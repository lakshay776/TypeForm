import { notFound } from "next/navigation";

import { ResultsView } from "@/components/results/ResultsView";
import { api } from "@/lib/api";

export default async function FormResultsPage({ params }: PageProps<"/forms/[formId]">) {
  const { formId } = await params;
  const id = Number(formId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const form = await api.forms.get(id).catch(() => null);
  if (!form) notFound();

  return <ResultsView form={form} />;
}
