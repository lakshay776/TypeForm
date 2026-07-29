from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import QuestionType

if TYPE_CHECKING:
    from app.models.form import Form


class Question(Base):
    """A single question inside a form."""

    __tablename__ = "questions"
    __table_args__ = (Index("ix_questions_form_position", "form_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False
    )

    type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, native_enum=False, length=32), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    position: Mapped[int] = mapped_column(Integer, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    placeholder: Mapped[str] = mapped_column(String(120), default="", nullable=False)

    max_length: Mapped[Optional[int]] = mapped_column(Integer, default=None)

    min_value: Mapped[Optional[float]] = mapped_column(Float, default=None)
    max_value: Mapped[Optional[float]] = mapped_column(Float, default=None)
    allow_decimal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    rating_max: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    rating_icon: Mapped[str] = mapped_column(String(20), default="star", nullable=False)

    allow_multiple: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    randomize_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    form: Mapped["Form"] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="QuestionOption.position",
    )

    def __repr__(self) -> str:
        return f"<Question id={self.id} type={self.type.value} position={self.position}>"


class QuestionOption(Base):
    """A selectable choice belonging to a multiple-choice or dropdown question."""

    __tablename__ = "question_options"
    __table_args__ = (Index("ix_question_options_question_position", "question_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False
    )

    label: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["Question"] = relationship(back_populates="options")

    def __repr__(self) -> str:
        return f"<QuestionOption id={self.id} label={self.label!r}>"
