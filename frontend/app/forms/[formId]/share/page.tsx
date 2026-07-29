import { notFound } from "next/navigation";

import { SharePage } from "@/components/share/SharePage";
import { api } from "@/lib/api";

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
