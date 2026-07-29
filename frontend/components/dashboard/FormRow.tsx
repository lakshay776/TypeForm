"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { FormActions, FormActionsMenu, StatusPill } from "@/components/dashboard/FormActionsMenu";
import { FormTile, Puzzle } from "@/components/ui/Icons";
import { cn, formatCount, formatDate } from "@/lib/format";
import type { FormSummary } from "@/lib/types";

/**
 * Shared column template.
 *
 * The header row and every data row consume this same string, which is what
 * guarantees the "Responses / Completed / Updated" headings stay aligned with
 * their values. Defining it twice is how those drift apart.
 */
export const COLUMN_TEMPLATE =
  "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_96px_104px_120px_112px_40px] items-center gap-3";

/**
 * Columns that only appear once there is room for them.
 *
 * Responses, Completed, Updated and Integrations are secondary to knowing which
 * form a row is: at 375px the six-column template left the title about 40px wide.
 * The row menu stays at every width, since deleting and duplicating are the
 * actions people actually reach for.
 */
const SECONDARY_CELL = "hidden md:block";

interface FormRowProps {
  form: FormSummary;
  actions: FormActions;
  renaming: boolean;
  onRenameSubmit: (title: string) => void;
  onRenameCancel: () => void;
  onOpen: () => void;
  onPlaceholder: (feature: string) => void;
}

export function FormRow({
  form,
  actions,
  renaming,
  onRenameSubmit,
  onRenameCancel,
  onOpen,
  onPlaceholder,
}: FormRowProps) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        COLUMN_TEMPLATE,
        "group rounded-[var(--radius-card)] border border-line bg-canvas px-4 py-1.5",
        "transition-shadow duration-150 hover:shadow-[0_2px_10px_-2px_rgba(24,22,30,0.09)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0">
          <FormTile size={32} />
        </span>

        {renaming ? (
          <RenameField
            initialValue={form.title}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
          />
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onOpen}
              className="truncate text-[15px] font-medium text-ink hover:underline"
            >
              {form.title}
            </button>
            <StatusPill status={form.status} />
          </div>
        )}
      </div>

      <Cell className={SECONDARY_CELL}>{formatCount(form.response_count)}</Cell>
      <Cell className={SECONDARY_CELL}>{formatCount(form.response_count)}</Cell>

      <span className={cn("text-[14px] text-link", SECONDARY_CELL)}>
        {formatDate(form.updated_at)}
      </span>

      <button
        type="button"
        aria-label="Integrations"
        title="Integrations"
        onClick={() => onPlaceholder("Integrations")}
        className={cn(
          "h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-line text-ink-soft transition-colors hover:bg-hover hover:text-ink",
          "hidden md:flex",
        )}
      >
        <Puzzle size={17} />
      </button>

      <FormActionsMenu form={form} actions={actions} />
    </motion.div>
  );
}

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-[14px] text-ink-soft", className)}>{children}</span>;
}

/** Inline title editor: commits on Enter or blur, abandons on Escape. */
function RenameField({
  initialValue,
  onSubmit,
  onCancel,
}: {
  initialValue: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape and blur both fire; this stops the blur handler from also committing
  // after the user has already cancelled.
  const settled = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = () => {
    if (settled.current) return;
    settled.current = true;
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialValue) onCancel();
    else onSubmit(trimmed);
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") {
          settled.current = true;
          onCancel();
        }
      }}
      maxLength={255}
      aria-label="Form name"
      className="min-w-0 flex-1 rounded-md border border-plum bg-canvas px-2 py-1 text-[15px] font-medium text-ink outline-none"
    />
  );
}
