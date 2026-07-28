"use client";

import { Dropdown, MenuItem } from "@/components/ui/Dropdown";
import { Calendar, ChevronDown, Dots, Grid2, ListIcon, Users } from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import { SORT_LABELS, type SortKey } from "@/hooks/useForms";

export type ViewMode = "list" | "grid";

interface WorkspaceHeaderProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onPlaceholder: (feature: string) => void;
  onRenameWorkspace: () => void;
}

export function WorkspaceHeader({
  sort,
  onSortChange,
  view,
  onViewChange,
  onPlaceholder,
  onRenameWorkspace,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-ink">
          My workspace
        </h1>

        <Dropdown
          align="start"
          width={200}
          trigger={({ open }) => (
            <span
              role="button"
              tabIndex={0}
              aria-label="Workspace actions"
              className={cn(
                "flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-control)]",
                "text-ink-soft transition-colors hover:bg-hover hover:text-ink",
                open && "bg-hover text-ink",
              )}
            >
              <Dots size={19} />
            </span>
          )}
        >
          {({ close }) => (
            <>
              <MenuItem
                onClick={() => {
                  close();
                  onRenameWorkspace();
                }}
              >
                Rename workspace
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  onPlaceholder("Multiple workspaces");
                }}
              >
                Duplicate workspace
              </MenuItem>
            </>
          )}
        </Dropdown>

        <button
          type="button"
          onClick={() => onPlaceholder("Team collaboration")}
          className="flex items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[14.5px] text-ink transition-colors hover:bg-hover"
        >
          <Users size={18} className="text-ink-soft" />
          Invite
        </button>

        <button
          type="button"
          onClick={() => onPlaceholder("Workspace visibility")}
          aria-label="Workspace visibility"
          title="Private workspace"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#a5d6c4] bg-[#e6f4ef] text-live transition-colors hover:bg-[#d8ece4]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5.5c-4 0-7 3.6-7 6.5s3 6.5 7 6.5 7-3.6 7-6.5-3-6.5-7-6.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <Dropdown
          width={190}
          trigger={({ open }) => (
            <span
              role="button"
              tabIndex={0}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line",
                "bg-canvas px-3 py-2 text-[14px] text-ink transition-colors hover:bg-hover",
                open && "bg-hover",
              )}
            >
              <Calendar size={17} className="text-ink-soft" />
              {SORT_LABELS[sort]}
              <ChevronDown size={16} className="text-ink-soft" />
            </span>
          )}
        >
          {({ close }) => (
            <>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <MenuItem
                  key={key}
                  selected={key === sort}
                  hint={key === sort ? "✓" : undefined}
                  onClick={() => {
                    onSortChange(key);
                    close();
                  }}
                >
                  {SORT_LABELS[key]}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>

        <div
          className="flex items-center gap-0.5 rounded-[10px] bg-hover p-0.5"
          role="group"
          aria-label="View mode"
        >
          <ViewButton
            active={view === "list"}
            onClick={() => onViewChange("list")}
            icon={<ListIcon size={17} />}
            label="List"
          />
          <ViewButton
            active={view === "grid"}
            onClick={() => onViewChange("grid")}
            icon={<Grid2 size={17} />}
            label="Grid"
          />
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[14px] transition-all duration-150",
        active
          ? "bg-canvas font-medium text-ink shadow-[0_1px_3px_rgba(24,22,30,0.13)]"
          : "text-ink-soft hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
