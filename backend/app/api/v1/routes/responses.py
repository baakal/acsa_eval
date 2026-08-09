"""Responses & Section-Statuses API — Sprint 2.

Endpoints for reading and upserting per-requirement responses and per-section
submission statuses for a given assessment.
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.modules.assessments.models import Assessment, AssessmentSectionStatus, Response
from app.modules.organizations.models import Organization, OrganizationMember, User
from app.modules.questionnaires.models import Requirement

router = APIRouter(tags=["responses"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]


# ── Schemas ───────────────────────────────────────────────────────────────────


class ResponseOut(BaseModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    requirement_stable_id: str
    compliance_code: str | None
    operating_mode: str | None
    depends_on_systems: bool | None
    dependent_systems: str | None
    evidence_text: str | None
    notes: str | None
    is_complete: bool
    review_outcome: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResponseUpsert(BaseModel):
    compliance_code: str | None = None
    operating_mode: str | None = None
    depends_on_systems: bool | None = None
    dependent_systems: str | None = None
    evidence_text: str | None = None
    notes: str | None = None
    is_complete: bool = False
    review_outcome: str | None = None


class SectionStatusOut(BaseModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    section_stable_id: str
    status: str
    submitted_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class SectionStatusUpsert(BaseModel):
    status: str
    submitted_at: datetime | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _get_user(session: AsyncSession, sub: str) -> User | None:
    result = await session.execute(select(User).where(User.keycloak_sub == sub))
    return result.scalar_one_or_none()


async def _assert_assessment_access(
    session: AsyncSession, user_id: uuid.UUID, assessment_id: uuid.UUID
) -> Assessment:
    """Verify the assessment exists and the user is an org member."""
    result = await session.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.deleted_at.is_(None),
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found.")

    member_result = await session.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.organization_id == assessment.organization_id,
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization.",
        )
    return assessment


async def _get_requirement_by_stable_id(
    session: AsyncSession, stable_id: str, questionnaire_version_id: uuid.UUID
) -> Requirement | None:
    result = await session.execute(
        select(Requirement).where(
            Requirement.stable_id == stable_id,
            Requirement.questionnaire_version_id == questionnaire_version_id,
            Requirement.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


# ── Response endpoints ────────────────────────────────────────────────────────


@router.get(
    "/assessments/{assessment_id}/responses",
    response_model=list[ResponseOut],
)
async def list_responses(assessment_id: uuid.UUID, db: Db, current: Auth):
    """Return all responses for an assessment, including the requirement stable_id."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    await _assert_assessment_access(db, user.id, assessment_id)

    result = await db.execute(
        select(Response, Requirement.stable_id.label("req_stable_id"))
        .join(Requirement, Requirement.id == Response.requirement_id)
        .where(Response.assessment_id == assessment_id)
    )
    rows = result.all()

    return [
        ResponseOut(
            id=resp.id,
            assessment_id=resp.assessment_id,
            requirement_stable_id=req_stable_id,
            compliance_code=resp.compliance_code,
            operating_mode=resp.operating_mode,
            depends_on_systems=resp.depends_on_systems,
            dependent_systems=resp.dependent_systems,
            evidence_text=resp.evidence_text,
            notes=resp.notes,
            is_complete=resp.is_complete,
            review_outcome=resp.review_outcome,
            updated_at=resp.updated_at,
        )
        for resp, req_stable_id in rows
    ]


@router.put(
    "/assessments/{assessment_id}/responses/{requirement_stable_id}",
    response_model=ResponseOut,
)
async def upsert_response(
    assessment_id: uuid.UUID,
    requirement_stable_id: str,
    body: ResponseUpsert,
    db: Db,
    current: Auth,
):
    """Create or update the response for a single requirement."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    assessment = await _assert_assessment_access(db, user.id, assessment_id)

    requirement = await _get_requirement_by_stable_id(
        db, requirement_stable_id, assessment.questionnaire_version_id
    )
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{requirement_stable_id}' not found in this questionnaire version.",
        )

    result = await db.execute(
        select(Response).where(
            Response.assessment_id == assessment_id,
            Response.requirement_id == requirement.id,
        )
    )
    response = result.scalar_one_or_none()

    if response is None:
        response = Response(
            assessment_id=assessment_id,
            requirement_id=requirement.id,
            answered_by=user.id,
            last_updated_by=user.id,
        )
        db.add(response)

    response.compliance_code = body.compliance_code
    response.operating_mode = body.operating_mode
    response.depends_on_systems = body.depends_on_systems
    response.dependent_systems = body.dependent_systems
    response.evidence_text = body.evidence_text
    response.notes = body.notes
    response.is_complete = body.is_complete
    response.review_outcome = body.review_outcome
    response.last_updated_by = user.id

    await db.flush()
    await db.refresh(response)

    return ResponseOut(
        id=response.id,
        assessment_id=response.assessment_id,
        requirement_stable_id=requirement_stable_id,
        compliance_code=response.compliance_code,
        operating_mode=response.operating_mode,
        depends_on_systems=response.depends_on_systems,
        dependent_systems=response.dependent_systems,
        evidence_text=response.evidence_text,
        notes=response.notes,
        is_complete=response.is_complete,
        review_outcome=response.review_outcome,
        updated_at=response.updated_at,
    )


# ── Section-status endpoints ──────────────────────────────────────────────────


@router.get(
    "/assessments/{assessment_id}/section-statuses",
    response_model=list[SectionStatusOut],
)
async def list_section_statuses(assessment_id: uuid.UUID, db: Db, current: Auth):
    """Return all section submission statuses for an assessment."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    await _assert_assessment_access(db, user.id, assessment_id)

    result = await db.execute(
        select(AssessmentSectionStatus).where(
            AssessmentSectionStatus.assessment_id == assessment_id
        )
    )
    return [SectionStatusOut.model_validate(s) for s in result.scalars().all()]


@router.put(
    "/assessments/{assessment_id}/section-statuses/{section_stable_id}",
    response_model=SectionStatusOut,
)
async def upsert_section_status(
    assessment_id: uuid.UUID,
    section_stable_id: str,
    body: SectionStatusUpsert,
    db: Db,
    current: Auth,
):
    """Create or update the submission status for a section."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    await _assert_assessment_access(db, user.id, assessment_id)

    result = await db.execute(
        select(AssessmentSectionStatus).where(
            AssessmentSectionStatus.assessment_id == assessment_id,
            AssessmentSectionStatus.section_stable_id == section_stable_id,
        )
    )
    section_status = result.scalar_one_or_none()

    if section_status is None:
        section_status = AssessmentSectionStatus(
            assessment_id=assessment_id,
            section_stable_id=section_stable_id,
        )
        db.add(section_status)

    section_status.status = body.status
    if body.status == "Submitted" and section_status.submitted_at is None:
        section_status.submitted_at = body.submitted_at or datetime.now(timezone.utc)
    elif body.status != "Submitted":
        section_status.submitted_at = body.submitted_at

    await db.flush()
    await db.refresh(section_status)

    return SectionStatusOut.model_validate(section_status)
