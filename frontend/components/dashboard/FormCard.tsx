"use client";

import { motion } from "motion/react";

import { FormActions, FormActionsMenu, StatusPill } from "@/components/dashboard/FormActionsMenu";
import { FORM_THUMBNAIL, cn, formatDate, pluralize } from "@/lib/format";
import type { FormSummary } from "@/lib/types";

/** Grid-view tile, behind the List/Grid toggle. */
export function FormCard({
  form,
  actions,
  onOpen,
}: {
  form: FormSummary;
  actions: FormActions;
  onOpen: () => void;
}) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas",
        "transition-shadow duration-150 hover:shadow-[0_4px_16px_-4px_rgba(24,22,30,0.13)]",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${form.title}`}
        className="h-[104px] w-full"
        style={{ background: FORM_THUMBNAIL }}
      />

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="line-clamp-2 min-w-0 text-left text-[14.5px] font-medium text-ink hover:underline"
          >
            {form.title}
          </button>
          <FormActionsMenu form={form} actions={actions} className="-mt-1 -mr-1.5" />
        </div>

        <StatusPill status={form.status} />

        <p className="mt-auto text-[12.5px] text-ink-soft">
          {pluralize(form.question_count, "question")} ·{" "}
          {pluralize(form.response_count, "response")}
        </p>
        <p className="text-[12.5px] text-ink-faint">Updated {formatDate(form.updated_at)}</p>
      </div>
    </motion.div>
  );
}
