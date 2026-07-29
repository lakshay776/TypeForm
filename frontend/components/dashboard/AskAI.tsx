"use client";

import { useState } from "react";

import { Mic, Send } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

export function AskAI({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <div className="p-4">
      <div
        className={cn(
          "rounded-[14px] p-[1.5px] transition-shadow duration-200",
          focused && "shadow-[0_0_0_3px_rgba(167,124,214,0.16)]",
        )}
        style={{ background: "linear-gradient(120deg,#c79ae0,#9a7ad4,#7f9ede)" }}
      >
        <div className="flex items-center gap-2 rounded-[12.5px] bg-canvas px-3 py-2.5">
          <Mic size={19} className="shrink-0 text-ink-soft" />

          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Ask Typeform AI"
            aria-label="Ask Typeform AI"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-faint"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
              value.trim()
                ? "bg-plum text-white"
                : "border border-line text-ink-faint",
            )}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
