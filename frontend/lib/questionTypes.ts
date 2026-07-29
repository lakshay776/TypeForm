import type { ComponentType, SVGProps } from "react";

import {
  IconDropdown,
  IconEmail,
  IconLongText,
  IconMultipleChoice,
  IconNumber,
  IconRating,
  IconShortText,
  IconYesNo,
} from "@/components/ui/TypeIcons";
import type { Question, QuestionType } from "@/lib/types";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** Tint families, matching the colour-coding the picker uses per category. */
export type Accent = "amber" | "violet" | "green" | "blue" | "slate";

export const ACCENT_CLASSES: Record<Accent, { tile: string; text: string }> = {
  amber: { tile: "bg-[#fdf3dc]", text: "text-[#a9762a]" },
  violet: { tile: "bg-[#efe8fb]", text: "text-[#6c4bb0]" },
  green: { tile: "bg-[#e2f2e9]", text: "text-[#2c7a55]" },
  blue: { tile: "bg-[#e4edfb]", text: "text-[#3a63b8]" },
  slate: { tile: "bg-[#ececed]", text: "text-[#5b5b62]" },
};

export interface TypeMeta {
  label: string;
  icon: Icon;
  accent: Accent;
  /** Copy shown under the type dropdown and in the empty canvas hint. */
  hint: string;
}

/**
 * Metadata for the eight types the brief requires.
 *
 * This registry is the single source of truth for how a type is labelled and
 * coloured. The pages panel, the element picker, the settings dropdown, the
 * canvas and the preview all read from it, so a type can never be shown with
 * two different names or icons depending on where you're looking.
 */
export const TYPE_META: Record<QuestionType, TypeMeta> = {
  short_text: {
    label: "Short Text",
    icon: IconShortText,
    accent: "blue",
    hint: "A single line of text.",
  },
  long_text: {
    label: "Long Text",
    icon: IconLongText,
    accent: "blue",
    hint: "A multi-line answer.",
  },
  multiple_choice: {
    label: "Multiple Choice",
    icon: IconMultipleChoice,
    accent: "violet",
    hint: "Pick from a list of options.",
  },
  dropdown: {
    label: "Dropdown",
    icon: IconDropdown,
    accent: "violet",
    hint: "Pick one option from a menu.",
  },
  email: {
    label: "Email",
    icon: IconEmail,
    accent: "amber",
    hint: "A validated email address.",
  },
  number: {
    label: "Number",
    icon: IconNumber,
    accent: "amber",
    hint: "A numeric answer.",
  },
  yes_no: {
    label: "Yes/No",
    icon: IconYesNo,
    accent: "violet",
    hint: "A simple yes or no.",
  },
  rating: {
    label: "Rating",
    icon: IconRating,
    accent: "green",
    hint: "A star or number rating.",
  },
};

export const ALL_TYPES = Object.keys(TYPE_META) as QuestionType[];

/** Types whose answers come from option rows. */
export const CHOICE_TYPES: QuestionType[] = ["multiple_choice", "dropdown"];

export function isChoiceType(type: QuestionType): boolean {
  return CHOICE_TYPES.includes(type);
}

/* ------------------------------------------------------------------------- */
/* Element picker                                                            */
/* ------------------------------------------------------------------------- */

export interface PickerItem {
  type: QuestionType;
  label: string;
  icon: Icon;
  accent: Accent;
}

export interface PickerGroup {
  title: string;
  items: PickerItem[];
}

/**
 * The element picker.
 *
 * Contains only the eight question types the brief specifies — no unimplemented
 * entries. Every item in the picker adds a real question, so nothing here can be
 * clicked to reach a dead end. Category names follow Typeform's own grouping so
 * the panel stays recognisable.
 */
export const PICKER_GROUPS: PickerGroup[] = [
  {
    title: "Text",
    items: [
      { label: "Short Text", icon: IconShortText, accent: "blue", type: "short_text" },
      { label: "Long Text", icon: IconLongText, accent: "blue", type: "long_text" },
    ],
  },
  {
    title: "Choice",
    items: [
      {
        label: "Multiple Choice",
        icon: IconMultipleChoice,
        accent: "violet",
        type: "multiple_choice",
      },
      { label: "Dropdown", icon: IconDropdown, accent: "violet", type: "dropdown" },
      { label: "Yes/No", icon: IconYesNo, accent: "violet", type: "yes_no" },
    ],
  },
  {
    title: "Contact info",
    items: [{ label: "Email", icon: IconEmail, accent: "amber", type: "email" }],
  },
  {
    title: "Rating",
    items: [{ label: "Rating", icon: IconRating, accent: "green", type: "rating" }],
  },
  {
    title: "Other",
    items: [{ label: "Number", icon: IconNumber, accent: "amber", type: "number" }],
  },
];

/* ------------------------------------------------------------------------- */
/* Defaults                                                                  */
/* ------------------------------------------------------------------------- */

export interface QuestionDraft {
  type: QuestionType;
  title: string;
  description: string;
  is_required: boolean;
  placeholder: string;
  max_length: number | null;
  min_value: number | null;
  max_value: number | null;
  allow_decimal: boolean;
  rating_max: number;
  rating_icon: string;
  allow_multiple: boolean;
  randomize_options: boolean;
  options: { id?: number; label: string }[];
}

/**
 * A new question of the given type.
 *
 * Titles are left empty so the canvas shows its placeholder prompt, which is how
 * Typeform behaves — the creator types over the hint rather than deleting
 * pre-filled text.
 */
export function defaultDraft(type: QuestionType): QuestionDraft {
  return {
    type,
    title: "",
    description: "",
    is_required: false,
    placeholder: PLACEHOLDER_BY_TYPE[type] ?? "",
    max_length: null,
    min_value: null,
    max_value: null,
    allow_decimal: false,
    rating_max: 5,
    rating_icon: "star",
    allow_multiple: false,
    randomize_options: false,
    // Choice types need at least one option to satisfy the API. One blank option
    // is what a fresh choice question shows; the creator adds more with "Add choice".
    options: isChoiceType(type) ? [{ label: "" }] : [],
  };
}

const PLACEHOLDER_BY_TYPE: Partial<Record<QuestionType, string>> = {
  short_text: "Type your answer here...",
  long_text: "Type your answer here...",
  email: "name@example.com",
  number: "Type your answer here...",
};

/** Option letter keys — A, B, C … the respondent can press to select. */
export function optionKey(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

/**
 * How long a chosen answer stays on screen before the flow moves on.
 *
 * Long enough to see which option took the highlight, short enough to still read
 * as a response to the click.
 *
 * Lives here rather than in either runner so the builder's preview and the public
 * flow advance identically — a preview that moves on at a different moment than
 * the real form is worse than no preview.
 */
export const AUTO_ADVANCE_MS = 1000;

/**
 * Types where picking an option is the whole answer, so there is nothing to type
 * and nothing to confirm — the flow can move on by itself.
 *
 * Multi-select is excluded even though it is a choice type: a respondent selecting
 * "Web app" may be about to select "Mobile app" too, and advancing under them
 * would lose that.
 */
export function advancesOnSelect(question: Question): boolean {
  if (question.type === "yes_no" || question.type === "rating") return true;
  if (question.type === "multiple_choice" || question.type === "dropdown") {
    return !question.allow_multiple;
  }
  return false;
}
