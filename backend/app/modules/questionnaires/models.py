"""ORM models — Questionnaires, Sections, Requirements."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Questionnaire(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "questionnaires"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    versions: Mapped[list["QuestionnaireVersion"]] = relationship(
        back_populates="questionnaire", lazy="noload"
    )


class QuestionnaireVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "questionnaire_versions"

    questionnaire_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questionnaires.id"), nullable=False
    )
    version_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT")
    description: Mapped[str | None] = mapped_column(Text)
    changelog: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    effective_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    questionnaire: Mapped["Questionnaire"] = relationship(back_populates="versions", lazy="joined")
    sections: Mapped[list["Section"]] = relationship(
        back_populates="questionnaire_version", lazy="noload", order_by="Section.display_order"
    )


class Section(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sections"

    questionnaire_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questionnaire_versions.id"), nullable=False
    )
    stable_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    questionnaire_version: Mapped["QuestionnaireVersion"] = relationship(
        back_populates="sections", lazy="joined"
    )
    requirements: Mapped[list["Requirement"]] = relationship(
        back_populates="section", lazy="noload", order_by="Requirement.display_order"
    )


class Requirement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "requirements"

    questionnaire_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questionnaire_versions.id"), nullable=False
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False
    )
    stable_id: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    guidance: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    requirement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    evidence_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_condition: Mapped[dict | None] = mapped_column(JSONB)

    section: Mapped["Section"] = relationship(back_populates="requirements", lazy="joined")
