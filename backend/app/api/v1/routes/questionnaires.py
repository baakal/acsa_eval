"""Questionnaires API — Sprint 7."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.modules.questionnaires.models import (
    QuestionnaireVersion,
    Requirement,
    Section,
)

router = APIRouter(prefix="/questionnaires", tags=["questionnaires"])

Db = Annotated[AsyncSession, Depends(get_db)]


# ── Schemas ───────────────────────────────────────────────────────────────────

class RequirementOut(BaseModel):
    id: uuid.UUID
    stable_id: str
    name: str
    description: str | None
    guidance: str | None
    display_order: int
    requirement_type: str
    priority: str
    evidence_required: bool
    is_mandatory: bool
    display_condition: dict | None

    model_config = {"from_attributes": True}


class SectionOut(BaseModel):
    id: uuid.UUID
    stable_id: str
    name: str
    description: str | None
    display_order: int
    requirements: list[RequirementOut] = []

    model_config = {"from_attributes": True}


class QuestionnaireVersionOut(BaseModel):
    id: uuid.UUID
    version_number: str
    status: str
    description: str | None
    changelog: str | None
    sections: list[SectionOut] = []

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/versions", response_model=list[QuestionnaireVersionOut])
async def list_published_versions(db: Db, _=Depends(get_current_user)):
    """List all published questionnaire versions."""
    result = await db.execute(
        select(QuestionnaireVersion).where(QuestionnaireVersion.status == "PUBLISHED")
    )
    versions = result.scalars().all()
    return [QuestionnaireVersionOut.model_validate(v) for v in versions]


@router.get("/versions/{version_id}", response_model=QuestionnaireVersionOut)
async def get_questionnaire_version(
    version_id: uuid.UUID,
    db: Db,
    _=Depends(get_current_user),
):
    """Fetch a full questionnaire version including sections and requirements."""
    result = await db.execute(
        select(QuestionnaireVersion).where(QuestionnaireVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Questionnaire version not found.",
        )

    # Load all sections and requirements in two queries (avoids N+1)
    sections_result = await db.execute(
        select(Section)
        .where(Section.questionnaire_version_id == version_id)
        .order_by(Section.display_order)
    )
    sections = sections_result.scalars().all()

    # Fetch all requirements for this version in one query
    section_ids = [s.id for s in sections]
    if section_ids:
        reqs_result = await db.execute(
            select(Requirement)
            .where(
                Requirement.section_id.in_(section_ids),
                Requirement.is_active.is_(True),
            )
            .order_by(Requirement.section_id, Requirement.display_order)
        )
        all_reqs = reqs_result.scalars().all()
    else:
        all_reqs = []

    # Group requirements by section_id
    reqs_by_section: dict[uuid.UUID, list[Requirement]] = {}
    for req in all_reqs:
        reqs_by_section.setdefault(req.section_id, []).append(req)

    section_outs = [
        SectionOut(
            id=section.id,
            stable_id=section.stable_id,
            name=section.name,
            description=section.description,
            display_order=section.display_order,
            requirements=[RequirementOut.model_validate(r) for r in reqs_by_section.get(section.id, [])],
        )
        for section in sections
    ]

    return QuestionnaireVersionOut(
        id=version.id,
        version_number=version.version_number,
        status=version.status,
        description=version.description,
        changelog=version.changelog,
        sections=section_outs,
    )
