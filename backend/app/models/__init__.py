"""SQLAlchemy models.

Every model is re-exported here so that importing :mod:`app.models` is enough to
register the full metadata with :class:`~app.core.database.Base` — which Alembic's
autogenerate and the seed script both rely on.
"""

from app.models.enums import CHOICE_TYPES, TEXT_TYPES, FormStatus, QuestionType
from app.models.form import Form, FormTheme
from app.models.question import Question, QuestionOption
from app.models.response import Answer, Response, answer_options
from app.models.user import User

__all__ = [
    "CHOICE_TYPES",
    "TEXT_TYPES",
    "Answer",
    "Form",
    "FormStatus",
    "FormTheme",
    "Question",
    "QuestionOption",
    "QuestionType",
    "Response",
    "User",
    "answer_options",
]
