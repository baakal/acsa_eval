"""ORM models — Users and Organizations."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    keycloak_sub: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_lang: Mapped[str] = mapped_column(String(2), nullable=False, default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization_members: Mapped[list["OrganizationMember"]] = relationship(
        back_populates="user", lazy="noload"
    )


class OrganizationType(Base):
    __tablename__ = "organization_types"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)

    organizations: Mapped[list["Organization"]] = relationship(
        back_populates="org_type", lazy="noload"
    )


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type_id: Mapped[int] = mapped_column(
        SmallInteger, ForeignKey("organization_types.id"), nullable=False
    )
    country_code: Mapped[str | None] = mapped_column(String(2))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING_APPROVAL")
    description: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(500))
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    org_type: Mapped["OrganizationType"] = relationship(back_populates="organizations", lazy="joined")
    members: Mapped[list["OrganizationMember"]] = relationship(
        back_populates="organization", lazy="noload"
    )


class OrganizationMember(Base, TimestampMixin):
    __tablename__ = "organization_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    user: Mapped["User"] = relationship(back_populates="organization_members", lazy="joined")
    organization: Mapped["Organization"] = relationship(back_populates="members", lazy="joined")
