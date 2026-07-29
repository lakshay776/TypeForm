"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { FormSummary } from "@/lib/types";

export type SortKey = "created" | "updated" | "title" | "responses";

const SORTERS: Record<SortKey, (a: FormSummary, b: FormSummary) => number> = {
  created: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  updated: (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
  title: (a, b) => a.title.localeCompare(b.title),
  responses: (a, b) => b.response_count - a.response_count,
};

export const SORT_LABELS: Record<SortKey, string> = {
  created: "Date created",
  updated: "Last updated",
  title: "Alphabetical",
  responses: "Responses",
};

interface Loaded {
  key: string;
  forms: FormSummary[];
}

interface Failed {
  key: string;
  message: string;
}

interface UseFormsResult {
  forms: FormSummary[];
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  totalResponses: number;
  reload: () => void;
  replace: (form: FormSummary) => void;
  remove: (id: number) => void;
  prepend: (form: FormSummary) => void;
}

export function useForms(search: string, sort: SortKey): UseFormsResult {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const key = `${debouncedSearch}::${reloadToken}`;

  const latestKey = useRef(key);

  useEffect(() => {
    latestKey.current = key;
    const controller = new AbortController();

    api.forms
      .list({ search: debouncedSearch || undefined }, controller.signal)
      .then((forms) => {
        if (latestKey.current !== key) return;
        setLoaded({ key, forms });
        setFailed(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || latestKey.current !== key) return;
        setFailed({
          key,
          message:
            cause instanceof ApiError
              ? cause.message
              : "Something went wrong loading your forms.",
        });
      });

    return () => controller.abort();
  }, [key, debouncedSearch]);

  const settled = loaded?.key === key || failed?.key === key;
  const error = failed?.key === key ? failed.message : null;

  const sorted = useMemo(
    () => [...(loaded?.forms ?? [])].sort(SORTERS[sort]),
    [loaded, sort],
  );

  const totalResponses = useMemo(
    () => (loaded?.forms ?? []).reduce((sum, form) => sum + form.response_count, 0),
    [loaded],
  );

  const patch = useCallback(
    (update: (forms: FormSummary[]) => FormSummary[]) => {
      setLoaded((current) => (current ? { ...current, forms: update(current.forms) } : current));
    },
    [],
  );

  const replace = useCallback(
    (updated: FormSummary) =>
      patch((forms) => forms.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))),
    [patch],
  );

  const remove = useCallback(
    (id: number) => patch((forms) => forms.filter((f) => f.id !== id)),
    [patch],
  );

  const prepend = useCallback(
    (form: FormSummary) => patch((forms) => [form, ...forms]),
    [patch],
  );

  return {
    forms: sorted,
    loading: !settled,
    initialLoading: loaded === null && failed === null,
    error,
    totalResponses,
    reload: () => setReloadToken((value) => value + 1),
    replace,
    remove,
    prepend,
  };
}
