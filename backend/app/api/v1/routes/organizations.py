"""Organizations API — Sprint 4."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user, require_admin
from app.db.session import get_db
from app.modules.audit.service import record_audit_event
from app.modules.organizations.models import Organization, OrganizationMember, User

router = APIRouter(prefix="/organizations", tags=["organizations"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]
AdminAuth = Annotated[CurrentUser, Depends(require_admin)]


# ── Schemas ───────────────────────────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    type_id: int
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    description: str | None = None
    website: str | None = None


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    type_id: int
    country_code: str | None
    status: str
    description: str | None
    website: str | None
    approved_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteUserRequest(BaseModel):
    email: str
    role: str = "member"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_user(session: AsyncSession, current: CurrentUser) -> User:
    result = await session.execute(
        select(User).where(User.oauth_sub == current.sub)
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            oauth_sub=current.sub,
            email=current.email,
            full_name=current.name or current.preferred_username or current.email,
            preferred_lang="en",
        )
        session.add(user)
        await session.flush()
    return user


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=OrganizationOut)
async def register_organization(
    body: OrganizationCreate,
    db: Db,
    current: Auth,
):
    """Register a new organization (status = PENDING_APPROVAL)."""
    user = await _get_or_create_user(db, current)

    # Check for duplicate name
    result = await db.execute(
        select(Organization).where(
            Organization.name == body.name,
            Organization.deleted_at.is_(None),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An organization with this name already exists.",
        )

    org = Organization(
        name=body.name,
        type_id=body.type_id,
        country_code=body.country_code,
        description=body.description,
        website=body.website,
        created_by=user.id,
        status="PENDING_APPROVAL",
    )
    db.add(org)
    await db.flush()

    # Make the creator an admin member
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="admin",
        is_admin=True,
        invited_by=user.id,
    )
    db.add(member)
    await record_audit_event(
        db,
        event_type="organization.registered",
        actor_id=user.id,
        organization_id=org.id,
        resource_type="organization",
        resource_id=org.id,
        details={"name": org.name, "status": org.status},
    )

    return OrganizationOut.model_validate(org)


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(org_id: uuid.UUID, db: Db, current: Auth):
    """Fetch a single organization by ID."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.deleted_at.is_(None),
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return OrganizationOut.model_validate(org)


@router.patch("/{org_id}/approve", response_model=OrganizationOut)
async def approve_organization(org_id: uuid.UUID, db: Db, current: AdminAuth):
    """Approve a pending organization (Admin only)."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.deleted_at.is_(None),
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    if org.status != "PENDING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization is not pending approval (current status: {org.status}).",
        )

    # Get approver user row
    approver = await _get_or_create_user(db, current)
    org.status = "APPROVED"
    org.approved_by = approver.id
    org.approved_at = datetime.now(timezone.utc)
    await record_audit_event(
        db,
        event_type="organization.approved",
        actor_id=approver.id,
        organization_id=org.id,
        resource_type="organization",
        resource_id=org.id,
        details={"status": org.status},
    )

    return OrganizationOut.model_validate(org)


@router.patch("/{org_id}/reject", response_model=OrganizationOut)
async def reject_organization(org_id: uuid.UUID, db: Db, current: AdminAuth):
    """Reject a pending organization (Admin only)."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.deleted_at.is_(None),
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    org.status = "REJECTED"
    approver = await _get_or_create_user(db, current)
    await record_audit_event(
        db,
        event_type="organization.rejected",
        actor_id=approver.id,
        organization_id=org.id,
        resource_type="organization",
        resource_id=org.id,
        details={"status": org.status},
    )

    return OrganizationOut.model_validate(org)
