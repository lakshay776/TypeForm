"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AnswerField, type AnswerValue } from "@/components/form/AnswerField";
import { IconButton } from "@/components/ui/Button";
import { AlertCircle, Check, ChevronDown, ChevronUp, Close } from "@/components/ui/Icons";
import { isEmptyAnswer, validateAnswer } from "@/lib/answerValidation";
import { cn } from "@/lib/format";
import type { DeviceMode } from "@/components/builder/CanvasToolbar";
import type { FormDetail } from "@/lib/types";

/** Steps are the welcome screen (optional), each question, then the ending. */
type Step = { kind: "welcome" } | { kind: "question"; index: number } | { kind: "ending" };

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  form: FormDetail;
  device: DeviceMode;
}

/**
 * Live preview of the form as a respondent would move through it.
 *
 * Answers are held in local state and never submitted — this is the builder's
 * preview, not the public flow. It reuses `AnswerField`, so what is previewed here
 * is rendered by the same code that will render the real thing.
 */
export function PreviewModal({ open, onClose, form, device }: PreviewModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-[#1a1822]/70 p-0 sm:p-6">
          {/* The run state lives in here, which only exists while the preview is
              open — so every preview starts from the first step with no answers,
              without needing an effect to reset it. */}
          <PreviewRun form={form} device={device} onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}

function PreviewRun({
  form,
  device,
  onClose,
}: {
  form: FormDetail;
  device: DeviceMode;
  onClose: () => void;
}) {
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];
    if (form.show_welcome_screen) list.push({ kind: "welcome" });
    form.questions.forEach((_, index) => list.push({ kind: "question", index }));
    list.push({ kind: "ending" });
    return list;
  }, [form.show_welcome_screen, form.questions]);

  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [direction, setDirection] = useState<1 | -1>(1);
  /** Validation message for the question on screen, or null when it passes. */
  const [error, setError] = useState<string | null>(null);
  /** Bumped on each rejection so the field can re-run its shake animation. */
  const [shake, setShake] = useState(0);

  const step = steps[Math.min(cursor, steps.length - 1)];

  const go = useCallback(
    (delta: 1 | -1) => {
      // Going back never validates: a respondent must always be able to return to
      // a previous question, including one they left incomplete.
      if (delta === 1 && step.kind === "question") {
        const question = form.questions[step.index];
        const message = validateAnswer(question, answers[question.id] ?? null);
        if (message) {
          setError(message);
          setShake((count) => count + 1);
          return;
        }
      }
      setError(null);
      setDirection(delta);
      setCursor((current) => Math.min(Math.max(current + delta, 0), steps.length - 1));
    },
    [step, form.questions, answers, steps.length],
  );

  const setAnswer = useCallback((questionId: number, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    // Clear the message as soon as the respondent starts fixing it, rather than
    // making them press OK again to find out whether they have.
    setError(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Arrow navigation is skipped while typing, or ↓ inside a textarea would
      // jump to the next question instead of moving the caret.
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (typing) return;
      if (event.key === "ArrowDown") go(1);
      if (event.key === "ArrowUp") go(-1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, go]);

  // Uses the same emptiness rule as validation, so `false` (a "No" answer) and
  // `0` count as answered rather than being treated as blanks.
  const answeredCount = form.questions.filter(
    (question) => !isEmptyAnswer(answers[question.id] ?? null),
  ).length;
  const progress = form.questions.length
    ? Math.round((answeredCount / form.questions.length) * 100)
    : 0;

  const { theme } = form;

  return (
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Form preview"
            className={cn(
              "relative mx-auto flex h-full w-full flex-col overflow-hidden bg-canvas",
              "sm:rounded-2xl sm:shadow-[0_30px_80px_-16px_rgba(0,0,0,0.5)]",
              device === "mobile" ? "sm:max-w-[420px]" : "sm:max-w-[1120px]",
            )}
            style={{ background: theme.background_color }}
          >
            {/* Progress bar */}
            <div className="absolute inset-x-0 top-0 z-10 h-[3px] bg-black/10">
              <motion.div
                className="h-full"
                style={{ background: theme.button_color }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                style={{ background: `${theme.answer_color}1f`, color: theme.answer_color }}
              >
                Preview
              </span>
              <IconButton
                label="Close preview"
                onClick={onClose}
                className="hover:bg-black/5"
                style={{ color: theme.answer_color }}
              >
                <Close size={19} />
              </IconButton>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step.kind === "question" ? `q${step.index}` : step.kind}
                  custom={direction}
                  initial={{ opacity: 0, y: direction * 46 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: direction * -46 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col justify-center overflow-y-auto px-8 py-20 sm:px-16"
                >
                  {step.kind === "welcome" && (
                    <div className="mx-auto w-full max-w-[640px] text-center">
                      <h2
                        className="text-[36px] leading-[1.15] font-semibold tracking-[-0.02em]"
                        style={{ color: theme.question_color }}
                      >
                        {form.welcome_heading || form.title}
                      </h2>
                      {form.welcome_description && (
                        <p
                          className="mt-4 text-[18px] leading-relaxed"
                          style={{ color: theme.answer_color }}
                        >
                          {form.welcome_description}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => go(1)}
                        className="mt-9 rounded-[7px] px-7 py-3 text-[17px] font-medium transition-transform hover:scale-[1.02]"
                        style={{
                          background: theme.button_color,
                          color: theme.button_text_color,
                        }}
                      >
                        {form.welcome_button_label || "Start"}
                      </button>
                    </div>
                  )}

                  {step.kind === "question" && form.questions[step.index] && (
                    <QuestionStep
                      form={form}
                      index={step.index}
                      value={answers[form.questions[step.index].id] ?? null}
                      onChange={(value) => setAnswer(form.questions[step.index].id, value)}
                      onNext={() => go(1)}
                      error={error}
                      shakeKey={shake}
                    />
                  )}

                  {step.kind === "ending" && (
                    <div className="mx-auto w-full max-w-[560px] text-center">
                      <span
                        className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
                        style={{
                          background: `${theme.button_color}1f`,
                          color: theme.button_color,
                        }}
                      >
                        <Check size={30} />
                      </span>
                      <h2
                        className="text-[32px] leading-tight font-semibold tracking-[-0.02em]"
                        style={{ color: theme.question_color }}
                      >
                        {form.thank_you_heading}
                      </h2>
                      {form.thank_you_description && (
                        <p className="mt-3 text-[17px]" style={{ color: theme.answer_color }}>
                          {form.thank_you_description}
                        </p>
                      )}
                      <p className="mt-8 text-[13px]" style={{ color: `${theme.answer_color}99` }}>
                        Nothing was submitted — this is a preview.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step controls */}
            <div className="absolute right-5 bottom-5 z-10 flex overflow-hidden rounded-[7px]">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={cursor === 0}
                aria-label="Previous"
                className="flex h-9 w-9 items-center justify-center transition-opacity disabled:opacity-40"
                style={{ background: theme.button_color, color: theme.button_text_color }}
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={cursor >= steps.length - 1}
                aria-label="Next"
                className="ml-px flex h-9 w-9 items-center justify-center transition-opacity disabled:opacity-40"
                style={{ background: theme.button_color, color: theme.button_text_color }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </motion.div>
  );
}

function QuestionStep({
  form,
  index,
  value,
  onChange,
  onNext,
  error,
  shakeKey,
}: {
  form: FormDetail;
  index: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onNext: () => void;
  error: string | null;
  shakeKey: number;
}) {
  const question = form.questions[index];
  const { theme } = form;
  const errorId = `preview-error-${question.id}`;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="flex gap-3">
        <span
          className="mt-2.5 shrink-0 text-[15px] font-medium"
          style={{ color: theme.button_color }}
          aria-hidden="true"
        >
          {index + 1} →
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="text-[28px] leading-[1.25] font-medium tracking-[-0.01em]"
            style={{ color: theme.question_color }}
          >
            {question.title || "Your question here"}
            {question.is_required && (
              <span style={{ color: theme.button_color }} title="Required">
                {" *"}
              </span>
            )}
          </h2>

          {question.description && (
            <p className="mt-1.5 text-[17px]" style={{ color: `${theme.answer_color}c9` }}>
              {question.description}
            </p>
          )}

          {/* Keyed on shakeKey so pressing OK on an already-invalid answer
              replays the nudge — without the key the animation would only run
              the first time the message appeared. */}
          <motion.div
            key={shakeKey}
            animate={error ? { x: [0, -7, 6, -4, 0] } : { x: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="mt-8"
            aria-describedby={error ? errorId : undefined}
          >
            <AnswerField
              question={question}
              value={value}
              onChange={onChange}
              theme={theme}
              autoFocus
              onSubmit={onNext}
            />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                id={errorId}
                // assertive rather than polite: the respondent has just tried to
                // move on, so this needs to interrupt.
                role="alert"
                aria-live="assertive"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="mt-3 flex items-center gap-2 text-[14.5px] font-medium text-[#e0574c]"
              >
                <AlertCircle size={17} />
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={onNext}
              className="rounded-[7px] px-5 py-2.5 text-[16px] font-medium transition-transform hover:scale-[1.02]"
              style={{ background: theme.button_color, color: theme.button_text_color }}
            >
              OK
            </button>
            <span className="text-[13px]" style={{ color: `${theme.answer_color}99` }}>
              press <strong className="font-semibold">Enter</strong> ↵
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
