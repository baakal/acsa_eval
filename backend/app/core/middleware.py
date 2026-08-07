"""Request middleware: inject trace_id, log requests."""

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a trace_id to every request and log response time."""

    async def dispatch(self, request: Request, call_next) -> Response:
        trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
        request.state.trace_id = trace_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["X-Trace-Id"] = trace_id

        logger.info(
            "request",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response
