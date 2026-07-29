"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/ui/Button";
import { Check, ChevronRight, Forms, HelpCircle, ShareArrow } from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import type { SaveState } from "@/hooks/useBuilder";
import type { FormDetail } from "@/lib/types";

export type FormTab = "content" | "workflow" | "connect" | "share" | "results";

interface TabDef {
  id: FormTab;
  label: string;
  path?: (formId: number) => string;
}

const TABS: TabDef[] = [
  { id: "content", label: "Content", path: (id) => `/forms/${id}` },
  { id: "workflow", label: "Workflow" },
  { id: "connect", label: "Connect" },
  { id: "share", label: "Share", path: (id) => `/forms/${id}/share` },
  { id: "results", label: "Results", path: (id) => `/forms/${id}/results` },
];

const PUBLISHED_ONLY = new Set<FormTab>(["share", "results"]);

interface FormTopBarProps {
  form: FormDetail;
  active: FormTab;
  saveState?: SaveState;
  onRename?: (title: string) => void;
  onPublishEdits?: () => Promise<void>;
  onPlaceholder: (feature: string) => void;
}

export function FormTopBar({
  form,
  active,
  saveState,
  onRename,
  onPublishEdits,
  onPlaceholder,
}: FormTopBarProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(form.title);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== form.title) onRename?.(trimmed);
    else setDraft(form.title);
  };

  const select = (tab: TabDef) => {
    if (tab.id === active) return;
    if (tab.path) router.push(tab.path(form.id));
    else onPlaceholder(tab.label);
  };

  const published = form.status === "published";
  const visibleTabs = TABS.filter(
    (tab) => published || !PUBLISHED_ONLY.has(tab.id) || tab.id === active,
  );

  return (
    <header className="relative flex shrink-0 flex-col border-b border-line bg-canvas lg:h-[56px] lg:flex-row lg:items-center lg:gap-4">
      <div className="flex h-[56px] min-w-0 flex-1 items-center justify-between gap-2 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-[14.5px] text-ink transition-colors hover:bg-hover"
        >
          <Forms size={19} className="text-ink-soft" />
          Forms
        </Link>
        <ChevronRight size={15} className="shrink-0 text-ink-faint" />

        {editing && onRename ? (
          <input
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(form.title);
                setEditing(false);
              }
            }}
            maxLength={255}
            aria-label="Form title"
            className="min-w-0 max-w-[340px] rounded-md border border-plum px-2 py-1 text-[14.5px] font-medium text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!onRename) return;
              setDraft(form.title);
              setEditing(true);
            }}
            title={onRename ? "Rename form" : form.title}
            className="min-w-0 truncate rounded-[var(--radius-control)] px-2 py-1.5 text-[14.5px] font-medium text-ink transition-colors hover:bg-hover"
          >
            {form.title}
          </button>
        )}

        {saveState && <SaveIndicator state={saveState} />}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {form.has_unpublished_edits && onPublishEdits && (
          <PublishEditsButton onPublish={onPublishEdits} />
        )}

        {form.public_url ? (
          <CopyLinkButton url={form.public_url} />
        ) : (
          active !== "share" && (
            <Link
              href={`/forms/${form.id}/share?publish=1`}
              className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-canvas px-3.5 text-sm font-medium text-ink transition-colors hover:bg-hover"
            >
              <ShareArrow size={17} />
              Share
            </Link>
          )
        )}

        <button
          type="button"
          onClick={() => onPlaceholder("Plans and billing")}
          className="flex h-9 items-center rounded-[var(--radius-control)] bg-evergreen px-3.5 text-sm font-semibold text-white transition-colors hover:bg-evergreen-hover"
        >
          View plans
        </button>
        <button
          type="button"
          aria-label="Help"
          onClick={() => onPlaceholder("Help centre")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-hover hover:text-ink"
        >
          <HelpCircle size={21} />
        </button>
      </div>
      </div>

      <nav
        className={cn(
          "scrollbar-slim flex items-center gap-1 overflow-x-auto overflow-y-hidden",
          "border-t border-line px-3 py-1.5 whitespace-nowrap",
          "lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:border-t-0 lg:px-0 lg:py-0",
        )}
        aria-label="Form sections"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => select(tab)}
            aria-current={tab.id === active ? "page" : undefined}
            className={cn(
              "rounded-[var(--radius-control)] px-3.5 py-2 text-[15px] transition-colors",
              tab.id === active
                ? "bg-hover font-medium text-ink"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function PublishEditsButton({ onPublish }: { onPublish: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onPublish();
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-canvas px-3.5 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? <Spinner className="h-4 w-4 border" /> : <ShareArrow size={17} />}
      Publish edits
    </button>
  );
}

const COPIED_FEEDBACK_MS = 1800;

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Link copied" : "Copy the public link"}
      title={copied ? "Link copied" : "Copy the public link"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border",
        "transition-colors duration-200",
        copied
          ? "border-ink-faint bg-canvas text-ink"
          : "border-line bg-canvas text-ink-soft hover:bg-hover hover:text-ink",
      )}
    >
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "copied" : "idle"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center"
        >
          {copied ? <Check size={19} /> : <LinkGlyph />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function LinkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.4 13.6a3.6 3.6 0 010-5.1l2.4-2.4a3.6 3.6 0 015.1 5.1l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.6 10.4a3.6 3.6 0 010 5.1l-2.4 2.4a3.6 3.6 0 01-5.1-5.1l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <span
      className={cn(
        "ml-1 flex shrink-0 items-center gap-1.5 text-[12.5px]",
        state === "error" ? "text-danger" : "text-ink-faint",
      )}
      aria-live="polite"
    >
      {state === "saving" && (
        <>
          <Spinner className="h-3 w-3 border" />
          Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <Check size={14} />
          Saved
        </>
      )}
      {state === "error" && "Couldn’t save"}
    </span>
  );
}
