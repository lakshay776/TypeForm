from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.enums import CHOICE_TYPES, QuestionType
from app.schemas.common import ORMModel, RequestModel


class QuestionOptionIn(RequestModel):
    """An option as submitted by the builder."""

    id: Optional[int] = None
    label: str = Field(default="", max_length=500)


class QuestionOptionOut(ORMModel):
    id: int
    label: str
    position: int


class QuestionBase(RequestModel):
    title: str = Field(default="", max_length=2000)
    description: str = Field(default="", max_length=2000)
    is_required: bool = False
    placeholder: str = Field(default="", max_length=120)

    max_length: Optional[int] = Field(default=None, ge=1, le=10_000)

    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allow_decimal: bool = False

    rating_max: int = Field(default=5, ge=2, le=10)
    rating_icon: str = Field(default="star", pattern="^(star|heart|thumb|number)$")

    allow_multiple: bool = False
    randomize_options: bool = False

    options: list[QuestionOptionIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_number_bounds(self) -> "QuestionBase":
        if (
            self.min_value is not None
            and self.max_value is not None
            and self.min_value > self.max_value
        ):
            raise ValueError("min_value cannot be greater than max_value")
        return self


class QuestionCreate(QuestionBase):
    type: QuestionType

    position: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _choice_questions_need_options(self) -> "QuestionCreate":
        if self.type in CHOICE_TYPES and not self.options:
            raise ValueError(f"{self.type.value} questions require at least one option")
        return self


class QuestionUpdate(QuestionBase):
    """Full replacement of a question's editable fields."""

    type: Optional[QuestionType] = None


class QuestionOut(ORMModel):
    id: int
    form_id: int
    type: QuestionType
    title: str
    description: str
    position: int
    is_required: bool
    placeholder: str
    max_length: Optional[int]
    min_value: Optional[float]
    max_value: Optional[float]
    allow_decimal: bool
    rating_max: int
    rating_icon: str
    allow_multiple: bool
    randomize_options: bool
    options: list[QuestionOptionOut]


class QuestionBulkCreate(RequestModel):
    """Several questions appended in one request."""

    questions: list[QuestionCreate] = Field(min_length=1, max_length=100)


class QuestionReorder(RequestModel):
    """New ordering for a form's questions, as a full list of question ids."""

    question_ids: list[int] = Field(min_length=1)
