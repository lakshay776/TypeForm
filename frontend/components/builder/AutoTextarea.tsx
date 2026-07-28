"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/format";

/**
 * Textarea that grows to fit its content.
 *
 * The canvas edits question titles in place, so a fixed-height box with its own
 * scrollbar would break the illusion that you are typing directly onto the form.
 * Height is set in a layout effect rather than on change so it is also correct on
 * first paint and whenever the value changes from outside.
 */
export function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  style,
  ariaLabel,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent outline-none",
        "placeholder:text-ink-faint placeholder:italic",
        className,
      )}
      style={style}
    />
  );
}
