"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FormTopBar } from "@/components/builder/FormTopBar";
import { PublishBurst } from "@/components/share/PublishBurst";
import { Button } from "@/components/ui/Button";
import { ChevronDown, Copy, ExternalLink, Globe, Pencil } from "@/components/ui/Icons";
import { ComingSoonModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api, publishProblems } from "@/lib/api";
import { cn } from "@/lib/format";
import type { FormDetail } from "@/lib/types";

/**
 * The Share tab.
 *
 * A form only has a link once it is published, so publishing lives here rather
 * than behind a separate dialog — the two questions ("is it live?" and "what's the
 * link?") are the same question from the creator's point of view.
 */
export function SharePage({
  form: initialForm,
  autoPublish = false,
}: {
  form: FormDetail;
  /** Set when arriving from the top bar's Share button, not from the tab. */
  autoPublish?: boolean;
}) {
  const { success, error } = useToast();
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);

  const [editingLink, setEditingLink] = useState(false);
  const [slugDraft, setSlugDraft] = useState(initialForm.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);

  const published = form.status === "published";
  const link = form.public_url ?? "";
  // Everything up to and including the final slash, so the slug can be edited on
  // its own with the origin shown as static context.
  const linkBase = link.slice(0, link.lastIndexOf("/") + 1);

  const setPublished = useCallback(
    async (next: boolean) => {
      setBusy(true);
      setProblems([]);
      try {
        setForm(await api.forms.setPublished(form.id, next));
        if (next) setBurst(true);
        else success("Form unpublished");
      } catch (cause) {
        // A blocked publish is a checklist, not a failure — it belongs on the page
        // rather than in a toast that vanishes before it can be acted on.
        const blockers = publishProblems(cause);
        if (blockers.length > 0) setProblems(blockers);
        else error(next ? "Couldn't publish the form." : "Couldn't unpublish the form.");
      } finally {
        setBusy(false);
      }
    },
    [form.id, success, error],
  );

  /**
   * Publish once on arrival when the creator pressed Share on a draft.
   *
   * The request is fired from a promise chain rather than set synchronously in the
   * effect body, and the ref guards against a second attempt if this remounts —
   * publishing twice would be harmless but the animation firing twice would not
   * look it.
   */
  const attempted = useRef(false);
  useEffect(() => {
    if (!autoPublish || attempted.current || form.status === "published") return;
    attempted.current = true;
    void setPublished(true);
  }, [autoPublish, form.status, setPublished]);

  const saveSlug = async () => {
    const cleaned = tidySlug(slugDraft);
    if (cleaned === form.slug) {
      setEditingLink(false);
      return;
    }
    if (cleaned.length < 3) {
      setSlugError("Links need at least 3 characters.");
      return;
    }

    setSavingSlug(true);
    setSlugError(null);
    try {
      setForm(await api.forms.update(form.id, { slug: cleaned }));
      setEditingLink(false);
      success("Link updated");
    } catch (cause) {
      // A 409 means another form owns that link; anything else is unexpected.
      setSlugError(
        cause instanceof ApiError && cause.status === 409
          ? cause.message
          : "Couldn't update the link. Try a different one.",
      );
    } finally {
      setSavingSlug(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      success("Link copied to clipboard");
    } catch {
      // Clipboard access needs a secure context; say so rather than fail silently.
      error("Couldn't copy — your browser blocked clipboard access.");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar">
      {/* Only going live is worth animating. Playing a reveal on every arrival
          meant the wipe fired when simply switching tabs, which reads as the app
          reloading rather than as something having happened. */}
      {burst && <PublishBurst onDone={() => setBurst(false)} />}

      <FormTopBar form={form} active="share" onPlaceholder={setPlaceholder} />

      <main className="scrollbar-slim flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[840px] px-6 py-14">
          <h1 className="text-center text-[30px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Choose how you’d like to share your form
          </h1>

          <section className="mt-10 rounded-[12px] border border-line bg-canvas p-6">
            {published ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="gap-2 font-semibold"
                    onClick={copy}
                    disabled={editingLink}
                  >
                    <Copy size={17} />
                    Copy link
                  </Button>

                  {editingLink ? (
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-1 rounded-[8px] border px-3 py-2",
                        slugError ? "border-danger" : "border-plum",
                      )}
                    >
                      <span className="shrink-0 text-[14px] text-ink-faint">{linkBase}</span>
                      <input
                        autoFocus
                        value={slugDraft}
                        aria-label="Edit the link"
                        aria-invalid={slugError !== null}
                        onChange={(event) => {
                          // Normalised as it is typed, so the field can only ever
                          // contain something the API will accept.
                          setSlugDraft(normalizeSlug(event.target.value));
                          setSlugError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveSlug();
                          if (event.key === "Escape") {
                            setSlugDraft(form.slug);
                            setSlugError(null);
                            setEditingLink(false);
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink outline-none"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingSlug}
                        onClick={saveSlug}
                        className="shrink-0"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={savingSlug}
                        onClick={() => {
                          setSlugDraft(form.slug);
                          setSlugError(null);
                          setEditingLink(false);
                        }}
                        className="shrink-0"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-line px-3 py-2.5">
                      <Globe size={17} className="shrink-0 text-ink-soft" />
                      <input
                        readOnly
                        value={link}
                        aria-label="Public form link"
                        onFocus={(event) => event.currentTarget.select()}
                        className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSlugDraft(form.slug);
                          setSlugError(null);
                          setEditingLink(true);
                        }}
                        className="flex shrink-0 items-center gap-1.5 text-[14px] text-ink-soft transition-colors hover:text-ink"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    aria-label="QR code"
                    title="QR code"
                    onClick={() => setPlaceholder("QR codes")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-line text-ink-soft transition-colors hover:bg-hover hover:text-ink"
                  >
                    <QrGlyph />
                  </button>
                </div>

                {editingLink && (
                  <p
                    className={cn(
                      "mt-2.5 text-[13.5px]",
                      slugError ? "font-medium text-danger" : "text-ink-soft",
                    )}
                    role={slugError ? "alert" : undefined}
                  >
                    {slugError ??
                      "Anyone holding the current link will get a “not available” page once you change it. Responses already collected are kept."}
                  </p>
                )}

                <div className="mt-7 border-t border-line-soft pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] text-ink">Link preview</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPlaceholder("Customising the link preview")}
                        className="flex items-center gap-1.5 text-[14px] text-ink-soft transition-colors hover:text-ink"
                      >
                        Customize
                        <ChevronDown size={16} />
                      </button>
                      <span
                        title="Not available in this build"
                        className="flex h-[19px] w-[19px] items-center justify-center rounded-full border border-[#a5d6c4] bg-[#e6f4ef] text-live"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M12 5.5c-4 0-7 3.6-7 6.5s3 6.5 7 6.5 7-3.6 7-6.5-3-6.5-7-6.5z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <circle cx="12" cy="12" r="2.1" fill="currentColor" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Built from the form's own data, so it reflects what a chat app
                      would actually unfurl for this link. */}
                  <div className="mt-3 flex gap-4 rounded-[10px] border border-line p-3.5">
                    <span
                      className="flex h-[72px] w-[104px] shrink-0 items-center justify-center rounded-[6px] text-[13px] font-semibold"
                      style={{
                        background: form.theme.background_color,
                        color: form.theme.question_color,
                        border: `1px solid ${form.theme.answer_color}33`,
                      }}
                    >
                      Typeform
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">{form.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-ink-soft">
                        {form.welcome_description ||
                          "Turn data collection into an experience. Built with Typeform Clone."}
                      </p>
                      <p className="mt-1 truncate text-[13px] text-ink-faint">{hostOf(link)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-6">
                  <div>
                    <p className="text-[14.5px] font-medium text-ink">Accepting responses</p>
                    <p className="text-[13.5px] text-ink-soft">
                      Unpublishing takes the link offline. Responses already collected are kept.
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <Button
                      variant="secondary"
                      className="gap-2"
                      onClick={() => window.open(link, "_blank")}
                    >
                      <ExternalLink size={16} />
                      Open form
                    </Button>
                    <Button variant="secondary" loading={busy} onClick={() => setPublished(false)}>
                      Unpublish
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-[15.5px] text-ink">
                  This form isn’t published yet, so it has no link.
                </p>
                <p className="mt-1.5 text-[14px] text-ink-soft">
                  Publishing generates a public URL anyone can open — no sign-in required.
                </p>

                {problems.length > 0 && (
                  <div className="mx-auto mt-5 max-w-md rounded-[8px] bg-danger-bg px-4 py-3 text-left">
                    <p className="text-[13.5px] font-medium text-danger">Finish these first:</p>
                    <ul className="mt-1.5 space-y-1">
                      {problems.map((problem) => (
                        <li key={problem} className="text-[13.5px] text-danger">
                          · {problem}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="mt-6 font-semibold"
                  loading={busy}
                  onClick={() => setPublished(true)}
                >
                  Publish form
                </Button>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-[16px] font-semibold text-ink">Embed form</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EmbedCard
                label="On your website"
                tint="linear-gradient(140deg,#e0b6f0,#c98ede)"
                onClick={() => setPlaceholder("Website embeds")}
              />
              <EmbedCard
                label="In your email"
                tint="linear-gradient(140deg,#b8d4f5,#8fb6e8)"
                onClick={() => setPlaceholder("Email embeds")}
              />
            </div>
          </section>

          <div className="mt-10 flex justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setPlaceholder("Other sharing channels")}
            >
              Explore other ways to share
            </Button>
          </div>
        </div>
      </main>

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </div>
  );
}

/**
 * Coerces typed input toward a valid slug: lowercase, single hyphens, no symbols.
 *
 * Applied on every keystroke so the field cannot hold something the API would
 * reject. Leading and trailing hyphens are left alone here — stripping them mid-word
 * would fight the user as they type "my-form" — and removed by `tidySlug` on save.
 */
function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/** Final tidy-up before sending: the API rejects edge hyphens. */
function tidySlug(raw: string): string {
  return normalizeSlug(raw).replace(/^-+|-+$/g, "");
}

/** Domain only, for the unfurl preview. Falls back to the raw string. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function EmbedCard({
  label,
  tint,
  onClick,
}: {
  label: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-stretch overflow-hidden rounded-[10px] border border-line bg-canvas text-left",
        "transition-shadow hover:shadow-[0_4px_14px_-4px_rgba(24,22,30,0.13)]",
      )}
    >
      <span
        className="flex w-[136px] shrink-0 items-center justify-center py-7"
        style={{ background: tint }}
        aria-hidden="true"
      >
        <span className="h-[46px] w-[76px] rounded-[4px] bg-white/85" />
      </span>
      <span className="flex flex-1 items-center px-5 text-[15px] text-ink">{label}</span>
    </button>
  );
}

function QrGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.4" y="3.4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.6" y="3.4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.4" y="13.6" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M14 14h2.4M19.2 14h1.4M14 17.6h1.4M17.8 17.6h2.8M14 20.6h6.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
