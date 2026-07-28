from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, overridable via environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Typeform Clone API"
    api_prefix: str = "/api"

    # SQLite by default. Kept as a URL so the app can move to Postgres on a host
    # without a persistent disk, without touching application code.
    database_url: str = "sqlite:///./typeform.db"

    # Comma-separated list of origins allowed to call the API.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Base URL the frontend is served from, used to build shareable public links.
    public_form_base_url: str = "http://localhost:3000/f"

    # Auth is out of scope for this assignment: every creator-scoped request is
    # attributed to this seeded account (see app/api/deps.py).
    default_creator_email: str = "creator@typeformclone.dev"
    default_creator_name: str = "Alex Morgan"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
