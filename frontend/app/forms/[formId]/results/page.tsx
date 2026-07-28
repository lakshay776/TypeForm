import { notFound } from "next/navigation";

import { ResultsView } from "@/components/results/ResultsView";
import { api } from "@/lib/api";

/**
 * The Results tab: per-question summary statistics and the submissions table.
 *
 * The form definition is fetched on the server because the responses table needs
 * one column per question before it can render anything; the results themselves
 * load client-side, since paging and opening a response are interactive.
 */
export default async function FormResultsPage({ params }: PageProps<"/forms/[formId]">) {
  const { formId } = await params;
  const id = Number(formId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const form = await api.forms.get(id).catch(() => null);
  if (!form) notFound();

  return <ResultsView form={form} />;
}
