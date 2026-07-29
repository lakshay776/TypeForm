from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.enums import QuestionType
from app.schemas.common import ORMModel, RequestModel


class AnswerIn(RequestModel):
    """One submitted answer."""

    question_id: int
    value: Any = None


class ResponseSubmit(RequestModel):
    answers: list[AnswerIn] = Field(default_factory=list)
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86_400)


class ResponseCreated(BaseModel):
    """Returned on successful submission."""

    token: str
    submitted_at: datetime
    thank_you_heading: str
    thank_you_description: str


class AnswerOut(BaseModel):
    """A stored answer, flattened for display."""

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
    recent_answers: Optional[list[str]] = None


class FormStats(BaseModel):
    form_id: int
    title: str
    total_responses: int
    completed_responses: int
    completion_rate: float
    average_duration_seconds: Optional[float]
    questions: list[QuestionSummary]
