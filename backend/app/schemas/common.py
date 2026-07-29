from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base for response models read directly off SQLAlchemy instances."""

    model_config = ConfigDict(from_attributes=True)


class RequestModel(BaseModel):
    """Base for request bodies, rejecting fields the schema doesn't declare."""

    model_config = ConfigDict(extra="forbid")


class Message(BaseModel):
    """Generic acknowledgement payload for endpoints with nothing to return."""

    detail: str


class FieldIssue(BaseModel):
    """A single server-side answer validation failure, addressed by question."""

    question_id: int
    message: str


class PublishBlocked(BaseModel):
    """Body returned with HTTP 422 when a form is not ready to be published."""

    detail: str
    problems: list[str]


class AnswerValidationError(BaseModel):
    """Body returned with HTTP 422 when submitted answers fail validation."""

    detail: str
    issues: list[FieldIssue]
