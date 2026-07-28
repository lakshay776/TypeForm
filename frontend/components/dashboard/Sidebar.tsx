"use client";

import { useState } from "react";

import { AskAI } from "@/components/dashboard/AskAI";
import { ResponseMeter } from "@/components/dashboard/ResponseMeter";
import { Button, Spinner } from "@/components/ui/Button";
import { ChevronUp, Grid2, Plus, Search } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

interface SidebarProps {
  search: string;
  onSearchChange: (value: string) => void;
  formCount: number;
  totalResponses: number;
  creating: boolean;
  onCreateForm: () => void;
  onPlaceholder: (feature: string) => void;
}

export function Sidebar({
  search,
  onSearchChange,
  formCount,
  totalResponses,
  creating,
  onCreateForm,
  onPlaceholder,
}: SidebarProps) {
  const [privateOpen, setPrivateOpen] = useState(true);

  return (
    <aside className="flex w-[var(--spacing-sidebar)] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="px-5 pt-7 pb-5">
        <Button
          variant="primary"
          size="lg"
          onClick={onCreateForm}
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

      <div className="mx-5 h-px bg-line" />

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
