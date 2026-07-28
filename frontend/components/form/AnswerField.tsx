"use client";

import { ChoiceOption } from "@/components/form/ChoiceOption";
import { ChevronDown } from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import { optionKey } from "@/lib/questionTypes";
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
        <div className="relative w-full max-w-[620px]">
          <select
            value={Array.isArray(value) && value.length > 0 ? String(value[0]) : ""}
            onChange={(event) =>
              onChange(event.target.value ? [Number(event.target.value)] : [])
            }
            disabled={disabled}
            autoFocus={autoFocus}
            aria-label={question.title || "Your answer"}
            className="w-full appearance-none border-b-[1.5px] bg-transparent pb-2 pr-8 text-[24px] outline-none disabled:cursor-default"
            style={{ color: answerColor, borderColor: `${answerColor}4d` }}
          >
            <option value="">Type or select an option</option>
            {question.options.map((option, index) => (
              <option key={option.id} value={option.id}>
                {optionKey(index)} — {option.label || "Choice"}
              </option>
            ))}
          </select>
          <ChevronDown
            size={22}
            className="pointer-events-none absolute right-1 bottom-3"
            style={{ color: answerColor }}
          />
        </div>
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
