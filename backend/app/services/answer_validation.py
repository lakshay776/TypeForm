"""Server-side validation of submitted answers.

The respondent UI validates the same rules client-side for instant feedback, but
this module is the authority: a form can be submitted with a crafted request, and
the messages produced here are written to be shown directly to a respondent.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from email_validator import EmailNotValidError, validate_email

from app.models import CHOICE_TYPES, TEXT_TYPES, Form, Question, QuestionType
from app.schemas.common import FieldIssue
from app.schemas.response import AnswerIn

REQUIRED_MESSAGE = "Please fill this in"
REQUIRED_CHOICE_MESSAGE = "Please make a selection"

#: Types whose answer is chosen by clicking rather than typed.
SELECTION_TYPES = CHOICE_TYPES | {QuestionType.YES_NO, QuestionType.RATING}


@dataclass
class AnswerDraft:
    """A validated answer, not yet attached to a response row."""

    question_id: int
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_bool: Optional[bool] = None
    value_rating: Optional[int] = None
    option_ids: list[int] = field(default_factory=list)


@dataclass
class ValidationResult:
    drafts: list[AnswerDraft] = field(default_factory=list)
    issues: list[FieldIssue] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.issues


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, tuple, set)):
        return len(value) == 0
    return False


def _as_option_ids(value: Any) -> Optional[list[int]]:
    """Normalise a choice answer to a list of ids, or ``None`` if unparseable."""
    raw = value if isinstance(value, (list, tuple)) else [value]
    ids: list[int] = []
    for item in raw:
        if isinstance(item, bool) or not isinstance(item, (int, str)):
            return None
        try:
            ids.append(int(item))
        except (TypeError, ValueError):
            return None
    # Preserve order while dropping duplicates.
    return list(dict.fromkeys(ids))


def _validate_text(question: Question, value: Any) -> tuple[Optional[AnswerDraft], Optional[str]]:
    if not isinstance(value, str):
        return None, "Please enter some text"
    text = value.strip()

    if question.max_length is not None and len(text) > question.max_length:
        return None, f"Please keep this under {question.max_length} characters"

    if question.type is QuestionType.EMAIL:
        try:
            normalised = validate_email(text, check_deliverability=False).normalized
        except EmailNotValidError:
            return None, "Hmm... that email doesn't look right"
        return AnswerDraft(question_id=question.id, value_text=normalised), None

    return AnswerDraft(question_id=question.id, value_text=text), None


def _validate_number(question: Question, value: Any) -> tuple[Optional[AnswerDraft], Optional[str]]:
    if isinstance(value, bool):
        return None, "Please enter a number"
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value.strip())
        except ValueError:
            return None, "Please enter a number"
    else:
        return None, "Please enter a number"

    if not question.allow_decimal and not number.is_integer():
        return None, "Please enter a whole number"
    if question.min_value is not None and number < question.min_value:
        return None, f"Please enter a number no lower than {_pretty(question.min_value)}"
    if question.max_value is not None and number > question.max_value:
        return None, f"Please enter a number no higher than {_pretty(question.max_value)}"

    return AnswerDraft(question_id=question.id, value_number=number), None


def _validate_yes_no(question: Question, value: Any) -> tuple[Optional[AnswerDraft], Optional[str]]:
    if isinstance(value, bool):
        boolean = value
    elif isinstance(value, str) and value.strip().lower() in {"yes", "no", "true", "false"}:
        boolean = value.strip().lower() in {"yes", "true"}
    else:
        return None, REQUIRED_CHOICE_MESSAGE
    return AnswerDraft(question_id=question.id, value_bool=boolean), None


def _validate_rating(question: Question, value: Any) -> tuple[Optional[AnswerDraft], Optional[str]]:
    out_of_range = f"Please choose a rating between 1 and {question.rating_max}"
    if isinstance(value, bool):
        return None, out_of_range
    if isinstance(value, str):
        try:
            value = int(value.strip())
        except ValueError:
            return None, out_of_range
    if not isinstance(value, int) and not (isinstance(value, float) and value.is_integer()):
        return None, out_of_range

    rating = int(value)
    if not 1 <= rating <= question.rating_max:
        return None, out_of_range
    return AnswerDraft(question_id=question.id, value_rating=rating), None


def _validate_choice(question: Question, value: Any) -> tuple[Optional[AnswerDraft], Optional[str]]:
    ids = _as_option_ids(value)
    if not ids:
        return None, REQUIRED_CHOICE_MESSAGE

    if not question.allow_multiple and len(ids) > 1:
        return None, "Please select only one option"

    valid_ids = {option.id for option in question.options}
    if not set(ids).issubset(valid_ids):
        # Only reachable from a stale client or a crafted request: the option was
        # deleted from the form after the respondent loaded it.
        return None, "That option is no longer available — please choose again"

    return AnswerDraft(question_id=question.id, option_ids=ids), None


_VALIDATORS = {
    QuestionType.NUMBER: _validate_number,
    QuestionType.YES_NO: _validate_yes_no,
    QuestionType.RATING: _validate_rating,
}


def _pretty(number: float) -> str:
    return str(int(number)) if float(number).is_integer() else str(number)


def validate_submission(form: Form, submitted: list[AnswerIn]) -> ValidationResult:
    """Validate every answer against its question, driven by the form definition.

    Iterating over the form's questions rather than the submitted answers is what
    makes missing required answers detectable, and it means unknown or duplicate
    question ids in the payload cannot influence what gets stored.
    """
    result = ValidationResult()
    by_id = {question.id: question for question in form.questions}

    unknown = {answer.question_id for answer in submitted} - set(by_id)
    for question_id in sorted(unknown):
        result.issues.append(
            FieldIssue(question_id=question_id, message="This question is not part of the form")
        )

    # Last write wins if a client sends the same question twice.
    values = {answer.question_id: answer.value for answer in submitted}

    for question in form.questions:
        value = values.get(question.id)

        if _is_empty(value):
            if question.is_required:
                # Types answered by clicking rather than typing get "make a
                # selection": telling someone to "fill this in" when the control
                # is a row of stars reads as the wrong instruction.
                message = (
                    REQUIRED_CHOICE_MESSAGE
                    if question.type in SELECTION_TYPES
                    else REQUIRED_MESSAGE
                )
                result.issues.append(FieldIssue(question_id=question.id, message=message))
            # An empty optional answer is a skip: no row is written, which keeps
            # "skipped" and "answered with an empty string" distinguishable in stats.
            continue

        if question.type in TEXT_TYPES:
            draft, error = _validate_text(question, value)
        elif question.type in CHOICE_TYPES:
            draft, error = _validate_choice(question, value)
        else:
            draft, error = _VALIDATORS[question.type](question, value)

        if error is not None:
            result.issues.append(FieldIssue(question_id=question.id, message=error))
        elif draft is not None:
            result.drafts.append(draft)

    return result
