import { notFound } from "next/navigation";

import { Builder } from "@/components/builder/Builder";

/**
 * The form builder.
 *
 * Both `params` and `searchParams` are Promises in Next 16 — synchronous access
 * was removed — so they have to be awaited before they can be read.
 *
 * `?new=1` is set by the dashboard when it has just created the form, and makes
 * the builder open its element picker so the creator's first choice becomes
 * question 1. Reading it here rather than inferring "no questions yet" means
 * reopening an existing empty form does not pop the picker unasked.
 */
export default async function BuilderPage({ params, searchParams }: PageProps<"/forms/[formId]">) {
  const [{ formId }, query] = await Promise.all([params, searchParams]);

  const id = Number(formId);
  if (!Number.isInteger(id) || id < 1) notFound();

  return <Builder formId={id} isNew={query.new === "1"} />;
}
