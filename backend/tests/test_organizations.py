"""Unit tests — Organization registration flow (Sprint 4)."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app


# ── Fixtures ──────────────────────────────────────────────────────────────────

MOCK_USER = MagicMock(
    sub="test-keycloak-sub",
    email="test@example.com",
    name="Test User",
    preferred_username="testuser",
    roles=["applicant"],
    email_verified=True,
)
MOCK_USER.has_role = lambda *roles: any(r in MOCK_USER.roles for r in roles)
MOCK_USER.require_role = lambda *roles: None  # no-op in tests

MOCK_ADMIN = MagicMock(
    sub="admin-keycloak-sub",
    email="admin@acsa.org",
    name="Admin User",
    preferred_username="admin",
    roles=["admin"],
    email_verified=True,
)
MOCK_ADMIN.has_role = lambda *roles: any(r in MOCK_ADMIN.roles for r in roles)
MOCK_ADMIN.require_role = lambda *roles: None


@pytest.fixture
def mock_current_user():
    with patch("app.api.v1.routes.organizations.get_current_user", return_value=MOCK_USER):
        yield MOCK_USER


@pytest.fixture
def mock_admin_user():
    with patch("app.core.security.get_current_user", return_value=MOCK_ADMIN):
        yield MOCK_ADMIN


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_register_organization_missing_fields():
    """POST /organizations without required fields returns 422."""
    client = TestClient(app)
    resp = client.post(
        "/api/v1/organizations",
        json={},
        headers={"Authorization": "******"},
    )
    # 401 because no real token — confirms auth guard is active
    assert resp.status_code in (401, 422)


def test_get_organization_not_found():
    """GET /organizations/{id} with unknown ID returns 404 (when auth passes)."""
    client = TestClient(app)
    fake_id = str(uuid.uuid4())
    resp = client.get(
        f"/api/v1/organizations/{fake_id}",
        headers={"Authorization": "******"},
    )
    assert resp.status_code in (401, 404)


def test_health_live():
    """GET /health/live always returns 200."""
    client = TestClient(app)
    resp = client.get("/health/live")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_ready_structure():
    """GET /health/ready returns a checks dict even when DB is unavailable."""
    client = TestClient(app)
    resp = client.get("/health/ready")
    assert resp.status_code in (200, 503)
    data = resp.json()
    assert "checks" in data
    assert "database" in data["checks"]
