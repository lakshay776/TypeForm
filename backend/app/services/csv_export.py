import csv
import io

from sqlalchemy.orm import Session

from app.models import Form
from app.services.response_service import all_responses_for_export, display_value

_META_HEADERS = ["Response ID", "Submitted at", "Duration (s)"]


def responses_to_csv(db: Session, form: Form) -> str:
    """Flatten a form's responses into a CSV with one column per question.

    Columns come from the form definition rather than from the answers present,
    so every row has the same width even when respondents skipped questions.
    """
    questions = list(form.questions)
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(_META_HEADERS + [question.title for question in questions])

    for response in all_responses_for_export(db, form.id):
        by_question = {answer.question_id: display_value(answer) for answer in response.answers}
        writer.writerow(
            [
                response.token,
                response.submitted_at.isoformat() if response.submitted_at else "",
                response.duration_seconds if response.duration_seconds is not None else "",
                *(by_question.get(question.id, "") for question in questions),
            ]
        )

    return buffer.getvalue()
