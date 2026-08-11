"""Audit logging helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditEvent, Notification


async def record_audit_event(
    session: AsyncSession,
    *,
    event_type: str,
    actor_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
    assessment_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    details: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        event_type=event_type,
        actor_id=actor_id,
        organization_id=organization_id,
        assessment_id=assessment_id,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        occurred_at=datetime.now(UTC),
    )
    session.add(event)
    await session.flush()
    return event


async def create_notification(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    notification_type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        link=link,
    )
    session.add(notification)
    await session.flush()
    return notification
