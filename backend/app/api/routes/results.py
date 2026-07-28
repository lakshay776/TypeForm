from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, status
from fastapi.responses import PlainTextResponse
from slugify import slugify

from app.api.deps import DbSession, OwnedForm
from app.schemas.response import FormStats, ResponseDetail, ResponsePage
from app.services import csv_export, response_service, stats_service

router = APIRouter(prefix="/forms/{form_id}", tags=["results"])


@router.get(
    "/summary",
    response_model=FormStats,
    summary="Per-question summary statistics",
)
def form_summary(db: DbSession, form: OwnedForm) -> FormStats:
    return stats_service.compute_form_stats(db, form)


@router.get(
    "/responses/export",
    response_class=PlainTextResponse,
    summary="Export all responses as CSV",
)
def export_responses(db: DbSession, form: OwnedForm) -> PlainTextResponse:
    filename = f"{slugify(form.title) or 'responses'}-responses.csv"
    return PlainTextResponse(
        content=csv_export.responses_to_csv(db, form),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/responses", response_model=ResponsePage, summary="List a form's responses")
def list_responses(
    db: DbSession,
    form: OwnedForm,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResponsePage:
    return response_service.list_responses(db, form.id, limit=limit, offset=offset)


@router.get(
    "/responses/{response_id}",
    response_model=ResponseDetail,
    summary="View a single response in full",
)
def get_response(
    db: DbSession, form: OwnedForm, response_id: Annotated[int, Path(ge=1)]
) -> ResponseDetail:
    detail = response_service.get_response_detail(db, form.id, response_id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Response not found")
    return detail
