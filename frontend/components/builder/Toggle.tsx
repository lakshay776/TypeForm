"use client";

import { HelpCircle } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

/** Labelled switch row, the repeated unit of the settings panel. */
export function ToggleRow({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Adds the small `?` affordance and a tooltip. */
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span
        className={cn(
          "flex items-center gap-1.5 text-[14px]",
          disabled ? "text-ink-faint" : "text-ink",
        )}
      >
        {label}
        {hint && (
          <span title={hint} className="text-ink-faint">
            <HelpCircle size={14} />
          </span>
        )}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-plum" : "bg-[#d3d1d8]",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {/* `left` is set explicitly. Without it an absolutely positioned child
            falls back to its static position, and a <button> centres its content
            by default — which parked the knob half-way across the track and, once
            translated, entirely outside it. Anchoring to the left edge means the
            translate distance is simply the track's travel: 38 - 3 - 3 - 16. */}
        <span
          className={cn(
            "absolute top-[3px] left-[3px] h-4 w-4 rounded-full",
            "transition-[transform,background-color] duration-200 ease-out",
            "shadow-[0_1px_2px_rgba(24,22,30,0.28)]",
            // The knob has to change colour with the track: a white knob is
            // invisible against the light "off" track.
            checked ? "translate-x-4 bg-white" : "translate-x-0 bg-plum",
          )}
        />
      </button>
    </div>
  );
}

/** Collapsible-looking section card, matching the panel's grouping. */
export function PanelSection({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-line bg-canvas">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children && <div className="px-4 pb-3">{children}</div>}
    </section>
  );
}

/** Compact numeric input used by the per-type settings. */
export function NumberRow({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "None",
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[14px] text-ink">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => {
          const raw = event.target.value;
          // An empty field means "no limit", which the API models as null —
          // distinct from 0, which is a real bound.
          onChange(raw === "" ? null : Number(raw));
        }}
        className="w-[86px] rounded-md border border-line bg-canvas px-2 py-1.5 text-right text-[13.5px] text-ink outline-none focus:border-plum"
      />
    </div>
  );
}
