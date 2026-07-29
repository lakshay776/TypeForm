"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { defaultDraft, isChoiceType } from "@/lib/questionTypes";
import type { FormDetail, FormUpdatePayload, Question, QuestionPayload, QuestionType } from "@/lib/types";

/** What the top bar's status indicator shows. */
export type SaveState = "idle" | "saving" | "saved" | "error";

/** The canvas edits either a question or one of the two screens. */
export type Selection = { kind: "question"; id: number } | { kind: "welcome" } | { kind: "ending" };

const AUTOSAVE_DELAY_MS = 600;

/** Strips a loaded question down to the fields the API accepts back. */
function toPayload(question: Question): QuestionPayload {
  return {
    type: question.type,
    title: question.title,
    description: question.description,
    is_required: question.is_required,
    placeholder: question.placeholder,
    max_length: question.max_length,
    min_value: question.min_value,
    max_value: question.max_value,
    allow_decimal: question.allow_decimal,
    rating_max: question.rating_max,
    rating_icon: question.rating_icon,
    allow_multiple: question.allow_multiple,
    randomize_options: question.randomize_options,
    // Ids are echoed back so the server updates options in place rather than
    // recreating them, which would cascade away existing answers. Options the
    // canvas has only just added carry a negative placeholder id, which is
    // dropped here so the server treats them as inserts.
    options: question.options.map((option) => ({
      id: option.id > 0 ? option.id : undefined,
      label: option.label,
    })),
  };
}

interface UseBuilderResult {
  form: FormDetail | null;
  loading: boolean;
  error: string | null;
  saveState: SaveState;
  selection: Selection;
  select: (selection: Selection) => void;
  selectedQuestion: Question | null;
  patchQuestion: (id: number, patch: Partial<Question>) => void;
  changeType: (id: number, type: QuestionType) => Promise<void>;
  addQuestion: (type: QuestionType) => Promise<void>;
  importQuestions: (titles: string[]) => Promise<number>;
  deleteQuestion: (id: number) => Promise<void>;
  duplicateQuestion: (id: number) => Promise<void>;
  reorder: (ids: number[]) => Promise<void>;
  patchForm: (patch: FormUpdatePayload) => void;
  setPublished: (published: boolean) => Promise<void>;
  reload: () => void;
}

/**
 * Owns the builder's form state.
 *
 * Every edit is applied locally first and persisted on a debounce, so typing a
 * question title never waits on the network. Structural changes — adding,
 * deleting, reordering, changing a type — are sent immediately instead, because
 * they can fail in ways the creator needs to see straight away (a locked type,
 * a rejected reorder) and because they change identity rather than content.
 */
export function useBuilder(formId: number): UseBuilderResult {
  const [form, setForm] = useState<FormDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [selection, setSelection] = useState<Selection>({ kind: "welcome" });
  const [reloadToken, setReloadToken] = useState(0);

  /**
   * Which load attempt has settled. Compared against the current key to derive
   * `loading`, rather than setting a flag at the top of the effect — a
   * synchronous setState there costs an extra render pass before paint and can
   * fall out of step with the request it is meant to describe.
   */
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const loadKey = `${formId}::${reloadToken}`;
  const loading = settledKey !== loadKey;

  /** Pending debounce timers, keyed by question id or "form". */
  const timers = useRef(new Map<string, number>());
  /** Latest unsaved payloads, so a flush always sends the newest state. */
  const pending = useRef(new Map<string, () => Promise<unknown>>());
  const inFlight = useRef(0);

  useEffect(() => {
    let active = true;

    api.forms
      .get(formId)
      .then((detail) => {
        if (!active) return;
        setForm(detail);
        setError(null);
        // Land on the first question when there is one, so the canvas isn't
        // showing a screen for a form the creator came back to edit. The welcome
        // screen is optional, so it is only a fallback when the form has one.
        setSelection(
          detail.questions.length > 0
            ? { kind: "question", id: detail.questions[0].id }
            : detail.show_welcome_screen
              ? { kind: "welcome" }
              : { kind: "ending" },
        );
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof ApiError ? cause.message : "Couldn't load this form.");
      })
      .finally(() => {
        if (active) setSettledKey(loadKey);
      });

    return () => {
      active = false;
    };
  }, [formId, loadKey]);

  const runSave = useCallback(async (key: string) => {
    const task = pending.current.get(key);
    if (!task) return;
    pending.current.delete(key);

    inFlight.current += 1;
    setSaveState("saving");
    try {
      await task();
      if (inFlight.current === 1 && pending.current.size === 0) setSaveState("saved");
    } catch (cause) {
      setSaveState("error");
      setError(cause instanceof ApiError ? cause.message : "Couldn't save your changes.");
    } finally {
      inFlight.current -= 1;
    }
  }, []);

  /**
   * Flag locally that the live form is now behind the builder.
   *
   * Applied optimistically rather than read back from the save response: saves are
   * debounced and fire-and-forget, so merging a response would either arrive too
   * late to show the button or overwrite edits typed while it was in flight. The
   * rule is simple enough to mirror — the server flags any edit to a published
   * form — and `setPublished` merges the real response, so the clear is authoritative.
   */
  const markEdited = useCallback(() => {
    setForm((current) =>
      current && current.status === "published" && !current.has_unpublished_edits
        ? { ...current, has_unpublished_edits: true }
        : current,
    );
  }, []);

  const schedule = useCallback(
    (key: string, task: () => Promise<unknown>) => {
      markEdited();
      pending.current.set(key, task);
      const existing = timers.current.get(key);
      if (existing) window.clearTimeout(existing);
      timers.current.set(
        key,
        window.setTimeout(() => {
          timers.current.delete(key);
          void runSave(key);
        }, AUTOSAVE_DELAY_MS),
      );
    },
    [runSave, markEdited],
  );

  // Flush anything still debounced when the builder unmounts, so navigating away
  // immediately after typing does not silently drop the last edit.
  useEffect(() => {
    const activeTimers = timers.current;
    const activePending = pending.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
      activePending.forEach((task) => void task());
      activePending.clear();
    };
  }, []);

  const patchQuestion = useCallback(
    (id: number, patch: Partial<Question>) => {
      setForm((current) => {
        if (!current) return current;
        const questions = current.questions.map((question) =>
          question.id === id ? { ...question, ...patch } : question,
        );
        const updated = questions.find((question) => question.id === id);
        if (updated) {
          schedule(`q:${id}`, () => api.questions.update(current.id, id, toPayload(updated)));
        }
        return { ...current, questions };
      });
    },
    [schedule],
  );

  const patchForm = useCallback(
    (patch: FormUpdatePayload) => {
      setForm((current) => {
        if (!current) return current;
        const next: FormDetail = {
          ...current,
          ...patch,
          theme: patch.theme ? { ...current.theme, ...patch.theme } : current.theme,
        };
        // Only the changed keys are sent: the API treats form updates as partial,
        // so replaying the whole object would overwrite fields nothing touched.
        schedule("form", () => api.forms.update(current.id, patch));
        return next;
      });
    },
    [schedule],
  );

  /** Sends immediately and surfaces the 409 when a type is locked by answers. */
  const changeType = useCallback(
    async (id: number, type: QuestionType) => {
      markEdited();
      if (!form) return;
      const question = form.questions.find((item) => item.id === id);
      if (!question || question.type === type) return;

      const defaults = defaultDraft(type);
      const payload: QuestionPayload = {
        ...toPayload(question),
        type,
        // A choice type needs options; carry the existing ones over when switching
        // between choice types, otherwise seed the two blanks a fresh one gets.
        options: isChoiceType(type)
          ? question.options.length > 0
            ? question.options.map((o) => ({ id: o.id, label: o.label }))
            : defaults.options
          : [],
        rating_max: type === "rating" && question.rating_max < 2 ? defaults.rating_max : question.rating_max,
        placeholder: defaults.placeholder || question.placeholder,
      };

      setSaveState("saving");
      try {
        const updated = await api.questions.update(form.id, id, payload);
        setForm((current) =>
          current
            ? {
                ...current,
                questions: current.questions.map((q) => (q.id === id ? updated : q)),
              }
            : current,
        );
        setSaveState("saved");
      } catch (cause) {
        setSaveState("error");
        throw cause;
      }
    },
    [form, markEdited],
  );

  const addQuestion = useCallback(
    async (type: QuestionType) => {
      markEdited();
      if (!form) return;
      setSaveState("saving");
      try {
        const created = await api.questions.create(form.id, defaultDraft(type));
        setForm((current) =>
          current ? { ...current, questions: [...current.questions, created] } : current,
        );
        setSelection({ kind: "question", id: created.id });
        setSaveState("saved");
      } catch (cause) {
        setSaveState("error");
        throw cause;
      }
    },
    [form, markEdited],
  );

  /**
   * Creates one question per pasted line and returns how many were added.
   *
   * Every line becomes a Short Text question. Guessing the type from the wording
   * would be wrong often enough to be worse than a predictable default — the type
   * dropdown is one click away, whereas silently mis-typing a question is easy to
   * miss and, once answered, locks.
   */
  const importQuestions = useCallback(
    async (titles: string[]) => {
      markEdited();
      if (!form || titles.length === 0) return 0;

      setSaveState("saving");
      try {
        const created = await api.questions.createMany(
          form.id,
          titles.map((title) => ({ ...defaultDraft("short_text"), title })),
        );
        setForm((current) =>
          current ? { ...current, questions: [...current.questions, ...created] } : current,
        );
        if (created.length > 0) setSelection({ kind: "question", id: created[0].id });
        setSaveState("saved");
        return created.length;
      } catch (cause) {
        setSaveState("error");
        throw cause;
      }
    },
    [form, markEdited],
  );

  const duplicateQuestion = useCallback(
    async (id: number) => {
      markEdited();
      if (!form) return;
      const source = form.questions.find((item) => item.id === id);
      if (!source) return;

      setSaveState("saving");
      try {
        const created = await api.questions.create(form.id, {
          ...toPayload(source),
          // New option rows, not the originals — copying ids would move the
          // existing options onto the new question.
          options: source.options.map((option) => ({ label: option.label })),
          position: source.position + 1,
        });
        // The insert shifted every later position, so take the server's ordering
        // rather than guessing at it.
        const refreshed = await api.forms.get(form.id);
        setForm(refreshed);
        setSelection({ kind: "question", id: created.id });
        setSaveState("saved");
      } catch (cause) {
        setSaveState("error");
        throw cause;
      }
    },
    [form, markEdited],
  );

  const deleteQuestion = useCallback(
    async (id: number) => {
      markEdited();
      if (!form) return;
      // Drop any queued autosave for a question that is about to stop existing.
      const timer = timers.current.get(`q:${id}`);
      if (timer) window.clearTimeout(timer);
      timers.current.delete(`q:${id}`);
      pending.current.delete(`q:${id}`);

      const index = form.questions.findIndex((question) => question.id === id);
      const remaining = form.questions.filter((question) => question.id !== id);

      setForm({
        ...form,
        questions: remaining.map((question, position) => ({ ...question, position })),
      });
      // Select the neighbour that takes its place, falling back to the one before.
      const neighbour = remaining[index] ?? remaining[index - 1];
      setSelection(neighbour ? { kind: "question", id: neighbour.id } : { kind: "welcome" });

      setSaveState("saving");
      try {
        await api.questions.remove(form.id, id);
        setSaveState("saved");
      } catch (cause) {
        setForm(form); // put it back
        setSaveState("error");
        throw cause;
      }
    },
    [form, markEdited],
  );

  const reorder = useCallback(
    async (ids: number[]) => {
      markEdited();
      if (!form) return;
      const byId = new Map(form.questions.map((question) => [question.id, question]));
      const optimistic = ids
        .map((id, position) => {
          const question = byId.get(id);
          return question ? { ...question, position } : null;
        })
        .filter((question): question is Question => question !== null);

      const previous = form.questions;
      setForm({ ...form, questions: optimistic });

      setSaveState("saving");
      try {
        const confirmed = await api.questions.reorder(form.id, ids);
        setForm((current) => (current ? { ...current, questions: confirmed } : current));
        setSaveState("saved");
      } catch (cause) {
        setForm((current) => (current ? { ...current, questions: previous } : current));
        setSaveState("error");
        throw cause;
      }
    },
    [form, markEdited],
  );

  const setPublished = useCallback(
    async (published: boolean) => {
      if (!form) return;
      const updated = await api.forms.setPublished(form.id, published);
      setForm((current) => (current ? { ...current, ...updated } : current));
    },
    [form],
  );

  const selectedQuestion = useMemo(() => {
    if (!form || selection.kind !== "question") return null;
    return form.questions.find((question) => question.id === selection.id) ?? null;
  }, [form, selection]);

  return {
    form,
    loading,
    error,
    saveState,
    selection,
    select: setSelection,
    selectedQuestion,
    patchQuestion,
    changeType,
    addQuestion,
    importQuestions,
    deleteQuestion,
    duplicateQuestion,
    reorder,
    patchForm,
    setPublished,
    reload: () => setReloadToken((value) => value + 1),
  };
}
