"""Application configuration via environment variables (pydantic-settings)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_VERSION: str = "0.1.0"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = Field(default="dev-secret-key-change-me")

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://acsa:acsa@localhost:5432/acsa_eval"
    )

    # ── Redis ──────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Keycloak ──────────────────────────────────────────────────────────────
    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "acsa"
    KEYCLOAK_CLIENT_ID: str = "acsa-api"
    KEYCLOAK_CLIENT_SECRET: str = Field(default="")

    @property
    def keycloak_jwks_url(self) -> str:
        return (
            f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}"
            "/protocol/openid-connect/certs"
        )

    @property
    def keycloak_issuer(self) -> str:
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}"

    # ── Object storage ────────────────────────────────────────────────────────
    OBJECT_STORAGE_ENDPOINT: str = "http://localhost:9000"
    OBJECT_STORAGE_ACCESS_KEY: str = "minioadmin"
    OBJECT_STORAGE_SECRET_KEY: str = "minioadmin"
    OBJECT_STORAGE_BUCKET: str = "acsa-evidence"

    # ── ClamAV ────────────────────────────────────────────────────────────────
    CLAMD_HOST: str = "localhost"
    CLAMD_PORT: int = 3310

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── Email ──────────────────────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@acsa.local"

    # ── Validation ────────────────────────────────────────────────────────────
    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.APP_ENV == "production":
            if self.SECRET_KEY == "dev-secret-key-change-me":
                raise ValueError("SECRET_KEY must be set in production")
            if not self.KEYCLOAK_CLIENT_SECRET:
                raise ValueError("KEYCLOAK_CLIENT_SECRET must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
