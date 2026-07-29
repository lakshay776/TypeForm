from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Form, User
from app.services import form_service

DbSession = Annotated[Session, Depends(get_db)]


def get_current_creator(db: DbSession) -> User:
    """Resolve the acting creator."""
    user = db.scalars(select(User).where(User.email == settings.default_creator_email)).one_or_none()
    if user is None:
        user = User(email=settings.default_creator_email, name=settings.default_creator_name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

CurrentCreator = Annotated[User, Depends(get_current_creator)]


def get_owned_form(
    db: DbSession,
    creator: CurrentCreator,
    form_id: Annotated[int, Path(ge=1)],
) -> Form:
    """Load a form the acting creator owns, or 404."""
    form = form_service.get_form_for_owner(db, form_id, creator.id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Form not found")
    return form

OwnedForm = Annotated[Form, Depends(get_owned_form)]
