from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Backend for a Typeform clone.\n\n"
        "* **Creator endpoints** (`/api/forms/...`) act as the single configured "
        "creator; see `app/api/deps.py`.\n"
        "* **Public endpoints** (`/api/public/...`) back the respondent flow and "
        "require no authentication."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health", tags=["meta"], summary="Liveness probe")

def health() -> dict[str, str]:
    return {"status": "ok"}
