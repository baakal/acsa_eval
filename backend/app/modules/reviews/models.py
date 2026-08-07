"""ORM models — Reviews, Findings, Evidence Requests, Approval Decisions."""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Review(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reviews"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="IN_PROGRESS")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    findings: Mapped[list["ReviewFinding"]] = relationship(
        back_populates="review", lazy="noload"
    )


class ReviewFinding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "review_findings"

    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requirements.id"), nullable=False
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    outcome: Mapped[str | None] = mapped_column(String(50))
    score_override: Mapped[float | None] = mapped_column(Numeric(6, 3))
    override_reason: Mapped[str | None] = mapped_column(Text)
    internal_note: Mapped[str | None] = mapped_column(Text)
    applicant_comment: Mapped[str | None] = mapped_column(Text)
    show_to_applicant: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    review: Mapped["Review"] = relationship(back_populates="findings", lazy="joined")


class EvidenceRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "evidence_requests"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("requirements.id"))
    request_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    due_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="NORMAL")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT")
    reviewer_outcome: Mapped[str | None] = mapped_column(String(50))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    approver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    outcome: Mapped[str] = mapped_column(String(50), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    certificate_key: Mapped[str | None] = mapped_column(String(1000))
