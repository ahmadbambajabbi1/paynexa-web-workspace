"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as txApi from "@/src/lib/api/transactions";
import * as escrowApi from "@/src/lib/api/escrow";
import type { TransactionListItem } from "@/src/lib/api/types";
import { errorMessage } from "@/src/lib/api/errors";
import {
  formatStatus,
  formatTransactionType,
  statusApproxProgress,
} from "@/src/lib/transaction-ui";
import { userMayCreateTransactions } from "@/src/lib/kyc-access";
import { getCachedTransactions, loadTransactionsForParty, mergeTransactionItems, syncTransactionsIncremental } from "@/src/lib/transactions-cache";
import { formatMoney } from "@/src/lib/currency";
import { subscribeTransactionUpdates } from "@/src/lib/realtime/transaction-stream";

type TransactionFilter = "all" | "public" | "escrow";

type TransactionTab = {
  id: TransactionFilter;
  label: string;
  description: string;
  icon: string;
  count: number;
};

export default function TransactionsPage() {
  return (
    <RequireAuth requireProfileComplete>
      <TransactionsInner />
    </RequireAuth>
  );
}

function TransactionsInner() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<TransactionListItem[]>(() =>
    user ? getCachedTransactions(user.id) : [],
  );
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter] = useState<TransactionFilter>("all");
  const [walletCurrency, setWalletCurrency] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const realtimeRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    const cached = getCachedTransactions(user.id);
    if (cached.length > 0) {
      setItems(cached);
    } else {
      setSyncing(true);
    }
    void (async () => {
      try {
        const [merged, wallet, listRes] = await Promise.all([
          loadTransactionsForParty(user.id, (opts) =>
            txApi.listTransactionsForParty(token, user.id, opts),
          ),
          escrowApi.getWallet(token),
          txApi.listTransactionsForParty(token, user.id, { limit: 40 }),
        ]);
        if (!cancelled) {
          setItems(merged);
          setNextCursor(listRes.nextCursor ?? null);
          setHasMore(listRes.hasMore === true);
          setWalletCurrency(wallet.currency ?? null);
          setLoadErr(null);
        }
      } catch (e) {
        if (!cancelled && cached.length === 0) setLoadErr(errorMessage(e));
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  useEffect(() => {
    if (!user?.id || !token) return;
    const abort = new AbortController();

    const scheduleListRefresh = (event?: { type?: string }) => {
      if (realtimeRefreshRef.current) {
        clearTimeout(realtimeRefreshRef.current);
      }
      const delay = event?.type === "transaction.updated" ? 0 : 150;
      realtimeRefreshRef.current = setTimeout(() => {
        void syncTransactionsIncremental(user.id, (opts) =>
          txApi.listTransactionsForParty(token, user.id, opts),
        ).then((merged) => {
          if (!abort.signal.aborted) setItems(merged);
        });
      }, delay);
    };

    subscribeTransactionUpdates({
      token,
      userId: user.id,
      signal: abort.signal,
      onEvent: scheduleListRefresh,
    });

    return () => {
      abort.abort();
      if (realtimeRefreshRef.current) clearTimeout(realtimeRefreshRef.current);
    };
  }, [user?.id, token]);

  const loadMore = useCallback(async () => {
    if (!token || !user?.id || !hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await txApi.listTransactionsForParty(token, user.id, {
        limit: 40,
        cursor: nextCursor,
      });
      setItems((prev) => mergeTransactionItems(prev, res.items));
      setNextCursor(res.nextCursor ?? null);
      setHasMore(res.hasMore === true);
    } finally {
      setLoadingMore(false);
    }
  }, [token, user?.id, hasMore, loadingMore, nextCursor]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore, items.length]);

  const filteredItems = useMemo(() => {
    if (filter === "public") return items.filter((item) => item.workflow === "PUBLIC_SHAREABLE");
    if (filter === "escrow") return items.filter((item) => item.workflow === "ESCROW_TWO_PARTY");
    return items;
  }, [filter, items]);

  const counts = useMemo(() => {
    const publicCount = items.filter((item) => item.workflow === "PUBLIC_SHAREABLE").length;
    const escrowCount = items.filter((item) => item.workflow === "ESCROW_TWO_PARTY").length;
    const activeCount = items.filter((item) => ["FUNDED", "IN_PROGRESS", "INSPECTION"].includes(item.status)).length;
    return {
      all: items.length,
      public: publicCount,
      escrow: escrowCount,
      active: activeCount,
    };
  }, [items]);

  const tabs: TransactionTab[] = useMemo(() => [
    {
      id: "all",
      label: "All Transactions",
      description: "Every transaction",
      icon: "fa-layer-group",
      count: counts.all,
    },
    {
      id: "public",
      label: "Shareable sales",
      description: "Payment-link checkout",
      icon: "fa-link",
      count: counts.public,
    },
    // {
    //   id: "escrow",
    //   label: "Two-party escrow",
    //   description: "Buyer and seller rooms",
    //   icon: "fa-shield-alt",
    //   count: counts.escrow,
    // },
  ], [counts]);

  const selectedTab = tabs.find((tab) => tab.id === filter) ?? tabs[0];

  if (!user || !token) return null;

  return (
    <>
      {/* Header – clean, no background */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="app-kicker">
            Transaction Dashboard
          </span>
          <h1 className="app-section-heading mt-1 text-3xl font-extrabold md:text-4xl">
            Transactions
          </h1>
        </div>
        <Link
          href={userMayCreateTransactions(user) ? "/transactions/new" : "/kyc/personal"}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-black/90 hover:shadow-md active:scale-95"
        >
          <i className={`fas ${userMayCreateTransactions(user) ? "fa-shield-alt" : "fa-id-card"}`} />
          {userMayCreateTransactions(user)
            ? "Create transaction"
            : user.personalKycStatus === "PENDING"
              ? "KYC pending review"
              : "Apply KYC"}
        </Link>
      </div>

      {/* Stats strip – elegant, no progress bars, light shadows */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          icon="fa-layer-group"
          label="Total Transactions"
          value={String(counts.all)}
        />
        <Stat
          icon="fa-link"
          label="Shareable Transactions"
          value={String(counts.public)}
        />
        {/* <Stat icon="fa-shield-alt" label="Two-Party Escrows" value={String(counts.escrow)} /> */}
        <Stat
          icon="fa-lock"
          label="in Escrow"
          value={String(counts.active)}
        />
      </div>

      {/* Uncomment below to enable tab switching */}
      {/* <TransactionTabs tabs={tabs} active={filter} onChange={setFilter} /> */}

      {/* Transaction list – refined card design */}
      <div className="app-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)] px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="app-section-heading text-xl font-bold">
              {selectedTab.label}
            </h2>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-app-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-app-text)] shadow-sm">
              <i className={`fas ${selectedTab.icon}`} />
              {filteredItems.length} {filteredItems.length === 1 ? "transaction" : "transactions"}
            </span>
          </div>
        </div>

        {loadErr && (
          <div className="mx-6 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadErr}
          </div>
        )}

        <div className="space-y-4 p-6">
          {syncing && filteredItems.length === 0 && !loadErr ? (
            <TransactionsLoading />
          ) : filteredItems.length === 0 && !loadErr ? (
            <EmptyState filter={filter} />
          ) : null}

          {filteredItems.map((row) => (
            <TransactionRow key={row.id} row={row} selfId={user.id} currency={walletCurrency} />
          ))}
          <div ref={loadMoreRef} className="py-4 text-center text-sm text-black/45">
            {loadingMore ? "Loading more…" : hasMore ? "Scroll for more" : filteredItems.length > 0 ? "End of list" : null}
          </div>
        </div>
      </div>
    </>
  );
}

// Kept for the deferred multi-tab transaction view design.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TransactionTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TransactionTab[];
  active: TransactionFilter;
  onChange: (value: TransactionFilter) => void;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-2.5">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`group flex flex-1 items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                selected
                  ? "border-black bg-black text-white shadow-md shadow-black/15"
                  : "border-transparent bg-black/5 text-black hover:bg-black/10"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base transition-colors ${
                  selected
                    ? "bg-white/10 text-white"
                    : "bg-white text-black shadow-sm"
                }`}
              >
                <i className={`fas ${tab.icon}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold tracking-tight">{tab.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-black/10 text-black"
                    }`}
                  >
                    {tab.count}
                  </span>
                </span>
                <span
                  className={`mt-1 block truncate text-xs ${
                    selected ? "text-white/70" : "text-black/60"
                  }`}
                >
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TransactionRow({
  row,
  selfId,
  currency,
}: {
  row: TransactionListItem;
  selfId: string;
  currency: string | null;
}) {
  const isPublic = row.workflow === "PUBLIC_SHAREABLE";
  const roleLabel = row.buyerId === selfId ? "Buying" : "Selling";
  const progress = statusApproxProgress(row.status);

  return (
    <Link
      href={`/transactions/${row.id}`}
      className="app-card app-card-hover group block rounded-2xl p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-app-surface-muted)] text-lg text-[var(--color-app-text)]">
            <i className={`fas ${isPublic ? "fa-link" : "fa-shield-alt"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-bold text-[var(--color-app-text)]">
                    {row.productTitle || `Secure sale ${row.id.slice(0, 8)}...`}
                  </h3>
                  <WorkflowBadge workflow={row.workflow} />
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
                  {roleLabel} · {formatTransactionType(row.type)} ·{" "}
                  {new Date(row.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-[var(--color-app-text)]">
                  {formatMoney(row.amount, currency)}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusBadgeClass(
                    row.status
                  )}`}
                >
                  {formatStatus(row.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-app-text-muted)]">
                Progress
              </span>
              <span className="text-xs font-bold text-[var(--color-app-text)]">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-app-surface-muted)]">
              <div
                className="h-full rounded-full bg-[var(--color-primaryColorBlack)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)] text-[var(--color-app-text)] transition duration-300 group-hover:bg-[var(--color-primaryColorBlack)] group-hover:text-white">
            <i className="fas fa-chevron-right text-xs" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function WorkflowBadge({ workflow }: { workflow: string }) {
  const isPublic = workflow === "PUBLIC_SHAREABLE";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        isPublic
          ? "bg-black/5 text-black"
          : "bg-black text-white"
      }`}
    >
      {isPublic ? "Shareable sale" : "Two-party escrow"}
    </span>
  );
}

function statusBadgeClass(status: string): string {
  if (status === "COMPLETED" || status === "CLOSED")
    return "bg-black text-white";
  if (status === "DISPUTED") return "bg-red-50 text-red-700";
  return "bg-black/10 text-black";
}

function TransactionsLoading() {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-black/5 px-6 py-14 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
      <p className="mx-auto mt-4 max-w-md text-sm font-bold leading-6 text-black/70">
        Loading transactions...
      </p>
    </div>
  );
}

function EmptyState({ filter }: { filter: TransactionFilter }) {
  const text =
    filter === "public"
      ? "No shareable sales yet."
      : filter === "escrow"
      ? "No two-party escrow rooms yet."
      : "No transactions yet.";

  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-black/5 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black shadow-sm">
        <i className="fas fa-receipt" />
      </div>
      <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-6 text-black/70">
        {text}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Redesigned Stat Card – clean, elegant, no progress bar, light shadow
// ----------------------------------------------------------------------

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
      <div className="app-card app-card-hover rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
            <p className="app-kicker">
            {label}
          </p>
            <p className="mt-2 font-display text-4xl font-black tracking-tight text-[var(--color-app-text)]">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-app-surface-muted)] text-[var(--color-app-text)]">
          <i className={`fas ${icon} text-base`} />
        </div>
      </div>
    </div>
  );
}