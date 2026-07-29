"use client";

import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FormCard } from "@/components/dashboard/FormCard";
import type { FormActions } from "@/components/dashboard/FormActionsMenu";
import { COLUMN_TEMPLATE, FormRow } from "@/components/dashboard/FormRow";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  NoSearchResults,
} from "@/components/dashboard/States";
import { TopBar } from "@/components/dashboard/TopBar";
import { WorkspaceHeader, type ViewMode } from "@/components/dashboard/WorkspaceHeader";
import { ComingSoonModal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useForms, type SortKey } from "@/hooks/useForms";
import { ApiError, api, publishProblems } from "@/lib/api";
import { cn } from "@/lib/format";
import type { Creator, FormSummary } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { success, error: errorToast } = useToast();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("created");
  const [view, setView] = useState<ViewMode>("list");

  /** Drawer state for the sidebar below lg; ignored at wider widths. */
  const [navOpen, setNavOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  const {
    forms,
    loading,
    initialLoading,
    error,
    totalResponses,
    reload,
    replace,
    remove,
    prepend,
  } = useForms(search, sort);

  useEffect(() => {
    api.me()
      .then(setCreator)
      .catch(() => setCreator(null));
  }, []);

  /** Prefers the API's own message, which is already written for a user to read. */
  const reportFailure = (fallback: string) => (cause: unknown) => {
    errorToast(cause instanceof ApiError ? cause.message : fallback);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      // Created with no questions: the builder opens its element picker so the
      // creator chooses the first question's type, and whatever they pick becomes
      // question 1. `?new=1` is what tells the builder this is a fresh form, so
      // reopening an existing empty form doesn't pop the picker unasked.
      const form = await api.forms.create();
      prepend(form);
      success("Form created");
      router.push(`/forms/${form.id}?new=1`);
    } catch (cause) {
      reportFailure("Couldn't create the form.")(cause);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (form: FormSummary, title: string) => {
    setRenamingId(null);
    // Applied locally first so the new name paints immediately; the response then
    // reconciles updated_at and anything else the server changed.
    replace({ ...form, title });
    try {
      replace(await api.forms.update(form.id, { title }));
      success("Form renamed");
    } catch (cause) {
      replace(form); // roll back to the name we started from
      reportFailure("Couldn't rename the form.")(cause);
    }
  };

  const handleDuplicate = async (form: FormSummary) => {
    try {
      const clone = await api.forms.duplicate(form.id);
      prepend(clone);
      success(`Duplicated “${form.title}”`);
    } catch (cause) {
      reportFailure("Couldn't duplicate the form.")(cause);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      success("Link copied to clipboard");
    } catch {
      // Clipboard access requires a secure context; say so rather than fail quietly.
      errorToast("Couldn't copy — your browser blocked clipboard access.");
    }
  };

  const handleTogglePublish = async (form: FormSummary) => {
    const publishing = form.status !== "published";

    replace({ ...form, status: publishing ? "published" : "draft" });
    try {
      const updated = await api.forms.setPublished(form.id, publishing);
      replace(updated);
      if (publishing && updated.public_url) {
        const url = updated.public_url;
        success("Form published", { label: "Copy link", onClick: () => copyLink(url) });
      } else {
        success("Form unpublished");
      }
    } catch (cause) {
      replace(form);
      // The server decides whether a form is publishable — an untitled question
      // blocks it just as a missing one does, which a question count can't see.
      const blockers = publishProblems(cause);
      if (blockers.length > 0) {
        errorToast(
          blockers.length === 1
            ? blockers[0]
            : `${blockers[0]} (${blockers.length - 1} more to fix)`,
        );
        return;
      }
      reportFailure("Couldn't change the form's status.")(cause);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.forms.remove(deleteTarget.id);
      remove(deleteTarget.id);
      success(`Deleted “${deleteTarget.title}”`);
      setDeleteTarget(null);
    } catch (cause) {
      reportFailure("Couldn't delete the form.")(cause);
    } finally {
      setDeleting(false);
    }
  };

  const actionsFor = (form: FormSummary): FormActions => ({
    onRename: () => setRenamingId(form.id),
    onDuplicate: () => handleDuplicate(form),
    onTogglePublish: () => handleTogglePublish(form),
    onCopyLink: () => form.public_url && copyLink(form.public_url),
    onOpenPublic: () => form.public_url && window.open(form.public_url, "_blank"),
    onViewResponses: () => router.push(`/forms/${form.id}/results`),
    onDelete: () => setDeleteTarget(form),
  });

  const searching = Boolean(search.trim());
  // Gated on `loading` rather than `initialLoading` so a search in flight can't
  // briefly flash "no results" before its response lands.
  const showEmptyState = !loading && !error && forms.length === 0 && !searching;
  const showNoResults = !loading && !error && forms.length === 0 && searching;
  // Headings stay put during a search: the previous results remain on screen
  // while the request is in flight, so hiding them would shift the layout.
  const showColumnHeadings = view === "list" && !error && !initialLoading && forms.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar creator={creator} onToggleNav={() => setNavOpen((open) => !open)} />
      <NavTabs />

      <div className="relative flex min-h-0 flex-1">
        {/* Below lg the rail is a drawer: at 375px a fixed 256px column leaves
            ~119px for the list, which is not a narrow layout so much as no
            layout. Static from lg up, where it fits alongside. */}
        <Sidebar
          search={search}
          onSearchChange={setSearch}
          formCount={forms.length}
          totalResponses={totalResponses}
          creating={creating}
          onCreateForm={handleCreate}
          onPlaceholder={setPlaceholder}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />

        {navOpen && (
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-[#1a1822]/40 lg:hidden"
          />
        )}

        <main className="scrollbar-slim min-w-0 flex-1 overflow-y-auto bg-workspace">
          {/* No max-width: capping this at 1090px and centring it left a wide gap
              either side, so the list floated in the middle instead of filling the
              workspace. Padding alone, matching the reference. */}
          <div className="w-full px-4 pt-8 pb-12 sm:px-8 sm:pt-10 lg:px-11 lg:pt-14">
            <WorkspaceHeader
              sort={sort}
              onSortChange={setSort}
              view={view}
              onViewChange={setView}
              onPlaceholder={setPlaceholder}
              onRenameWorkspace={() => setPlaceholder("Multiple workspaces")}
            />

            <div className="mt-7 border-b border-line" />

            {showColumnHeadings ? (
              <div
                className={cn(COLUMN_TEMPLATE, "px-4 pt-10 pb-3 md:pt-16")}
                aria-hidden="true"
              >
                <span />
                <ColumnHeading>Responses</ColumnHeading>
                <ColumnHeading>Completed</ColumnHeading>
                <ColumnHeading>Updated</ColumnHeading>
                <ColumnHeading>Integrations</ColumnHeading>
                <span />
              </div>
            ) : (
              <div className="pt-10" />
            )}

            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : initialLoading ? (
              <ListSkeleton />
            ) : showEmptyState ? (
              <EmptyState creating={creating} onCreateForm={handleCreate} />
            ) : showNoResults ? (
              <NoSearchResults query={search} onClear={() => setSearch("")} />
            ) : view === "list" ? (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {forms.map((form) => (
                    <FormRow
                      key={form.id}
                      form={form}
                      actions={actionsFor(form)}
                      renaming={renamingId === form.id}
                      onRenameSubmit={(title) => handleRename(form, title)}
                      onRenameCancel={() => setRenamingId(null)}
                      onOpen={() => router.push(`/forms/${form.id}`)}
                      onPlaceholder={setPlaceholder}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(212px,1fr))] gap-4">
                <AnimatePresence initial={false}>
                  {forms.map((form) => (
                    <FormCard
                      key={form.id}
                      form={form}
                      actions={actionsFor(form)}
                      onOpen={() => router.push(`/forms/${form.id}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        destructive
        confirmLabel="Delete form"
        title={`Delete “${deleteTarget?.title ?? ""}”?`}
        description={
          deleteTarget && deleteTarget.response_count > 0
            ? `This permanently deletes the form and all ${deleteTarget.response_count} of its responses. This can't be undone.`
            : "This permanently deletes the form. This can't be undone."
        }
      />

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </div>
  );
}

/**
 * Hidden below md to stay in step with the row cells it labels — see
 * SECONDARY_CELL in FormRow. A heading whose column has collapsed is worse than
 * no heading: it shifts every remaining label one column left.
 */
function ColumnHeading({ children }: { children: React.ReactNode }) {
  return <span className="hidden text-[14px] text-ink-soft md:block">{children}</span>;
}
