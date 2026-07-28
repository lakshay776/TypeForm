from enum import Enum


class FormStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class QuestionType(str, Enum):
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    MULTIPLE_CHOICE = "multiple_choice"
    DROPDOWN = "dropdown"
    EMAIL = "email"
    NUMBER = "number"
    YES_NO = "yes_no"
    RATING = "rating"


#: Types whose valid answers come from the question's own option rows.
CHOICE_TYPES: frozenset[QuestionType] = frozenset(
    {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}
)

#: Types stored in ``answers.value_text``.
TEXT_TYPES: frozenset[QuestionType] = frozenset(
    {QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL}
)
