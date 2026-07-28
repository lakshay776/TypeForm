"use client";

import { ACCENT_CLASSES, TYPE_META } from "@/lib/questionTypes";
import { cn, pluralize, questionLabel } from "@/lib/format";
import type { FormStats, QuestionSummary } from "@/lib/types";

/** mm:ss, matching Typeform's "Time to complete". */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Per-question summary statistics.
 *
 * Every number comes from `GET /forms/{id}/summary`, which aggregates in SQL — so
 * this component only formats, and the figures can't drift from what the CSV
 * export or the responses table would say.
 */
export function SummaryTab({ stats }: { stats: FormStats }) {
  if (stats.completed_responses === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-line py-20 text-center">
        <h2 className="text-[18px] font-semibold text-ink">No responses yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-soft">
          Once someone fills in your form, their answers and the per-question stats
          appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Only metrics the app actually records. Views and starts would need
          page-level tracking that doesn't exist, so they aren't shown. */}
      <dl className="flex flex-wrap gap-x-14 gap-y-6">
        <Metric label="Submissions" value={String(stats.completed_responses)} />
        <Metric label="Completion rate" value={`${stats.completion_rate}%`} />
        <Metric label="Time to complete" value={formatDuration(stats.average_duration_seconds)} />
      </dl>

      <div className="mt-10 space-y-4">
        {stats.questions.map((question, index) => (
          <QuestionCard key={question.question_id} question={question} number={index + 1} />
        ))}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[15px] text-ink-soft">{label}</dt>
      <dd className="mt-1 text-[30px] leading-none font-normal tracking-[-0.01em] text-ink">
        {value}
      </dd>
    </div>
  );
}

function QuestionCard({ question, number }: { question: QuestionSummary; number: number }) {
  const meta = TYPE_META[question.type];
  const accent = ACCENT_CLASSES[meta.accent];
  const Icon = meta.icon;
  const total = question.answered_count + question.skipped_count;

  return (
    <section className="rounded-[12px] border border-line bg-canvas p-6">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-[7px] px-2",
            accent.tile,
            accent.text,
          )}
        >
          <Icon size={15} />
          <span className="text-[13px] font-medium">{number}</span>
        </span>
        <h3 className="min-w-0 flex-1 pt-0.5 text-[18px] leading-snug font-medium text-ink">
          {questionLabel(question.title)}
        </h3>
      </div>

      <p className="mt-2.5 text-[14.5px] text-ink-soft">
        {question.answered_count} out of {total}{" "}
        {total === 1 ? "person" : "people"} answered this question.
      </p>

      <div className="mt-5">
        <QuestionStats question={question} />
      </div>
    </section>
  );
}

function QuestionStats({ question }: { question: QuestionSummary }) {
  // Choice and dropdown: counts per option, which is the case the brief names.
  if (question.option_counts) {
    return (
      <StatTable
        headings={["Choices", "Responses", "Percentages"]}
        rows={question.option_counts.map((option) => [
          questionLabel(option.label),
          String(option.count),
          `${option.percentage}%`,
        ])}
      />
    );
  }

  if (question.yes_count !== null && question.no_count !== null) {
    const total = question.yes_count + question.no_count;
    const share = (count: number) => (total ? `${Math.round((count * 100) / total)}%` : "0%");
    return (
      <StatTable
        headings={["Choices", "Responses", "Percentages"]}
        rows={[
          ["Yes", String(question.yes_count), share(question.yes_count)],
          ["No", String(question.no_count), share(question.no_count)],
        ]}
      />
    );
  }

  if (question.rating_distribution) {
    const total = question.rating_distribution.reduce((sum, b) => sum + b.count, 0);
    return (
      <>
        {question.average !== null && (
          <p className="mb-4 text-[14.5px] text-ink">
            Average rating <strong className="font-semibold">{question.average}</strong>
          </p>
        )}
        <StatTable
          headings={["Rating", "Responses", "Percentages"]}
          rows={question.rating_distribution.map((bucket) => [
            String(bucket.value),
            String(bucket.count),
            total ? `${Math.round((bucket.count * 100) / total)}%` : "0%",
          ])}
        />
      </>
    );
  }

  if (question.average !== null) {
    return (
      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        <Metric label="Average" value={String(question.average)} />
        <Metric label="Lowest" value={String(question.minimum ?? "—")} />
        <Metric label="Highest" value={String(question.maximum ?? "—")} />
      </dl>
    );
  }

  // Free text: the API returns the most recent answers rather than all of them,
  // so the full set stays the responses table's job.
  if (question.recent_answers) {
    if (question.recent_answers.length === 0) {
      return <p className="text-[14px] text-ink-soft">No answers yet.</p>;
    }
    return (
      <>
        <p className="mb-2.5 text-[13px] font-semibold tracking-wide text-ink-faint uppercase">
          Latest answers
        </p>
        <ul className="space-y-2">
          {question.recent_answers.map((answer, index) => (
            <li
              key={index}
              className="rounded-[8px] border border-line-soft bg-sidebar/60 px-3.5 py-2.5 text-[14.5px] leading-relaxed break-words text-ink"
            >
              {answer}
            </li>
          ))}
        </ul>
        {question.answered_count > question.recent_answers.length && (
          <p className="mt-2.5 text-[13.5px] text-ink-soft">
            Showing the latest {question.recent_answers.length} of{" "}
            {pluralize(question.answered_count, "answer")}. See the Responses tab for all
            of them.
          </p>
        )}
      </>
    );
  }

  return <p className="text-[14px] text-ink-soft">No answers yet.</p>;
}

function StatTable({
  headings,
  rows,
}: {
  headings: string[];
  rows: (React.ReactNode | string)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="py-2.5 pr-4 text-[14px] font-normal text-ink-soft"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-b border-line-soft last:border-0">
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "py-3 pr-4 text-[14.5px]",
                    cellIndex === 0 ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
