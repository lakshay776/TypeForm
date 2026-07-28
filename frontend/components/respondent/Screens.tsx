"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";

import { ActionButton, EnterHint } from "@/components/respondent/Chrome";
import { AnswerField, type AnswerValue } from "@/components/form/AnswerField";
import { AlertCircle, Check } from "@/components/ui/Icons";
import type { PublicForm, Question } from "@/lib/types";

/** Shared content column: left-aligned, centred in the viewport. */
function Column({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[900px] px-6 sm:px-10 ${className ?? ""}`}>{children}</div>;
}

export function WelcomeScreen({ form, onStart }: { form: PublicForm; onStart: () => void }) {
  const { theme } = form;

  return (
    <Column>
      <h1
        className="text-[38px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[44px]"
        style={{ color: theme.question_color }}
      >
        {form.welcome_heading || form.title}
      </h1>

      {form.welcome_description && (
        <p
          className="mt-4 max-w-[640px] text-[18px] leading-relaxed"
          style={{ color: theme.answer_color }}
        >
          {form.welcome_description}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
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
  submitting,
}: {
  form: PublicForm;
  question: Question;
  number: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onAdvance: () => void;
  error: string | null;
  shakeKey: number;
  isLast: boolean;
  submitting: boolean;
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
            {question.title || "Untitled question"}
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
}: {
  form: PublicForm;
  heading: string;
  description: string;
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
        >
          <path d="M15.1 8.2h-2V6.9c0-.6.4-.8.7-.8h1.3V3.9h-1.9c-2.1 0-2.6 1.6-2.6 2.6v1.7H9.2v2.4h1.4V20h2.5v-9.4h1.7l.3-2.4z" />
        </ShareLink>
        <ShareLink
          label="Share on X"
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
          background="#000000"
        >
          <path d="M17.2 4h-2.4l-2.9 3.6L9.4 4H4.6l4.9 6.6L4.9 20h2.4l3.2-4 2.7 4h4.7l-5.2-7L17.2 4z" />
        </ShareLink>
        <ShareLink
          label="Share on LinkedIn"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          background="#0A66C2"
        >
          <path d="M7.3 9.6H4.9V20h2.4V9.6zM6.1 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM19.1 13.6c0-2.6-1.4-3.9-3.3-3.9-1.4 0-2.1.8-2.4 1.4V9.6H11V20h2.4v-5.6c0-1.2.5-2 1.6-2s1.6.8 1.6 2V20h2.5v-6.4z" />
        </ShareLink>
      </div>

      <Link
        href="/"
        className="mt-7 inline-flex rounded-[6px] px-6 py-3 text-[17px] font-semibold transition-transform hover:scale-[1.02]"
        style={{ background: theme.button_color, color: theme.button_text_color }}
      >
        Create a typeform
      </Link>
    </Column>
  );
}

function ShareLink({
  label,
  href,
  background,
  children,
}: {
  label: string;
  href: string;
  background: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      // noreferrer as well as noopener: these are third-party share endpoints and
      // there is no reason to leak the form's URL as a referrer header.
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-[7px] text-white transition-transform hover:scale-105"
      style={{ background }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {children}
      </svg>
    </a>
  );
}
