"""Unauthenticated endpoints backing the respondent flow.

Nothing here is creator-scoped: a published form is fillable by anyone holding the
link, which is the point of the shareable public URL.
"""

from typing import Annotated, Union

from fastapi import APIRouter, HTTPException, Path, Request, status
from fastapi.responses import JSONResponse

from app.api.deps import DbSession
from app.schemas.common import AnswerValidationError
from app.schemas.form import PublicForm
from app.schemas.response import ResponseCreated, ResponseSubmit
from app.services import form_service, response_service
from app.services.response_service import SubmissionRejected

router = APIRouter(prefix="/public/forms", tags=["public"])

_UNAVAILABLE = "This form isn't available"

SlugPath = Annotated[str, Path(min_length=1, max_length=80)]


def _load_published(db: DbSession, slug: str):
    form = form_service.get_published_form_by_slug(db, slug)
    if form is None:
        # Unpublished and non-existent slugs are indistinguishable from outside,
        # so an unpublished draft's link cannot be used to probe for its existence.
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=_UNAVAILABLE)
    return form


@router.get(
    "/{slug}",
    response_model=PublicForm,
    summary="Fetch a published form by its public slug",
)
def get_public_form(db: DbSession, slug: SlugPath) -> PublicForm:
    return form_service.to_public(db, _load_published(db, slug))


@router.post(
    "/{slug}/responses",
    response_model=ResponseCreated,
    status_code=status.HTTP_201_CREATED,
    responses={422: {"model": AnswerValidationError, "description": "Answers failed validation"}},
    summary="Submit a response",
)
def submit_response(
    db: DbSession, request: Request, slug: SlugPath, payload: ResponseSubmit
) -> Union[ResponseCreated, JSONResponse]:
    form = _load_published(db, slug)
    try:
        response = response_service.submit_response(
            db, form, payload, user_agent=request.headers.get("user-agent", "")
        )
    except SubmissionRejected as exc:
        # Returned as a plain body rather than an HTTPException so the issue list
        # sits at the top level, matching AnswerValidationError.
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=AnswerValidationError(
                detail="Some answers need attention", issues=exc.issues
            ).model_dump(),
        )

    return ResponseCreated(
        token=response.token,
        submitted_at=response.submitted_at,
        thank_you_heading=form.thank_you_heading,
        thank_you_description=form.thank_you_description,
    )
