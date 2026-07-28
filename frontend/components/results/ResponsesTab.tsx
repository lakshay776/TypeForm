"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Calendar, Search } from "@/components/ui/Icons";
import { ACCENT_CLASSES, TYPE_META, isChoiceType } from "@/lib/questionTypes";
import { cn, questionLabel } from "@/lib/format";
import type { Question, ResponseListItem } from "@/lib/types";

/** "29 Jul 2026" / "01:40", split over two lines as the reference does. */
function formatStamp(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const value = new Date(iso);
  // Pinned to en-GB/UTC so server-rendered and client-rendered text agree.
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(value),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(value),
  };
}

interface ResponsesTabProps {
  questions: Question[];
  items: ResponseListItem[];
  total: number;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (responseId: number) => void;
  onPlaceholder: (feature: string) => void;
  exportHref: string;
}

/**
 * The submissions table: one row per response, one column per question.
 *
 * Columns come from the form definition rather than from the answers present, so
 * every row is the same width even where respondents skipped questions — a skip
 * shows as "–" rather than shifting the grid.
 *
 * Wide forms scroll sideways. The timestamp column is sticky so a row stays
 * identifiable once the question columns have scrolled past.
 */
export function ResponsesTab({
  questions,
  items,
  total,
  loadingMore,
  onLoadMore,
  onOpen,
  onPlaceholder,
  exportHref,
}: ResponsesTabProps) {
  const [query, setQuery] = useState("");

  /**
   * Filters the rows already loaded, matching against every rendered answer.
   *
   * Deliberately client-side over the loaded page rather than a server query: the
   * API has no search parameter, and inventing one would be a bigger change than
   * this view needs. "Showing X of Y" above the table keeps that limit visible.
   */
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      Object.values(item.answers).some((value) => value.toLowerCase().includes(term)),
    );
  }, [items, query]);

  if (total === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-line py-20 text-center">
        <h2 className="text-[18px] font-semibold text-ink">No responses yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-soft">
          Share your form’s link and submissions will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2.5">
        <span className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-hover px-3 text-[14px] font-medium text-ink">
          <InboxGlyph />
          Responses
        </span>
        <ToolbarButton onClick={() => onPlaceholder("Spam filtering")}>
          <AlertGlyph />
          Spam [0]
        </ToolbarButton>

        <label className="flex h-9 min-w-[210px] items-center gap-2 rounded-[var(--radius-control)] border border-line bg-canvas px-3 text-ink-soft focus-within:border-plum focus-within:text-ink">
          <Search size={17} className="shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search responses"
            aria-label="Search responses"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-soft"
          />
        </label>

        <ToolbarButton onClick={() => onPlaceholder("Date ranges")}>
          <Calendar size={17} />
          All time
        </ToolbarButton>
        <ToolbarButton onClick={() => onPlaceholder("Response filters")}>
          <FilterGlyph />
          Filters
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-2.5">
          {/* A plain link so the browser handles the download and honours the
              Content-Disposition filename the API sends. */}
          <a
            href={exportHref}
            aria-label="Download responses as CSV"
            title="Download responses as CSV"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <DownloadGlyph />
          </a>
          <ToolbarButton onClick={() => onPlaceholder("Test responses")}>
            Generate test response
          </ToolbarButton>
        </div>
      </div>

      {/* Shown only while filtering. The unfiltered count already lives in the
          "Responses [N]" tab label, so repeating it above the table is noise. */}
      {query.trim() && (
        <p className="mb-3 shrink-0 text-[13.5px] text-ink-soft">
          {visible.length} of {items.length} loaded{" "}
          {items.length === 1 ? "response" : "responses"} match
        </p>
      )}

      {/* Fills the remaining height so the table's horizontal scrollbar sits at the
          bottom of the card instead of the page growing a second scrollbar. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-line bg-canvas">
        <div className="scrollbar-slim min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <Th sticky className="min-w-[140px]">
                  <span className="flex items-center gap-2">
                    <ClockGlyph />
                    {/* Wrapped, as the reference does, so the column stays narrow. */}
                    <span className="leading-tight">
                      Response
                      <br />
                      time
                    </span>
                  </span>
                </Th>
                <Th className="min-w-[132px]">
                  <span className="flex items-center gap-2">
                    <FilterGlyph />
                    Response type
                  </span>
                </Th>
                {questions.map((question) => {
                  const meta = TYPE_META[question.type];
                  const accent = ACCENT_CLASSES[meta.accent];
                  const Icon = meta.icon;
                  return (
                    <Th key={question.id} className="min-w-[200px]">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]",
                            accent.tile,
                            accent.text,
                          )}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="truncate" title={questionLabel(question.title)}>
                          {questionLabel(question.title)}
                        </span>
                      </span>
                    </Th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visible.map((item) => {
                const stamp = formatStamp(item.submitted_at);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onOpen(item.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open the response from ${stamp.date} ${stamp.time}`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpen(item.id);
                      }
                    }}
                    className="group cursor-pointer border-b border-line-soft last:border-0 hover:bg-hover/50"
                  >
                    <Td sticky>
                      <span className="block text-[13.5px] text-ink">{stamp.date}</span>
                      <span className="block text-[13.5px] text-ink-soft">{stamp.time}</span>
                    </Td>
                    <Td>
                      <span className="inline-flex rounded-full border border-live/30 bg-live-bg px-2.5 py-1 text-[12.5px] font-medium text-live">
                        {item.is_complete ? "Completed" : "Partial"}
                      </span>
                    </Td>
                    {questions.map((question) => {
                      // Ids arrive as object keys, so they're strings here.
                      const value = item.answers[String(question.id)];
                      return (
                        <Td key={question.id} className="max-w-[300px]">
                          {!value ? (
                            <span className="text-ink-faint" title="Skipped">
                              –
                            </span>
                          ) : isChoiceType(question.type) ? (
                            // Chosen options read as chips, distinguishing a picked
                            // option from free text the respondent typed.
                            <span className="flex flex-wrap gap-1.5">
                              {value.split(", ").map((label, index) => (
                                <span
                                  key={index}
                                  className="inline-flex rounded-[6px] border border-line bg-canvas px-2 py-1 text-[13px] text-ink"
                                >
                                  {label}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="line-clamp-2 text-[14px] break-words text-ink">
                              {value}
                            </span>
                          )}
                        </Td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 && (
            <p className="px-4 py-10 text-center text-[14px] text-ink-soft">
              No loaded responses match “{query}”.
            </p>
          )}
        </div>
      </div>

      {items.length < total && (
        <div className="mt-4 flex shrink-0 justify-center">
          <Button variant="secondary" loading={loadingMore} onClick={onLoadMore}>
            Load more responses ({total - items.length} left)
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Header cell. Vertical rules match the reference's grid.
 *
 * Sticks to the top of the scroll container so the columns stay labelled through a
 * long list. The background has to be fully opaque — a translucent one lets the rows
 * show through as they scroll underneath. The timestamp header sticks on both axes,
 * so it needs to sit above its neighbours in the stack.
 */
function Th({
  children,
  className,
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 border-r border-line bg-[#f7f6f8] px-4 py-3 text-left",
        "text-[13.5px] font-medium text-ink-soft last:border-r-0",
        sticky ? "left-0 z-30" : "z-20",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-r border-line-soft px-4 py-4 align-middle last:border-r-0",
        // An opaque background is required on a sticky cell, or the scrolling
        // columns show through underneath it.
        sticky && "sticky left-0 z-10 bg-canvas group-hover:bg-[#f4f3f5]",
        className,
      )}
    >
      {children}
    </td>
  );
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-canvas px-3 text-[14px] text-ink transition-colors hover:bg-hover"
    >
      {children}
    </button>
  );
}

function InboxGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.6 12.4h4l1.4 2.4h6l1.4-2.4h4M3.6 12.4l2.6-6.4a1.8 1.8 0 011.7-1.1h8.2a1.8 1.8 0 011.7 1.1l2.6 6.4v4.6a1.8 1.8 0 01-1.8 1.8H5.4a1.8 1.8 0 01-1.8-1.8v-4.6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.8v4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function FilterGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.6h16l-6.2 7.3v5.5l-3.6-2v-3.5L4 5.6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.6V12l3.2 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.2v10.4M8.2 11l3.8 3.8L15.8 11M4.6 19.4h14.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
