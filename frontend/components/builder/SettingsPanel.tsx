"use client";

import { NumberRow, PanelSection, ToggleRow } from "@/components/builder/Toggle";
import { Dropdown, MenuItem } from "@/components/ui/Dropdown";
import { ChevronDown, HelpCircle, Plus } from "@/components/ui/Icons";
import { IconVideo } from "@/components/ui/TypeIcons";
import { ACCENT_CLASSES, ALL_TYPES, TYPE_META, isChoiceType } from "@/lib/questionTypes";
import { cn } from "@/lib/format";
import type { FormDetail, FormUpdatePayload, Question, QuestionType } from "@/lib/types";

interface SettingsPanelProps {
  form: FormDetail;
  question: Question | null;
  screen: "welcome" | "ending" | null;
  onPatchQuestion: (patch: Partial<Question>) => void;
  onChangeType: (type: QuestionType) => void;
  onPatchForm: (patch: FormUpdatePayload) => void;
  onPlaceholder: (feature: string) => void;
}

export function SettingsPanel({
  form,
  question,
  screen,
  onPatchQuestion,
  onChangeType,
  onPatchForm,
  onPlaceholder,
}: SettingsPanelProps) {
  return (
    <aside className="scrollbar-slim flex w-[320px] shrink-0 flex-col gap-3 overflow-y-auto bg-sidebar p-5 pt-4">
      {screen ? (
        <ScreenSettings form={form} screen={screen} onPatchForm={onPatchForm} />
      ) : question ? (
        <QuestionSettings
          question={question}
          onPatch={onPatchQuestion}
          onChangeType={onChangeType}
          onPlaceholder={onPlaceholder}
        />
      ) : (
        <PanelSection title="Question">
          <p className="text-[13.5px] text-ink-soft">
            Add a question to start editing its settings.
          </p>
        </PanelSection>
      )}
    </aside>
  );
}

function QuestionSettings({
  question,
  onPatch,
  onChangeType,
  onPlaceholder,
}: {
  question: Question;
  onPatch: (patch: Partial<Question>) => void;
  onChangeType: (type: QuestionType) => void;
  onPlaceholder: (feature: string) => void;
}) {
  const meta = TYPE_META[question.type];
  const accent = ACCENT_CLASSES[meta.accent];
  const Icon = meta.icon;
  const choice = isChoiceType(question.type);

  return (
    <>
      <PanelSection
        title={
          <>
            Question
            <span title="How the question itself is presented" className="text-ink-faint">
              <HelpCircle size={14} />
            </span>
          </>
        }
      >
        <div className="flex items-center gap-0.5 rounded-[9px] bg-hover p-0.5">
          <button
            type="button"
            aria-pressed
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] bg-canvas py-2 text-[14px] font-medium text-ink shadow-[0_1px_3px_rgba(24,22,30,0.13)]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 8.5h16M4 14h9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Text
          </button>
          <button
            type="button"
            onClick={() => onPlaceholder("Video questions")}
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] py-2 text-[14px] text-ink-soft transition-colors hover:text-ink"
          >
            <IconVideo size={17} />
            Video
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Answer">
        <Dropdown
          align="start"
          width={272}
          trigger={({ open }) => (
            <span
              role="button"
              tabIndex={0}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-[8px] border border-line bg-canvas px-3 py-2.5",
                "transition-colors hover:bg-hover",
                open && "border-plum",
              )}
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
              <span className="flex-1 text-[14px] text-ink">{meta.label}</span>
              <ChevronDown size={17} className="text-ink-soft" />
            </span>
          )}
        >
          {({ close }) => (
            <>
              {ALL_TYPES.map((type) => {
                const option = TYPE_META[type];
                const optionAccent = ACCENT_CLASSES[option.accent];
                const OptionIcon = option.icon;
                return (
                  <MenuItem
                    key={type}
                    selected={type === question.type}
                    hint={type === question.type ? "✓" : undefined}
                    icon={
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-[7px]",
                          optionAccent.tile,
                          optionAccent.text,
                        )}
                      >
                        <OptionIcon size={15} />
                      </span>
                    }
                    onClick={() => {
                      close();
                      onChangeType(type);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                );
              })}
            </>
          )}
        </Dropdown>

        <div className="mt-1.5 divide-y divide-line-soft">
          <ToggleRow
            label="Required"
            checked={question.is_required}
            onChange={(is_required) => onPatch({ is_required })}
          />

          {choice && (
            <>
              <ToggleRow
                label="Multiple selection"
                checked={question.allow_multiple}
                onChange={(allow_multiple) => onPatch({ allow_multiple })}
                hint="Let respondents pick more than one option."
              />
              <ToggleRow
                label="Randomize"
                checked={question.randomize_options}
                onChange={(randomize_options) => onPatch({ randomize_options })}
                hint="Shuffle the option order for each respondent."
              />
              <ToggleRow
                label={'"Other" option'}
                checked={false}
                onChange={() => onPlaceholder('The "Other" option')}
              />
              <ToggleRow
                label={'"None" option'}
                checked={false}
                onChange={() => onPlaceholder('The "None" option')}
              />
              <ToggleRow
                label="Vertical alignment"
                checked
                onChange={() => onPlaceholder("Answer alignment")}
              />
            </>
          )}

          {(question.type === "short_text" || question.type === "long_text") && (
            <NumberRow
              label="Max characters"
              value={question.max_length}
              min={1}
              max={10000}
              onChange={(max_length) => onPatch({ max_length })}
            />
          )}

          {question.type === "number" && (
            <>
              <NumberRow
                label="Min value"
                value={question.min_value}
                onChange={(min_value) => onPatch({ min_value })}
              />
              <NumberRow
                label="Max value"
                value={question.max_value}
                onChange={(max_value) => onPatch({ max_value })}
              />
              <ToggleRow
                label="Allow decimals"
                checked={question.allow_decimal}
                onChange={(allow_decimal) => onPatch({ allow_decimal })}
              />
            </>
          )}

          {question.type === "rating" && (
            <>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[14px] text-ink">Steps</span>
                <div className="flex gap-1">
                  {[3, 5, 7, 10].map((steps) => (
                    <button
                      key={steps}
                      type="button"
                      onClick={() => onPatch({ rating_max: steps })}
                      aria-pressed={question.rating_max === steps}
                      className={cn(
                        "h-7 w-7 rounded-md border text-[13px] transition-colors",
                        question.rating_max === steps
                          ? "border-plum bg-plum text-white"
                          : "border-line text-ink-soft hover:bg-hover",
                      )}
                    >
                      {steps}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[14px] text-ink">Shape</span>
                <div className="flex gap-1">
                  {(["star", "heart", "thumb", "number"] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => onPatch({ rating_icon: shape })}
                      aria-pressed={question.rating_icon === shape}
                      title={shape}
                      className={cn(
                        "h-7 rounded-md border px-2 text-[12px] capitalize transition-colors",
                        question.rating_icon === shape
                          ? "border-plum bg-plum text-white"
                          : "border-line text-ink-soft hover:bg-hover",
                      )}
                    >
                      {shape === "number" ? "1–n" : shape}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!choice && question.type !== "yes_no" && question.type !== "rating" && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[14px] text-ink">Placeholder</span>
              <input
                value={question.placeholder}
                onChange={(event) => onPatch({ placeholder: event.target.value })}
                maxLength={120}
                aria-label="Placeholder text"
                className="min-w-0 flex-1 rounded-md border border-line px-2 py-1.5 text-right text-[13px] text-ink outline-none focus:border-plum"
              />
            </div>
          )}
        </div>

        <div className="mt-1.5 border-t border-line-soft">
          <ToggleRow
            label="Map to contacts"
            checked={false}
            onChange={() => onPlaceholder("Contact mapping")}
            hint="Sync answers to a contact record."
          />
        </div>
      </PanelSection>

      <PanelSection
        title="Branching"
        action={
          <button
            type="button"
            onClick={() => onPlaceholder("Logic jumps and branching")}
            aria-label="Add branching"
            title="Add branching"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <Plus size={16} />
          </button>
        }
      />

      <PanelSection
        title={
          <>
            Comments
            <span
              title="Not available in this build"
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#a5d6c4] bg-[#e6f4ef] text-live"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5.5c-4 0-7 3.6-7 6.5s3 6.5 7 6.5 7-3.6 7-6.5-3-6.5-7-6.5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.1" fill="currentColor" />
              </svg>
            </span>
          </>
        }
      />
    </>
  );
}

function ScreenSettings({
  form,
  screen,
  onPatchForm,
}: {
  form: FormDetail;
  screen: "welcome" | "ending";
  onPatchForm: (patch: FormUpdatePayload) => void;
}) {
  if (screen === "welcome") {
    return (
      <PanelSection title="Welcome screen">
        <ToggleRow
          label="Show welcome screen"
          checked={form.show_welcome_screen}
          onChange={(show_welcome_screen) => onPatchForm({ show_welcome_screen })}
          hint="When off, respondents land straight on the first question."
        />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Edit the heading, description and button label directly on the canvas.
        </p>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Thank you screen">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Shown once a response is submitted. Edit the heading and message on the canvas.
      </p>
    </PanelSection>
  );
}
