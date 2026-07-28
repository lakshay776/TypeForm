from fastapi import APIRouter

from app.api.deps import CurrentCreator
from app.schemas.common import ORMModel

router = APIRouter(tags=["meta"])


class CreatorOut(ORMModel):
    id: int
    email: str
    name: str


@router.get("/me", response_model=CreatorOut, summary="The acting creator")
def me(creator: CurrentCreator) -> CreatorOut:
    """Returns the stand-in logged-in creator, used by the dashboard header."""
    return creator
