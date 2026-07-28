from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.enums import CHOICE_TYPES, QuestionType
from app.schemas.common import ORMModel, RequestModel


class QuestionOptionIn(RequestModel):
    """An option as submitted by the builder.

    ``id`` is echoed back for options that already exist so an edit can update
    them in place instead of deleting and recreating — which would orphan the
    answers that reference them.

    An empty label is accepted deliberately: the builder creates a choice question
    with blank options for the creator to type into, so rejecting them here would
    make adding a choice question impossible. A blank option is instead caught at
    publish time, where it actually matters — see
    :func:`app.services.form_service.publish_blockers`.
    """

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

    #: Where to insert the question. ``None`` appends to the end of the form.
    position: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _choice_questions_need_options(self) -> "QuestionCreate":
        if self.type in CHOICE_TYPES and not self.options:
            # The builder creates choice questions with two blank options, so an
            # empty list here means a malformed client request.
            raise ValueError(f"{self.type.value} questions require at least one option")
        return self


class QuestionUpdate(QuestionBase):
    """Full replacement of a question's editable fields.

    The builder holds the whole question in local state and PUTs it back, so a
    PATCH-style partial update would add ambiguity without removing any work.

    ``type`` may be changed only while the question has no answers. Once a
    respondent has answered it, the stored values live in type-specific columns
    that a new type would not read — so the change is refused with a 409 rather
    than silently orphaning the data. Omitting the field leaves the type alone.
    """

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
    """Several questions appended in one request.

    Backs the builder's "Import questions" panel, where a creator pastes a list of
    titles. Any ``position`` in the payload is ignored: importing a list means
    appending in the order given, and honouring per-item positions would make the
    result depend on the order the items happened to be inserted.
    """

    questions: list[QuestionCreate] = Field(min_length=1, max_length=100)


class QuestionReorder(RequestModel):
    """New ordering for a form's questions, as a full list of question ids."""

    question_ids: list[int] = Field(min_length=1)
