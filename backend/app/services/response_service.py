from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import utcnow
from app.models import Answer, Form, Question, QuestionType, Response
from app.schemas.common import FieldIssue
from app.schemas.response import (
    AnswerOut,
    ResponseDetail,
    ResponseListItem,
    ResponsePage,
    ResponseSubmit,
)
from app.services.answer_validation import validate_submission


class SubmissionRejected(Exception):
    """Raised when submitted answers fail server-side validation."""

    def __init__(self, issues: list[FieldIssue]) -> None:
        super().__init__("Some answers need attention")
        self.issues = issues


def display_value(answer: Answer) -> str:
    """Render an answer as the single string used by the table, detail view and CSV."""
    question = answer.question

    if question.type in {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}:
        return ", ".join(option.label for option in answer.selected_options)
    if question.type is QuestionType.YES_NO:
        if answer.value_bool is None:
            return ""
        return "Yes" if answer.value_bool else "No"
    if question.type is QuestionType.RATING:
        if answer.value_rating is None:
            return ""
        return f"{answer.value_rating}/{question.rating_max}"
    if question.type is QuestionType.NUMBER:
        if answer.value_number is None:
            return ""
        number = answer.value_number
        return str(int(number)) if float(number).is_integer() else str(number)
    return answer.value_text or ""


def _to_answer_out(answer: Answer) -> AnswerOut:
    return AnswerOut(
        question_id=answer.question_id,
        question_title=answer.question.title,
        question_type=answer.question.type,
        position=answer.question.position,
        display_value=display_value(answer),
        text=answer.value_text,
        number=answer.value_number,
        boolean=answer.value_bool,
        rating=answer.value_rating,
        selected_option_ids=[option.id for option in answer.selected_options],
    )


def submit_response(
    db: Session, form: Form, payload: ResponseSubmit, *, user_agent: str = ""
) -> Response:
    """Validate and persist a respondent's submission.

    Nothing is written unless every answer validates, so a rejected submission
    never leaves a partial row behind for the creator to puzzle over.
    """
    result = validate_submission(form, payload.answers)
    if not result.ok:
        raise SubmissionRejected(result.issues)

    options_by_id = {
        option.id: option for question in form.questions for option in question.options
    }

    response = Response(
        form_id=form.id,
        is_complete=True,
        submitted_at=utcnow(),
        duration_seconds=payload.duration_seconds,
        user_agent=user_agent[:400],
    )
    db.add(response)
    db.flush()

    for draft in result.drafts:
        answer = Answer(
            response_id=response.id,
            question_id=draft.question_id,
            value_text=draft.value_text,
            value_number=draft.value_number,
            value_bool=draft.value_bool,
            value_rating=draft.value_rating,
        )
        answer.selected_options = [options_by_id[option_id] for option_id in draft.option_ids]
        db.add(answer)

    db.commit()
    db.refresh(response)
    return response


def _response_query(form_id: int):
    return (
        select(Response)
        .where(Response.form_id == form_id, Response.is_complete.is_(True))
        .options(
            selectinload(Response.answers)
            .selectinload(Answer.question)
            .selectinload(Question.options)
        )
        # Newest first, with id as a tiebreaker so pagination is stable when
        # several responses share a timestamp (as seeded data does).
        .order_by(Response.submitted_at.desc(), Response.id.desc())
    )


def list_responses(db: Session, form_id: int, *, limit: int, offset: int) -> ResponsePage:
    total = db.scalar(
        select(func.count(Response.id)).where(
            Response.form_id == form_id, Response.is_complete.is_(True)
        )
    ) or 0

    responses = db.scalars(_response_query(form_id).limit(limit).offset(offset)).unique().all()

    items = [
        ResponseListItem(
            id=response.id,
            token=response.token,
            is_complete=response.is_complete,
            submitted_at=response.submitted_at,
            duration_seconds=response.duration_seconds,
            answers={answer.question_id: display_value(answer) for answer in response.answers},
        )
        for response in responses
    ]
    return ResponsePage(total=total, limit=limit, offset=offset, items=items)


def get_response_detail(db: Session, form_id: int, response_id: int) -> Optional[ResponseDetail]:
    response = (
        db.scalars(_response_query(form_id).where(Response.id == response_id)).unique().one_or_none()
    )
    if response is None:
        return None

    answers = sorted((_to_answer_out(answer) for answer in response.answers), key=lambda a: a.position)
    return ResponseDetail(
        id=response.id,
        token=response.token,
        is_complete=response.is_complete,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        duration_seconds=response.duration_seconds,
        answers=answers,
    )


def all_responses_for_export(db: Session, form_id: int) -> list[Response]:
    return list(db.scalars(_response_query(form_id)).unique().all())
