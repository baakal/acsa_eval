"""Top-level API router — mounts all versioned route groups."""

from fastapi import APIRouter

from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.organizations import router as organizations_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.assessments import router as assessments_router
from app.api.v1.routes.questionnaires import router as questionnaires_router

api_router = APIRouter()

# Health endpoints (no /api/v1 prefix — used by load balancers and Docker)
api_router.include_router(health_router)

# Versioned API
api_router.include_router(organizations_router, prefix="/api/v1")
api_router.include_router(users_router, prefix="/api/v1")
api_router.include_router(assessments_router, prefix="/api/v1")
api_router.include_router(questionnaires_router, prefix="/api/v1")
