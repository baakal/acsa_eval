"""Seed script — loads questionnaire version 1.0.0 from catalogue.json.

Run via:  docker compose exec api python -m app.db.seeds.questionnaire
Or:       make seed-questionnaire
"""

import asyncio
import json
import os
import uuid
from pathlib import Path

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal

logger = structlog.get_logger(__name__)

# Path to catalogue.json (relative to the monorepo root; mounted at /catalogue.json in Docker)
# Falls back to the prototype app directory for local dev.
_CATALOGUE_PATHS = [
    Path("/catalogue.json"),
    Path(__file__).parents[5] / "app" / "catalogue.json",
]


def _load_catalogue() -> list[dict]:
    for path in _CATALOGUE_PATHS:
        if path.exists():
            logger.info("loading_catalogue", path=str(path))
            return json.loads(path.read_text())
    raise FileNotFoundError(
        "catalogue.json not found. Expected at /catalogue.json or app/catalogue.json"
    )


async def seed(session: AsyncSession) -> None:
    # ── Seed user (system account) ────────────────────────────────────────────
    system_user_sub = "system"
    result = await session.execute(
        text("SELECT id FROM users WHERE keycloak_sub = :sub"),
        {"sub": system_user_sub},
    )
    row = result.first()
    if row:
        system_user_id = row[0]
        logger.info("system_user_exists", id=str(system_user_id))
    else:
        system_user_id = uuid.uuid4()
        await session.execute(
            text(
                """
                INSERT INTO users (id, keycloak_sub, email, full_name, preferred_lang)
                VALUES (:id, :sub, :email, :name, 'en')
                """
            ),
            {
                "id": system_user_id,
                "sub": system_user_sub,
                "email": "system@acsa.local",
                "name": "System",
            },
        )
        logger.info("system_user_created", id=str(system_user_id))

    # ── Questionnaire ─────────────────────────────────────────────────────────
    result = await session.execute(
        text("SELECT id FROM questionnaires WHERE name = 'ACSA CRVS Requirements'")
    )
    row = result.first()
    if row:
        questionnaire_id = row[0]
        logger.info("questionnaire_exists", id=str(questionnaire_id))
    else:
        questionnaire_id = uuid.uuid4()
        await session.execute(
            text(
                """
                INSERT INTO questionnaires (id, name, description, created_by)
                VALUES (:id, :name, :desc, :created_by)
                """
            ),
            {
                "id": questionnaire_id,
                "name": "ACSA CRVS Requirements",
                "desc": "African Civil Registration and Statistics — CRVS system requirements catalogue.",
                "created_by": system_user_id,
            },
        )
        logger.info("questionnaire_created", id=str(questionnaire_id))

    # ── Questionnaire version ─────────────────────────────────────────────────
    result = await session.execute(
        text(
            "SELECT id FROM questionnaire_versions WHERE questionnaire_id = :qid AND version_number = '1.0.0'"
        ),
        {"qid": questionnaire_id},
    )
    row = result.first()
    if row:
        logger.info("version_exists", version="1.0.0")
        return

    version_id = uuid.uuid4()
    await session.execute(
        text(
            """
            INSERT INTO questionnaire_versions
              (id, questionnaire_id, version_number, status, description, created_by, published_at)
            VALUES
              (:id, :qid, '1.0.0', 'PUBLISHED', :desc, :created_by, now())
            """
        ),
        {
            "id": version_id,
            "qid": questionnaire_id,
            "desc": "Initial questionnaire seeded from catalogue.json",
            "created_by": system_user_id,
        },
    )
    logger.info("version_created", id=str(version_id))

    # ── Sections and Requirements ─────────────────────────────────────────────
    requirements = _load_catalogue()
    categories: dict[str, dict] = {}
    for req in requirements:
        cat = req.get("category", "Uncategorised")
        if cat not in categories:
            categories[cat] = {
                "id": uuid.uuid4(),
                "order": len(categories),
                "requirements": [],
            }
        categories[cat]["requirements"].append(req)

    for cat_name, cat_data in categories.items():
        section_id = cat_data["id"]
        stable_id = cat_name.upper().replace(" ", "_")[:100]
        await session.execute(
            text(
                """
                INSERT INTO sections (id, questionnaire_version_id, stable_id, name, display_order)
                VALUES (:id, :vid, :stable_id, :name, :order)
                """
            ),
            {
                "id": section_id,
                "vid": version_id,
                "stable_id": stable_id,
                "name": cat_name,
                "order": cat_data["order"],
            },
        )

        for i, req in enumerate(cat_data["requirements"]):
            req_id = uuid.uuid4()
            await session.execute(
                text(
                    """
                    INSERT INTO requirements
                      (id, questionnaire_version_id, section_id, stable_id, name,
                       description, display_order, requirement_type, priority,
                       evidence_required, is_mandatory, is_active)
                    VALUES
                      (:id, :vid, :sid, :stable_id, :name,
                       :desc, :order, :req_type, :priority,
                       false, true, true)
                    """
                ),
                {
                    "id": req_id,
                    "vid": version_id,
                    "sid": section_id,
                    "stable_id": req["id"],
                    "name": req["name"],
                    "desc": req.get("description", ""),
                    "order": i,
                    "req_type": req.get("type", "Functional"),
                    "priority": req.get("priority", "Must"),
                },
            )

    await session.commit()
    total = len(requirements)
    sections = len(categories)
    logger.info("seed_complete", requirements=total, sections=sections, version="1.0.0")
    print(f"✓ Seeded {total} requirements across {sections} sections (version 1.0.0)")


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed(session)


if __name__ == "__main__":
    asyncio.run(main())
