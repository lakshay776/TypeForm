"use client";

import { useState } from "react";

import { FormTopBar } from "@/components/builder/FormTopBar";
import { Button } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/Icons";
import { ComingSoonModal } from "@/components/ui/Modal";
import { RouteReveal } from "@/components/ui/RouteReveal";
import { exportUrl } from "@/lib/api";
import { pluralize } from "@/lib/format";
import type { FormDetail } from "@/lib/types";

/**
 * Results tab body, pending the summary and responses views.
 *
 * The CSV export is already wired because its endpoint is finished — a plain link
 * so the browser handles the download and the `Content-Disposition` filename the
 * API sends is respected.
 */
export function ResultsPlaceholder({ form }: { form: FormDetail }) {
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar">
      <RouteReveal />

      <FormTopBar form={form} active="results" onPlaceholder={setPlaceholder} />

      <main className="scrollbar-slim flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[720px] flex-col items-center px-6 py-20 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg,#b686d6,#9a67c6)" }}
          >
            <BarChart size={26} />
          </span>

          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.01em] text-ink">
            Results — coming next
          </h1>
          <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-ink-soft">
            “{form.title}” has {pluralize(form.response_count, "response")} across{" "}
            {pluralize(form.questions.length, "question")}. The summary and responses views
            are the next thing being built.
          </p>

          {form.response_count > 0 && (
            <a
              href={exportUrl(form.id)}
              className="mt-7 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-plum px-5 text-[15px] font-semibold text-white transition-colors hover:bg-plum-hover"
            >
              Download responses as CSV
            </a>
          )}

          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => setPlaceholder("Response filters")}
          >
            Filter responses
          </Button>
        </div>
      </main>

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </div>
  );
}
