import { notFound } from "next/navigation";

import { ResultsPlaceholder } from "@/components/results/ResultsPlaceholder";
import { api } from "@/lib/api";

/**
 * The Results tab.
 *
 * Currently a placeholder body inside the real chrome, so the tab navigation is
 * complete while the summary and responses views are built.
 */
export default async function FormResultsPage({ params }: PageProps<"/forms/[formId]">) {
  const { formId } = await params;
  const id = Number(formId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const form = await api.forms.get(id).catch(() => null);
  if (!form) notFound();

  return <ResultsPlaceholder form={form} />;
}
