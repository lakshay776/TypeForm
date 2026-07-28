"use client";

import { Plus } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

export type DeviceMode = "desktop" | "mobile";

interface CanvasToolbarProps {
  device: DeviceMode;
  onDeviceChange: (device: DeviceMode) => void;
  onAddContent: () => void;
  onDesign: () => void;
  onPreview: () => void;
  onPlaceholder: (feature: string) => void;
  designOpen: boolean;
}

export function CanvasToolbar({
  device,
  onDeviceChange,
  onAddContent,
  onDesign,
  onPreview,
  onPlaceholder,
  designOpen,
}: CanvasToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-line bg-canvas px-2 py-2">
      <button
        type="button"
        onClick={onAddContent}
        className="flex items-center gap-2 rounded-[8px] bg-plum px-3.5 py-2 text-[14.5px] font-medium text-white transition-colors hover:bg-plum-hover"
      >
        <Plus size={17} />
        Add content
      </button>

      <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />

      <ToolButton
        label="Design"
        active={designOpen}
        onClick={onDesign}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3.75a8.25 8.25 0 000 16.5c1.24 0 1.9-.86 1.9-1.86 0-1.1-.8-1.64-.8-2.5 0-.86.7-1.39 1.6-1.39h1.55A3.75 3.75 0 0020 10.75C20 6.6 16.42 3.75 12 3.75z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="8.4" cy="10.4" r="1.05" fill="currentColor" />
            <circle cx="12" cy="7.9" r="1.05" fill="currentColor" />
            <circle cx="15.7" cy="9.9" r="1.05" fill="currentColor" />
          </svg>
        }
      >
        Design
      </ToolButton>

      <ToolButton
        label={device === "mobile" ? "Switch to desktop preview" : "Switch to mobile preview"}
        active={device === "mobile"}
        onClick={() => onDeviceChange(device === "mobile" ? "desktop" : "mobile")}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="7"
              y="3"
              width="10"
              height="18"
              rx="2.4"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M10.6 18.2h2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />

      <ToolButton
        label="Preview the form"
        onClick={onPreview}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 5.6l10 6.4-10 6.4V5.6z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <ToolButton
        label="Accessibility"
        onClick={() => onPlaceholder("Accessibility settings")}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="8.2" r="1.1" fill="currentColor" />
            <path
              d="M8.4 10.6h7.2M12 10.9v5M12 15.9l-1.8 2.4M12 15.9l1.8 2.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        }
      />

      <ToolButton
        label="Version history"
        onClick={() => onPlaceholder("Version history")}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4.6 9.8A8 8 0 1112 20a8 8 0 01-6.6-3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M4.2 5.2v4.8h4.8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <ToolButton
        label="Translate"
        onClick={() => onPlaceholder("Translations")}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3.4 6h7.8M7 4.2v1.8M8.8 6c0 3.6-2 6.4-5.4 7.6M4.6 9.4c1 2 2.8 3.4 5 4.2M12.4 20l3.8-9.4L20 20M13.8 17.2h4.9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <ToolButton
        label="Form settings"
        onClick={() => onPlaceholder("Advanced form settings")}
        icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M12 3.6v2.2M12 18.2v2.2M4.8 12H2.6M21.4 12h-2.2M6.9 6.9L5.3 5.3M18.7 18.7l-1.6-1.6M6.9 17.1l-1.6 1.6M18.7 5.3l-1.6 1.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </div>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  active = false,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[14.5px] transition-colors",
        active ? "bg-hover text-ink" : "text-ink-soft hover:bg-hover hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
