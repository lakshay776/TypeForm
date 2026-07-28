import type { AnswerValue } from "@/components/form/AnswerField";
import type { Question } from "@/lib/types";

/**
 * Client-side answer validation.
 *
 * A deliberate mirror of `backend/app/services/answer_validation.py`. The server
 * is the authority — it re-checks everything and a crafted request cannot get
 * past it — but a respondent should not have to wait for a round trip to be told
 * an email is malformed.
 *
 * The messages are copied verbatim from the backend so the same mistake never
 * produces two different wordings depending on which layer caught it. If a rule
 * changes there, it has to change here.
 */

const REQUIRED_MESSAGE = "Please fill this in";
const REQUIRED_CHOICE_MESSAGE = "Please make a selection";

/** Types whose answer is chosen by clicking rather than typed. */
const SELECTION_TYPES: ReadonlySet<Question["type"]> = new Set([
  "multiple_choice",
  "dropdown",
  "yes_no",
  "rating",
]);

/**
 * Pragmatic email shape check. The server uses a full RFC-aware validator, so
 * anything this lets through is still caught before it is stored; the point here
 * is to catch the obvious "forgot the @" case instantly.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mirrors the backend's `_is_empty`: `false` and `0` are answers, not blanks. */
export function isEmptyAnswer(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Matches the backend's `_pretty`: drop the trailing `.0` on whole numbers. */
function pretty(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

/**
 * Returns the message to show, or `null` when the answer is acceptable.
 *
 * Skipping an optional question is valid, which is why emptiness is checked
 * before anything type-specific.
 */
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
      // Number("") is 0, so an all-whitespace string has to be rejected before
      // the conversion rather than after it.
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

/** Every question that would be rejected, keyed by question id. */
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
