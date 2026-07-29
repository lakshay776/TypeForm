from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import FormStatus

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.response import Response
    from app.models.user import User


class Form(Base):
    """A form definition owned by a creator.

    A form always has a ``slug``; publishing only flips ``status`` and stamps
    ``published_at``. Keeping the slug stable across publish/unpublish cycles
    means a shared link keeps working if a creator republishes.
    """

    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    status: Mapped[FormStatus] = mapped_column(
        Enum(FormStatus, native_enum=False, length=20),
        default=FormStatus.DRAFT,
        nullable=False,
        index=True,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=None)

    # Set when a live form is edited, cleared when those edits are published.
    #
    # Tracked explicitly rather than derived from ``updated_at > published_at``:
    # publishing writes to the form row too, so its own update would bump
    # ``updated_at`` past ``published_at`` by microseconds and the flag would come
    # straight back on. A boolean has no such race.
    has_unpublished_edits: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("0"), nullable=False
    )

    # Welcome screen (shown before the first question).
    #
    # Off by default: a welcome screen is an element the creator opts into from the
    # builder's element picker, not something every new form silently starts with.
    # This is a Python-side default, so existing rows keep whatever they were saved
    # with and no migration is needed.
    show_welcome_screen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    welcome_heading: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    welcome_description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    welcome_button_label: Mapped[str] = mapped_column(String(60), default="Start", nullable=False)

    # Thank-you screen (shown after a successful submission).
    thank_you_heading: Mapped[str] = mapped_column(
        String(255), default="Thanks for completing this typeform", nullable=False
    )
    thank_you_description: Mapped[str] = mapped_column(
        Text, default="Created with Typeform Clone", nullable=False
    )

    owner: Mapped["User"] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Question.position",
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", passive_deletes=True
    )
    theme: Mapped[Optional["FormTheme"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )

    @property
    def is_published(self) -> bool:
        return self.status is FormStatus.PUBLISHED

    def mark_edited(self) -> None:
        """Record that the live version is now behind the builder.

        A no-op on a draft: an unpublished form has nothing live to be behind, and
        flagging one would light up "Publish edits" before it was ever published.
        """
        if self.is_published:
            self.has_unpublished_edits = True

    def __repr__(self) -> str:
        return f"<Form id={self.id} slug={self.slug!r} status={self.status.value}>"


class FormTheme(Base):
    """Per-form visual theme. One row per form, created lazily on first edit.

    Colours are stored as hex strings so the frontend can drop them straight
    into CSS custom properties.
    """

    __tablename__ = "form_themes"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    background_color: Mapped[str] = mapped_column(String(9), default="#FFFFFF", nullable=False)
    question_color: Mapped[str] = mapped_column(String(9), default="#262627", nullable=False)
    answer_color: Mapped[str] = mapped_column(String(9), default="#4B5563", nullable=False)
    button_color: Mapped[str] = mapped_column(String(9), default="#262627", nullable=False)
    button_text_color: Mapped[str] = mapped_column(String(9), default="#FFFFFF", nullable=False)
    font_family: Mapped[str] = mapped_column(String(80), default="Inter", nullable=False)

    form: Mapped["Form"] = relationship(back_populates="theme")

    def __repr__(self) -> str:
        return f"<FormTheme form_id={self.form_id}>"
