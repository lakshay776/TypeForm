"use client";

import { useState } from "react";

import {
  Automations,
  Contacts,
  Forms,
  ResearchFlow,
} from "@/components/ui/Icons";
import { ComingSoonModal } from "@/components/ui/Modal";
import { cn } from "@/lib/format";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Tabs without an implementation open the placeholder dialog. */
  available?: boolean;
  badge?: string;
}

const TABS: Tab[] = [
  { id: "forms", label: "Forms", icon: <Forms size={19} />, available: true },
  { id: "contacts", label: "Contacts", icon: <Contacts size={19} /> },
  { id: "automations", label: "Automations", icon: <Automations size={19} /> },
];

const DEMO_TAB: Tab = {
  id: "research",
  label: "Research Flow",
  icon: <ResearchFlow size={19} />,
  badge: "Demo",
};

export function NavTabs() {
  const [active, setActive] = useState("forms");
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  const select = (tab: Tab) => {
    if (tab.available) setActive(tab.id);
    else setPlaceholder(tab.label);
  };

  return (
    <>
      <nav
        // Scrolls sideways rather than wrapping or clipping: four tabs plus a
        // badge do not fit at 375px, and a second row would push the list down.
        className="scrollbar-slim flex h-[46px] shrink-0 items-end gap-1 overflow-x-auto overflow-y-hidden border-b border-line bg-workspace px-3 whitespace-nowrap sm:px-5"
        aria-label="Sections"
      >
        {TABS.map((tab) => (
          <TabButton key={tab.id} tab={tab} active={active === tab.id} onSelect={select} />
        ))}

        <span className="mx-3 mb-4 h-6 w-px bg-line" aria-hidden="true" />

        <TabButton tab={DEMO_TAB} active={active === DEMO_TAB.id} onSelect={select} />
      </nav>

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
}: {
  tab: Tab;
  active: boolean;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2 rounded-t-md px-3 pt-2 pb-3 text-[14.5px] transition-colors duration-150",
        active ? "font-medium text-ink" : "text-ink-soft hover:text-ink",
      )}
    >
      <span className={active ? "text-ink" : "text-ink-soft"}>{tab.icon}</span>
      {tab.label}

      {tab.badge && (
        <span className="rounded-full bg-[#e8effb] px-2 py-0.5 text-[11.5px] font-medium text-[#3a63b8]">
          {tab.badge}
        </span>
      )}

      {/* Sits on the nav's bottom border rather than under it, so the active
          tab's indicator visually replaces that segment of the line. */}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-ink" />
      )}
    </button>
  );
}
