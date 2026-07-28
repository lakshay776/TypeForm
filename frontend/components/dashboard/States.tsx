"use client";

import { Button } from "@/components/ui/Button";
import { AlertCircle, Plus, Search, Sparkle } from "@/components/ui/Icons";
import { COLUMN_TEMPLATE } from "@/components/dashboard/FormRow";
import { cn } from "@/lib/format";

/**
 * Skeleton rows shaped like the real list.
 *
 * Reusing COLUMN_TEMPLATE means the placeholder occupies the same columns as the
 * loaded content, so nothing shifts when the data arrives.
 */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading forms">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            COLUMN_TEMPLATE,
            "rounded-[var(--radius-card)] border border-line bg-canvas px-4 py-2",
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-[10px] bg-hover" />
            <div
              className="h-3.5 animate-pulse rounded-full bg-hover"
              style={{ width: `${140 + index * 34}px` }}
            />
          </div>
          <Bar />
          <Bar />
          <Bar width={78} />
          <div className="h-8 w-8 animate-pulse rounded-[var(--radius-control)] bg-hover" />
          <span />
        </div>
      ))}
    </div>
  );
}

function Bar({ width = 26 }: { width?: number }) {
  return (
    <div className="h-3 animate-pulse rounded-full bg-hover" style={{ width }} />
  );
}

/** Shown when the creator has no forms at all. */
export function EmptyState({
  creating,
  onCreateForm,
}: {
  creating: boolean;
  onCreateForm: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line py-20 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ background: "linear-gradient(135deg,#b686d6,#9a67c6)" }}
      >
        <Sparkle size={26} />
      </span>
      <h2 className="mt-5 text-[19px] font-semibold text-ink">Create your first typeform</h2>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-soft">
        Build a form one question at a time, then share it with a link. No account needed
        for people to fill it in.
      </p>
      <Button
        variant="primary"
        size="lg"
        className="mt-6 font-semibold"
        loading={creating}
        onClick={onCreateForm}
      >
        <Plus size={18} />
        Create form
      </Button>
    </div>
  );
}

/** Shown when a search matches nothing — distinct from having no forms at all. */
export function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-hover text-ink-soft">
        <Search size={22} />
      </span>
      <h2 className="mt-4 text-[16px] font-medium text-ink">
        No forms match “{query}”
      </h2>
      <p className="mt-1.5 text-[14px] text-ink-soft">Try a different search term.</p>
      <Button size="sm" className="mt-5" onClick={onClear}>
        Clear search
      </Button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-danger-bg/40 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertCircle size={24} />
      </span>
      <h2 className="mt-4 text-[16px] font-medium text-ink">Couldn’t load your forms</h2>
      <p className="mt-1.5 max-w-md text-[14px] text-ink-soft">{message}</p>
      <Button size="sm" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
