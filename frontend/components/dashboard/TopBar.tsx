"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dropdown, MenuDivider, MenuItem, MenuLabel } from "@/components/ui/Dropdown";
import {
  ChevronDown,
  HelpCircle,
  LogoMark,
  Palette,
  Puzzle,
} from "@/components/ui/Icons";
import { ComingSoonModal } from "@/components/ui/Modal";
import { cn } from "@/lib/format";
import type { Creator } from "@/lib/types";

/** "Alex Morgan" -> "AM"; falls back to the email's first letter. */
function initials(creator: Creator | null): string {
  if (!creator) return "–";
  const parts = creator.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] ?? creator.email[0]).toUpperCase();
}

/** Typeform shows the account handle rather than the display name here. */
function handle(creator: Creator | null): string {
  return creator ? creator.email.split("@")[0] : "…";
}

export function TopBar({ creator }: { creator: Creator | null }) {
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  return (
    <>
      <header className="flex h-[68px] shrink-0 items-center justify-between gap-4 bg-canvas px-5">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />

          <Dropdown
            align="start"
            width={260}
            trigger={({ open }) => (
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-control)] py-1.5 pr-2 pl-1.5",
                  "transition-colors duration-150 hover:bg-hover",
                  open && "bg-hover",
                )}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#b686d6,#9a67c6)" }}
                >
                  {initials(creator)}
                </span>
                <span className="max-w-[190px] truncate text-[15px] text-ink">
                  {handle(creator)}
                </span>
                <ChevronDown size={16} className="text-ink-soft" />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <MenuLabel>Signed in as</MenuLabel>
                <div className="px-2.5 pb-2">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {creator?.name ?? "Loading…"}
                  </p>
                  <p className="truncate text-[12.5px] text-ink-soft">{creator?.email}</p>
                </div>
                <MenuDivider />
                <MenuItem
                  onClick={() => {
                    close();
                    setPlaceholder("Account settings");
                  }}
                >
                  Account settings
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    close();
                    setPlaceholder("Team collaboration");
                  }}
                >
                  Invite teammates
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>

        <div className="flex items-center gap-1">
          <TopBarLink
            icon={<Puzzle size={19} />}
            label="Integrations"
            onClick={() => setPlaceholder("Integrations")}
          />
          <TopBarLink
            icon={<Palette size={19} />}
            label="Brand kit"
            onClick={() => setPlaceholder("Brand kit")}
          />

          <Button
            variant="evergreen"
            className="ml-2 h-9 px-4 text-[14px] font-semibold"
            onClick={() => setPlaceholder("Plans and billing")}
          >
            View plans
          </Button>

          <button
            type="button"
            aria-label="Help"
            title="Help"
            onClick={() => setPlaceholder("Help centre")}
            className="ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <HelpCircle size={21} />
          </button>

          <span
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#cf8fc4,#b56aae)" }}
            title={creator?.email}
          >
            {initials(creator)}
          </span>
        </div>
      </header>

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </>
  );
}

function TopBarLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-[14.5px] text-ink transition-colors duration-150 hover:bg-hover"
    >
      <span className="text-ink-soft">{icon}</span>
      {label}
    </button>
  );
}
