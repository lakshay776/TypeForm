"use client";

import { useState } from "react";

import { AskAI } from "@/components/dashboard/AskAI";
import { ResponseMeter } from "@/components/dashboard/ResponseMeter";
import { Button, Spinner } from "@/components/ui/Button";
import { ChevronUp, Close, Grid2, Plus, Search } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

interface SidebarProps {
  search: string;
  onSearchChange: (value: string) => void;
  formCount: number;
  totalResponses: number;
  creating: boolean;
  onCreateForm: () => void;
  onPlaceholder: (feature: string) => void;
  /** Drawer state, used below lg only. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  search,
  onSearchChange,
  formCount,
  totalResponses,
  creating,
  onCreateForm,
  onPlaceholder,
  open = false,
  onClose,
}: SidebarProps) {
  const [privateOpen, setPrivateOpen] = useState(true);

  return (
    <aside
      className={cn(
        "flex w-[var(--spacing-sidebar)] shrink-0 flex-col border-r border-line bg-workspace",
        // Off-canvas below lg, in the flow from lg up. Translated rather than
        // unmounted so the search box keeps its value across open and close.
        "fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
        open ? "translate-x-0 shadow-[0_0_40px_-8px_rgba(24,22,30,0.35)]" : "-translate-x-full",
      )}
    >
      {/* Only the drawer needs dismissing; from lg up the rail is just there. */}
      <div className="flex justify-end px-3 pt-3 lg:hidden">
        <button
          type="button"
          aria-label="Close the menu"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-ink-soft transition-colors hover:bg-hover hover:text-ink"
        >
          <Close size={19} />
        </button>
      </div>

      <div className="px-5 pt-4 pb-5 lg:pt-7">
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            // Closes the drawer as it navigates, or the new builder would open
            // behind it on a phone.
            onClose?.();
            onCreateForm();
          }}
          disabled={creating}
          className="w-full font-semibold"
        >
          {creating ? (
            <Spinner />
          ) : (
            <>
              <Plus size={18} />
              Create form
            </>
          )}
        </Button>
      </div>

      <div className="px-5 pb-4">
        <label className="flex items-center gap-2.5 text-ink-soft focus-within:text-ink">
          <Search size={19} className="shrink-0" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            aria-label="Search forms"
            className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-ink outline-none placeholder:text-ink-soft"
          />
        </label>
      </div>

      {/* A white band, not a grey hairline: with the rail itself on #F7F7F8 the
          separation reads as a gap between groups rather than a drawn rule. */}
      <div className="h-1.5 shrink-0 bg-canvas" />

      <div className="flex items-center justify-between px-5 pt-5 pb-1.5">
        <span className="flex items-center gap-2.5 text-[15px] text-ink">
          <Grid2 size={19} className="text-ink-soft" />
          Workspaces
        </span>
        <button
          type="button"
          aria-label="Create workspace"
          title="Create workspace"
          onClick={() => onPlaceholder("Multiple workspaces")}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-canvas text-ink-soft transition-colors hover:text-ink"
        >
          <Plus size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setPrivateOpen((value) => !value)}
        aria-expanded={privateOpen}
        className="flex items-center justify-between px-5 py-2.5 text-[14.5px] text-ink-soft transition-colors hover:text-ink"
      >
        Private
        <ChevronUp
          size={16}
          className={cn("transition-transform duration-200", !privateOpen && "rotate-180")}
        />
      </button>

      {privateOpen && (
        <div className="px-2.5">
          <div
            className="flex items-center justify-between rounded-[var(--radius-control)] bg-selected px-2.5 py-2 text-[14.5px] text-ink"
            aria-current="true"
          >
            My workspace
            <span className="text-[13.5px] text-ink-soft">{formCount}</span>
          </div>
        </div>
      )}

      {/* Pushes the meter and composer to the bottom of the rail. */}
      <div className="flex-1" />

      <ResponseMeter
        used={totalResponses}
        onUpgrade={() => onPlaceholder("Plans and billing")}
      />
      <AskAI onSubmit={() => onPlaceholder("Typeform AI")} />
    </aside>
  );
}
