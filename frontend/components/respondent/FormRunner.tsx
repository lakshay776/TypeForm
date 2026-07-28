"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BottomBar, ProgressBar } from "@/components/respondent/Chrome";
import {
  QuestionScreen,
  ThankYouScreen,
  WelcomeScreen,
} from "@/components/respondent/Screens";
import type { AnswerValue } from "@/components/form/AnswerField";
import { ApiError, answerIssues, api } from "@/lib/api";
import { isEmptyAnswer, validateAnswer } from "@/lib/answerValidation";
import type { AnswerSubmission, PublicForm, ResponseCreated } from "@/lib/types";

type Step = { kind: "welcome" } | { kind: "question"; index: number };

/**
 * The public form-filling experience.
 *
 * One question per screen. Answers live here until submitted in a single request
 * at the end — the API stores a response atomically, so there is nothing to
 * partially write and nothing to clean up if a respondent abandons the form.
 *
 * Validation runs on the client for instant feedback and again on the server,
 * which is the authority. When the server rejects a submission it returns
 * per-question issues, and the flow jumps back to the first offending question
 * rather than showing one opaque failure.
 */
export function FormRunner({ form }: { form: PublicForm }) {
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];
    if (form.show_welcome_screen) list.push({ kind: "welcome" });
    form.questions.forEach((_, index) => list.push({ kind: "question", index }));
    return list;
  }, [form.show_welcome_screen, form.questions]);

  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ResponseCreated | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  /**
   * When the respondent opened the form, for the reported fill duration.
   *
   * A ref rather than state: it must not change across renders, and reading the
   * clock during render would differ between the server and client pass.
   */
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const step = steps[Math.min(cursor, steps.length - 1)];
  const isLastQuestion = cursor === steps.length - 1;

  const answeredCount = form.questions.filter(
    (question) => !isEmptyAnswer(answers[question.id] ?? null),
  ).length;
  const progress = form.questions.length
    ? (answeredCount / form.questions.length) * 100
    : 0;

  const jumpTo = useCallback(
    (questionIndex: number, message: string) => {
      const stepIndex = steps.findIndex(
        (item) => item.kind === "question" && item.index === questionIndex,
      );
      if (stepIndex !== -1) setCursor(stepIndex);
      setError(message);
      setShake((count) => count + 1);
    },
    [steps],
  );

  const submit = useCallback(async () => {
    // Everything is re-checked before sending: a respondent can reach the last
    // question, go back, clear a required answer, and come forward again.
    for (const [index, question] of form.questions.entries()) {
      const message = validateAnswer(question, answers[question.id] ?? null);
      if (message) {
        jumpTo(index, message);
        return;
      }
    }

    const payload: AnswerSubmission[] = form.questions.map((question) => ({
      question_id: question.id,
      value: answers[question.id] ?? null,
    }));

    setSubmitting(true);
    setError(null);
    try {
      const created = await api.public.submit(form.slug, {
        answers: payload,
        duration_seconds: startedAt.current
          ? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
          : undefined,
      });
      setSubmitted(created);
    } catch (cause) {
      const issues = answerIssues(cause);
      const firstBad = form.questions.findIndex((question) => issues[question.id]);
      if (firstBad !== -1) {
        jumpTo(firstBad, issues[form.questions[firstBad].id]);
      } else {
        setFatal(
          cause instanceof ApiError
            ? cause.message
            : "Something went wrong sending your answers. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, form.questions, form.slug, jumpTo]);

  const advance = useCallback(() => {
    if (step.kind === "question") {
      const question = form.questions[step.index];
      const message = validateAnswer(question, answers[question.id] ?? null);
      if (message) {
        setError(message);
        setShake((count) => count + 1);
        return;
      }
      if (isLastQuestion) {
        void submit();
        return;
      }
    }
    setError(null);
    setDirection(1);
    setCursor((current) => Math.min(current + 1, steps.length - 1));
  }, [step, form.questions, answers, isLastQuestion, submit, steps.length]);

  const goBack = useCallback(() => {
    // Never validates: a respondent must always be able to return to a question
    // they left incomplete.
    setError(null);
    setDirection(-1);
    setCursor((current) => Math.max(current - 1, 0));
  }, []);

  const setAnswer = useCallback((questionId: number, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    // Clear the message as soon as they start fixing it.
    setError(null);
  }, []);

  useEffect(() => {
    if (submitted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Enter inside a field is handled by the field itself, so Shift+Enter can
      // stay a newline in long text.
      if (event.key === "Enter" && !inField) {
        event.preventDefault();
        advance();
      }

      // Arrows still navigate from a single-line input, where up/down have nothing
      // else to do — but not from a textarea (they move the caret) or a native
      // select (they change the selection).
      const arrowsOwnedByField = tag === "TEXTAREA" || tag === "SELECT";
      if (arrowsOwnedByField) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        advance();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goBack();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [advance, goBack, submitted]);

  const { theme } = form;

  if (submitted) {
    return (
      <main
        className="flex min-h-screen flex-col justify-center py-20"
        style={{ background: theme.background_color }}
      >
        <ProgressBar percentage={100} theme={theme} />
        <ThankYouScreen
          form={form}
          heading={submitted.thank_you_heading}
          description={submitted.thank_you_description}
        />
      </main>
    );
  }

  return (
    <main
      className="relative flex min-h-screen flex-col justify-center overflow-x-hidden py-24"
      style={{ background: theme.background_color }}
    >
      <ProgressBar percentage={progress} theme={theme} />

      {fatal && (
        <div className="fixed inset-x-0 top-[5px] z-30 flex justify-center px-4 py-3">
          <p
            role="alert"
            className="rounded-[8px] bg-[#fdeceb] px-4 py-2.5 text-[14px] font-medium text-[#c8372d]"
          >
            {fatal}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step.kind === "question" ? `q${step.index}` : "welcome"}
          initial={{ opacity: 0, y: direction * 52 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: direction * -52 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          {step.kind === "welcome" ? (
            <WelcomeScreen form={form} onStart={advance} />
          ) : (
            <QuestionScreen
              form={form}
              question={form.questions[step.index]}
              number={step.index + 1}
              value={answers[form.questions[step.index].id] ?? null}
              onChange={(value) => setAnswer(form.questions[step.index].id, value)}
              onAdvance={advance}
              error={error}
              shakeKey={shake}
              isLast={isLastQuestion}
              submitting={submitting}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <BottomBar
        theme={theme}
        canGoBack={cursor > 0}
        canGoForward={!isLastQuestion}
        onBack={goBack}
        onForward={advance}
      />
    </main>
  );
}
