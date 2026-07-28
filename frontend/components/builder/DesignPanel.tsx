"use client";

import { motion } from "motion/react";

import { IconButton } from "@/components/ui/Button";
import { Close } from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import type { FormTheme, FormUpdatePayload } from "@/lib/types";

/**
 * Preset themes.
 *
 * The brief lists custom themes as a bonus; presets plus per-colour pickers cover
 * it without needing a font-upload pipeline. Every value maps onto a column of
 * `form_themes`, so a chosen theme survives a reload and applies to the public form.
 */
const PRESETS: { name: string; theme: FormTheme }[] = [
  {
    name: "Default",
    theme: {
      background_color: "#FFFFFF",
      question_color: "#262627",
      answer_color: "#4B5563",
      button_color: "#262627",
      button_text_color: "#FFFFFF",
      font_family: "Inter",
    },
  },
  {
    name: "Midnight",
    theme: {
      background_color: "#0B1B2B",
      question_color: "#FFFFFF",
      answer_color: "#9CC5E8",
      button_color: "#3FA1F5",
      button_text_color: "#0B1B2B",
      font_family: "Inter",
    },
  },
  {
    name: "Sand",
    theme: {
      background_color: "#F6F1E7",
      question_color: "#33291B",
      answer_color: "#6B5B45",
      button_color: "#B4703A",
      button_text_color: "#FFFFFF",
      font_family: "Inter",
    },
  },
  {
    name: "Forest",
    theme: {
      background_color: "#10261E",
      question_color: "#EAF6EF",
      answer_color: "#A6CDB8",
      button_color: "#59B98A",
      button_text_color: "#0B1F17",
      font_family: "Inter",
    },
  },
  {
    name: "Blush",
    theme: {
      background_color: "#FDF1F2",
      question_color: "#3A1F26",
      answer_color: "#7C5560",
      button_color: "#D06A80",
      button_text_color: "#FFFFFF",
      font_family: "Inter",
    },
  },
];

const SWATCHES: { key: keyof FormTheme; label: string }[] = [
  { key: "background_color", label: "Background" },
  { key: "question_color", label: "Question" },
  { key: "answer_color", label: "Answer" },
  { key: "button_color", label: "Button" },
  { key: "button_text_color", label: "Button text" },
];

export function DesignPanel({
  theme,
  onPatchForm,
  onClose,
}: {
  theme: FormTheme;
  onPatchForm: (patch: FormUpdatePayload) => void;
  onClose: () => void;
}) {
  const activePreset = PRESETS.find(
    (preset) =>
      preset.theme.background_color.toLowerCase() === theme.background_color.toLowerCase() &&
      preset.theme.button_color.toLowerCase() === theme.button_color.toLowerCase(),
  );

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 296, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="scrollbar-slim shrink-0 overflow-y-auto overflow-x-hidden border-l border-line bg-canvas"
    >
      <div className="w-[296px] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-ink">Design</h3>
          <IconButton label="Close design panel" onClick={onClose}>
            <Close size={18} />
          </IconButton>
        </div>

        <p className="mt-4 mb-2.5 text-[13px] font-semibold tracking-wide text-ink-faint uppercase">
          Themes
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onPatchForm({ theme: preset.theme })}
              aria-pressed={activePreset?.name === preset.name}
              className={cn(
                "overflow-hidden rounded-[9px] border-2 text-left transition-colors",
                activePreset?.name === preset.name ? "border-plum" : "border-line hover:border-ink-faint",
              )}
            >
              <span
                className="flex h-[62px] flex-col items-start justify-center gap-1.5 px-3"
                style={{ background: preset.theme.background_color }}
              >
                <span
                  className="h-1.5 w-11 rounded-full"
                  style={{ background: preset.theme.question_color }}
                />
                <span
                  className="h-1.5 w-8 rounded-full"
                  style={{ background: preset.theme.answer_color }}
                />
                <span
                  className="mt-0.5 h-3 w-7 rounded-[3px]"
                  style={{ background: preset.theme.button_color }}
                />
              </span>
              <span className="block px-2.5 py-1.5 text-[12.5px] text-ink">{preset.name}</span>
            </button>
          ))}
        </div>

        <p className="mt-6 mb-1 text-[13px] font-semibold tracking-wide text-ink-faint uppercase">
          Colours
        </p>
        <div className="divide-y divide-line-soft">
          {SWATCHES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[14px] text-ink">{label}</span>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="font-mono text-[12px] text-ink-soft uppercase">
                  {String(theme[key])}
                </span>
                <span
                  className="h-7 w-7 shrink-0 rounded-md border border-line"
                  style={{ background: String(theme[key]) }}
                />
                {/* The native colour input is the control; it is visually hidden so
                    the swatch can be styled to match the rest of the panel. */}
                <input
                  type="color"
                  value={String(theme[key])}
                  onChange={(event) => onPatchForm({ theme: { [key]: event.target.value } })}
                  aria-label={`${label} colour`}
                  className="sr-only"
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
