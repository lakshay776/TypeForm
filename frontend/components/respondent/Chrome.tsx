"use client";

import { motion } from "motion/react";

import { ChevronDown, ChevronUp } from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import type { FormTheme } from "@/lib/types";

/**
 * Fill-progress bar, pinned to the very top of the viewport.
 *
 * Driven by answered count rather than by step index: a respondent who skips
 * optional questions has genuinely made less progress through the form than one
 * who answered them, and the bar should say so.
 */
export function ProgressBar({ percentage, theme }: { percentage: number; theme: FormTheme }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 h-[5px]"
      style={{ background: `${theme.answer_color}1f` }}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progress through the form"
    >
      <motion.div
        className="h-full"
        style={{ background: theme.button_color }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** The ⌃ / ⌄ pair and the branding pill, bottom-right. */
export function BottomBar({
  theme,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: {
  theme: FormTheme;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <div className="fixed right-5 bottom-5 z-30 flex items-center gap-2.5">
      <div className="flex gap-1" role="group" aria-label="Move between questions">
        <StepButton
          label="Previous question"
          theme={theme}
          disabled={!canGoBack}
          onClick={onBack}
        >
          <ChevronUp size={19} />
        </StepButton>
        <StepButton
          label="Next question"
          theme={theme}
          disabled={!canGoForward}
          onClick={onForward}
        >
          <ChevronDown size={19} />
        </StepButton>
      </div>

      <span
        className="flex items-center gap-1.5 rounded-[6px] px-3 py-2 text-[12.5px] font-medium"
        style={{ background: theme.question_color, color: theme.background_color }}
      >
        Powered by
        <strong className="font-semibold">Typeform Clone</strong>
      </span>
    </div>
  );
}

function StepButton({
  label,
  theme,
  disabled,
  onClick,
  children,
}: {
  label: string;
  theme: FormTheme;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-10 items-center justify-center rounded-[6px] transition-opacity",
        disabled ? "cursor-not-allowed opacity-35" : "hover:opacity-80",
      )}
      style={{ background: `${theme.answer_color}1f`, color: theme.question_color }}
    >
      {children}
    </button>
  );
}

// ActionButton and EnterHint moved to components/form/Screens.tsx — they are used
// by the screens themselves, which the builder's preview now shares.
