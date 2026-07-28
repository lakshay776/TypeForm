"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { ChoiceOption } from "@/components/form/ChoiceOption";
import { ChevronDown } from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import type { FormTheme, Question } from "@/lib/types";

/** The value shape an answer can take, matching what the API accepts. */
export type AnswerValue = string | number | boolean | number[] | null;

interface AnswerFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  theme: FormTheme;
  /** Non-interactive rendering for the builder canvas. */
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Renders the input for one question.
 *
 * Deliberately knows nothing about navigation, progress or transitions — those
 * belong to whatever is driving it. That separation is what lets the builder
 * canvas, the live preview and the public respondent flow all render answers
 * through this one component instead of maintaining three copies of eight types.
 */
export function AnswerField({
  question,
  value,
  onChange,
  theme,
  disabled = false,
  autoFocus = false,
  onSubmit,
}: AnswerFieldProps) {
  const { answer_color: answerColor, button_color: buttonColor } = theme;

  /** Enter submits, except in a long-text field where it should insert a newline. */
  const submitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  switch (question.type) {
    case "short_text":
    case "email":
    case "number": {
      const isNumber = question.type === "number";
      return (
        <input
          type={isNumber ? "text" : question.type === "email" ? "email" : "text"}
          inputMode={isNumber ? (question.allow_decimal ? "decimal" : "numeric") : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={submitOnEnter}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={question.max_length ?? undefined}
          placeholder={question.placeholder || "Type your answer here..."}
          aria-label={question.title || "Your answer"}
          className={cn(
            "placeholder-themed w-full max-w-[680px] border-b-[1.5px] bg-transparent pb-2",
            "text-[24px] outline-none transition-colors duration-200 disabled:cursor-default",
          )}
          style={
            {
              color: answerColor,
              borderColor: `${answerColor}4d`,
              "--placeholder-color": `${answerColor}73`,
            } as React.CSSProperties
          }
        />
      );
    }

    case "long_text":
      return (
        <textarea
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            // Shift+Enter is a newline; plain Enter advances, matching Typeform.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit?.();
            }
          }}
          disabled={disabled}
          autoFocus={autoFocus}
          rows={2}
          maxLength={question.max_length ?? undefined}
          placeholder={question.placeholder || "Type your answer here..."}
          aria-label={question.title || "Your answer"}
          className="placeholder-themed w-full max-w-[680px] resize-none border-b-[1.5px] bg-transparent pb-2 text-[24px] leading-snug outline-none disabled:cursor-default"
          style={
            {
              color: answerColor,
              borderColor: `${answerColor}4d`,
              "--placeholder-color": `${answerColor}73`,
            } as React.CSSProperties
          }
        />
      );

    case "multiple_choice":
      return (
        <div className="flex w-full max-w-[620px] flex-col gap-2.5">
          {question.options.map((option, index) => {
            const selectedIds = Array.isArray(value) ? value : [];
            const selected = selectedIds.includes(option.id);
            return (
              <ChoiceOption
                key={option.id}
                index={index}
                selected={selected}
                answerColor={answerColor}
                buttonColor={buttonColor}
                onClick={() => {
                  if (disabled) return;
                  if (!question.allow_multiple) {
                    onChange(selected ? [] : [option.id]);
                    return;
                  }
                  onChange(
                    selected
                      ? selectedIds.filter((id) => id !== option.id)
                      : [...selectedIds, option.id],
                  );
                }}
                className={disabled ? "cursor-default" : "cursor-pointer"}
              >
                {option.label || <span className="italic opacity-55">Choice</span>}
              </ChoiceOption>
            );
          })}
        </div>
      );

    case "dropdown":
      return (
        <DropdownField
          question={question}
          value={value}
          onChange={onChange}
          theme={theme}
          disabled={disabled}
        />
      );

    case "yes_no":
      return (
        <div className="flex w-full max-w-[420px] flex-col gap-2.5">
          {[true, false].map((option, index) => (
            <ChoiceOption
              key={String(option)}
              index={index}
              selected={value === option}
              answerColor={answerColor}
              buttonColor={buttonColor}
              onClick={() => !disabled && onChange(value === option ? null : option)}
              className={disabled ? "cursor-default" : "cursor-pointer"}
            >
              {option ? "Yes" : "No"}
            </ChoiceOption>
          ))}
        </div>
      );

    case "rating": {
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: question.rating_max }, (_, index) => index + 1).map((step) => (
            <button
              key={step}
              type="button"
              disabled={disabled}
              onClick={() => onChange(current === step ? null : step)}
              aria-label={`${step} out of ${question.rating_max}`}
              aria-pressed={current === step}
              className={cn(
                "flex items-center justify-center transition-transform duration-150",
                !disabled && "hover:scale-110",
                question.rating_icon === "number"
                  ? "h-11 min-w-11 rounded-[7px] border-[1.5px] px-3 text-[18px] font-medium"
                  : "p-0.5",
              )}
              style={
                question.rating_icon === "number"
                  ? {
                      borderColor: current >= step ? buttonColor : `${answerColor}59`,
                      background: current >= step ? buttonColor : "transparent",
                      color: current >= step ? theme.button_text_color : answerColor,
                    }
                  : { color: current >= step ? buttonColor : `${answerColor}59` }
              }
            >
              {question.rating_icon === "number" ? (
                step
              ) : (
                <RatingGlyph shape={question.rating_icon} filled={current >= step} />
              )}
            </button>
          ))}
        </div>
      );
    }
  }
}

/**
 * Themed dropdown.
 *
 * A native `<select>` renders its option list through the operating system, so the
 * form's theme cannot reach it — on a dark theme you get a light OS menu, and the
 * A/B/C keys can't be shown at all. This is a listbox built from the same
 * `ChoiceOption` card the other choice types use, so a dropdown and a multiple
 * choice look like the same form.
 */
function DropdownField({
  question,
  value,
  onChange,
  theme,
  disabled,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  theme: FormTheme;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedId = Array.isArray(value) && value.length > 0 ? value[0] : null;
  const selected = question.options.find((option) => option.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Stopped so the surrounding flow doesn't also act on Escape.
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="w-full max-w-[620px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={question.title || "Your answer"}
        className="flex w-full items-center gap-3 border-b-[1.5px] bg-transparent pb-2 text-left text-[24px] disabled:cursor-default"
        style={{ color: theme.answer_color, borderColor: `${theme.answer_color}4d` }}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "opacity-55")}>
          {selected ? selected.label || "Choice" : question.placeholder || "Select an option"}
        </span>
        <ChevronDown
          size={22}
          className={cn("shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="scrollbar-slim mt-3 flex max-h-[320px] flex-col gap-2.5 overflow-y-auto"
          >
            {question.options.map((option, index) => (
              <li key={option.id} role="option" aria-selected={option.id === selectedId}>
                <ChoiceOption
                  index={index}
                  selected={option.id === selectedId}
                  answerColor={theme.answer_color}
                  buttonColor={theme.button_color}
                  onClick={() => {
                    onChange(option.id === selectedId ? [] : [option.id]);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  {option.label || <span className="italic opacity-55">Choice</span>}
                </ChoiceOption>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function RatingGlyph({ shape, filled }: { shape: string; filled: boolean }) {
  const common = {
    width: 38,
    height: 38,
    viewBox: "0 0 24 24",
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (shape === "heart") {
    return (
      <svg {...common}>
        <path d="M12 20.3l-1.3-1.2C6.1 15 3.2 12.4 3.2 9.1A4.7 4.7 0 0112 6.4a4.7 4.7 0 018.8 2.7c0 3.3-2.9 5.9-7.5 10z" />
      </svg>
    );
  }
  if (shape === "thumb") {
    return (
      <svg {...common}>
        <path d="M7 10.6h2.6l2.7-6a2.1 2.1 0 013 2.7l-1.2 3.3H19a1.8 1.8 0 011.7 2.3l-1.6 6A1.8 1.8 0 0117.4 20H7M7 10.6V20M4.2 20h2.8V10.6H4.2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3.6l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.6z" />
    </svg>
  );
}
