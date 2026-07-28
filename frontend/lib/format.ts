import clsx, { type ClassValue } from "clsx";

/** Conditional className joining. Thin alias so components read cleanly. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * "Jul 28, 2026" — matching the Updated column.
 *
 * Pinned to en-US and UTC rather than the visitor's locale: the backend sends
 * UTC, and letting the browser localise would make the server-rendered and
 * client-rendered output disagree, which React reports as a hydration error.
 */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * What to show where a question has no title yet.
 *
 * A question can be saved before it is worded — the builder has to create it before
 * you can type into it — so every surface that displays a title needs a stand-in.
 * One helper so the pages panel, canvas, respondent flow, summary, responses table
 * and CSV can't disagree about what an untitled question looks like.
 */
export const UNTITLED_QUESTION = "…";

export function questionLabel(title: string): string {
  return title.trim() || UNTITLED_QUESTION;
}

/** Dashes for zero, so an untouched form reads as empty rather than "0". */
export function formatCount(value: number): string {
  return value === 0 ? "-" : String(value);
}

/** "1 question" / "6 questions" */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Deterministic pick from a palette, so a form's thumbnail never changes. */
export function thumbnailGradient(seed: number): string {
  const gradients = [
    "linear-gradient(135deg, #b686d6, #9a67c6)",
    "linear-gradient(135deg, #f0a3a3, #dd7f8f)",
    "linear-gradient(135deg, #8fb8e8, #6f95d6)",
    "linear-gradient(135deg, #94d3bd, #6fb79f)",
    "linear-gradient(135deg, #f2c58c, #e0a367)",
  ];
  return gradients[seed % gradients.length];
}
