"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/format";

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
