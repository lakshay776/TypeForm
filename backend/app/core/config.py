from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, overridable via environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Typeform Clone API"
    api_prefix: str = "/api"

    database_url: str = "sqlite:///./typeform.db"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    public_form_base_url: str = "http://localhost:3000/f"

    default_creator_email: str = "creator@typeformclone.dev"
    default_creator_name: str = "Alex Morgan"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache

def get_settings() -> Settings:
    return Settings()

settings = get_settings()
