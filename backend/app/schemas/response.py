from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.enums import QuestionType
from app.schemas.common import ORMModel, RequestModel


class AnswerIn(RequestModel):
    """One submitted answer.

    ``value`` is intentionally untyped at the schema layer. Coercing it here
    would mean Pydantic decides what "not a number" looks like, and its error
    text is not something a respondent should ever read. Instead the value is
    validated against the question's own type and settings in
    :mod:`app.services.answer_validation`, which owns the respondent-facing
    messages. Accepted shapes per type:

    * ``short_text`` / ``long_text`` / ``email`` — string
    * ``number`` — number, or a numeric string
    * ``yes_no`` — boolean
    * ``rating`` — integer between 1 and the question's ``rating_max``
    * ``multiple_choice`` / ``dropdown`` — an option id, or a list of option ids
    * skipped (optional question) — ``null``, ``""`` or ``[]``
    """

    question_id: int
    value: Any = None


class ResponseSubmit(RequestModel):
    answers: list[AnswerIn] = Field(default_factory=list)
    #: Client-reported fill duration, surfaced in the results view.
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86_400)


class ResponseCreated(BaseModel):
    """Returned on successful submission."""

    token: str
    submitted_at: datetime
    thank_you_heading: str
    thank_you_description: str


class AnswerOut(BaseModel):
    """A stored answer, flattened for display.

    ``display_value`` is the single human-readable rendering used by the results
    table, the individual-response view and the CSV export, so those three never
    disagree about how an answer reads.
    """

    question_id: int
    question_title: str
    question_type: QuestionType
    position: int
    display_value: str
    text: Optional[str] = None
    number: Optional[float] = None
    boolean: Optional[bool] = None
    rating: Optional[int] = None
    selected_option_ids: list[int] = Field(default_factory=list)


class ResponseListItem(ORMModel):
    id: int
    token: str
    is_complete: bool
    submitted_at: Optional[datetime]
    duration_seconds: Optional[int]
    #: Answers keyed by question id, so the table can render one column per question.
    answers: dict[int, str] = Field(default_factory=dict)


class ResponseDetail(BaseModel):
    id: int
    token: str
    is_complete: bool
    started_at: datetime
    submitted_at: Optional[datetime]
    duration_seconds: Optional[int]
    answers: list[AnswerOut]


class ResponsePage(BaseModel):
    """Paginated response list plus the column headers the table needs."""

    total: int
    limit: int
    offset: int
    items: list[ResponseListItem]


class OptionCount(BaseModel):
    option_id: int
    label: str
    count: int
    percentage: float


class RatingBucket(BaseModel):
    value: int
    count: int


class QuestionSummary(BaseModel):
    """Per-question aggregate. Only the fields relevant to the type are populated."""

    question_id: int
    type: QuestionType
    title: str
    position: int
    answered_count: int
    skipped_count: int

    option_counts: Optional[list[OptionCount]] = None
    yes_count: Optional[int] = None
    no_count: Optional[int] = None
    average: Optional[float] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    rating_distribution: Optional[list[RatingBucket]] = None
    #: Most recent free-text answers, for text and email questions.
    recent_answers: Optional[list[str]] = None


class FormStats(BaseModel):
    form_id: int
    title: str
    total_responses: int
    completed_responses: int
    completion_rate: float
    average_duration_seconds: Optional[float]
    questions: list[QuestionSummary]
