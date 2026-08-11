"""Invitation API for shared assessment workspaces."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.modules.assessments.models import Assessment
from app.modules.audit.service import create_notification, record_audit_event
from app.modules.organizations.models import Invitation, Organization, OrganizationMember, User

router = APIRouter(prefix="/invitations", tags=["invitations"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]


class InvitationCreate(BaseModel):
    assessment_id: uuid.UUID | None = None
    email: str
    role: str = "collaborator"


class InvitationOut(BaseModel):
    token: str
    email: str
    role: str
    status: str
    expires_at: datetime
    organization_name: str
    assessment_id: uuid.UUID | None
    assessment_name: str | None
    invite_url: str | None = None


async def _get_or_create_user(db: AsyncSession, current: CurrentUser) -> User:
    result = await db.execute(select(User).where(User.oauth_sub == current.sub))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            oauth_sub=current.sub,
            email=current.email,
            full_name=current.name or current.email,
        )
        db.add(user)
        await db.flush()
    return user


async def _get_invitation_with_context(
    db: AsyncSession,
    token: str,
) -> tuple[Invitation, Organization, Assessment | None]:
    result = await db.execute(
        select(Invitation, Organization, Assessment)
        .join(Organization, Organization.id == Invitation.organization_id)
        .outerjoin(Assessment, Assessment.id == Invitation.assessment_id)
        .where(Invitation.token == token)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    return row


async def _assert_org_admin(db: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.is_admin.is_(True),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization administrators can manage invitations.",
        )


@router.post("", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
async def create_invitation(body: InvitationCreate, db: Db, current: Auth):
    user = await _get_or_create_user(db, current)

    membership_result = await db.execute(
        select(OrganizationMember, Organization)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .where(
            OrganizationMember.user_id == user.id,
            Organization.deleted_at.is_(None),
        )
        .order_by(OrganizationMember.created_at.desc())
        .limit(1)
    )
    row = membership_result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No organization workspace is available for invitations.",
        )
    _, organization = row
    await _assert_org_admin(db, organization.id, user.id)

    assessment = None
    if body.assessment_id is not None:
        assessment_result = await db.execute(
            select(Assessment).where(
                Assessment.id == body.assessment_id,
                Assessment.organization_id == organization.id,
                Assessment.deleted_at.is_(None),
            )
        )
        assessment = assessment_result.scalar_one_or_none()
        if assessment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found for this organization.",
            )

    invitation = Invitation(
        organization_id=organization.id,
        assessment_id=assessment.id if assessment else None,
        email=str(body.email).lower(),
        role=body.role,
        token=secrets.token_urlsafe(32),
        status="PENDING",
        invited_by=user.id,
        expires_at=datetime.now(UTC) + timedelta(hours=72),
    )
    db.add(invitation)
    await db.flush()

    existing_user_result = await db.execute(
        select(User).where(User.email == invitation.email)
    )
    existing_user = existing_user_result.scalar_one_or_none()
    if existing_user:
        await create_notification(
            db,
            user_id=existing_user.id,
            notification_type="invitation.created",
            title=f"{organization.name} shared an assessment workspace with you",
            body=(
                f"{user.full_name} invited you to collaborate on "
                f"{assessment.name if assessment else organization.name}."
            ),
            link=f"/invite/{invitation.token}",
        )

    await record_audit_event(
        db,
        event_type="invitation.created",
        actor_id=user.id,
        organization_id=organization.id,
        assessment_id=assessment.id if assessment else None,
        resource_type="invitation",
        resource_id=invitation.id,
        details={"email": invitation.email, "role": invitation.role},
    )

    return InvitationOut(
        token=invitation.token,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        expires_at=invitation.expires_at,
        organization_name=organization.name,
        assessment_id=assessment.id if assessment else None,
        assessment_name=assessment.name if assessment else None,
        invite_url=f"/invite/{invitation.token}",
    )


@router.get("/{token}", response_model=InvitationOut)
async def get_invitation(token: str, db: Db):
    invitation, organization, assessment = await _get_invitation_with_context(db, token)
    return InvitationOut(
        token=invitation.token,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        expires_at=invitation.expires_at,
        organization_name=organization.name,
        assessment_id=assessment.id if assessment else None,
        assessment_name=assessment.name if assessment else None,
    )


@router.post("/{token}/accept", response_model=InvitationOut)
async def accept_invitation(token: str, db: Db, current: Auth):
    user = await _get_or_create_user(db, current)

    invitation, organization, assessment = await _get_invitation_with_context(db, token)
    if invitation.status == "ACCEPTED":
        return InvitationOut(
            token=invitation.token,
            email=invitation.email,
            role=invitation.role,
            status=invitation.status,
            expires_at=invitation.expires_at,
            organization_name=organization.name,
            assessment_id=assessment.id if assessment else None,
            assessment_name=assessment.name if assessment else None,
        )
    if invitation.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation has expired.")
    if user.email.lower() != invitation.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation does not match the signed-in email address.",
        )

    existing_member_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == invitation.organization_id,
            OrganizationMember.user_id == user.id,
        )
    )
    existing_member = existing_member_result.scalar_one_or_none()
    if existing_member is None:
        db.add(
            OrganizationMember(
                organization_id=invitation.organization_id,
                user_id=user.id,
                role=invitation.role,
                is_admin=False,
                invited_by=invitation.invited_by,
            )
        )

    invitation.status = "ACCEPTED"
    invitation.accepted_by = user.id
    await db.flush()

    inviter_result = await db.execute(select(User).where(User.id == invitation.invited_by))
    inviter = inviter_result.scalar_one_or_none()
    if inviter:
        await create_notification(
            db,
            user_id=inviter.id,
            notification_type="invitation.accepted",
            title=f"{user.full_name} joined the shared workspace",
            body=f"{user.full_name} accepted the invitation for {organization.name}.",
            link=f"/assessment?assessmentId={assessment.id}" if assessment else None,
        )

    await record_audit_event(
        db,
        event_type="invitation.accepted",
        actor_id=user.id,
        organization_id=organization.id,
        assessment_id=assessment.id if assessment else None,
        resource_type="invitation",
        resource_id=invitation.id,
        details={"email": invitation.email, "role": invitation.role},
    )

    return InvitationOut(
        token=invitation.token,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        expires_at=invitation.expires_at,
        organization_name=organization.name,
        assessment_id=assessment.id if assessment else None,
        assessment_name=assessment.name if assessment else None,
    )
