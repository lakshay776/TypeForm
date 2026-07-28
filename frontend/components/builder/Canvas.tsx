"use client";

import { motion } from "motion/react";

import { AutoTextarea } from "@/components/builder/AutoTextarea";
import { AnswerField } from "@/components/form/AnswerField";
import { ChoiceOption } from "@/components/form/ChoiceOption";
import { IconButton } from "@/components/ui/Button";
import { Close, Plus } from "@/components/ui/Icons";
import { isChoiceType } from "@/lib/questionTypes";
import type { FormDetail, Question } from "@/lib/types";

const QUESTION_PLACEHOLDER = "Your question here. Recall information with @";

interface CanvasProps {
  form: FormDetail;
  question: Question;
  number: number;
  onPatch: (patch: Partial<Question>) => void;
}

/**
 * The editable question card.
 *
 * Renders at the form's own theme colours so the canvas is a genuine preview
 * rather than a differently-styled editor. Choice options are editable inputs
 * inside the same `ChoiceOption` card the respondent flow uses, which is why a
 * choice question looks identical here and when filled in.
 */
export function Canvas({ form, question, number, onPatch }: CanvasProps) {
  const { theme } = form;
  const choice = isChoiceType(question.type);

  const setOptionLabel = (index: number, label: string) => {
    const options = question.options.map((option, position) =>
      position === index ? { ...option, label } : option,
    );
    onPatch({ options });
  };

  const addOption = () => {
    onPatch({
      options: [
        ...question.options,
        // A negative id marks a row that does not exist server-side yet; the API
        // treats an option without a real id as an insert.
        { id: -Date.now(), label: "", position: question.options.length },
      ],
    });
  };

  const removeOption = (index: number) => {
    onPatch({ options: question.options.filter((_, position) => position !== index) });
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-full items-center justify-center px-16 py-20"
      style={{ background: theme.background_color }}
    >
      <div className="w-full max-w-[720px]">
        <div className="flex gap-3">
          <span
            className="mt-2.5 flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[5px] text-[13px] font-semibold text-white"
            style={{ background: theme.question_color }}
            aria-hidden="true"
          >
            {number}
          </span>

          <div className="min-w-0 flex-1">
            <AutoTextarea
              value={question.title}
              onChange={(title) => onPatch({ title })}
              placeholder={QUESTION_PLACEHOLDER}
              ariaLabel="Question title"
              className="text-[27px] leading-[1.25] font-medium tracking-[-0.01em]"
              style={{ color: theme.question_color }}
            />

            <AutoTextarea
              value={question.description}
              onChange={(description) => onPatch({ description })}
              placeholder="Description (optional)"
              ariaLabel="Question description"
              className="mt-1 text-[17px] leading-snug"
              style={{ color: `${theme.answer_color}c9` }}
            />

            <div className="mt-7">
              {choice ? (
                <div className="flex w-full max-w-[560px] flex-col gap-2.5">
                  {question.options.map((option, index) => (
                    <div key={option.id} className="group/option relative">
                      <ChoiceOption
                        as="div"
                        index={index}
                        answerColor={theme.answer_color}
                        buttonColor={theme.button_color}
                      >
                        <input
                          value={option.label}
                          onChange={(event) => setOptionLabel(index, event.target.value)}
                          placeholder="Choice"
                          aria-label={`Option ${index + 1}`}
                          className="w-full bg-transparent text-[17px] outline-none placeholder:italic placeholder:opacity-55"
                          style={{ color: theme.answer_color }}
                        />
                      </ChoiceOption>

                      {/* Never let the creator delete the last option: a choice
                          question with none is rejected by the API. */}
                      {question.options.length > 1 && (
                        <IconButton
                          label={`Remove option ${index + 1}`}
                          onClick={() => removeOption(index)}
                          className="absolute top-1/2 -right-9 h-7 w-7 -translate-y-1/2 opacity-0 group-hover/option:opacity-100 focus-visible:opacity-100"
                        >
                          <Close size={15} />
                        </IconButton>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-1 flex w-fit items-center gap-1.5 text-[15px] underline decoration-1 underline-offset-[3px] transition-opacity hover:opacity-70"
                    style={{ color: theme.answer_color }}
                  >
                    <Plus size={15} />
                    Add choice
                  </button>
                </div>
              ) : (
                // Non-choice types render the real input, disabled: the creator is
                // editing the question, not answering it.
                <AnswerField
                  question={question}
                  value={null}
                  onChange={() => {}}
                  theme={theme}
                  disabled
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
