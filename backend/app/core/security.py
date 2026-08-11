"""JWT validation for next-auth HS256 tokens.

The frontend (next-auth) signs a compact JWT with NEXTAUTH_SECRET (HS256).
The backend verifies the same secret — no external JWKS endpoint required.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_bearer = HTTPBearer(auto_error=True)


# ── Public models ─────────────────────────────────────────────────────────────

class CurrentUser(BaseModel):
    """Decoded, validated token claims."""

    sub: str
    email: str
    name: str = ""
    roles: list[str] = []

    def has_role(self, *roles: str) -> bool:
        return any(r in self.roles for r in roles)

    def require_role(self, *roles: str) -> None:
        if not self.has_role(*roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )


# ── Token validation ──────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.NEXTAUTH_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        logger.warning("jwt_validation_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return CurrentUser(
        sub=payload["sub"],
        email=payload.get("email", ""),
        name=payload.get("name", ""),
        roles=payload.get("roles", []),
    )


# ── Role guards (use as FastAPI dependencies) ─────────────────────────────────

def require_roles(*roles: str):
    """Dependency factory that enforces at least one of the given roles."""

    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        user.require_role(*roles)
        return user

    return _guard


require_admin = require_roles("admin")
require_reviewer = require_roles("reviewer", "adjudicator", "admin")
require_adjudicator = require_roles("adjudicator", "admin")
