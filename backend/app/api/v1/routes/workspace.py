"""Workspace bootstrap API — Sprint 2.

POST /api/v1/me/workspace
  Idempotently provisions the first-time user experience:
    1. Creates the user profile if it doesn't exist.
    2. Creates a personal "Solution Provider" organization if none exists.
    3. Auto-approves the organization (personal workspace concept).
    4. Creates a default assessment against the latest published
       questionnaire version if none exists.
  Returns the workspace context so the frontend can store the assessment ID.
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
from app.modules.assessments.models import Assessment
from app.modules.organizations.models import Organization, OrganizationMember, User
from app.modules.questionnaires.models import QuestionnaireVersion

router = APIRouter(prefix="/me", tags=["workspace"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]

# organization_types.id for "Solution Provider" (seeded in initial migration)
_PROVIDER_TYPE_ID = 2


# ── Schemas ───────────────────────────────────────────────────────────────────


class WorkspaceOut(BaseModel):
    user_id: uuid.UUID
    organization_id: uuid.UUID
    organization_name: str
    assessment_id: uuid.UUID
    assessment_name: str
    assessment_status: str


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/workspace", response_model=WorkspaceOut, status_code=status.HTTP_200_OK)
async def bootstrap_workspace(db: Db, current: Auth):
    """Idempotently provision a personal workspace for the authenticated user."""

    # 1. Get or create user row ────────────────────────────────────────────────
    result = await db.execute(select(User).where(User.keycloak_sub == current.sub))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            keycloak_sub=current.sub,
            email=current.email,
            full_name=current.name or current.preferred_username or current.email,
        )
        db.add(user)
        await db.flush()

    user.last_login_at = datetime.now(timezone.utc)

    # 2. Get or create personal organization ──────────────────────────────────
    # Personal orgs are named "<full_name>'s Workspace" and are auto-approved.
    personal_org_name = f"{user.full_name}'s Workspace"
    org_result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(
            OrganizationMember.user_id == user.id,
            Organization.name == personal_org_name,
            Organization.deleted_at.is_(None),
        )
        .limit(1)
    )
    org = org_result.scalar_one_or_none()

    if org is None:
        org = Organization(
            name=personal_org_name,
            type_id=_PROVIDER_TYPE_ID,
            created_by=user.id,
            status="APPROVED",
            approved_by=user.id,
            approved_at=datetime.now(timezone.utc),
        )
        db.add(org)
        await db.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role="admin",
            is_admin=True,
            invited_by=user.id,
        )
        db.add(member)
        await db.flush()

    # 3. Resolve the latest published questionnaire version ───────────────────
    qv_result = await db.execute(
        select(QuestionnaireVersion)
        .where(QuestionnaireVersion.status == "PUBLISHED")
        .order_by(QuestionnaireVersion.published_at.desc())
        .limit(1)
    )
    questionnaire_version = qv_result.scalar_one_or_none()
    if questionnaire_version is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No published questionnaire version found. Run the seed script first.",
        )

    # 4. Get or create the default assessment ─────────────────────────────────
    assessment_result = await db.execute(
        select(Assessment).where(
            Assessment.organization_id == org.id,
            Assessment.deleted_at.is_(None),
        ).limit(1)
    )
    assessment = assessment_result.scalar_one_or_none()

    if assessment is None:
        assessment = Assessment(
            organization_id=org.id,
            questionnaire_version_id=questionnaire_version.id,
            name="ACSA Self-Evaluation",
            description="Auto-created personal assessment workspace.",
            status="IN_PROGRESS",
            created_by=user.id,
        )
        db.add(assessment)
        await db.flush()

    return WorkspaceOut(
        user_id=user.id,
        organization_id=org.id,
        organization_name=org.name,
        assessment_id=assessment.id,
        assessment_name=assessment.name,
        assessment_status=assessment.status,
    )
