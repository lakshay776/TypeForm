
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
  has_unpublished_edits: boolean;
}

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

export interface FieldIssue {
  question_id: number;
  message: string;
}

export interface ResponseListItem {
  id: number;
  token: string;
  is_complete: boolean;
  submitted_at: string | null;
  duration_seconds: number | null;
  answers: Record<string, string>;
}

export interface ResponsePage {
  total: number;
  limit: number;
  offset: number;
  items: ResponseListItem[];
}

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
  slug?: string;
  show_welcome_screen?: boolean;
  welcome_heading?: string;
  welcome_description?: string;
  welcome_button_label?: string;
  thank_you_heading?: string;
  thank_you_description?: string;
  theme?: Partial<FormTheme>;
}
