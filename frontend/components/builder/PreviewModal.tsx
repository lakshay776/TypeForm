"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AnswerField, type AnswerValue } from "@/components/form/AnswerField";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Close,
  Mobile,
  Restart,
} from "@/components/ui/Icons";
import { isEmptyAnswer, validateAnswer } from "@/lib/answerValidation";
import { cn, questionLabel } from "@/lib/format";
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
      {/* Everything below only exists while the preview is open, so each launch
          starts from the first step with no answers and with the device the
          builder toolbar was set to — no effects needed to reset any of it. */}
      {open && <PreviewShell form={form} initialDevice={device} onClose={onClose} />}
    </AnimatePresence>
  );
}

/**
 * Full-screen chrome around a preview run: the floating control pill, the device
 * frame, and the restart control.
 *
 * Restart works by remounting `PreviewRun` under a new key rather than by
 * clearing its state field by field. The run owns cursor, answers, direction,
 * error and shake — resetting five things by hand is five chances to forget one,
 * and a fresh mount is the same code path a first launch takes.
 */
function PreviewShell({
  form,
  initialDevice,
  onClose,
}: {
  form: FormDetail;
  initialDevice: DeviceMode;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<DeviceMode>(initialDevice);
  const [runKey, setRunKey] = useState(0);
  const isMobile = device === "mobile";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[110] flex flex-col bg-sidebar"
    >
      <div className="flex shrink-0 justify-center py-3">
        <div className="flex items-center gap-1 rounded-[12px] border border-line bg-canvas px-2 py-2 shadow-[0_8px_28px_-10px_rgba(0,0,0,0.25)]">
          <PreviewToolButton label="Close preview" onClick={onClose}>
            <Close size={19} />
          </PreviewToolButton>
          <PreviewToolButton
            label={isMobile ? "Switch to desktop preview" : "Switch to mobile preview"}
            active={isMobile}
            onClick={() => setDevice(isMobile ? "desktop" : "mobile")}
          >
            <Mobile size={19} />
          </PreviewToolButton>
          <PreviewToolButton
            label="Restart the preview"
            onClick={() => setRunKey((count) => count + 1)}
          >
            <Restart size={19} />
          </PreviewToolButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center">
        <motion.div
          layout
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative h-full overflow-hidden",
            isMobile
              ? "w-full max-w-[420px] rounded-t-[14px] border border-b-0 border-line shadow-[0_-4px_30px_-12px_rgba(0,0,0,0.2)]"
              : "w-full",
          )}
          style={{ background: form.theme.background_color }}
        >
          <PreviewRun key={runKey} form={form} onClose={onClose} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function PreviewToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex h-9 w-10 items-center justify-center rounded-[8px] border transition-colors",
        active
          ? "border-ink/25 bg-hover text-ink"
          : "border-transparent text-ink-soft hover:bg-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function PreviewRun({ form, onClose }: { form: FormDetail; onClose: () => void }) {
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
      // See the matching guard in FormRunner: a field that consumed this key marks
      // it handled, and defaultPrevented is the only signal that survives both
      // listeners being attached to `document`. Without it, Escape aimed at an
      // open dropdown would also tear down the whole preview.
      if (event.defaultPrevented) return;

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
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Form preview"
            className="relative flex h-full w-full flex-col overflow-hidden"
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
          </div>
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
            {questionLabel(question.title)}
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
