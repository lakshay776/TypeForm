"""Per-question summary statistics for the results view.

Aggregation is pushed into SQL and grouped by question so the whole summary costs
a fixed handful of queries regardless of how many questions or responses a form
has — rather than one query per question.
"""

from collections import defaultdict
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    CHOICE_TYPES,
    TEXT_TYPES,
    Answer,
    Form,
    QuestionOption,
    QuestionType,
    Response,
    answer_options,
)
from app.schemas.response import (
    FormStats,
    OptionCount,
    QuestionSummary,
    RatingBucket,
)

_RECENT_TEXT_LIMIT = 5


def _complete_responses(form_id: int):
    """Subquery of ids of the form's completed responses, reused by every aggregate."""
    return (
        select(Response.id)
        .where(Response.form_id == form_id, Response.is_complete.is_(True))
        .scalar_subquery()
    )


def compute_form_stats(db: Session, form: Form) -> FormStats:
    responses_subq = _complete_responses(form.id)

    total_responses = db.scalar(
        select(func.count(Response.id)).where(Response.form_id == form.id)
    ) or 0
    completed_responses = db.scalar(
        select(func.count(Response.id)).where(
            Response.form_id == form.id, Response.is_complete.is_(True)
        )
    ) or 0
    average_duration = db.scalar(
        select(func.avg(Response.duration_seconds)).where(
            Response.form_id == form.id,
            Response.is_complete.is_(True),
            Response.duration_seconds.is_not(None),
        )
    )

    answered: dict[int, int] = dict(
        db.execute(
            select(Answer.question_id, func.count(Answer.id))
            .where(Answer.response_id.in_(responses_subq))
            .group_by(Answer.question_id)
        ).all()
    )

    option_counts: dict[int, dict[int, int]] = defaultdict(dict)
    option_rows = db.execute(
        select(
            QuestionOption.question_id,
            QuestionOption.id,
            func.count(answer_options.c.answer_id),
        )
        .select_from(QuestionOption)
        .outerjoin(answer_options, answer_options.c.option_id == QuestionOption.id)
        .outerjoin(
            Answer,
            (Answer.id == answer_options.c.answer_id)
            & Answer.response_id.in_(responses_subq),
        )
        .group_by(QuestionOption.question_id, QuestionOption.id)
    ).all()
    for question_id, option_id, count in option_rows:
        option_counts[question_id][option_id] = count

    bool_counts: dict[int, dict[bool, int]] = defaultdict(dict)
    for question_id, value, count in db.execute(
        select(Answer.question_id, Answer.value_bool, func.count(Answer.id))
        .where(Answer.response_id.in_(responses_subq), Answer.value_bool.is_not(None))
        .group_by(Answer.question_id, Answer.value_bool)
    ).all():
        bool_counts[question_id][bool(value)] = count

    rating_counts: dict[int, dict[int, int]] = defaultdict(dict)
    for question_id, value, count in db.execute(
        select(Answer.question_id, Answer.value_rating, func.count(Answer.id))
        .where(Answer.response_id.in_(responses_subq), Answer.value_rating.is_not(None))
        .group_by(Answer.question_id, Answer.value_rating)
    ).all():
        rating_counts[question_id][int(value)] = count

    numeric: dict[int, tuple[float, float, float]] = {
        question_id: (avg, minimum, maximum)
        for question_id, avg, minimum, maximum in db.execute(
            select(
                Answer.question_id,
                func.avg(Answer.value_number),
                func.min(Answer.value_number),
                func.max(Answer.value_number),
            )
            .where(Answer.response_id.in_(responses_subq), Answer.value_number.is_not(None))
            .group_by(Answer.question_id)
        ).all()
    }

    recent_text: dict[int, list[str]] = defaultdict(list)
    for question_id, text in db.execute(
        select(Answer.question_id, Answer.value_text)
        .where(Answer.response_id.in_(responses_subq), Answer.value_text.is_not(None))
        .order_by(Answer.id.desc())
    ).all():
        bucket = recent_text[question_id]
        if len(bucket) < _RECENT_TEXT_LIMIT:
            bucket.append(text)

    summaries: list[QuestionSummary] = []
    for question in form.questions:
        answered_count = answered.get(question.id, 0)
        summary = QuestionSummary(
            question_id=question.id,
            type=question.type,
            title=question.title,
            position=question.position,
            answered_count=answered_count,
            skipped_count=max(completed_responses - answered_count, 0),
        )

        if question.type in CHOICE_TYPES:
            counts = option_counts.get(question.id, {})
            # Percentages are of respondents who answered this question, not of
            # all responses, so a mostly-skipped optional question still reads
            # sensibly. Multi-select answers can therefore sum above 100%.
            denominator = answered_count or 1
            summary.option_counts = [
                OptionCount(
                    option_id=option.id,
                    label=option.label,
                    count=counts.get(option.id, 0),
                    percentage=round(counts.get(option.id, 0) * 100 / denominator, 1),
                )
                for option in question.options
            ]
        elif question.type is QuestionType.YES_NO:
            summary.yes_count = bool_counts.get(question.id, {}).get(True, 0)
            summary.no_count = bool_counts.get(question.id, {}).get(False, 0)
        elif question.type is QuestionType.RATING:
            buckets = rating_counts.get(question.id, {})
            summary.rating_distribution = [
                RatingBucket(value=value, count=buckets.get(value, 0))
                for value in range(1, question.rating_max + 1)
            ]
            total = sum(buckets.values())
            if total:
                summary.average = round(
                    sum(value * count for value, count in buckets.items()) / total, 2
                )
                summary.minimum = float(min(buckets))
                summary.maximum = float(max(buckets))
        elif question.type is QuestionType.NUMBER:
            aggregate = numeric.get(question.id)
            if aggregate is not None:
                average, minimum, maximum = aggregate
                summary.average = round(float(average), 2)
                summary.minimum = float(minimum)
                summary.maximum = float(maximum)
        elif question.type in TEXT_TYPES:
            summary.recent_answers = recent_text.get(question.id, [])

        summaries.append(summary)

    return FormStats(
        form_id=form.id,
        title=form.title,
        total_responses=total_responses,
        completed_responses=completed_responses,
        completion_rate=(
            round(completed_responses * 100 / total_responses, 1) if total_responses else 0.0
        ),
        average_duration_seconds=(
            round(float(average_duration), 1) if average_duration is not None else None
        ),
        questions=summaries,
    )


def average_duration(db: Session, form_id: int) -> Optional[float]:
    value = db.scalar(
        select(func.avg(Response.duration_seconds)).where(
            Response.form_id == form_id, Response.duration_seconds.is_not(None)
        )
    )
    return round(float(value), 1) if value is not None else None
