import type { AnswerValue } from "@/components/form/AnswerField";
import type { Question } from "@/lib/types";

const REQUIRED_MESSAGE = "Please fill this in";
const REQUIRED_CHOICE_MESSAGE = "Please make a selection";

const SELECTION_TYPES: ReadonlySet<Question["type"]> = new Set([
  "multiple_choice",
  "dropdown",
  "yes_no",
  "rating",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmptyAnswer(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function pretty(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function validateAnswer(question: Question, value: AnswerValue): string | null {
  if (isEmptyAnswer(value)) {
    if (!question.is_required) return null;
    return SELECTION_TYPES.has(question.type) ? REQUIRED_CHOICE_MESSAGE : REQUIRED_MESSAGE;
  }

  switch (question.type) {
    case "short_text":
    case "long_text":
    case "email": {
      if (typeof value !== "string") return "Please enter some text";
      const text = value.trim();
      if (question.max_length !== null && text.length > question.max_length) {
        return `Please keep this under ${question.max_length} characters`;
      }
      if (question.type === "email" && !EMAIL_PATTERN.test(text)) {
        return "Hmm... that email doesn't look right";
      }
      return null;
    }

    case "number": {
      if (typeof value === "boolean") return "Please enter a number";
      const text = typeof value === "string" ? value.trim() : value;
      if (text === "") return "Please enter a number";
      const number = Number(text);
      if (!Number.isFinite(number)) return "Please enter a number";
      if (!question.allow_decimal && !Number.isInteger(number)) {
        return "Please enter a whole number";
      }
      if (question.min_value !== null && number < question.min_value) {
        return `Please enter a number no lower than ${pretty(question.min_value)}`;
      }
      if (question.max_value !== null && number > question.max_value) {
        return `Please enter a number no higher than ${pretty(question.max_value)}`;
      }
      return null;
    }

    case "rating": {
      const outOfRange = `Please choose a rating between 1 and ${question.rating_max}`;
      const rating = typeof value === "string" ? Number(value.trim()) : value;
      if (typeof rating !== "number" || !Number.isInteger(rating)) return outOfRange;
      return rating >= 1 && rating <= question.rating_max ? null : outOfRange;
    }

    case "yes_no":
      return typeof value === "boolean" ? null : REQUIRED_CHOICE_MESSAGE;

    case "multiple_choice":
    case "dropdown": {
      const ids = Array.isArray(value) ? value : [value];
      if (ids.some((id) => typeof id !== "number")) return REQUIRED_CHOICE_MESSAGE;
      if (!question.allow_multiple && ids.length > 1) return "Please select only one option";
      const valid = new Set(question.options.map((option) => option.id));
      if (!ids.every((id) => valid.has(id as number))) {
        return "That option is no longer available — please choose again";
      }
      return null;
    }
  }
}

export function validateAll(
  questions: Question[],
  answers: Record<number, AnswerValue>,
): Record<number, string> {
  const issues: Record<number, string> = {};
  for (const question of questions) {
    const message = validateAnswer(question, answers[question.id] ?? null);
    if (message) issues[question.id] = message;
  }
  return issues;
}
