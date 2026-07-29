"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import { IconButton, Spinner } from "@/components/ui/Button";
import { Close } from "@/components/ui/Icons";
import { ACCENT_CLASSES, TYPE_META } from "@/lib/questionTypes";
import { cn, questionLabel } from "@/lib/format";
import type { Question, ResponseDetail } from "@/lib/types";

function formatStamp(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(iso));
}

interface ResponseDrawerProps {
  open: boolean;
  onClose: () => void;
  detail: ResponseDetail | null;
  loading: boolean;
  questions: Question[];
}

export function ResponseDrawer({
  open,
  onClose,
  detail,
  loading,
  questions,
}: ResponseDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const byQuestion = new Map(detail?.answers.map((answer) => [answer.question_id, answer]));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1a1822]/40"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Response details"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="scrollbar-slim relative flex w-full max-w-[560px] flex-col overflow-y-auto bg-canvas shadow-[-16px_0_48px_-16px_rgba(24,22,30,0.28)]"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-canvas px-6 py-5">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold text-ink">Response</h2>
                {detail && (
                  <p className="mt-1 text-[13.5px] text-ink-soft">
                    {formatStamp(detail.submitted_at)}
                    {detail.duration_seconds !== null && (
                      <> · took {detail.duration_seconds}s</>
                    )}
                  </p>
                )}
              </div>
              <IconButton label="Close" onClick={onClose}>
                <Close size={19} />
              </IconButton>
            </header>

            {loading || !detail ? (
              <div className="flex flex-1 items-center justify-center py-24">
                <Spinner className="h-6 w-6 text-ink-soft" />
              </div>
            ) : (
              <div className="flex-1 divide-y divide-line-soft px-6 py-2">
                {questions.map((question, index) => {
                  const answer = byQuestion.get(question.id);
                  const meta = TYPE_META[question.type];
                  const accent = ACCENT_CLASSES[meta.accent];
                  const Icon = meta.icon;

                  return (
                    <div key={question.id} className="py-5">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "flex h-6 items-center gap-1.5 rounded-[6px] px-1.5",
                            accent.tile,
                            accent.text,
                          )}
                        >
                          <Icon size={13} />
                          <span className="text-[12px] font-medium">{index + 1}</span>
                        </span>
                        <p className="min-w-0 flex-1 text-[14.5px] leading-snug text-ink-soft">
                          {questionLabel(question.title)}
                        </p>
                      </div>

                      <div className="mt-2.5 pl-[38px]">
                        {answer ? (
                          <p className="text-[16.5px] leading-relaxed whitespace-pre-wrap break-words text-ink">
                            {answer.display_value}
                          </p>
                        ) : (
                          <p className="text-[15px] text-ink-faint italic">Skipped</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <p className="py-5 font-mono text-[12px] text-ink-faint">
                  Response ID {detail.token}
                </p>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
