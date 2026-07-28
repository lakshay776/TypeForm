"""Populate the database with demo content.

Run after migrations:

    python -m app.seed

Responses are inserted through :func:`app.services.response_service.submit_response`
rather than written directly, so seeding exercises the same validation path a real
respondent hits — a schema or validation regression fails the seed loudly instead
of quietly producing unreachable data.
"""

from __future__ import annotations

import random
import sys
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine, utcnow
from app.core.config import settings
from app.models import (
    Answer,
    Form,
    FormStatus,
    FormTheme,
    Question,
    QuestionOption,
    QuestionType,
    Response,
    User,
    answer_options,
)
from app.schemas.form import FormCreate, FormUpdate
from app.schemas.question import QuestionCreate, QuestionOptionIn
from app.schemas.response import AnswerIn, ResponseSubmit
from app.services import form_service, response_service

#: Fixed so repeated seeding produces the same demo data.
RNG = random.Random(20260728)


def _options(*labels: str) -> list[QuestionOptionIn]:
    return [QuestionOptionIn(label=label) for label in labels]


# --------------------------------------------------------------------------- #
# Form definitions
# --------------------------------------------------------------------------- #

SATISFACTION_QUESTIONS = [
    QuestionCreate(
        type=QuestionType.SHORT_TEXT,
        title="First off, what's your name?",
        description="So we know who to thank.",
        is_required=True,
        placeholder="Jane Doe",
        max_length=80,
    ),
    QuestionCreate(
        type=QuestionType.EMAIL,
        title="What's your email address?",
        description="We'll only use it to follow up on your feedback.",
        is_required=True,
        placeholder="name@example.com",
    ),
    QuestionCreate(
        type=QuestionType.RATING,
        title="How would you rate your overall experience?",
        is_required=True,
        rating_max=5,
        rating_icon="star",
    ),
    QuestionCreate(
        type=QuestionType.MULTIPLE_CHOICE,
        title="Which of these did you use?",
        description="Select all that apply.",
        is_required=True,
        allow_multiple=True,
        options=_options("Web app", "Mobile app", "API", "Browser extension"),
    ),
    QuestionCreate(
        type=QuestionType.DROPDOWN,
        title="How did you hear about us?",
        is_required=False,
        options=_options("A friend", "Search engine", "Social media", "A newsletter", "Other"),
    ),
    QuestionCreate(
        type=QuestionType.YES_NO,
        title="Would you recommend us to a colleague?",
        is_required=True,
    ),
    QuestionCreate(
        type=QuestionType.LONG_TEXT,
        title="What could we do better?",
        description="Be as blunt as you like — it genuinely helps.",
        is_required=False,
        placeholder="Type your answer here...",
        max_length=1000,
    ),
]

PRODUCT_QUESTIONS = [
    QuestionCreate(
        type=QuestionType.SHORT_TEXT,
        title="Which team are you on?",
        is_required=True,
        placeholder="e.g. Design",
        max_length=60,
    ),
    QuestionCreate(
        type=QuestionType.NUMBER,
        title="How many hours a week do you spend building forms?",
        is_required=True,
        min_value=0,
        max_value=60,
        allow_decimal=False,
    ),
    QuestionCreate(
        type=QuestionType.MULTIPLE_CHOICE,
        title="Which feature should we ship next?",
        is_required=True,
        allow_multiple=False,
        options=_options(
            "Conditional logic jumps",
            "Custom themes",
            "Webhooks & integrations",
            "File upload questions",
        ),
    ),
    QuestionCreate(
        type=QuestionType.RATING,
        title="How likely are you to keep using the builder?",
        is_required=True,
        rating_max=10,
        rating_icon="number",
    ),
    QuestionCreate(
        type=QuestionType.LONG_TEXT,
        title="Anything else on your wishlist?",
        is_required=False,
        placeholder="Type your answer here...",
    ),
]

APPLICATION_QUESTIONS = [
    QuestionCreate(
        type=QuestionType.SHORT_TEXT,
        title="What's your full name?",
        is_required=True,
        placeholder="Jane Doe",
    ),
    QuestionCreate(
        type=QuestionType.EMAIL,
        title="Where can we reach you?",
        is_required=True,
        placeholder="name@example.com",
    ),
    QuestionCreate(
        type=QuestionType.NUMBER,
        title="How many years of frontend experience do you have?",
        is_required=True,
        min_value=0,
        max_value=40,
        allow_decimal=True,
    ),
    QuestionCreate(
        type=QuestionType.DROPDOWN,
        title="Which framework do you reach for first?",
        is_required=True,
        options=_options("React", "Vue", "Svelte", "Angular", "Something else"),
    ),
    QuestionCreate(
        type=QuestionType.YES_NO,
        title="Are you open to hybrid work?",
        is_required=True,
    ),
    QuestionCreate(
        type=QuestionType.LONG_TEXT,
        title="Tell us about something you've shipped that you're proud of.",
        description="A couple of paragraphs is plenty.",
        is_required=True,
        placeholder="Type your answer here...",
        max_length=2000,
    ),
]


# --------------------------------------------------------------------------- #
# Response fixtures
# --------------------------------------------------------------------------- #

NAMES = [
    "Priya Sharma", "Marcus Webb", "Chloe Dubois", "Ravi Menon", "Hannah Kim",
    "Diego Santos", "Amara Okafor", "Tomas Novak", "Leila Haddad", "Ben Whitfield",
    "Yuki Tanaka", "Sofia Rossi",
]

IMPROVEMENTS = [
    "The builder is great, but I'd love keyboard shortcuts for adding questions.",
    "Loading the results page takes a moment when there are lots of responses.",
    "Honestly nothing — the one-question-at-a-time flow is lovely.",
    "More theme presets, please. Building one from scratch is a bit fiddly.",
    "Let me duplicate a single question instead of the whole form.",
    "An email notification when someone submits would close the loop nicely.",
]

TEAMS = ["Design", "Marketing", "Engineering", "People Ops", "Sales", "Research"]

WISHLIST = [
    "Conditional logic would save me maintaining three near-identical forms.",
    "CSV export with the raw option ids, not just the labels.",
    "Dark mode for the builder.",
    "",
]


def _satisfaction_answers(form: Form, index: int) -> list[AnswerIn]:
    q = form.questions
    used = RNG.sample(
        [option.id for option in q[3].options], RNG.randint(1, min(3, len(q[3].options)))
    )
    name = NAMES[index % len(NAMES)]
    return [
        AnswerIn(question_id=q[0].id, value=name),
        AnswerIn(
            question_id=q[1].id,
            value=f"{name.split()[0].lower()}.{name.split()[1].lower()}@example.com",
        ),
        AnswerIn(question_id=q[2].id, value=RNG.choices([5, 4, 3, 2], weights=[8, 7, 3, 1])[0]),
        AnswerIn(question_id=q[3].id, value=used),
        AnswerIn(
            question_id=q[4].id,
            # Left blank sometimes, so the summary shows a real skipped count.
            value=RNG.choice([option.id for option in q[4].options] + [None]),
        ),
        AnswerIn(question_id=q[5].id, value=RNG.choices([True, False], weights=[9, 2])[0]),
        AnswerIn(question_id=q[6].id, value=RNG.choice(IMPROVEMENTS + [""])),
    ]


def _product_answers(form: Form, index: int) -> list[AnswerIn]:
    q = form.questions
    return [
        AnswerIn(question_id=q[0].id, value=TEAMS[index % len(TEAMS)]),
        AnswerIn(question_id=q[1].id, value=RNG.randint(1, 20)),
        AnswerIn(question_id=q[2].id, value=RNG.choice([option.id for option in q[2].options])),
        AnswerIn(question_id=q[3].id, value=RNG.choices(range(6, 11), weights=[1, 2, 4, 6, 5])[0]),
        AnswerIn(question_id=q[4].id, value=RNG.choice(WISHLIST)),
    ]


# --------------------------------------------------------------------------- #
# Seeding
# --------------------------------------------------------------------------- #


def _wipe(db: Session) -> None:
    """Remove existing demo data, children first.

    Explicit deletes in dependency order rather than dropping tables, so the
    schema stays exactly as Alembic left it and the migration history is not
    bypassed.
    """
    db.execute(delete(answer_options))
    for model in (Answer, Response, QuestionOption, Question, FormTheme, Form, User):
        db.execute(delete(model))
    db.commit()


def _creator(db: Session) -> User:
    user = User(email=settings.default_creator_email, name=settings.default_creator_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create(db: Session, owner: User, title: str, questions: list[QuestionCreate]) -> Form:
    return form_service.create_form(db, owner.id, FormCreate(title=title, questions=questions))


def _backdate(db: Session, form: Form, days_ago: int) -> None:
    """Spread submissions over recent days so the results view isn't one timestamp."""
    responses = db.scalars(select(Response).where(Response.form_id == form.id)).all()
    now = utcnow()
    for offset, response in enumerate(responses):
        stamp = now - timedelta(days=days_ago, hours=offset * 5, minutes=RNG.randint(0, 59))
        response.started_at = stamp
        response.submitted_at = stamp + timedelta(seconds=response.duration_seconds or 60)
    db.commit()


def seed() -> None:
    # Safety net for a fresh checkout where migrations have not been run yet.
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        _wipe(db)
        owner = _creator(db)

        satisfaction = _create(db, owner, "Customer Satisfaction Survey", SATISFACTION_QUESTIONS)
        form_service.update_form(
            db,
            satisfaction,
            FormUpdate(
                # Enabled explicitly: new forms have no welcome screen until the
                # creator adds one, so the demo data has to opt in.
                show_welcome_screen=True,
                welcome_heading="How are we doing?",
                welcome_description="Six quick questions — about two minutes.",
                welcome_button_label="Let's go",
                thank_you_heading="Thank you!",
                thank_you_description="Your feedback goes straight to the product team.",
            ),
        )
        form_service.set_published(db, satisfaction, True)

        product = _create(db, owner, "Product Feedback 2026", PRODUCT_QUESTIONS)
        form_service.update_form(
            db,
            product,
            FormUpdate(
                show_welcome_screen=True,
                welcome_heading="Help shape what we build next",
                welcome_description="Five questions. No wrong answers.",
                thank_you_heading="Noted, thank you",
                thank_you_description="We read every single one of these.",
                theme={
                    "background_color": "#0B1B2B",
                    "question_color": "#FFFFFF",
                    "answer_color": "#9CC5E8",
                    "button_color": "#3FA1F5",
                    "button_text_color": "#0B1B2B",
                    "font_family": "Inter",
                },
            ),
        )
        form_service.set_published(db, product, True)

        # Left as a draft so the dashboard shows both statuses.
        _create(db, owner, "Job Application — Frontend Engineer", APPLICATION_QUESTIONS)

        for index in range(12):
            response_service.submit_response(
                db,
                satisfaction,
                ResponseSubmit(
                    answers=_satisfaction_answers(satisfaction, index),
                    duration_seconds=RNG.randint(45, 260),
                ),
                user_agent="Mozilla/5.0 (seed)",
            )
        _backdate(db, satisfaction, days_ago=6)

        for index in range(6):
            response_service.submit_response(
                db,
                product,
                ResponseSubmit(
                    answers=_product_answers(product, index),
                    duration_seconds=RNG.randint(40, 180),
                ),
                user_agent="Mozilla/5.0 (seed)",
            )
        _backdate(db, product, days_ago=2)

        _report(form_service.list_forms(db, owner.id), owner.email)


def _report(forms: list, email: str) -> None:
    """Print a seeding summary. Kept ASCII-only: the default Windows console
    code page (cp1252) raises UnicodeEncodeError on characters like arrows."""
    print(f"Seeded {len(forms)} forms for {email}:")
    for summary in forms:
        link = summary.public_url or "(draft - not published)"
        title = summary.title.encode("ascii", "replace").decode()
        print(
            f"  - {title} [{summary.status.value}] "
            f"{summary.question_count} questions, {summary.response_count} responses -> {link}"
        )


def seed_if_empty() -> bool:
    """Seed only when the database holds no forms. Returns whether it seeded.

    This is what runs on deploy. :func:`seed` deletes everything first, so calling
    it unconditionally at container start would wipe real responses on every
    redeploy — exactly the data the brief requires to persist.
    """
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        existing = db.scalar(select(func.count(Form.id))) or 0

    if existing:
        print(f"Database already has {existing} form(s) — leaving it alone.")
        return False

    seed()
    return True


if __name__ == "__main__":
    # `--if-empty` is for deploys; a bare run is the destructive local reset.
    if "--if-empty" in sys.argv:
        seed_if_empty()
    else:
        seed()
