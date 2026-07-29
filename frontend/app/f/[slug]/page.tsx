import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormRunner } from "@/components/respondent/FormRunner";
import { api } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

async function loadForm(slug: string): Promise<PublicForm | null> {
  return api.public.form(slug).catch(() => null);
}

export async function generateMetadata({
  params,
}: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) return { title: "Form not available" };

  return {
    title: form.title,
    description: form.welcome_description || `Fill in ${form.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) notFound();

  if (form.questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">This form has no questions yet</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Check back once its author has finished building it.
          </p>
        </div>
      </main>
    );
  }

  return <FormRunner form={form} />;
}
