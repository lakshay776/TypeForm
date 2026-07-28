from typing import Annotated, Optional, Union

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse

from app.api.deps import CurrentCreator, DbSession, OwnedForm
from app.models import FormStatus
from app.schemas.common import PublishBlocked
from app.schemas.form import FormCreate, FormDetail, FormSummary, FormUpdate
from app.services import form_service
from app.services.form_service import FormNotPublishable, SlugTaken

router = APIRouter(prefix="/forms", tags=["forms"])


def _detail(db: DbSession, form) -> FormDetail:
    return form_service.to_detail(
        db, form, response_count=form_service.count_responses(db, form.id)
    )


@router.get("", response_model=list[FormSummary], summary="List the creator's forms")
def list_forms(
    db: DbSession,
    creator: CurrentCreator,
    status_filter: Annotated[Optional[FormStatus], Query(alias="status")] = None,
    search: Annotated[Optional[str], Query(max_length=120)] = None,
) -> list[FormSummary]:
    return form_service.list_forms(db, creator.id, status=status_filter, search=search)


@router.post(
    "",
    response_model=FormDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a form",
)
def create_form(db: DbSession, creator: CurrentCreator, payload: FormCreate) -> FormDetail:
    form = form_service.create_form(db, creator.id, payload)
    return _detail(db, form)


@router.get("/{form_id}", response_model=FormDetail, summary="Get a form definition")
def get_form(db: DbSession, form: OwnedForm) -> FormDetail:
    return _detail(db, form)


@router.patch(
    "/{form_id}",
    response_model=FormDetail,
    responses={409: {"description": "The requested link is already taken"}},
    summary="Update form settings (title, link, screens, theme)",
)
def update_form(db: DbSession, form: OwnedForm, payload: FormUpdate) -> FormDetail:
    try:
        updated = form_service.update_form(db, form, payload)
    except SlugTaken as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return _detail(db, updated)


@router.post(
    "/{form_id}/duplicate",
    response_model=FormDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate a form definition (without its responses)",
)
def duplicate_form(db: DbSession, form: OwnedForm) -> FormDetail:
    clone = form_service.duplicate_form(db, form)
    return _detail(db, clone)


@router.post(
    "/{form_id}/publish",
    response_model=FormDetail,
    responses={422: {"model": PublishBlocked, "description": "The form is incomplete"}},
    summary="Publish a form and expose its shareable link",
)
def publish_form(db: DbSession, form: OwnedForm) -> Union[FormDetail, JSONResponse]:
    try:
        published = form_service.set_published(db, form, True)
    except FormNotPublishable as exc:
        # Returned as a plain body rather than an HTTPException so `problems` sits
        # at the top level, matching PublishBlocked.
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=PublishBlocked(detail=str(exc), problems=exc.problems).model_dump(),
        )
    return _detail(db, published)


@router.post(
    "/{form_id}/unpublish",
    response_model=FormDetail,
    summary="Unpublish a form, taking its public link offline",
)
def unpublish_form(db: DbSession, form: OwnedForm) -> FormDetail:
    unpublished = form_service.set_published(db, form, False)
    return _detail(db, unpublished)


@router.delete(
    "/{form_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a form and all of its responses",
)
def delete_form(db: DbSession, form: OwnedForm) -> Response:
    form_service.delete_form(db, form)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
