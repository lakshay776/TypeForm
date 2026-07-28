import { notFound } from "next/navigation";

import { SharePage } from "@/components/share/SharePage";
import { api } from "@/lib/api";

/**
 * The Share tab.
 *
 * Fetched on the server so the link is on screen the moment the tab opens — the
 * whole point of this page is to copy a URL, and a spinner in front of it would be
 * the wrong first impression.
 *
 * `?publish=1` is added by the top bar's Share button and means "share this",
 * which for an unpublished draft includes publishing it. Navigating via the Share
 * *tab* omits the flag, so moving between tabs never mutates the form.
 */
export default async function FormSharePage({
  params,
  searchParams,
}: PageProps<"/forms/[formId]/share">) {
  const [{ formId }, query] = await Promise.all([params, searchParams]);

  const id = Number(formId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const form = await api.forms.get(id).catch(() => null);
  if (!form) notFound();

  return <SharePage form={form} autoPublish={query.publish === "1"} />;
}
