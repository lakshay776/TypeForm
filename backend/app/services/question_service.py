from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import CHOICE_TYPES, Answer, Form, Question, QuestionOption, QuestionType
from app.schemas.question import QuestionCreate, QuestionOptionIn, QuestionUpdate

_SCALAR_FIELDS = (
    "title",
    "description",
    "is_required",
    "placeholder",
    "max_length",
    "min_value",
    "max_value",
    "allow_decimal",
    "rating_max",
    "rating_icon",
    "allow_multiple",
    "randomize_options",
)


class ReorderMismatch(ValueError):
    """Raised when a reorder payload does not cover exactly the form's questions."""


class QuestionTypeLocked(Exception):
    """Raised when a question's type is changed after it has collected answers."""


class InvalidQuestionUpdate(ValueError):
    """Raised when an update would leave a question in an unusable state."""


def answer_count(db: Session, question_id: int) -> int:
    return db.scalar(
        select(func.count(Answer.id)).where(Answer.question_id == question_id)
    ) or 0


def get_question(db: Session, form_id: int, question_id: int) -> Optional[Question]:
    return db.scalars(
        select(Question)
        .options(selectinload(Question.options))
        .where(Question.id == question_id, Question.form_id == form_id)
    ).one_or_none()


def _ordered_questions(db: Session, form_id: int) -> list[Question]:
    return list(
        db.scalars(
            select(Question).where(Question.form_id == form_id).order_by(Question.position)
        ).all()
    )


def _renumber(questions: list[Question]) -> None:
    """Rewrite positions to a dense 0..n-1 sequence.

    Positions are always normalised after any structural change, so no gaps or
    duplicates can accumulate and the frontend can treat position as an index.
    """
    for index, question in enumerate(questions):
        question.position = index


def _sync_options(db: Session, question: Question, incoming: list[QuestionOptionIn]) -> None:
    """Reconcile a question's options against the builder's list.

    Options are matched by id and updated in place. Deleting and recreating them
    would cascade away the ``answer_options`` rows of every response already
    collected, silently destroying results data on a label typo fix.
    """
    existing = {option.id: option for option in question.options}
    seen: set[int] = set()

    for position, item in enumerate(incoming):
        option = existing.get(item.id) if item.id is not None else None
        if option is not None:
            option.label = item.label
            option.position = position
            seen.add(option.id)
        else:
            db.add(
                QuestionOption(question_id=question.id, label=item.label, position=position)
            )

    for option_id, option in existing.items():
        if option_id not in seen:
            db.delete(option)


def create_question(db: Session, form: Form, payload: QuestionCreate) -> Question:
    """Insert a question, optionally at a specific position."""
    siblings = _ordered_questions(db, form.id)

    question = Question(
        form_id=form.id,
        type=payload.type,
        position=len(siblings),  # provisional; corrected by _renumber below
        **{field: getattr(payload, field) for field in _SCALAR_FIELDS},
    )

    insert_at = len(siblings) if payload.position is None else min(payload.position, len(siblings))
    siblings.insert(insert_at, question)
    db.add(question)
    _renumber(siblings)
    db.flush()

    if payload.type in CHOICE_TYPES:
        _sync_options(db, question, payload.options)

    form.mark_edited()
    db.commit()
    db.refresh(question)
    return question


def create_questions(db: Session, form: Form, payloads: list[QuestionCreate]) -> list[Question]:
    """Append several questions in a single transaction.

    One commit for the whole batch rather than per question: importing twenty
    pasted titles should either all land or none of them should, and it avoids
    twenty round trips from the builder.
    """
    siblings = _ordered_questions(db, form.id)
    created: list[Question] = []

    for payload in payloads:
        question = Question(
            form_id=form.id,
            type=payload.type,
            position=len(siblings),
            **{field: getattr(payload, field) for field in _SCALAR_FIELDS},
        )
        db.add(question)
        siblings.append(question)
        created.append(question)

    _renumber(siblings)
    # Flushed before options so every question has an id to attach them to.
    db.flush()

    for question, payload in zip(created, payloads, strict=True):
        if question.type in CHOICE_TYPES:
            _sync_options(db, question, payload.options)

    form.mark_edited()
    db.commit()
    for question in created:
        db.refresh(question)
    return created


def update_question(db: Session, question: Question, payload: QuestionUpdate) -> Question:
    target_type = payload.type or question.type

    if target_type is not question.type:
        # Answers are stored in columns specific to the old type, so a change
        # would leave them unreadable. Refuse rather than orphan real data.
        if answer_count(db, question.id) > 0:
            raise QuestionTypeLocked(
                "This question already has answers, so its type can no longer be changed. "
                "Delete it and add a new question instead."
            )
        question.type = target_type

    if target_type in CHOICE_TYPES and not payload.options:
        raise InvalidQuestionUpdate(f"{target_type.value} questions need at least one option")

    for field in _SCALAR_FIELDS:
        setattr(question, field, getattr(payload, field))

    if target_type in CHOICE_TYPES:
        _sync_options(db, question, payload.options)
    else:
        # Switching away from a choice type leaves options that nothing can
        # reference; drop them so the question isn't carrying dead rows.
        for option in list(question.options):
            db.delete(option)

    question.form.mark_edited()
    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question: Question) -> None:
    form_id = question.form_id
    question.form.mark_edited()
    db.delete(question)
    db.flush()
    _renumber(_ordered_questions(db, form_id))
    db.commit()


def reorder_questions(db: Session, form: Form, question_ids: list[int]) -> list[Question]:
    """Apply a new ordering given the complete list of question ids.

    The payload must be a permutation of the form's questions: accepting a
    partial list would leave the remaining positions ambiguous, and silently
    ignoring unknown ids would hide a stale-client bug.
    """
    questions = {question.id: question for question in _ordered_questions(db, form.id)}

    if len(question_ids) != len(questions) or set(question_ids) != set(questions):
        raise ReorderMismatch(
            "question_ids must contain exactly the ids of this form's questions"
        )

    _renumber([questions[question_id] for question_id in question_ids])
    form.mark_edited()
    db.commit()
    return _ordered_questions(db, form.id)
