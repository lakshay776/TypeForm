from fastapi import APIRouter

from app.api.routes import forms, meta, public, questions, results

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(forms.router)
api_router.include_router(questions.router)
api_router.include_router(results.router)
api_router.include_router(public.router)

__all__ = ["api_router"]
