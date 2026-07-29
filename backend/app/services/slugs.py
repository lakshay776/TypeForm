import secrets

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Form

_MAX_TITLE_PART = 48
_SUFFIX_BYTES = 3


def unique_form_slug(db: Session, title: str) -> str:
    """Build a URL-safe, collision-free slug for a form."""
    base = slugify(title)[:_MAX_TITLE_PART] or "form"
    while True:
        candidate = f"{base}-{secrets.token_hex(_SUFFIX_BYTES)}"
        exists = db.scalar(select(Form.id).where(Form.slug == candidate))
        if exists is None:
            return candidate
