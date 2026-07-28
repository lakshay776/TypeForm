"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button, IconButton } from "@/components/ui/Button";
import { Close, Search, Sparkle } from "@/components/ui/Icons";
import { IconWelcomeScreen } from "@/components/ui/TypeIcons";
import {
  ACCENT_CLASSES,
  PICKER_GROUPS,
  type PickerGroup,
  type PickerItem,
} from "@/lib/questionTypes";
import { cn, pluralize } from "@/lib/format";
import type { QuestionType } from "@/lib/types";

const COLUMN_COUNT = 3;

type Tab = "elements" | "import" | "ai";

const TABS: { id: Tab; label: string }[] = [
  { id: "elements", label: "Add form elements" },
  { id: "import", label: "Import questions" },
  { id: "ai", label: "Create with AI" },
];

/**
 * Spreads groups across the three columns, keeping them roughly level.
 *
 * A plain CSS `columns` layout balances by rendered height, which reflows
 * unpredictably as the search filter changes the item count. This fills the
 * columns *in order* instead, moving on once a column reaches its share of the
 * total — so a group's items stay together and the categories still read
 * top-to-bottom, left-to-right in the order they are declared. Weight counts the
 * heading as one row.
 */
function toColumns(groups: PickerGroup[]): PickerGroup[][] {
  const weight = (group: PickerGroup) => group.items.length + 1;
  const target = Math.ceil(groups.reduce((sum, group) => sum + weight(group), 0) / COLUMN_COUNT);

  const columns: PickerGroup[][] = [[]];
  let used = 0;

  for (const group of groups) {
    const groupWeight = weight(group);
    if (used > 0 && used + groupWeight > target && columns.length < COLUMN_COUNT) {
      columns.push([]);
      used = 0;
    }
    columns[columns.length - 1].push(group);
    used += groupWeight;
  }

  while (columns.length < COLUMN_COUNT) columns.push([]);
  return columns;
}

interface AddElementsModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
  /** Resolves with how many questions were created. */
  onImport: (titles: string[]) => Promise<number>;
  /** Turns on the form's welcome screen and selects it. */
  onAddWelcomeScreen: () => void;
  /** Whether this form already has a welcome screen. */
  welcomeScreenAdded: boolean;
  onPlaceholder: (feature: string) => void;
}

export function AddElementsModal(props: AddElementsModalProps) {
  return (
    <AnimatePresence>
      {props.open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[46px]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={props.onClose}
            className="absolute inset-0 bg-[#1a1822]/45"
          />
          {/* All panel state lives in here, which only exists while the dialog is
              open — so it starts on the first tab with an empty search and an
              empty textarea every time, without needing a reset effect. */}
          <Panel {...props} />
        </div>
      )}
    </AnimatePresence>
  );
}

function Panel({
  onClose,
  onPick,
  onImport,
  onAddWelcomeScreen,
  welcomeScreenAdded,
  onPlaceholder,
}: Omit<AddElementsModalProps, "open">) {
  const [tab, setTab] = useState<Tab>("elements");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Add form elements"
      initial={{ opacity: 0, y: -14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex max-h-[calc(100vh-92px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-[10px] bg-sidebar shadow-[0_24px_70px_-14px_rgba(24,22,30,0.34)]"
    >
      <div className="relative flex shrink-0 items-center gap-1 px-6 pt-5 pb-4" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "relative rounded-md px-3 py-1 text-[15px] transition-colors",
              tab === item.id ? "font-medium text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
            {/* The active marker sits on the dialog's top edge rather than under
                the label, which is how the reference draws it. */}
            {tab === item.id && (
              <span className="absolute inset-x-2 -top-5 h-[3.5px] rounded-b-full bg-plum" />
            )}
          </button>
        ))}

        <IconButton label="Close" onClick={onClose} className="ml-auto">
          <Close size={20} />
        </IconButton>
      </div>

      {tab === "elements" && (
        <ElementsTab
          onPick={onPick}
          onClose={onClose}
          onAddWelcomeScreen={onAddWelcomeScreen}
          welcomeScreenAdded={welcomeScreenAdded}
        />
      )}
      {tab === "import" && (
        <ImportTab onImport={onImport} onClose={onClose} onPlaceholder={onPlaceholder} />
      )}
      {tab === "ai" && <AiTab onClose={onClose} />}
    </motion.div>
  );
}

/* ------------------------------------------------------------------------- */
/* Add form elements                                                         */
/* ------------------------------------------------------------------------- */

function ElementsTab({
  onPick,
  onClose,
  onAddWelcomeScreen,
  welcomeScreenAdded,
}: {
  onPick: (type: QuestionType) => void;
  onClose: () => void;
  onAddWelcomeScreen: () => void;
  welcomeScreenAdded: boolean;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search on mount so the picker is usable straight from the keyboard.
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return PICKER_GROUPS;
    return PICKER_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const columns = useMemo(() => toColumns(groups), [groups]);

  const select = (item: PickerItem) => {
    onPick(item.type);
    onClose();
  };

  return (
    <div className="scrollbar-slim flex-1 overflow-y-auto rounded-t-[10px] bg-canvas px-8 py-7">
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-[236px_minmax(0,1fr)]">
        <div>
          <label className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-line px-3 py-2.5 text-ink-soft focus-within:border-plum focus-within:text-ink">
            <Search size={18} className="shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search form elements"
              aria-label="Search form elements"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-soft"
            />
          </label>

          <p className="mt-7 mb-2.5 text-[15px] font-semibold text-ink">Recommended</p>
          <button
            type="button"
            disabled={welcomeScreenAdded}
            title={
              welcomeScreenAdded
                ? "This form already has a welcome screen"
                : "Add a welcome screen before the first question"
            }
            onClick={() => {
              onAddWelcomeScreen();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-line px-3 py-2.5 text-left transition-colors",
              welcomeScreenAdded
                ? "cursor-not-allowed opacity-55"
                : "bg-canvas hover:bg-hover",
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#ececed] text-[#5b5b62]">
              <IconWelcomeScreen size={18} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[14.5px] text-ink">
              Welcome Screen
            </span>
            {welcomeScreenAdded && (
              <span className="shrink-0 text-[12px] text-ink-faint">Added</span>
            )}
          </button>

          <p className="mt-6 text-[13px] leading-relaxed text-ink-soft">
            The thank-you screen is always present — edit it from the Endings section of
            the Pages panel.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-[14px] text-ink-soft">Nothing matches “{query}”.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((column, index) => (
              <div key={index} className="space-y-8">
                {column.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-2 text-[15px] font-semibold text-ink">{group.title}</h3>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <li key={item.type}>
                          <ElementButton item={item} onSelect={() => select(item)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ElementButton({ item, onSelect }: { item: PickerItem; onSelect: () => void }) {
  const accent = ACCENT_CLASSES[item.accent];
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`Add a ${item.label} question`}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left",
        "transition-colors duration-100 hover:bg-hover",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]",
          accent.tile,
          accent.text,
        )}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14.5px] text-ink">{item.label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------------- */
/* Import questions                                                          */
/* ------------------------------------------------------------------------- */

/** One question per non-blank line, trimmed. */
function parseTitles(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function ImportTab({
  onImport,
  onClose,
  onPlaceholder,
}: {
  onImport: (titles: string[]) => Promise<number>;
  onClose: () => void;
  onPlaceholder: (feature: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => textRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const titles = useMemo(() => parseTitles(text), [text]);

  const submit = async () => {
    if (titles.length === 0 || busy) return;
    setBusy(true);
    try {
      const created = await onImport(titles);
      // Only dismiss on success. Closing on failure would hide the pasted text
      // along with the dialog, leaving nothing to retry and making a failed
      // import look like one that silently did nothing.
      if (created > 0) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="scrollbar-slim flex-1 overflow-y-auto rounded-t-[10px] bg-canvas px-8 py-7">
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <label
              htmlFor="import-questions"
              className="mb-2 block text-[15px] text-ink"
            >
              Form questions
            </label>
            <textarea
              id="import-questions"
              ref={textRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // Ctrl/Cmd+Enter submits; plain Enter has to stay a newline here,
                // since one line per question is the whole input format.
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="Copy and paste or type in your questions, and press enter after each one."
              rows={18}
              className="w-full resize-none rounded-[10px] border border-line-soft bg-[#fbfbfc] px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-plum focus:bg-canvas"
            />
          </div>

          <div>
            <div className="rounded-[10px] border border-[#a8caf0] bg-[#f2f7fe] p-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[#2f6fbd]"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M12 10.6v6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="7.6" r="1.05" fill="currentColor" />
              </svg>

              <ul className="mt-3 space-y-2.5 text-[14px] leading-snug text-ink">
                <li className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>Paste or type your questions in the text field</span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>
                    Each line becomes a Short Text question — change its type from the
                    settings panel afterwards
                  </span>
                </li>
              </ul>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="mt-4 w-full font-medium"
              onClick={() => onPlaceholder("Create with AI")}
            >
              Create with AI
            </Button>

            {titles.length > 0 && (
              <p className="mt-4 text-[13.5px] text-ink-soft">
                {pluralize(titles.length, "question")} will be added.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 justify-end px-8 py-4">
        <Button
          variant="primary"
          size="lg"
          // The shared disabled style dims the dark fill, which still reads as a
          // dark button. Here it should go light-on-grey, as the reference does.
          className="font-medium disabled:bg-hover disabled:text-ink-faint disabled:opacity-100"
          disabled={titles.length === 0}
          loading={busy}
          onClick={submit}
        >
          Import questions
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Create with AI                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Placeholder tab.
 *
 * AI form generation appears nowhere in the brief — not in the core features, the
 * bonus list, or the placeholder list — so the surface exists for navigational
 * fidelity but there is nothing behind it.
 */
function AiTab({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-t-[10px] bg-canvas px-8 py-20 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ background: "linear-gradient(135deg,#b686d6,#9a67c6)" }}
      >
        <Sparkle size={26} />
      </span>
      <h3 className="mt-5 text-[19px] font-semibold text-ink">Create with AI — coming soon</h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-soft">
        Generating a form from a description isn’t part of this build. Use{" "}
        <strong className="font-medium text-ink">Import questions</strong> to paste a list, or{" "}
        <strong className="font-medium text-ink">Add form elements</strong> to add them one at a
        time.
      </p>
      <Button variant="primary" className="mt-6" onClick={onClose}>
        Got it
      </Button>
    </div>
  );
}
