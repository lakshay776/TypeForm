"use client";

import { useCallback, useEffect, useState } from "react";

import { FormTopBar } from "@/components/builder/FormTopBar";
import { ResponseDrawer } from "@/components/results/ResponseDrawer";
import { ResponsesTab } from "@/components/results/ResponsesTab";
import { SummaryTab } from "@/components/results/SummaryTab";
import { Button, Spinner } from "@/components/ui/Button";
import { AlertCircle } from "@/components/ui/Icons";
import { ComingSoonModal } from "@/components/ui/Modal";
import { ApiError, api, exportUrl } from "@/lib/api";
import { cn } from "@/lib/format";
import type {
  FormDetail,
  FormStats,
  ResponseDetail,
  ResponseListItem,
} from "@/lib/types";

type Tab = "summary" | "responses";

const PAGE_SIZE = 25;

export function ResultsView({ form }: { form: FormDetail }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [stats, setStats] = useState<FormStats | null>(null);
  const [items, setItems] = useState<ResponseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.results.summary(form.id),
      api.results.responses(form.id, { limit: PAGE_SIZE, offset: 0 }),
    ])
      .then(([summary, page]) => {
        if (!active) return;
        setStats(summary);
        setItems(page.items);
        setTotal(page.total);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof ApiError ? cause.message : "Couldn't load the results.");
      })
      .finally(() => {
        if (active) setSettled(true);
      });

    return () => {
      active = false;
    };
  }, [form.id, reloadToken]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const page = await api.results.responses(form.id, {
        limit: PAGE_SIZE,
        offset: items.length,
      });
      setItems((current) => [...current, ...page.items]);
      setTotal(page.total);
    } catch {
      setError("Couldn't load more responses.");
    } finally {
      setLoadingMore(false);
    }
  }, [form.id, items.length]);

  const openResponse = useCallback(
    async (responseId: number) => {
      setOpenId(responseId);
      setDetail(null);
      setDetailLoading(true);
      try {
        setDetail(await api.results.response(form.id, responseId));
      } catch {
        setError("Couldn't open that response.");
        setOpenId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [form.id],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar">
      <FormTopBar form={form} active="results" onPlaceholder={setPlaceholder} />

      <nav
        className="scrollbar-slim flex shrink-0 items-end gap-1 overflow-x-auto border-b border-line bg-canvas px-4 whitespace-nowrap sm:px-6"
        aria-label="Results sections"
      >
        <SubTab active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </SubTab>
        <SubTab active={tab === "responses"} onClick={() => setTab("responses")}>
          Responses{settled && ` [${total}]`}
        </SubTab>
      </nav>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <div className="mx-auto w-full max-w-[1180px] px-8 py-10">
            <div className="rounded-[12px] border border-line bg-danger-bg/40 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
                <AlertCircle size={24} />
              </span>
              <h2 className="mt-4 text-[16px] font-medium text-ink">Couldn’t load results</h2>
              <p className="mx-auto mt-1.5 max-w-md text-[14px] text-ink-soft">{error}</p>
              <Button
                size="sm"
                className="mt-5"
                onClick={() => {
                  setError(null);
                  setSettled(false);
                  setReloadToken((value) => value + 1);
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : !settled ? (
          <div className="flex flex-1 justify-center py-24">
            <Spinner className="h-6 w-6 text-ink-soft" />
          </div>
        ) : tab === "summary" ? (
          <div className="scrollbar-slim flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1180px] px-8 py-10">
              <h1 className="mb-8 text-[30px] leading-none font-semibold tracking-[-0.02em] text-ink">
                Summary
              </h1>
              {stats && <SummaryTab stats={stats} />}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <ResponsesTab
              questions={form.questions}
              items={items}
              total={total}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              onOpen={openResponse}
              onPlaceholder={setPlaceholder}
              exportHref={exportUrl(form.id)}
            />
          </div>
        )}
      </main>

      <ResponseDrawer
        open={openId !== null}
        onClose={() => setOpenId(null)}
        detail={detail}
        loading={detailLoading}
        questions={form.questions}
      />

      <ComingSoonModal
        open={placeholder !== null}
        onClose={() => setPlaceholder(null)}
        feature={placeholder ?? ""}
      />
    </div>
  );
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative px-3 pt-3.5 pb-3 text-[15px] transition-colors",
        active ? "font-medium text-ink" : "text-ink-soft hover:text-ink",
      )}
    >
      {children}
      {active && <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-ink" />}
    </button>
  );
}
