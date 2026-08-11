"""Assessments API — Sprint 6 (list + create) and Sprint 11 (submit)."""

import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.modules.assessments.models import Assessment
from app.modules.organizations.models import Organization, OrganizationMember, User

router = APIRouter(prefix="/assessments", tags=["assessments"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]


# ── Schemas ───────────────────────────────────────────────────────────────────

class AssessmentCreate(BaseModel):
    organization_id: uuid.UUID
    questionnaire_version_id: uuid.UUID
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    due_date: date | None = None


class AssessmentOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    questionnaire_version_id: uuid.UUID
    name: str
    description: str | None
    status: str
    due_date: date | None
    submitted_at: datetime | None
    approved_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_user(session: AsyncSession, sub: str) -> User | None:
    result = await session.execute(select(User).where(User.oauth_sub == sub))
    return result.scalar_one_or_none()


async def _assert_org_member(session: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID) -> None:
    result = await session.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.organization_id == org_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization.",
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AssessmentOut])
async def list_assessments(
    organization_id: uuid.UUID,
    db: Db,
    current: Auth,
):
    """List all assessments for an organization (requires membership)."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    await _assert_org_member(db, user.id, organization_id)

    result = await db.execute(
        select(Assessment).where(
            Assessment.organization_id == organization_id,
            Assessment.deleted_at.is_(None),
        )
    )
    return [AssessmentOut.model_validate(a) for a in result.scalars().all()]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=AssessmentOut)
async def create_assessment(body: AssessmentCreate, db: Db, current: Auth):
    """Create a new assessment (user must be an org member)."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    await _assert_org_member(db, user.id, body.organization_id)

    # Verify org is approved
    result = await db.execute(
        select(Organization).where(
            Organization.id == body.organization_id,
            Organization.deleted_at.is_(None),
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    if org.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization must be approved before creating assessments.",
        )

    assessment = Assessment(
        organization_id=body.organization_id,
        questionnaire_version_id=body.questionnaire_version_id,
        name=body.name,
        description=body.description,
        due_date=body.due_date,
        created_by=user.id,
        status="DRAFT",
    )
    db.add(assessment)
    await db.flush()

    return AssessmentOut.model_validate(assessment)


@router.get("/{assessment_id}", response_model=AssessmentOut)
async def get_assessment(assessment_id: uuid.UUID, db: Db, current: Auth):
    """Fetch a single assessment by ID."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.deleted_at.is_(None),
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found.")

    await _assert_org_member(db, user.id, assessment.organization_id)
    return AssessmentOut.model_validate(assessment)


@router.post("/{assessment_id}/submit", response_model=AssessmentOut)
async def submit_assessment(assessment_id: uuid.UUID, db: Db, current: Auth):
    """Submit an assessment for review."""
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.deleted_at.is_(None),
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found.")

    await _assert_org_member(db, user.id, assessment.organization_id)

    if assessment.status not in ("DRAFT", "IN_PROGRESS", "RETURNED"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Assessment cannot be submitted in status '{assessment.status}'.",
        )

    assessment.status = "SUBMITTED"
    assessment.submitted_at = datetime.now(timezone.utc)

    return AssessmentOut.model_validate(assessment)
