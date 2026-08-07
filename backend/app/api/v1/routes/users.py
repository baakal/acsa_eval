"""Users API — profile and user sync from Keycloak."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import get_db
from app.modules.organizations.models import User

router = APIRouter(prefix="/users", tags=["users"])

Db = Annotated[AsyncSession, Depends(get_db)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    preferred_lang: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(db: Db, current: Auth):
    """Return the current user's profile, creating a DB record if first login."""
    result = await db.execute(
        select(User).where(User.keycloak_sub == current.sub)
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            keycloak_sub=current.sub,
            email=current.email,
            full_name=current.name or current.preferred_username or current.email,
        )
        db.add(user)
        await db.flush()

    user.last_login_at = datetime.utcnow()
    return UserOut.model_validate(user)
