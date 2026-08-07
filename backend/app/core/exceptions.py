"""Centralised exception types and FastAPI exception handlers."""

import uuid
from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = structlog.get_logger(__name__)


# ── Domain exceptions ─────────────────────────────────────────────────────────

class ACSAError(Exception):
    """Base class for all ACSA domain errors."""

    http_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, details: list[dict] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or []


class NotFoundError(ACSAError):
    http_status = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"


class ConflictError(ACSAError):
    http_status = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"


class ForbiddenError(ACSAError):
    http_status = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"


class UnauthorizedError(ACSAError):
    http_status = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"


class ValidationError(ACSAError):
    http_status = status.HTTP_400_BAD_REQUEST
    error_code = "VALIDATION_ERROR"


class InvalidStateError(ACSAError):
    http_status = status.HTTP_409_CONFLICT
    error_code = "INVALID_STATE"


# ── Error response builder ────────────────────────────────────────────────────

def _error_response(
    code: str,
    message: str,
    details: list[dict] | None = None,
    trace_id: str | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "trace_id": trace_id or str(uuid.uuid4()),
        }
    }


# ── Handlers ──────────────────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ACSAError)
    async def acsa_error_handler(request: Request, exc: ACSAError) -> JSONResponse:
        trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
        logger.warning(
            "domain_error",
            code=exc.error_code,
            message=exc.message,
            trace_id=trace_id,
        )
        return JSONResponse(
            status_code=exc.http_status,
            content=_error_response(exc.error_code, exc.message, exc.details, trace_id),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
        details = [
            {"field": ".".join(str(l) for l in e["loc"]), "issue": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_response("VALIDATION_ERROR", "Request validation failed", details, trace_id),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
        logger.exception("unhandled_error", trace_id=trace_id, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_response(
                "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again later.",
                trace_id=trace_id,
            ),
        )
