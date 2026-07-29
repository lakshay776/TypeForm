"use client";

import { motion } from "motion/react";

import { AutoTextarea } from "@/components/builder/AutoTextarea";
import { Check } from "@/components/ui/Icons";
import type { FormDetail, FormUpdatePayload } from "@/lib/types";

export function ScreenCanvas({
  form,
  kind,
  onPatch,
}: {
  form: FormDetail;
  kind: "welcome" | "ending";
  onPatch: (patch: FormUpdatePayload) => void;
}) {
  const { theme } = form;
  const welcome = kind === "welcome";

  return (
    <motion.div
      key={kind}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-full flex-col items-center justify-center px-16 py-20 text-center"
      style={{ background: theme.background_color }}
    >
      <div className="w-full max-w-[640px]">
        {!welcome && (
          <span
            className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: `${theme.button_color}1f`, color: theme.button_color }}
          >
            <Check size={26} />
          </span>
        )}

        <AutoTextarea
          value={welcome ? form.welcome_heading : form.thank_you_heading}
          onChange={(value) =>
            onPatch(welcome ? { welcome_heading: value } : { thank_you_heading: value })
          }
          placeholder={welcome ? form.title || "Welcome heading" : "Thanks for completing this"}
          ariaLabel={welcome ? "Welcome heading" : "Thank-you heading"}
          className="text-center text-[34px] leading-[1.2] font-semibold tracking-[-0.02em]"
          style={{ color: theme.question_color }}
        />

        <AutoTextarea
          value={welcome ? form.welcome_description : form.thank_you_description}
          onChange={(value) =>
            onPatch(welcome ? { welcome_description: value } : { thank_you_description: value })
          }
          placeholder="Description (optional)"
          ariaLabel="Screen description"
          className="mt-3 text-center text-[18px] leading-relaxed"
          style={{ color: `${theme.answer_color}d9` }}
        />

        {welcome && (
          <div className="mt-9 flex flex-col items-center gap-2.5">
            <div
              className="rounded-[7px] px-7 py-3 text-[17px] font-medium"
              style={{ background: theme.button_color, color: theme.button_text_color }}
            >
              <input
                value={form.welcome_button_label}
                onChange={(event) => onPatch({ welcome_button_label: event.target.value })}
                placeholder="Start"
                aria-label="Start button label"
                size={Math.max(form.welcome_button_label.length || 5, 5)}
                className="bg-transparent text-center outline-none placeholder:opacity-70"
                style={{ color: theme.button_text_color }}
              />
            </div>
            <p className="text-[13px]" style={{ color: `${theme.answer_color}99` }}>
              press <strong className="font-semibold">Enter</strong> ↵
            </p>
          </div>
        )}
      </div>

      <p className="mt-14 text-[12.5px] text-ink-faint">
        {welcome
          ? "Shown before the first question. Turn it off in the settings panel."
          : "Shown after a response is submitted."}
      </p>
    </motion.div>
  );
}
