"""Admin reporting API."""

import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, require_admin
from app.db.session import get_db
from app.modules.assessments.models import Assessment, AssessmentSectionStatus, Response
from app.modules.audit.models import AuditEvent
from app.modules.organizations.models import Organization
from app.modules.questionnaires.models import Requirement

router = APIRouter(prefix="/admin", tags=["admin"])

Db = Annotated[AsyncSession, Depends(get_db)]
AdminAuth = Annotated[CurrentUser, Depends(require_admin)]

PRIORITY_WEIGHTS = {
    "Must": 2,
    "Should": 1.5,
    "Could": 1,
}

COMPLIANCE_SCORES = {
    "Fully Meets": 2,
    "Meets through Configuration": 2,
    "Customization Required": 1,
    "Not Available": 0,
}


class AdminAssessmentSummaryOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    organization_name: str
    country_code: str | None
    questionnaire_version_id: uuid.UUID
    name: str
    status: str
    due_date: date | None
    submitted_at: datetime | None
    approved_at: datetime | None
    created_at: datetime
    completed_requirements: int
    total_requirements: int
    completion_percent: int
    compliance_score: int


class AdminSectionStatusOut(BaseModel):
    section_stable_id: str
    status: str
    submitted_at: datetime | None
    updated_at: datetime


class AdminAuditEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    resource_type: str | None
    resource_id: uuid.UUID | None
    details: dict | None
    occurred_at: datetime


class AdminAssessmentDetailOut(AdminAssessmentSummaryOut):
    section_statuses: list[AdminSectionStatusOut]
    audit_events: list[AdminAuditEventOut]


async def _load_requirement_stats(
    db: AsyncSession,
    questionnaire_version_ids: set[uuid.UUID],
) -> dict[uuid.UUID, dict[str, int]]:
    if not questionnaire_version_ids:
        return {}

    result = await db.execute(
        select(
            Requirement.questionnaire_version_id,
            Requirement.priority,
            func.count(Requirement.id),
        )
        .where(
            Requirement.questionnaire_version_id.in_(questionnaire_version_ids),
            Requirement.is_active.is_(True),
        )
        .group_by(Requirement.questionnaire_version_id, Requirement.priority)
    )
    requirement_stats: dict[uuid.UUID, dict[str, int]] = {}
    for questionnaire_version_id, priority, count in result.all():
        priority_counts = requirement_stats.setdefault(
            questionnaire_version_id,
            {"Must": 0, "Should": 0, "Could": 0},
        )
        priority_counts[priority] = count
    return requirement_stats


async def _load_response_stats(
    db: AsyncSession,
    assessment_ids: list[uuid.UUID],
) -> dict[uuid.UUID, dict[str, float]]:
    if not assessment_ids:
        return {}

    result = await db.execute(
        select(
            Response.assessment_id,
            Response.is_complete,
            Response.compliance_code,
            Requirement.priority,
        )
        .join(Requirement, Requirement.id == Response.requirement_id)
        .where(Response.assessment_id.in_(assessment_ids))
    )
    response_stats: dict[uuid.UUID, dict[str, float]] = {}
    for assessment_id, is_complete, compliance_code, priority in result.all():
        stats = response_stats.setdefault(
            assessment_id,
            {"completed_requirements": 0, "achieved_score": 0},
        )
        if is_complete:
            stats["completed_requirements"] += 1
        stats["achieved_score"] += COMPLIANCE_SCORES.get(compliance_code or "", 0) * PRIORITY_WEIGHTS.get(
            priority, 1
        )
    return response_stats


async def _build_summary_rows(
    db: AsyncSession,
    assessments: list[Assessment],
    organizations: dict[uuid.UUID, Organization],
) -> list[AdminAssessmentSummaryOut]:
    requirement_stats = await _load_requirement_stats(
        db,
        {assessment.questionnaire_version_id for assessment in assessments},
    )
    response_stats = await _load_response_stats(db, [assessment.id for assessment in assessments])

    summaries: list[AdminAssessmentSummaryOut] = []
    for assessment in assessments:
        org = organizations[assessment.organization_id]
        counts = requirement_stats.get(
            assessment.questionnaire_version_id,
            {"Must": 0, "Should": 0, "Could": 0},
        )
        total_requirements = sum(counts.values())
        max_weighted_score = sum(
            count * 3 * PRIORITY_WEIGHTS.get(priority, 1)
            for priority, count in counts.items()
        )
        response_summary = response_stats.get(
            assessment.id,
            {"completed_requirements": 0, "achieved_score": 0},
        )
        completed_requirements = int(response_summary["completed_requirements"])
        achieved_score = float(response_summary["achieved_score"])
        completion_percent = round((completed_requirements / total_requirements) * 100) if total_requirements else 0
        compliance_score = round((achieved_score / max_weighted_score) * 100) if max_weighted_score else 0

        summaries.append(
            AdminAssessmentSummaryOut(
                id=assessment.id,
                organization_id=assessment.organization_id,
                organization_name=org.name,
                country_code=org.country_code,
                questionnaire_version_id=assessment.questionnaire_version_id,
                name=assessment.name,
                status=assessment.status,
                due_date=assessment.due_date,
                submitted_at=assessment.submitted_at,
                approved_at=assessment.approved_at,
                created_at=assessment.created_at,
                completed_requirements=completed_requirements,
                total_requirements=total_requirements,
                completion_percent=completion_percent,
                compliance_score=compliance_score,
            )
        )
    return summaries


@router.get("/assessments", response_model=list[AdminAssessmentSummaryOut])
async def list_admin_assessments(db: Db, current: AdminAuth):  # noqa: ARG001
    result = await db.execute(
        select(Assessment, Organization)
        .join(Organization, Organization.id == Assessment.organization_id)
        .where(
            Assessment.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
        .order_by(Assessment.created_at.desc())
    )
    rows = result.all()
    assessments = [assessment for assessment, _ in rows]
    organizations = {organization.id: organization for _, organization in rows}
    return await _build_summary_rows(db, assessments, organizations)


@router.get("/assessments/{assessment_id}", response_model=AdminAssessmentDetailOut)
async def get_admin_assessment(
    assessment_id: uuid.UUID,
    db: Db,
    current: AdminAuth,  # noqa: ARG001
):
    assessment_result = await db.execute(
        select(Assessment, Organization)
        .join(Organization, Organization.id == Assessment.organization_id)
        .where(
            Assessment.id == assessment_id,
            Assessment.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
    )
    row = assessment_result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found.")

    assessment, organization = row
    summary = (
        await _build_summary_rows(
            db,
            [assessment],
            {organization.id: organization},
        )
    )[0]

    section_statuses_result = await db.execute(
        select(AssessmentSectionStatus)
        .where(AssessmentSectionStatus.assessment_id == assessment_id)
        .order_by(AssessmentSectionStatus.updated_at.desc())
    )
    audit_events_result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.assessment_id == assessment_id)
        .order_by(AuditEvent.occurred_at.desc())
        .limit(100)
    )

    return AdminAssessmentDetailOut(
        **summary.model_dump(),
        section_statuses=[
            AdminSectionStatusOut(
                section_stable_id=status_row.section_stable_id,
                status=status_row.status,
                submitted_at=status_row.submitted_at,
                updated_at=status_row.updated_at,
            )
            for status_row in section_statuses_result.scalars().all()
        ],
        audit_events=[
            AdminAuditEventOut(
                id=event.id,
                event_type=event.event_type,
                resource_type=event.resource_type,
                resource_id=event.resource_id,
                details=event.details,
                occurred_at=event.occurred_at,
            )
            for event in audit_events_result.scalars().all()
        ],
    )
