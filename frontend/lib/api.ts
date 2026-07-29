import type {
  Creator,
  FieldIssue,
  FormDetail,
  FormStatus,
  FormSummary,
  FormStats,
  FormUpdatePayload,
  PublicForm,
  Question,
  QuestionPayload,
  ResponseCreated,
  ResponseDetail,
  ResponsePage,
  ResponseSubmission,
} from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  const url = new URL(`${BASE_URL}/api${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    if ((cause as Error)?.name === "AbortError") throw cause;
    throw new ApiError(0, "Can't reach the server. Is the backend running?", cause);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.text();
  const parsed = payload ? safeJson(payload) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(parsed) ?? response.statusText, parsed);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return undefined;
}

export const api = {
  me: () => request<Creator>("/me"),

  forms: {
    list: (params: { status?: FormStatus; search?: string } = {}, signal?: AbortSignal) =>
      request<FormSummary[]>("/forms", { query: params, signal }),

    get: (id: number) => request<FormDetail>(`/forms/${id}`),

    create: (payload: { title?: string; questions?: QuestionPayload[] } = {}) =>
      request<FormDetail>("/forms", { method: "POST", body: payload }),

    update: (id: number, payload: FormUpdatePayload) =>
      request<FormDetail>(`/forms/${id}`, { method: "PATCH", body: payload }),

    duplicate: (id: number) => request<FormDetail>(`/forms/${id}/duplicate`, { method: "POST" }),

    setPublished: (id: number, published: boolean) =>
      request<FormDetail>(`/forms/${id}/${published ? "publish" : "unpublish"}`, {
        method: "POST",
      }),

    remove: (id: number) => request<void>(`/forms/${id}`, { method: "DELETE" }),
  },

  questions: {
    create: (formId: number, payload: QuestionPayload & { position?: number }) =>
      request<Question>(`/forms/${formId}/questions`, { method: "POST", body: payload }),

    createMany: (formId: number, questions: QuestionPayload[]) =>
      request<Question[]>(`/forms/${formId}/questions/bulk`, {
        method: "POST",
        body: { questions },
      }),

    update: (formId: number, questionId: number, payload: QuestionPayload) =>
      request<Question>(`/forms/${formId}/questions/${questionId}`, {
        method: "PUT",
        body: payload,
      }),

    remove: (formId: number, questionId: number) =>
      request<void>(`/forms/${formId}/questions/${questionId}`, { method: "DELETE" }),

    reorder: (formId: number, questionIds: number[]) =>
      request<Question[]>(`/forms/${formId}/questions/reorder`, {
        method: "PUT",
        body: { question_ids: questionIds },
      }),
  },

  results: {
    summary: (formId: number) => request<FormStats>(`/forms/${formId}/summary`),

    responses: (formId: number, params: { limit?: number; offset?: number } = {}) =>
      request<ResponsePage>(`/forms/${formId}/responses`, { query: params }),

    response: (formId: number, responseId: number) =>
      request<ResponseDetail>(`/forms/${formId}/responses/${responseId}`),
  },

  public: {
    form: (slug: string) => request<PublicForm>(`/public/forms/${slug}`),

    submit: (slug: string, payload: ResponseSubmission) =>
      request<ResponseCreated>(`/public/forms/${slug}/responses`, {
        method: "POST",
        body: payload,
      }),
  },
};

export function answerIssues(cause: unknown): Record<number, string> {
  if (!(cause instanceof ApiError) || cause.status !== 422) return {};
  const body = cause.body as { issues?: unknown } | undefined;
  if (!Array.isArray(body?.issues)) return {};

  const issues: Record<number, string> = {};
  for (const item of body.issues as FieldIssue[]) {
    if (typeof item?.question_id === "number" && typeof item?.message === "string") {
      issues[item.question_id] = item.message;
    }
  }
  return issues;
}

export function publishProblems(cause: unknown): string[] {
  if (!(cause instanceof ApiError) || cause.status !== 422) return [];
  const body = cause.body as { problems?: unknown } | undefined;
  if (!Array.isArray(body?.problems)) return [];
  return body.problems.filter((item): item is string => typeof item === "string");
}

export function exportUrl(formId: number): string {
  return `${BASE_URL}/api/forms/${formId}/responses/export`;
}
