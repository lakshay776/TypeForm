"use client";

import { useEffect, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Dropdown, MenuDivider, MenuItem } from "@/components/ui/Dropdown";
import { ChevronRight, Copy, Dots, Plus, Trash } from "@/components/ui/Icons";
import { IconEndScreen, IconWelcomeScreen } from "@/components/ui/TypeIcons";
import { ACCENT_CLASSES, TYPE_META } from "@/lib/questionTypes";
import { cn, questionLabel } from "@/lib/format";
import type { Question } from "@/lib/types";
import type { Selection } from "@/hooks/useBuilder";

interface PagesPanelProps {
  questions: Question[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onAddContent: () => void;
  onReorder: (ids: number[]) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  /** Whether this form has a welcome screen; it is opt-in, not automatic. */
  showWelcomeScreen: boolean;
  onRemoveWelcomeScreen: () => void;
  onPlaceholder: (feature: string) => void;
}

export function PagesPanel({
  questions,
  selection,
  onSelect,
  onAddContent,
  onReorder,
  onDelete,
  onDuplicate,
  showWelcomeScreen,
  onRemoveWelcomeScreen,
  onPlaceholder,
}: PagesPanelProps) {
  const sensors = useSensors(
    // A small distance threshold means a click still selects the question rather
    // than being swallowed as a zero-length drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = questions.map((question) => question.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from === -1 || to === -1) return;

    const next = [...ids];
    next.splice(to, 0, ...next.splice(from, 1));
    onReorder(next);
  };

  return (
    <aside className="flex w-[320px] shrink-0 flex-col gap-3 overflow-hidden bg-sidebar p-5 pt-4">
      <button
        type="button"
        onClick={() => onPlaceholder("Universal mode")}
        className="flex shrink-0 items-center gap-2.5 rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink transition-colors hover:bg-hover"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 6.5h16M4 12h16M4 17.5h16"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        Universal mode
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="ml-auto text-ink-soft"
          aria-hidden="true"
        >
          <path d="M6 9.5l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Pages card */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[10px] border border-line bg-canvas p-2.5">
        <p className="px-1.5 pt-1.5 pb-2.5 text-[15px] font-semibold text-ink">Pages</p>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
          {/* Only present once the creator has added it from the element picker. */}
          {showWelcomeScreen && (
            <ScreenRow
              label="Welcome screen"
              icon={<IconWelcomeScreen size={16} />}
              selected={selection.kind === "welcome"}
              onSelect={() => onSelect({ kind: "welcome" })}
              onRemove={onRemoveWelcomeScreen}
            />
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((question) => question.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-0.5 space-y-0.5">
                {questions.map((question, index) => (
                  <SortableQuestion
                    key={question.id}
                    question={question}
                    number={index + 1}
                    selected={
                      selection.kind === "question" && selection.id === question.id
                    }
                    onSelect={() => onSelect({ kind: "question", id: question.id })}
                    onDelete={() => onDelete(question.id)}
                    onDuplicate={() => onDuplicate(question.id)}
                    onPlaceholder={onPlaceholder}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={onAddContent}
            className="mt-1 flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2.5 text-[14.5px] text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <Plus size={17} />
            Add content
          </button>
        </div>

        <button
          type="button"
          onClick={() => onPlaceholder("Logic jumps and branching")}
          className="mt-2.5 flex shrink-0 items-center gap-2.5 rounded-[10px] border border-line bg-sidebar px-3 py-3 text-left transition-colors hover:bg-hover"
        >
          <span className="text-[#a9762a]" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3.4a5.6 5.6 0 00-3.2 10.2v2.2h6.4v-2.2A5.6 5.6 0 0012 3.4zM9.6 19.2h4.8M10.4 21.4h3.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex-1 text-[13.5px] leading-snug text-ink">
            Personalize with branching
          </span>
          <ChevronRight size={17} className="text-ink-soft" />
        </button>
      </div>

      {/* Endings card */}
      <div className="shrink-0 rounded-[10px] border border-line bg-canvas p-2.5">
        <div className="flex items-center justify-between px-1.5 py-1">
          <p className="text-[15px] font-semibold text-ink">Endings</p>
          <button
            type="button"
            onClick={() => onPlaceholder("Multiple endings")}
            aria-label="Add an ending"
            title="Add an ending"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="mt-1.5">
          <ScreenRow
            label="Thank you screen"
            icon={<IconEndScreen size={16} />}
            selected={selection.kind === "ending"}
            onSelect={() => onSelect({ kind: "ending" })}
          />
        </div>
      </div>
    </aside>
  );
}

/**
 * Welcome / ending rows: selectable like questions but not draggable.
 *
 * `onRemove` is only passed for the welcome screen, which is optional. The
 * thank-you screen has no remove action because every submission needs somewhere
 * to land.
 */
function ScreenRow({
  label,
  icon,
  selected,
  onSelect,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        "group/screen flex items-center gap-2.5 rounded-[8px] px-2 py-2 transition-colors duration-100",
        selected ? "bg-selected" : "hover:bg-hover",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[#ececed] text-[#5b5b62]">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{label}</span>
      </button>

      {onRemove && (
        <Dropdown
          width={200}
          trigger={({ open }) => (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Options for ${label}`}
              className={cn(
                "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-opacity",
                "opacity-0 group-hover/screen:opacity-100 focus-visible:opacity-100 hover:bg-canvas hover:text-ink",
                (open || selected) && "opacity-100",
              )}
            >
              <Dots size={16} />
            </span>
          )}
        >
          {({ close }) => (
            <MenuItem
              icon={<Trash size={16} />}
              tone="danger"
              onClick={() => {
                close();
                onRemove();
              }}
            >
              Remove
            </MenuItem>
          )}
        </Dropdown>
      )}
    </div>
  );
}

function SortableQuestion({
  question,
  number,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onPlaceholder,
}: {
  question: Question;
  number: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPlaceholder: (feature: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const rowRef = useRef<HTMLLIElement | null>(null);

  /**
   * Keep the selected row on screen.
   *
   * Questions are appended to the end of the list, so adding or importing one on a
   * form that already fills the panel would otherwise put it below the fold — the
   * canvas would change but the panel would look untouched, which reads as "it
   * didn't work". Skipped mid-drag so this can't fight dnd-kit's own transforms.
   */
  useEffect(() => {
    if (selected && !isDragging) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [selected, isDragging]);

  // dnd-kit needs the node and so does the scroll effect, so the ref is composed.
  const setRefs = (node: HTMLLIElement | null) => {
    setNodeRef(node);
    rowRef.current = node;
  };

  const meta = TYPE_META[question.type];
  const accent = ACCENT_CLASSES[meta.accent];
  const Icon = meta.icon;

  return (
    <li
      ref={setRefs}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative",
        // Lifting the dragged row above its siblings stops the ones it passes
        // over from being painted on top of it mid-drag.
        isDragging && "z-10",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-[8px] px-2 py-2 transition-colors duration-100",
          selected ? "bg-selected" : "hover:bg-hover",
          isDragging && "bg-canvas shadow-[0_6px_18px_-4px_rgba(24,22,30,0.22)]",
        )}
      >
        {/* The whole row is the drag handle *and* the select target: dnd-kit's
            distance constraint decides which gesture it was. */}
        <button
          type="button"
          onClick={onSelect}
          {...attributes}
          {...listeners}
          className="flex min-w-0 flex-1 cursor-grab items-center gap-2.5 text-left active:cursor-grabbing"
          aria-label={`Question ${number}: ${questionLabel(question.title)}`}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]",
              accent.tile,
              accent.text,
            )}
          >
            <Icon size={15} />
          </span>
          <span className="shrink-0 text-[13px] text-ink-soft">{number}</span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13.5px]",
              question.title ? "text-ink" : "text-ink-faint italic",
            )}
          >
            {questionLabel(question.title)}
          </span>
          {question.is_required && (
            <span className="shrink-0 text-[13px] text-ink-faint" title="Required">
              *
            </span>
          )}
        </button>

        <Dropdown
          width={190}
          trigger={({ open }) => (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Options for question ${number}`}
              className={cn(
                "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-opacity",
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-canvas hover:text-ink",
                (open || selected) && "opacity-100",
              )}
            >
              <Dots size={16} />
            </span>
          )}
        >
          {({ close }) => (
            <>
              <MenuItem
                icon={<Copy size={16} />}
                onClick={() => {
                  close();
                  onDuplicate();
                }}
              >
                Duplicate
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  onPlaceholder("Logic jumps and branching");
                }}
              >
                Add branching
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Trash size={16} />}
                tone="danger"
                onClick={() => {
                  close();
                  onDelete();
                }}
              >
                Delete
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </li>
  );
}
