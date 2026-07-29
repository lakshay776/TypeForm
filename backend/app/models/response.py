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

answer_options = Table(
    "answer_options",
    Base.metadata,
    Column("answer_id", ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True),
    Column("option_id", ForeignKey("question_options.id", ondelete="CASCADE"), primary_key=True),
)


def _new_token() -> str:
    return uuid.uuid4().hex


class Response(Base):
    """One respondent's submission for a form."""

    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False
    )

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

    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, default=None)
    user_agent: Mapped[str] = mapped_column(String(400), default="", nullable=False)

    form: Mapped["Form"] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Response id={self.id} form_id={self.form_id} complete={self.is_complete}>"


class Answer(Base):
    """A respondent's answer to one question."""

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

    value_rating: Mapped[Optional[int]] = mapped_column(Integer, default=None)

    response: Mapped["Response"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(lazy="joined")
    selected_options: Mapped[list["QuestionOption"]] = relationship(
        secondary=answer_options, lazy="selectin", order_by="QuestionOption.position"
    )

    def __repr__(self) -> str:
        return f"<Answer id={self.id} question_id={self.question_id}>"
