import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export const UNTITLED_QUESTION = "…";

export function questionLabel(title: string): string {
  return title.trim() || UNTITLED_QUESTION;
}

export function formatCount(value: number): string {
  return value === 0 ? "-" : String(value);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const FORM_THUMBNAIL = "linear-gradient(135deg, #b686d6, #9a67c6)";
