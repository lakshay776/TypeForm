from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response, status

from app.api.deps import DbSession, OwnedForm
from app.schemas.question import (
    QuestionBulkCreate,
    QuestionCreate,
    QuestionOut,
    QuestionReorder,
    QuestionUpdate,
)
from app.services import question_service
from app.services.question_service import (
    InvalidQuestionUpdate,
    QuestionTypeLocked,
    ReorderMismatch,
)

router = APIRouter(prefix="/forms/{form_id}/questions", tags=["questions"])


def _load(db: DbSession, form_id: int, question_id: int):
    question = question_service.get_question(db, form_id, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


@router.get("", response_model=list[QuestionOut], summary="List a form's questions in order")

def list_questions(form: OwnedForm) -> list[QuestionOut]:
    return form.questions


@router.put(
    "/reorder",
    response_model=list[QuestionOut],
    summary="Reorder questions (drag and drop)",
)

def reorder_questions(db: DbSession, form: OwnedForm, payload: QuestionReorder) -> list[QuestionOut]:
    try:
        return question_service.reorder_questions(db, form, payload.question_ids)
    except ReorderMismatch as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/bulk",
    response_model=list[QuestionOut],
    status_code=status.HTTP_201_CREATED,
    summary="Append several questions at once (used by Import questions)",
)

def create_questions(
    db: DbSession, form: OwnedForm, payload: QuestionBulkCreate
) -> list[QuestionOut]:
    return question_service.create_questions(db, form, payload.questions)


@router.post(
    "",
    response_model=QuestionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a question",
)

def create_question(db: DbSession, form: OwnedForm, payload: QuestionCreate) -> QuestionOut:
    return question_service.create_question(db, form, payload)


@router.put(
    "/{question_id}",
    response_model=QuestionOut,
    responses={409: {"description": "The question's type is locked by existing answers"}},
    summary="Update a question",
)

def update_question(
    db: DbSession,
    form: OwnedForm,
    payload: QuestionUpdate,
    question_id: Annotated[int, Path(ge=1)],
) -> QuestionOut:
    question = _load(db, form.id, question_id)
    try:
        return question_service.update_question(db, question, payload)
    except QuestionTypeLocked as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except InvalidQuestionUpdate as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete(
    "/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a question",
)

def delete_question(
    db: DbSession, form: OwnedForm, question_id: Annotated[int, Path(ge=1)]
) -> Response:
    question = _load(db, form.id, question_id)
    question_service.delete_question(db, question)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
