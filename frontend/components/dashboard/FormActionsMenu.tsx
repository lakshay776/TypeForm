"use client";

import { Dropdown, MenuDivider, MenuItem } from "@/components/ui/Dropdown";
import {
  BarChart,
  Copy,
  Dots,
  ExternalLink,
  EyeOff,
  Globe,
  Link as LinkIcon,
  Pencil,
  Trash,
} from "@/components/ui/Icons";
import { cn } from "@/lib/format";
import type { FormSummary } from "@/lib/types";

export interface FormActions {
  onRename: () => void;
  onDuplicate: () => void;
  onTogglePublish: () => void;
  onCopyLink: () => void;
  onOpenPublic: () => void;
  onViewResponses: () => void;
  onDelete: () => void;
}

export function FormActionsMenu({
  form,
  actions,
  className,
}: {
  form: FormSummary;
  actions: FormActions;
  className?: string;
}) {
  const published = form.status === "published";

  return (
    <Dropdown
      width={218}
      trigger={({ open }) => (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Actions for ${form.title}`}
          title="More"
          className={cn(
            "flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-control)]",
            "text-ink-soft transition-colors duration-150 hover:bg-hover hover:text-ink",
            open && "bg-hover text-ink",
            className,
          )}
        >
          <Dots size={19} />
        </span>
      )}
    >
      {({ close }) => (
        <>
          <MenuItem
            icon={<Pencil size={16} />}
            onClick={() => {
              close();
              actions.onRename();
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            icon={<Copy size={16} />}
            onClick={() => {
              close();
              actions.onDuplicate();
            }}
          >
            Duplicate
          </MenuItem>
          <MenuItem
            icon={<BarChart size={16} />}
            onClick={() => {
              close();
              actions.onViewResponses();
            }}
            hint={form.response_count > 0 ? form.response_count : undefined}
          >
            Responses
          </MenuItem>

          <MenuDivider />

          <MenuItem
            icon={published ? <EyeOff size={16} /> : <Globe size={16} />}
            onClick={() => {
              close();
              actions.onTogglePublish();
            }}
          >
            {published ? "Unpublish" : "Publish"}
          </MenuItem>
          <MenuItem
            icon={<LinkIcon size={16} />}
            disabled={!published}
            onClick={() => {
              close();
              actions.onCopyLink();
            }}
          >
            Copy link
          </MenuItem>
          <MenuItem
            icon={<ExternalLink size={16} />}
            disabled={!published}
            onClick={() => {
              close();
              actions.onOpenPublic();
            }}
          >
            Open form
          </MenuItem>

          <MenuDivider />

          <MenuItem
            icon={<Trash size={16} />}
            tone="danger"
            onClick={() => {
              close();
              actions.onDelete();
            }}
          >
            Delete
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}

export function StatusPill({ status }: { status: FormSummary["status"] }) {
  const live = status === "published";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-[3px] text-[11.5px] font-medium",
        live ? "bg-live-bg text-live" : "bg-draft-bg text-draft",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-live" : "bg-draft")}
        aria-hidden="true"
      />
      {live ? "Live" : "Draft"}
    </span>
  );
}
