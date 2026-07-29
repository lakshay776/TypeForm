import { notFound } from "next/navigation";

import { Builder } from "@/components/builder/Builder";

export default async function BuilderPage({ params, searchParams }: PageProps<"/forms/[formId]">) {
  const [{ formId }, query] = await Promise.all([params, searchParams]);

  const id = Number(formId);
  if (!Number.isInteger(id) || id < 1) notFound();

  return <Builder formId={id} isNew={query.new === "1"} />;
}
