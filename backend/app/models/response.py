import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utcnow

if TYPE_CHECKING:
    from app.models.form import Form
    from app.models.question import Question, QuestionOption


#: Join table between an answer and the options it selected. Modelled as a bare
#: association table because it carries no data of its own; the composite primary
#: key also prevents the same option being recorded twice for one answer.
answer_options = Table(
    "answer_options",
    Base.metadata,
    Column("answer_id", ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True),
    Column("option_id", ForeignKey("question_options.id", ondelete="CASCADE"), primary_key=True),
)


def _new_token() -> str:
    return uuid.uuid4().hex


class Response(Base):
    """One respondent's submission for a form.

    Rows are created on submit. ``is_complete`` exists so partial-response
    tracking can be layered on by writing rows as the respondent advances,
    without a schema change.
    """

    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False
    )

    #: Opaque public identifier handed back to the respondent, so a response is
    #: never addressed by a guessable sequential id from outside.
    token: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=_new_token, nullable=False
    )

    is_complete: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=None, index=True
    )

    #: Rough completion time in seconds, reported by the client.
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, default=None)
    user_agent: Mapped[str] = mapped_column(String(400), default="", nullable=False)

    form: Mapped["Form"] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Response id={self.id} form_id={self.form_id} complete={self.is_complete}>"


class Answer(Base):
    """A respondent's answer to one question.

    Values live in type-specific columns instead of a single stringified column
    so numeric and boolean answers stay comparable and aggregatable in SQL.
    Choice answers store no value here at all — they point at option rows through
    :data:`answer_options`.
    """

    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_per_question"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False
    )

    value_text: Mapped[Optional[str]] = mapped_column(Text, default=None)
    value_number: Mapped[Optional[float]] = mapped_column(Float, default=None)
    value_bool: Mapped[Optional[bool]] = mapped_column(Boolean, default=None)

    #: Set for rating questions; kept separate from ``value_number`` so a rating
    #: distribution can be aggregated without mixing in free-form numbers.
    value_rating: Mapped[Optional[int]] = mapped_column(Integer, default=None)

    response: Mapped["Response"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(lazy="joined")
    selected_options: Mapped[list["QuestionOption"]] = relationship(
        secondary=answer_options, lazy="selectin", order_by="QuestionOption.position"
    )

    def __repr__(self) -> str:
        return f"<Answer id={self.id} question_id={self.question_id}>"
