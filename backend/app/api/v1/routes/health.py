"""Health check endpoints — liveness and readiness probes."""

import asyncio

import structlog
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import engine

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live", summary="Liveness probe")
async def liveness():
    """Returns 200 if the process is running. Used by Docker/K8s liveness probes."""
    return {"status": "ok", "env": settings.APP_ENV, "version": settings.APP_VERSION}


@router.get("/ready", summary="Readiness probe")
async def readiness():
    """
    Returns 200 only when all critical dependencies are reachable.
    Returns 503 if any dependency check fails.
    """
    checks: dict[str, str] = {}
    overall_ok = True

    # ── Database ──────────────────────────────────────────────────────────────
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        logger.warning("health_db_fail", error=str(exc))
        checks["database"] = "error"
        overall_ok = False

    # ── Redis ─────────────────────────────────────────────────────────────────
    try:
        import redis.asyncio as aioredis  # type: ignore[import]
        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        logger.warning("health_redis_fail", error=str(exc))
        checks["redis"] = "error"
        overall_ok = False

    status_code = status.HTTP_200_OK if overall_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if overall_ok else "degraded", "checks": checks},
    )
