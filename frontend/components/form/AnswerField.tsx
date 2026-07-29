"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { ChoiceOption } from "@/components/form/ChoiceOption";
import { ChevronDown, Search } from "@/components/ui/Icons";
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
          autoFocus={autoFocus}
          onSubmit={onSubmit}
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
 * Themed dropdown — a searchable combobox.
 *
 * A native `<select>` renders its list through the operating system, so the form's
 * theme cannot reach it: on a dark theme you get a light OS menu. This is a
 * combobox instead, which also gets the type-to-filter behaviour a `<select>`
 * can't offer — the point of a dropdown over multiple choice is that the list may
 * be long enough to need searching.
 *
 * Unlike the other choice types this deliberately drops the A/B/C key badges.
 * Those exist so a respondent can pick with one keypress, which stops being true
 * once the visible list is a filtered subset and the letters no longer line up.
 */
function DropdownField({
  question,
  value,
  onChange,
  theme,
  disabled,
  autoFocus,
  onSubmit,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  theme: FormTheme;
  disabled: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // -1 so the freshly opened list shows no row as pre-picked. Typing moves it to
  // the first match, which is what makes Enter select the obvious candidate.
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { answer_color: answerColor, button_color: buttonColor } = theme;
  const selectedId = Array.isArray(value) && value.length > 0 ? value[0] : null;
  const selected = question.options.find((option) => option.id === selectedId) ?? null;

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? question.options.filter((option) => option.label.toLowerCase().includes(needle))
    : question.options;

  // Clamped on read rather than corrected in an effect: filtering can shrink the
  // list under a stale index, and an effect that calls setState to fix it would
  // render one frame with the highlight out of bounds.
  const activeIndex =
    matches.length && highlight >= 0 ? Math.min(highlight, matches.length - 1) : -1;
  const activeOption = activeIndex >= 0 ? matches[activeIndex] : null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keeps the keyboard-highlighted row visible without scrolling the page.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const choose = (optionId: number) => {
    // Always selects rather than toggling: re-picking the row you already chose
    // should not silently empty a dropdown.
    onChange([optionId]);
    setQuery("");
    setHighlight(-1);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight(Math.min(Math.max(activeIndex + delta, 0), Math.max(matches.length - 1, 0)));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      // An open list means Enter is picking an option, not answering the question.
      if (open && activeOption) {
        choose(activeOption.id);
        return;
      }
      onSubmit?.();
      return;
    }
    if (event.key === "Escape" && open) {
      // Marks the key handled so the preview or respondent flow doesn't also act
      // on it and close itself out from under someone who only meant to shut the
      // list. preventDefault is what those handlers check — stopPropagation alone
      // cannot reach a listener attached to the same node. Escape has no default
      // action worth preserving here.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  // The canvas renders a non-interactive stand-in: a closed control with a
  // chevron, matching how the builder shows every other field type.
  if (disabled) {
    return (
      <div className="w-full max-w-[680px]">
        <div
          className="flex w-full items-center gap-3 border-b-[1.5px] pb-2 text-[24px]"
          style={{ color: answerColor, borderColor: `${answerColor}4d` }}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "opacity-55")}>
            {selected ? selected.label || "Choice" : question.placeholder || "Type or select an option"}
          </span>
          <ChevronDown size={22} className="shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-[680px]">
      <div
        className="flex w-full items-center gap-3 border-b-[1.5px] pb-2"
        style={{ borderColor: `${answerColor}4d` }}
      >
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`dropdown-list-${question.id}`}
          aria-activedescendant={
            activeOption ? `dropdown-option-${question.id}-${activeOption.id}` : undefined
          }
          aria-autocomplete="list"
          aria-label={question.title || "Your answer"}
          autoComplete="off"
          autoFocus={autoFocus}
          // Shows the chosen label while closed, and the live query while open, so
          // opening the list never looks like it wiped the answer.
          value={open ? query : selected ? selected.label || "Choice" : ""}
          placeholder={question.placeholder || "Type or select an option"}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="placeholder-themed min-w-0 flex-1 bg-transparent text-[24px] outline-none"
          style={
            {
              color: answerColor,
              "--placeholder-color": `${answerColor}73`,
            } as React.CSSProperties
          }
        />
        <Search size={22} className="shrink-0 opacity-55" style={{ color: answerColor }} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 rounded-[10px] p-3 shadow-[0_18px_44px_-12px_rgba(0,0,0,0.28)]"
            style={{
              background: theme.background_color,
              border: `1px solid ${answerColor}1f`,
            }}
          >
            <ul
              id={`dropdown-list-${question.id}`}
              ref={listRef}
              role="listbox"
              className="scrollbar-slim flex max-h-[280px] flex-col gap-2 overflow-y-auto"
            >
              {matches.map((option, index) => {
                const isSelected = option.id === selectedId;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={option.id}
                    id={`dropdown-option-${question.id}-${option.id}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      // The list is dismissed on pointerdown elsewhere, so the
                      // press must not first move focus off the input.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(option.id)}
                      // mousemove, not mouseenter: opening the panel grows the
                      // step, which re-centres it and slides rows under a
                      // stationary cursor. mouseenter fires on that and would
                      // pre-highlight whichever row happened to land under the
                      // pointer — one Enter away from picking it. A layout shift
                      // does not produce a mousemove.
                      onMouseMove={() => setHighlight(index)}
                      className="flex w-full cursor-pointer items-center rounded-[8px] px-4 py-3 text-left text-[17px] transition-colors duration-100"
                      style={{
                        background: isSelected
                          ? `${buttonColor}24`
                          : isActive
                            ? `${answerColor}1a`
                            : `${answerColor}0d`,
                        color: answerColor,
                      }}
                    >
                      {option.label || <span className="italic opacity-55">Choice</span>}
                    </button>
                  </li>
                );
              })}

              {matches.length === 0 && (
                <li
                  className="px-4 py-3 text-[16px] italic opacity-55"
                  style={{ color: answerColor }}
                >
                  {question.options.length === 0
                    ? "No options in list"
                    : `No option matches “${query.trim()}”`}
                </li>
              )}
            </ul>
          </motion.div>
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
