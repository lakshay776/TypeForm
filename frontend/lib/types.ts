/**
 * Types mirroring the backend's Pydantic schemas.
 *
 * Hand-written rather than generated from the OpenAPI document: the surface is
 * small enough that a generator would add a build step for no real benefit, and
 * these read better at call sites. They must stay in step with
 * `backend/app/schemas/`.
 */

export type FormStatus = "draft" | "published";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface QuestionOption {
  id: number;
  label: string;
  position: number;
}

export interface Question {
  id: number;
  form_id: number;
  type: QuestionType;
  title: string;
  description: string;
  position: number;
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
  options: QuestionOption[];
}

export interface FormTheme {
  background_color: string;
  question_color: string;
  answer_color: string;
  button_color: string;
  button_text_color: string;
  font_family: string;
}

/** Dashboard list row. */
export interface FormSummary {
  id: number;
  title: string;
  slug: string;
  status: FormStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  question_count: number;
  response_count: number;
  public_url: string | null;
  /** True when a live form has been edited since it was last published. */
  has_unpublished_edits: boolean;
}

/** Full definition used by the builder. */
export interface FormDetail extends FormSummary {
  show_welcome_screen: boolean;
  welcome_heading: string;
  welcome_description: string;
  welcome_button_label: string;
  thank_you_heading: string;
  thank_you_description: string;
  questions: Question[];
  theme: FormTheme;
}

/**
 * The respondent-facing projection of a form.
 *
 * Deliberately narrower than `FormDetail`: no id, no status, no counts, no
 * timestamps — nothing a respondent has no business seeing.
 */
export interface PublicForm {
  slug: string;
  title: string;
  show_welcome_screen: boolean;
  welcome_heading: string;
  welcome_description: string;
  welcome_button_label: string;
  thank_you_heading: string;
  thank_you_description: string;
  questions: Question[];
  theme: FormTheme;
}

/** One submitted answer. The server validates `value` against the question type. */
export interface AnswerSubmission {
  question_id: number;
  value: string | number | boolean | number[] | null;
}

export interface ResponseSubmission {
  answers: AnswerSubmission[];
  duration_seconds?: number;
}

export interface ResponseCreated {
  token: string;
  submitted_at: string;
  thank_you_heading: string;
  thank_you_description: string;
}

/** A single server-side validation failure, addressed by question. */
export interface FieldIssue {
  question_id: number;
  message: string;
}

/* --------------------------------------------------------------------------- */
/* Results                                                                     */
/* --------------------------------------------------------------------------- */

/** One row of the responses table. `answers` is keyed by question id. */
export interface ResponseListItem {
  id: number;
  token: string;
  is_complete: boolean;
  submitted_at: string | null;
  duration_seconds: number | null;
  /** JSON object keys are strings, so question ids arrive stringified. */
  answers: Record<string, string>;
}

export interface ResponsePage {
  total: number;
  limit: number;
  offset: number;
  items: ResponseListItem[];
}

/**
 * A stored answer, flattened for display.
 *
 * `display_value` is the server's single rendering of the answer, shared by the
 * table, this detail view and the CSV export so the three can't disagree.
 */
export interface AnswerOut {
  question_id: number;
  question_title: string;
  question_type: QuestionType;
  position: number;
  display_value: string;
  text: string | null;
  number: number | null;
  boolean: boolean | null;
  rating: number | null;
  selected_option_ids: number[];
}

export interface ResponseDetail {
  id: number;
  token: string;
  is_complete: boolean;
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number | null;
  answers: AnswerOut[];
}

export interface OptionCount {
  option_id: number;
  label: string;
  count: number;
  percentage: number;
}

export interface RatingBucket {
  value: number;
  count: number;
}

/** Per-question aggregate. Only the fields relevant to the type are populated. */
export interface QuestionSummary {
  question_id: number;
  type: QuestionType;
  title: string;
  position: number;
  answered_count: number;
  skipped_count: number;
  option_counts: OptionCount[] | null;
  yes_count: number | null;
  no_count: number | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  rating_distribution: RatingBucket[] | null;
  recent_answers: string[] | null;
}

export interface FormStats {
  form_id: number;
  title: string;
  total_responses: number;
  completed_responses: number;
  completion_rate: number;
  average_duration_seconds: number | null;
  questions: QuestionSummary[];
}

export interface Creator {
  id: number;
  email: string;
  name: string;
}

/**
 * Body for creating or updating a question.
 *
 * `type` is optional on update: omitting it keeps the current type, and sending a
 * different one is accepted only while the question has no answers (otherwise the
 * API returns 409, since answers live in columns specific to the old type).
 */
export interface QuestionPayload {
  type?: QuestionType;
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

export interface FormUpdatePayload {
  title?: string;
  /**
   * The public link's path segment.
   *
   * Changing it rewrites the shareable URL and takes the previous one offline at
   * once. Collected responses are unaffected — they reference the form's id.
   * The API answers 409 if another form already uses it.
   */
  slug?: string;
  show_welcome_screen?: boolean;
  welcome_heading?: string;
  welcome_description?: string;
  welcome_button_label?: string;
  thank_you_heading?: string;
  thank_you_description?: string;
  theme?: Partial<FormTheme>;
}
