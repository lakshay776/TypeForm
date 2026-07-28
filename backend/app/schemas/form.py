from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import FormStatus
from app.schemas.common import ORMModel, RequestModel
from app.schemas.question import QuestionCreate, QuestionOut

HEX_COLOR = r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"


class FormThemeUpdate(RequestModel):
    """Partial theme update.

    Every field is optional and only the ones actually sent are applied, so
    changing one colour cannot reset the rest. The defaults live on the
    ``form_themes`` table, which is the single source of truth for them.
    """

    background_color: Optional[str] = Field(default=None, pattern=HEX_COLOR)
    question_color: Optional[str] = Field(default=None, pattern=HEX_COLOR)
    answer_color: Optional[str] = Field(default=None, pattern=HEX_COLOR)
    button_color: Optional[str] = Field(default=None, pattern=HEX_COLOR)
    button_text_color: Optional[str] = Field(default=None, pattern=HEX_COLOR)
    font_family: Optional[str] = Field(default=None, max_length=80)


class FormThemeOut(ORMModel):
    background_color: str
    question_color: str
    answer_color: str
    button_color: str
    button_text_color: str
    font_family: str


class ScreenSettings(RequestModel):
    """Welcome and thank-you screen copy, editable from the builder's settings pane."""

    show_welcome_screen: bool = True
    welcome_heading: str = Field(default="", max_length=255)
    welcome_description: str = Field(default="", max_length=2000)
    welcome_button_label: str = Field(default="Start", max_length=60)
    thank_you_heading: str = Field(default="Thanks for completing this typeform", max_length=255)
    thank_you_description: str = Field(default="Created with Typeform Clone", max_length=2000)


class FormCreate(RequestModel):
    title: str = Field(default="My new form", min_length=1, max_length=255)
    #: Optional starter questions, so "create from template" is one round trip.
    questions: list[QuestionCreate] = Field(default_factory=list)


#: Lowercase words joined by single hyphens — what a URL path segment should be.
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class FormUpdate(RequestModel):
    """Partial update of form-level settings. Omitted fields are left untouched."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)

    #: Changing this rewrites the public link and takes the previous one offline
    #: immediately. Collected responses are unaffected — they reference the form's
    #: id, not its slug.
    slug: Optional[str] = Field(default=None, min_length=3, max_length=80, pattern=SLUG_PATTERN)
    show_welcome_screen: Optional[bool] = None
    welcome_heading: Optional[str] = Field(default=None, max_length=255)
    welcome_description: Optional[str] = Field(default=None, max_length=2000)
    welcome_button_label: Optional[str] = Field(default=None, max_length=60)
    thank_you_heading: Optional[str] = Field(default=None, max_length=255)
    thank_you_description: Optional[str] = Field(default=None, max_length=2000)
    theme: Optional[FormThemeUpdate] = None


class FormSummary(ORMModel):
    """List-row shape for the creator dashboard."""

    id: int
    title: str
    slug: str
    status: FormStatus
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    question_count: int = 0
    response_count: int = 0
    #: Absolute shareable link, present only once the form is published.
    public_url: Optional[str] = None


class FormDetail(FormSummary):
    """Full form definition used by the builder."""

    show_welcome_screen: bool
    welcome_heading: str
    welcome_description: str
    welcome_button_label: str
    thank_you_heading: str
    thank_you_description: str
    questions: list[QuestionOut]
    theme: FormThemeOut


class PublicForm(ORMModel):
    """The respondent-facing projection of a form.

    Deliberately narrower than :class:`FormDetail`: no owner, no counts, no
    timestamps, no numeric id — nothing a respondent has no business seeing.
    """

    slug: str
    title: str
    show_welcome_screen: bool
    welcome_heading: str
    welcome_description: str
    welcome_button_label: str
    thank_you_heading: str
    thank_you_description: str
    questions: list[QuestionOut]
    theme: FormThemeOut
