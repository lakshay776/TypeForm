"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/format";

interface DropdownProps {
  trigger: (props: { open: boolean }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: "start" | "end";
  width?: number | "auto";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "end",
  width = 220,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", () => setOpen(false), true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {trigger({ open })}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: width === "auto" ? undefined : width }}
            className={cn(
              "absolute z-50 mt-1.5 overflow-hidden rounded-[10px] border border-line bg-canvas p-1.5",
              "shadow-[0_8px_28px_-6px_rgba(24,22,30,0.18),0_2px_6px_-2px_rgba(24,22,30,0.1)]",
              align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
              className,
            )}
          >
            {children({ close: () => setOpen(false) })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "danger";
  selected?: boolean;
}

export function MenuItem({
  icon,
  hint,
  tone = "default",
  selected = false,
  className,
  children,
  ...props
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px]",
        "transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50",
        tone === "danger"
          ? "text-danger hover:bg-danger-bg"
          : "text-ink hover:bg-hover",
        selected && "font-medium",
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-ink-soft">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 text-xs text-ink-faint">{hint}</span>}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-line-soft" role="separator" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
      {children}
    </div>
  );
}
