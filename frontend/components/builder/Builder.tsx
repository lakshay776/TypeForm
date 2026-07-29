"use client";

import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { AddElementsModal } from "@/components/builder/AddElementsModal";
import { FormTopBar } from "@/components/builder/FormTopBar";
import { Canvas } from "@/components/builder/Canvas";
import { CanvasToolbar, type DeviceMode } from "@/components/builder/CanvasToolbar";
import { DesignPanel } from "@/components/builder/DesignPanel";
import { PagesPanel } from "@/components/builder/PagesPanel";
import { PreviewModal } from "@/components/builder/PreviewModal";
import { ScreenCanvas } from "@/components/builder/ScreenCanvas";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import { Button, Spinner } from "@/components/ui/Button";
import { AlertCircle, Plus } from "@/components/ui/Icons";
import { ComingSoonModal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useBuilder } from "@/hooks/useBuilder";
import { ApiError, publishProblems } from "@/lib/api";
import { cn } from "@/lib/format";
import type { QuestionType } from "@/lib/types";

export function Builder({ formId, isNew = false }: { formId: number; isNew?: boolean }) {
  const { success, error: errorToast } = useToast();
  const builder = useBuilder(formId);
  const {
    form,
    loading,
    error,
    saveState,
    selection,
    select,
    selectedQuestion,
    patchQuestion,
    changeType,
    addQuestion,
    importQuestions,
    deleteQuestion,
    duplicateQuestion,
    reorder,
    patchForm,
    setPublished,
    reload,
  } = builder;

  const handlePublishEdits = async () => {
    try {
      await setPublished(true);
      success("Edits published");
    } catch (cause) {
      const blockers = publishProblems(cause);
      errorToast(
        blockers[0] ??
          (cause instanceof ApiError ? cause.message : "Couldn't publish those edits."),
      );
    }
  };

  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [pickerOpen, setPickerOpen] = useState(isNew);
  const [designOpen, setDesignOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-ink-soft" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
          <AlertCircle size={24} />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold text-ink">Couldn’t open this form</h1>
        <p className="mt-1.5 max-w-sm text-[14px] text-ink-soft">
          {error ?? "The form could not be loaded."}
        </p>
        <div className="mt-6 flex gap-2.5">
          <Button onClick={reload}>Try again</Button>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-plum px-3.5 text-sm font-medium text-white transition-colors hover:bg-plum-hover"
          >
            Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  const handleAdd = async (type: QuestionType) => {
    try {
      await addQuestion(type);
    } catch (cause) {
      errorToast(cause instanceof ApiError ? cause.message : "Couldn't add the question.");
    }
  };

  const handleImport = async (titles: string[]) => {
    try {
      const count = await importQuestions(titles);
      success(`Imported ${count === 1 ? "1 question" : `${count} questions`}`);
      return count;
    } catch (cause) {
      errorToast(cause instanceof ApiError ? cause.message : "Couldn't import those questions.");
      return 0;
    }
  };

  const handleAddWelcomeScreen = () => {
    patchForm({ show_welcome_screen: true });
    select({ kind: "welcome" });
    success("Welcome screen added");
  };

  const handleRemoveWelcomeScreen = () => {
    patchForm({ show_welcome_screen: false });
    select(
      form.questions.length > 0
        ? { kind: "question", id: form.questions[0].id }
        : { kind: "ending" },
    );
    success("Welcome screen removed");
  };

  const handleChangeType = async (type: QuestionType) => {
    if (!selectedQuestion) return;
    try {
      await changeType(selectedQuestion.id, type);
    } catch (cause) {
      errorToast(cause instanceof ApiError ? cause.message : "Couldn't change the type.");
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await deleteQuestion(id);
      success("Question deleted");
    } catch (cause) {
      errorToast(cause instanceof ApiError ? cause.message : "Couldn't delete the question.");
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateQuestion(id);
      success("Question duplicated");
    } catch (cause) {
      errorToast(cause instanceof ApiError ? cause.message : "Couldn't duplicate the question.");
    }
  };

  const handleReorder = async (ids: number[]) => {
    try {
      await reorder(ids);
    } catch (cause) {
      errorToast(cause instanceof ApiError ? cause.message : "Couldn't reorder the questions.");
    }
  };

  const questionNumber =
    selectedQuestion !== null
      ? form.questions.findIndex((question) => question.id === selectedQuestion.id) + 1
      : 0;

  const staleWelcome = selection.kind === "welcome" && !form.show_welcome_screen;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar">
      <FormTopBar
        form={form}
        active="content"
        saveState={saveState}
        onRename={(title) => patchForm({ title })}
        onPublishEdits={handlePublishEdits}
        onPlaceholder={setPlaceholder}
      />

      <div className="scrollbar-slim flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <PagesPanel
          questions={form.questions}
          selection={selection}
          onSelect={select}
          onAddContent={() => setPickerOpen(true)}
          onReorder={handleReorder}
          onDelete={setDeleteId}
          onDuplicate={handleDuplicate}
          showWelcomeScreen={form.show_welcome_screen}
          onRemoveWelcomeScreen={handleRemoveWelcomeScreen}
          onPlaceholder={setPlaceholder}
        />

        <main className="flex min-h-[460px] min-w-0 flex-1 flex-col gap-3 px-4 py-4 lg:min-h-0 lg:px-0 lg:pr-2">
          <CanvasToolbar
            device={device}
            onDeviceChange={setDevice}
            onAddContent={() => setPickerOpen(true)}
            onDesign={() => setDesignOpen((value) => !value)}
            onPreview={() => setPreviewOpen(true)}
            onPlaceholder={setPlaceholder}
            designOpen={designOpen}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-[10px] border border-line bg-canvas">
            <div
              className={cn(
                "scrollbar-slim min-w-0 flex-1 overflow-y-auto",
                device === "mobile" && "mx-auto max-w-[440px] border-x border-line",
              )}
            >
              {selection.kind === "question" && selectedQuestion ? (
                <Canvas
                  form={form}
                  question={selectedQuestion}
                  number={questionNumber}
                  onPatch={(patch) => patchQuestion(selectedQuestion.id, patch)}
                />
              ) : selection.kind === "question" || staleWelcome ? (
                <EmptyCanvas onAdd={() => setPickerOpen(true)} />
              ) : (
                <ScreenCanvas form={form} kind={selection.kind} onPatch={patchForm} />
              )}
            </div>

            <AnimatePresence>
              {designOpen && (
                <DesignPanel
                  theme={form.theme}
                  onPatchForm={patchForm}
                  onClose={() => setDesignOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </main>

        <SettingsPanel
          form={form}
          question={selection.kind === "question" ? selectedQuestion : null}
          screen={selection.kind === "question" || staleWelcome ? null : selection.kind}
          onPatchQuestion={(patch) =>
            selectedQuestion && patchQuestion(selectedQuestion.id, patch)
          }
          onChangeType={handleChangeType}
          onPatchForm={patchForm}
          onPlaceholder={setPlaceholder}
        />
      </div>

      <AddElementsModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleAdd}
        onImport={handleImport}
        onAddWelcomeScreen={handleAddWelcomeScreen}
        welcomeScreenAdded={form.show_welcome_screen}
        onPlaceholder={setPlaceholder}
      />

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        form={form}
        device={device}
      />

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        destructive
        confirmLabel="Delete question"
        title="Delete this question?"
        description="Any answers already collected for it are deleted too. This can't be undone."
      />

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </div>
  );
}

function EmptyCanvas({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 text-center">
      <h2 className="text-[19px] font-semibold text-ink">This form has no questions yet</h2>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-soft">
        Add your first question and it will appear here, ready to edit in place.
      </p>
      <Button variant="primary" size="lg" className="mt-6 font-semibold" onClick={onAdd}>
        <Plus size={18} />
        Add content
      </Button>
    </div>
  );
}
