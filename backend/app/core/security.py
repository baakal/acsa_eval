"""JWT validation and Keycloak OIDC integration.

Tokens are validated against the Keycloak JWKS endpoint.
The decoded claims are mapped to an internal CurrentUser object which is
injected via FastAPI dependency injection.
"""

from __future__ import annotations

import time
from typing import Any

import httpx
import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings

logger = structlog.get_logger(__name__)

_bearer = HTTPBearer(auto_error=True)

# Simple in-memory JWKS cache (refreshed every 5 minutes)
_jwks_cache: dict[str, Any] = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL: float = 300.0  # seconds


async def _get_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.keycloak_jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
        logger.info("jwks_refreshed")
        return _jwks_cache


# ── Public models ─────────────────────────────────────────────────────────────

class CurrentUser(BaseModel):
    """Decoded, validated Keycloak token claims."""

    sub: str                          # Keycloak subject (UUID)
    email: str
    name: str = ""
    preferred_username: str = ""
    roles: list[str] = []             # realm roles extracted from token
    email_verified: bool = False

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
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=settings.keycloak_issuer,
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        logger.warning("jwt_validation_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Extract realm roles from token claim structure
    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", [])

    return CurrentUser(
        sub=payload["sub"],
        email=payload.get("email", ""),
        name=payload.get("name", ""),
        preferred_username=payload.get("preferred_username", ""),
        roles=roles,
        email_verified=payload.get("email_verified", False),
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
