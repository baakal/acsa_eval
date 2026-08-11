"""Notifications API."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.modules.audit.models import Notification
from app.modules.organizations.models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]


class NotificationOut(BaseModel):
    id: uuid.UUID
    notification_type: str
    title: str
    body: str | None
    link: str | None
    is_read: bool
    created_at: str

    model_config = {"from_attributes": True}


async def _get_user(db: AsyncSession, sub: str) -> User | None:
    result = await db.execute(select(User).where(User.oauth_sub == sub))
    return result.scalar_one_or_none()


@router.get("", response_model=list[NotificationOut])
async def list_notifications(db: Db, current: Auth):
    user = await _get_user(db, current.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return [
        NotificationOut(
            id=notification.id,
            notification_type=notification.notification_type,
            title=notification.title,
            body=notification.body,
            link=notification.link,
            is_read=notification.is_read,
            created_at=notification.created_at.isoformat(),
        )
        for notification in result.scalars().all()
    ]
