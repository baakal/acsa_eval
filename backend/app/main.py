"""ACSA Self-Evaluation Portal — FastAPI application entry point."""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestIdMiddleware
from app.api.v1.router import api_router
from app.db.session import engine

configure_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    logger.info("startup", env=settings.APP_ENV, version=settings.APP_VERSION)
    yield
    await engine.dispose()
    logger.info("shutdown")


def create_app() -> FastAPI:
    application = FastAPI(
        title="ACSA Self-Evaluation Portal API",
        version=settings.APP_VERSION,
        description="REST API for the ACSA CRVS assessment platform.",
        docs_url="/api/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
        openapi_url="/api/openapi.json" if settings.APP_ENV != "production" else None,
        lifespan=lifespan,
    )

    # Middleware
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(application)

    # Routes
    application.include_router(api_router)

    return application


app = create_app()
