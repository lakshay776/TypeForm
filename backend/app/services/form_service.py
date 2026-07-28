from typing import Optional

from sqlalchemy import Select, and_, distinct, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import utcnow
from app.models import (
    CHOICE_TYPES,
    Form,
    FormStatus,
    FormTheme,
    Question,
    QuestionOption,
    Response,
)
from app.schemas.form import FormCreate, FormDetail, FormSummary, FormUpdate, PublicForm
from app.services.question_service import create_question
from app.services.slugs import unique_form_slug


def _loaded_form_query() -> Select:
    """Base query that eager-loads everything the builder view needs."""
    return select(Form).options(
        selectinload(Form.questions).selectinload(Question.options),
        selectinload(Form.theme),
    )


def get_form_for_owner(db: Session, form_id: int, owner_id: int) -> Optional[Form]:
    return db.scalars(
        _loaded_form_query().where(Form.id == form_id, Form.owner_id == owner_id)
    ).unique().one_or_none()


def get_published_form_by_slug(db: Session, slug: str) -> Optional[Form]:
    return db.scalars(
        _loaded_form_query().where(Form.slug == slug, Form.status == FormStatus.PUBLISHED)
    ).unique().one_or_none()


def ensure_theme(db: Session, form: Form) -> FormTheme:
    """Return the form's theme, creating the default row on first access.

    Themes are created lazily so that every form does not carry a theme row it
    never diverges from, while API consumers can still rely on ``theme`` always
    being present in responses.
    """
    if form.theme is None:
        form.theme = FormTheme(form_id=form.id)
        db.flush()
    return form.theme


def public_url(form: Form) -> Optional[str]:
    if not form.is_published:
        return None
    return f"{settings.public_form_base_url.rstrip('/')}/{form.slug}"


# --------------------------------------------------------------------------- #
# Serialisation
# --------------------------------------------------------------------------- #


def to_summary(form: Form, *, question_count: int, response_count: int) -> FormSummary:
    return FormSummary(
        id=form.id,
        title=form.title,
        slug=form.slug,
        status=form.status,
        published_at=form.published_at,
        created_at=form.created_at,
        updated_at=form.updated_at,
        question_count=question_count,
        response_count=response_count,
        public_url=public_url(form),
    )


def to_detail(db: Session, form: Form, *, response_count: int) -> FormDetail:
    theme = ensure_theme(db, form)
    return FormDetail(
        **to_summary(
            form, question_count=len(form.questions), response_count=response_count
        ).model_dump(),
        show_welcome_screen=form.show_welcome_screen,
        welcome_heading=form.welcome_heading,
        welcome_description=form.welcome_description,
        welcome_button_label=form.welcome_button_label,
        thank_you_heading=form.thank_you_heading,
        thank_you_description=form.thank_you_description,
        questions=form.questions,
        theme=theme,
    )


def to_public(db: Session, form: Form) -> PublicForm:
    return PublicForm.model_validate(
        {
            "slug": form.slug,
            "title": form.title,
            "show_welcome_screen": form.show_welcome_screen,
            "welcome_heading": form.welcome_heading or form.title,
            "welcome_description": form.welcome_description,
            "welcome_button_label": form.welcome_button_label,
            "thank_you_heading": form.thank_you_heading,
            "thank_you_description": form.thank_you_description,
            "questions": form.questions,
            "theme": ensure_theme(db, form),
        }
    )


# --------------------------------------------------------------------------- #
# Queries
# --------------------------------------------------------------------------- #


def count_responses(db: Session, form_id: int) -> int:
    return db.scalar(
        select(func.count(Response.id)).where(
            Response.form_id == form_id, Response.is_complete.is_(True)
        )
    ) or 0


def list_forms(
    db: Session,
    owner_id: int,
    *,
    status: Optional[FormStatus] = None,
    search: Optional[str] = None,
) -> list[FormSummary]:
    """Dashboard listing with question and response counts in a single query.

    ``count(distinct ...)`` is required because joining both questions and
    responses multiplies the rows; distinct collapses that back to real counts.
    """
    stmt = (
        select(
            Form,
            func.count(distinct(Question.id)).label("question_count"),
            func.count(distinct(Response.id)).label("response_count"),
        )
        .outerjoin(Question, Question.form_id == Form.id)
        .outerjoin(
            Response,
            and_(Response.form_id == Form.id, Response.is_complete.is_(True)),
        )
        .where(Form.owner_id == owner_id)
        .group_by(Form.id)
        .order_by(Form.updated_at.desc())
    )

    if status is not None:
        stmt = stmt.where(Form.status == status)
    if search:
        stmt = stmt.where(Form.title.ilike(f"%{search.strip()}%"))

    return [
        to_summary(form, question_count=q_count, response_count=r_count)
        for form, q_count, r_count in db.execute(stmt).all()
    ]


# --------------------------------------------------------------------------- #
# Mutations
# --------------------------------------------------------------------------- #


def create_form(db: Session, owner_id: int, payload: FormCreate) -> Form:
    form = Form(
        owner_id=owner_id,
        title=payload.title,
        slug=unique_form_slug(db, payload.title),
        status=FormStatus.DRAFT,
        welcome_heading=payload.title,
    )
    db.add(form)
    db.flush()

    for question in payload.questions:
        create_question(db, form, question)

    ensure_theme(db, form)
    db.commit()
    db.refresh(form)
    return form


class SlugTaken(Exception):
    """Raised when a requested slug already belongs to another form."""


def update_form(db: Session, form: Form, payload: FormUpdate) -> Form:
    data = payload.model_dump(exclude_unset=True, exclude={"theme"})

    # Checked before anything is written, so a rejected slug leaves the rest of the
    # payload unapplied rather than half-saving the update.
    requested_slug = data.pop("slug", None)
    if requested_slug is not None and requested_slug != form.slug:
        clash = db.scalar(
            select(Form.id).where(Form.slug == requested_slug, Form.id != form.id)
        )
        if clash is not None:
            raise SlugTaken(f"“{requested_slug}” is already taken. Try another link.")
        form.slug = requested_slug

    for field, value in data.items():
        setattr(form, field, value)

    if payload.theme is not None:
        theme = ensure_theme(db, form)
        for field, value in payload.theme.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(theme, field, value)

    db.commit()
    db.refresh(form)
    return form


def duplicate_form(db: Session, form: Form) -> Form:
    """Deep-copy a form definition. Responses are never copied."""
    title = f"{form.title} (copy)"
    clone = Form(
        owner_id=form.owner_id,
        title=title,
        slug=unique_form_slug(db, title),
        status=FormStatus.DRAFT,
        show_welcome_screen=form.show_welcome_screen,
        welcome_heading=form.welcome_heading,
        welcome_description=form.welcome_description,
        welcome_button_label=form.welcome_button_label,
        thank_you_heading=form.thank_you_heading,
        thank_you_description=form.thank_you_description,
    )
    db.add(clone)
    db.flush()

    for question in form.questions:
        copied = Question(
            form_id=clone.id,
            type=question.type,
            title=question.title,
            description=question.description,
            position=question.position,
            is_required=question.is_required,
            placeholder=question.placeholder,
            max_length=question.max_length,
            min_value=question.min_value,
            max_value=question.max_value,
            allow_decimal=question.allow_decimal,
            rating_max=question.rating_max,
            rating_icon=question.rating_icon,
            allow_multiple=question.allow_multiple,
            randomize_options=question.randomize_options,
        )
        db.add(copied)
        db.flush()
        for option in question.options:
            db.add(
                QuestionOption(
                    question_id=copied.id, label=option.label, position=option.position
                )
            )

    if form.theme is not None:
        db.add(
            FormTheme(
                form_id=clone.id,
                background_color=form.theme.background_color,
                question_color=form.theme.question_color,
                answer_color=form.theme.answer_color,
                button_color=form.theme.button_color,
                button_text_color=form.theme.button_text_color,
                font_family=form.theme.font_family,
            )
        )
    else:
        ensure_theme(db, clone)

    db.commit()
    db.refresh(clone)
    return clone


class FormNotPublishable(Exception):
    """Raised when a form is not in a state that can be shared publicly."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("This form isn't ready to publish yet")
        self.problems = problems


def publish_blockers(form: Form) -> list[str]:
    """Everything preventing this form from going live.

    The builder deliberately allows a half-finished form to be saved — you cannot
    type a question title without first creating an empty one. Publishing is
    therefore the point where completeness is enforced, rather than every write.
    """
    problems: list[str] = []

    if not form.questions:
        problems.append("Add at least one question.")

    for question in form.questions:
        number = question.position + 1
        if not question.title.strip():
            problems.append(f"Question {number} needs a title.")

        if question.type in CHOICE_TYPES:
            if not question.options:
                problems.append(f"Question {number} needs at least one option.")
            elif any(not option.label.strip() for option in question.options):
                problems.append(f"Question {number} has an option with no label.")

    return problems


def set_published(db: Session, form: Form, published: bool) -> Form:
    if published:
        problems = publish_blockers(form)
        if problems:
            raise FormNotPublishable(problems)

        form.status = FormStatus.PUBLISHED
        # Stamped only on first publish so the dashboard can show when a form
        # originally went live, not when it was last toggled.
        form.published_at = form.published_at or utcnow()
    else:
        form.status = FormStatus.DRAFT
    db.commit()
    db.refresh(form)
    return form


def delete_form(db: Session, form: Form) -> None:
    db.delete(form)
    db.commit()
