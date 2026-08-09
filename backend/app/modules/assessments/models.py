"""ORM models — Assessments, Responses, Evidence."""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Assessment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assessments"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    questionnaire_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questionnaire_versions.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT")
    due_date: Mapped[date | None] = mapped_column(Date)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    responses: Mapped[list["Response"]] = relationship(
        back_populates="assessment", lazy="noload"
    )
    evidence_list: Mapped[list["Evidence"]] = relationship(
        back_populates="assessment", lazy="noload"
    )


class Response(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "responses"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requirements.id"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    compliance_code: Mapped[str | None] = mapped_column(String(50))
    operating_mode: Mapped[str | None] = mapped_column(String(20))
    depends_on_systems: Mapped[bool | None] = mapped_column(Boolean)
    dependent_systems: Mapped[str | None] = mapped_column(Text)
    text_value: Mapped[str | None] = mapped_column(Text)
    is_not_applicable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    na_justification: Mapped[str | None] = mapped_column(Text)
    evidence_text: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    review_outcome: Mapped[str | None] = mapped_column(String(50))
    answered_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    last_updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    assessment: Mapped["Assessment"] = relationship(back_populates="responses", lazy="joined")


class FileObject(Base, TimestampMixin):
    __tablename__ = "file_objects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    object_key: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    scan_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)


class Evidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "evidence"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    file_object_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("file_objects.id"))
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("requirements.id"))
    title: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    evidence_type: Mapped[str | None] = mapped_column(String(100))
    url: Mapped[str | None] = mapped_column(String(2000))
    confidentiality: Mapped[str] = mapped_column(String(50), nullable=False, default="STANDARD")
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    assessment: Mapped["Assessment"] = relationship(back_populates="evidence_list", lazy="joined")


class AssessmentSectionStatus(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks the submission status of a section (category) within an assessment."""

    __tablename__ = "assessment_section_statuses"
    __table_args__ = (
        UniqueConstraint("assessment_id", "section_stable_id", name="uq_section_status"),
    )

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    section_stable_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Draft")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    assessment: Mapped["Assessment"] = relationship(lazy="joined")
