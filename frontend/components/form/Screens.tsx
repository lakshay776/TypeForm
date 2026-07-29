"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";

import { AnswerField, type AnswerValue } from "@/components/form/AnswerField";
import { AlertCircle, Check } from "@/components/ui/Icons";
import { cn, questionLabel } from "@/lib/format";
import type { FormTheme, Question } from "@/lib/types";

/**
 * The three screens a respondent moves through, shared by the builder's preview
 * and the public form.
 *
 * These used to exist twice — once in `respondent/Screens.tsx` and again inline in
 * `PreviewModal` — and the copies drifted: the preview's ending had a smaller tick,
 * a smaller heading and no share row, so the preview was quietly showing something
 * the respondent would never see. One copy is the only way that stays fixed.
 *
 * `AnswerField` already worked this way, which is why answers never drifted.
 */

/**
 * The fields a screen needs, and nothing more.
 *
 * Structural rather than tied to `PublicForm` or `FormDetail` so both satisfy it —
 * the preview holds the creator's full form, the public flow holds the narrowed
 * respondent projection, and neither needs converting.
 */
export interface ScreenForm {
  title: string;
  welcome_heading: string;
  welcome_description: string;
  welcome_button_label: string;
  theme: FormTheme;
}

/** Shared content column: left-aligned, centred in the viewport. */
function Column({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[900px] px-6 sm:px-10", className)}>{children}</div>
  );
}

/** The dark primary action: Start, OK on a question, Submit on the last one. */
export function ActionButton({
  theme,
  onClick,
  loading = false,
  children,
}: {
  theme: FormTheme;
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-[6px] px-6 py-3 text-[17px] font-semibold transition-transform hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
      style={{ background: theme.button_color, color: theme.button_text_color }}
    >
      {loading ? "Submitting…" : children}
    </button>
  );
}

/** "press Enter ↵" hint shown beside the primary action. */
export function EnterHint({ theme, label = "Enter" }: { theme: FormTheme; label?: string }) {
  return (
    <span className="text-[13px]" style={{ color: `${theme.answer_color}99` }}>
      press <strong className="font-semibold">{label}</strong> ↵
    </span>
  );
}

export function WelcomeScreen({
  form,
  onStart,
}: {
  form: ScreenForm;
  onStart: () => void;
}) {
  const { theme } = form;

  // Centred to match the builder canvas. Question screens stay left-aligned; it is
  // only the welcome and ending screens that centre.
  return (
    <Column className="text-center">
      <h1
        className="text-[38px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[44px]"
        style={{ color: theme.question_color }}
      >
        {form.welcome_heading || form.title}
      </h1>

      {form.welcome_description && (
        <p
          className="mx-auto mt-4 max-w-[640px] text-[18px] leading-relaxed"
          style={{ color: theme.answer_color }}
        >
          {form.welcome_description}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <ActionButton theme={theme} onClick={onStart}>
          {form.welcome_button_label || "Start"}
        </ActionButton>
        <EnterHint theme={theme} />
      </div>
    </Column>
  );
}

export function QuestionScreen({
  form,
  question,
  number,
  value,
  onChange,
  onAdvance,
  error,
  shakeKey,
  isLast,
  submitting = false,
}: {
  form: ScreenForm;
  question: Question;
  number: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onAdvance: () => void;
  error: string | null;
  shakeKey: number;
  isLast: boolean;
  submitting?: boolean;
}) {
  const { theme } = form;
  const errorId = `answer-error-${question.id}`;

  return (
    <Column>
      <div className="flex items-start gap-3">
        <span
          className="mt-2 flex h-[26px] min-w-[26px] shrink-0 items-center justify-center rounded-[6px] text-[14px] font-semibold"
          style={{ background: theme.question_color, color: theme.background_color }}
          aria-hidden="true"
        >
          {number}
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="text-[27px] leading-[1.3] font-medium tracking-[-0.01em] sm:text-[30px]"
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
            <p
              className="mt-2 text-[17px] leading-snug"
              style={{ color: `${theme.answer_color}c9` }}
            >
              {question.description}
            </p>
          )}

          {/* Keyed on shakeKey so pressing OK on an already-invalid answer replays
              the nudge — without it the animation only runs the first time. */}
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
              onSubmit={onAdvance}
            />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                id={errorId}
                // assertive: the respondent has just tried to move on, so this
                // needs to interrupt rather than wait its turn.
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

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ActionButton theme={theme} onClick={onAdvance} loading={submitting}>
              {isLast ? "Submit" : "OK"}
            </ActionButton>
            <EnterHint theme={theme} />
          </div>
        </div>
      </div>
    </Column>
  );
}

export function ThankYouScreen({
  form,
  heading,
  description,
  /**
   * Renders the identical screen with its outbound actions inert.
   *
   * A flag rather than a second component: the whole reason this file exists is
   * that a separate preview ending drifted from the real one. Only behaviour
   * differs here, never layout.
   */
  preview = false,
}: {
  form: ScreenForm;
  heading: string;
  description: string;
  preview?: boolean;
}) {
  const { theme } = form;
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;

  return (
    <Column className="text-center">
      <span
        className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `${theme.button_color}1f`, color: theme.button_color }}
      >
        <Check size={34} />
      </span>

      <h1
        className="text-[34px] leading-tight font-semibold tracking-[-0.02em] sm:text-[38px]"
        style={{ color: theme.question_color }}
      >
        {heading}
      </h1>

      {description && (
        <p
          className="mx-auto mt-4 max-w-[520px] text-[18px] leading-relaxed"
          style={{ color: theme.answer_color }}
        >
          {description}
        </p>
      )}

      <div className="mt-10 flex justify-center gap-2.5">
        <ShareLink
          label="Share on Facebook"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          background="#1877F2"
          inert={preview}
        >
          <path d="M15.1 8.2h-2V6.9c0-.6.4-.8.7-.8h1.3V3.9h-1.9c-2.1 0-2.6 1.6-2.6 2.6v1.7H9.2v2.4h1.4V20h2.5v-9.4h1.7l.3-2.4z" />
        </ShareLink>
        <ShareLink
          label="Share on X"
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
          background="#000000"
          inert={preview}
        >
          <path d="M17.2 4h-2.4l-2.9 3.6L9.4 4H4.6l4.9 6.6L4.9 20h2.4l3.2-4 2.7 4h4.7l-5.2-7L17.2 4z" />
        </ShareLink>
        <ShareLink
          label="Share on LinkedIn"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          background="#0A66C2"
          inert={preview}
        >
          <path d="M7.3 9.6H4.9V20h2.4V9.6zM6.1 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM19.1 13.6c0-2.6-1.4-3.9-3.3-3.9-1.4 0-2.1.8-2.4 1.4V9.6H11V20h2.4v-5.6c0-1.2.5-2 1.6-2s1.6.8 1.6 2V20h2.5v-6.4z" />
        </ShareLink>
      </div>

      {preview ? (
        <>
          <span
            className="mt-7 inline-flex rounded-[6px] px-6 py-3 text-[17px] font-semibold opacity-60"
            style={{ background: theme.button_color, color: theme.button_text_color }}
            aria-hidden="true"
          >
            Create a typeform
          </span>
          <p className="mt-8 text-[13px]" style={{ color: `${theme.answer_color}99` }}>
            Nothing was submitted — this is a preview.
          </p>
        </>
      ) : (
        <Link
          href="/"
          className="mt-7 inline-flex rounded-[6px] px-6 py-3 text-[17px] font-semibold transition-transform hover:scale-[1.02]"
          style={{ background: theme.button_color, color: theme.button_text_color }}
        >
          Create a typeform
        </Link>
      )}
    </Column>
  );
}

function ShareLink({
  label,
  href,
  background,
  inert = false,
  children,
}: {
  label: string;
  href: string;
  background: string;
  inert?: boolean;
  children: React.ReactNode;
}) {
  const glyph = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
  const shape =
    "flex h-10 w-10 items-center justify-center rounded-[7px] text-white transition-transform";

  // A span, not a disabled link: in the preview these must not open a share dialog
  // for a form nobody has filled in, and there is no such thing as a disabled <a>.
  if (inert) {
    return (
      <span className={cn(shape, "opacity-60")} style={{ background }} aria-hidden="true">
        {glyph}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      // noreferrer as well as noopener: these are third-party share endpoints and
      // there is no reason to leak the form's URL as a referrer header.
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(shape, "hover:scale-105")}
      style={{ background }}
    >
      {glyph}
    </a>
  );
}
