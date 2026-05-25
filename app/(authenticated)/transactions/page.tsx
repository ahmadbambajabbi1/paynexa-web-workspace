"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as txApi from "@/src/lib/api/transactions";
import type { TransactionListItem } from "@/src/lib/api/types";
import { errorMessage } from "@/src/lib/api/errors";
import {
  formatStatus,
  formatTransactionType,
  statusApproxProgress,
} from "@/src/lib/transaction-ui";
import { userMayCreateTransactions } from "@/src/lib/kyc-access";
import { CURRENCY_PREFIX } from "@/src/config/constants";

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
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("all");

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await txApi.listTransactionsForParty(token, user.id);
        if (!cancelled) {
          setItems(res.items);
          setLoadErr(null);
        }
      } catch (e) {
        if (!cancelled) setLoadErr(errorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

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
      label: "All rooms",
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

  const filteredItems = useMemo(() => {
    if (filter === "public") return items.filter((item) => item.workflow === "PUBLIC_SHAREABLE");
    if (filter === "escrow") return items.filter((item) => item.workflow === "ESCROW_TWO_PARTY");
    return items;
  }, [filter, items]);

  if (!user || !token) return null;

  return (
    <>
      {/* Redesigned Header/Hero Card */}
      <div className="relative overflow-hidden rounded-xl bg-gambian-blue p-8 text-white shadow-xl shadow-gambian-blue/10 mb-8">
        <div className="absolute right-0 top-0 h-40 w-40 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">Transaction Dashboard</span>
            <h1 className="mt-1 font-display text-3xl font-extrabold md:text-4xl tracking-tight">Transactions</h1>
          </div>
          <Link
            href={userMayCreateTransactions(user) ? "/transactions/new" : "/kyc/personal"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-gambian-blue hover:bg-white/90 shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <i className={`fas ${userMayCreateTransactions(user) ? "fa-shield-alt" : "fa-id-card"} text-gambian-blue`} />
            {userMayCreateTransactions(user)
              ? "Create transaction"
              : user.personalKycStatus === "PENDING"
                ? "KYC pending review"
                : "Apply KYC"}
          </Link>
        </div>
      </div>

      {/* ── Colorful Aggregation Strip ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          icon="fa-layer-group"
          label="Total Rooms"
          value={String(counts.all)}
          accent="amber"
        />
        <Stat
          icon="fa-link"
          label="Shareable Links"
          value={String(counts.public)}
          accent="emerald"
        />
        {/* <Stat icon="fa-shield-alt" label="Two-Party Escrows" value={String(counts.escrow)} accent="violet" /> */}
        <Stat
          icon="fa-lock"
          label="Currently in Escrow"
          value={String(counts.active)}
          accent="rose"
        />
      </div>

      {/* <TransactionTabs tabs={tabs} active={filter} onChange={setFilter} /> */}

      {/* Redesigned Listing Section */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-gambian-blue/10 bg-white shadow-sm">
        <div className="border-b border-gambian-blue/10 bg-gambian-blue/5 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-gambian-blue">{selectedTab.label}</h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gambian-blue/10 bg-white px-4 py-2 text-xs font-bold text-gambian-blue shadow-sm">
              <i className={`fas ${selectedTab.icon}`} />
              {filteredItems.length} {filteredItems.length === 1 ? "transaction" : "transactions"}
            </span>
          </div>
        </div>
        {loadErr && (
          <p className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadErr}
          </p>
        )}
        <div className="space-y-4 p-6">
          {filteredItems.length === 0 && !loadErr && (
            <EmptyState filter={filter} />
          )}
          {filteredItems.map((row) => (
            <TransactionRow key={row.id} row={row} selfId={user.id} />
          ))}
        </div>
      </div>
    </>
  );
}

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
    <div className="rounded-2xl border border-gambian-blue/10 bg-white p-2.5 shadow-sm mb-6">
      <div className="gap2.5 flex">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`w-full group flex min-h-20 items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${selected
                ? "border-gambian-blue bg-gambian-blue text-white shadow-md shadow-gambian-blue/15"
                : "border-transparent bg-gambian-blue/5 text-gambian-blue hover:bg-gambian-blue/10"
                }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base transition-colors duration-200 ${selected
                  ? "bg-white/10 text-gambian-gold"
                  : "bg-white text-gambian-blue shadow-sm"
                  }`}
              >
                <i className={`fas ${tab.icon}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold tracking-tight">{tab.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${selected ? "bg-white/20 text-white" : "bg-gambian-blue/10 text-gambian-blue"}`}>
                    {tab.count}
                  </span>
                </span>
                <span className={`mt-1 block truncate text-xs ${selected ? "text-white/70" : "text-gambian-blue/60"}`}>
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

function TransactionRow({ row, selfId }: { row: TransactionListItem; selfId: string }) {
  const isPublic = row.workflow === "PUBLIC_SHAREABLE";
  const roleLabel = row.buyerId === selfId ? "Buying" : "Selling";
  const progress = statusApproxProgress(row.status);

  return (
    <Link
      href={`/transactions/${row.id}`}
      className="group block rounded-2xl border border-gambian-blue/10 bg-white p-5 transition-all duration-300 hover:border-gambian-blue/30 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg bg-gambian-blue/5 text-gambian-blue"
          >
            <i className={`fas ${isPublic ? "fa-link" : "fa-shield-alt"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-gambian-blue">
                {row.productTitle || `Secure sale ${row.id.slice(0, 8)}...`}
              </h3>
              <WorkflowBadge workflow={row.workflow} />
            </div>
            <p className="mt-1 text-xs text-gambian-blue/60 font-semibold uppercase tracking-wider">
              {roleLabel} · {formatTransactionType(row.type)} · {new Date(row.updatedAt).toLocaleDateString()}
            </p>
            <p className="mt-2.5 text-xl font-extrabold text-gambian-blue">{CURRENCY_PREFIX}{row.amount}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 lg:min-w-[17rem]">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusBadgeClass(row.status)}`}>
                {formatStatus(row.status)}
              </span>
              <span className="text-xs font-bold text-gambian-blue">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gambian-blue/5">
              <div
                className="h-full rounded-full bg-gambian-blue transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gambian-blue/10 bg-gambian-blue/5 text-gambian-blue transition duration-300 group-hover:bg-gambian-blue group-hover:text-white">
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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isPublic ? "bg-gambian-blue/5 text-gambian-blue" : "bg-gambian-blue text-white"}`}>
      {isPublic ? "Shareable sale" : "Two-party escrow"}
    </span>
  );
}

function statusBadgeClass(status: string): string {
  if (status === "COMPLETED" || status === "CLOSED") return "bg-gambian-blue text-white";
  if (status === "DISPUTED") return "bg-red-50 text-red-700";
  return "bg-gambian-blue/10 text-gambian-blue";
}

function EmptyState({ filter }: { filter: TransactionFilter }) {
  const text = filter === "public"
    ? "No shareable sales yet."
    : filter === "escrow"
      ? "No two-party escrow rooms yet."
      : "No transactions yet.";

  return (
    <div className="rounded-2xl border border-dashed border-gambian-blue/10 bg-gambian-blue/5 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gambian-blue shadow-sm">
        <i className="fas fa-receipt" />
      </div>
      <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-6 text-gambian-blue/70">{text}</p>
    </div>
  );
}

// ── Colorful Stat Card ────────────────────────────────────────────────────────
// Each card has a vivid gradient background that pops against the black primary.
// gambian-blue is NOT used here — these cards are fully self-colored.
// All colors are Tailwind palette tokens, zero hardcoded hex.

type StatAccent = "amber" | "emerald" | "rose" | "violet" | "sky";

const accentMap: Record<
  StatAccent,
  {
    cardBg: string;         // full card gradient background
    cardBorder: string;     // card border
    cardShadow: string;     // colored drop shadow
    glowBg: string;         // top-right decorative blur circle
    iconBg: string;         // icon pill background
    iconText: string;       // icon color
    labelText: string;      // small label color
    valueText: string;      // big number color
    barTrack: string;       // bar track
    barFill: string;        // bar fill
    dotColor: string;       // live-dot indicator
  }
> = {
  amber: {
    cardBg: "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500",
    cardBorder: "border-amber-300/30",
    cardShadow: "shadow-amber-400/40",
    glowBg: "bg-white/10",
    iconBg: "bg-white/20",
    iconText: "text-white",
    labelText: "text-amber-100/90",
    valueText: "text-white",
    barTrack: "bg-white/20",
    barFill: "bg-white/80",
    dotColor: "bg-white",
  },
  emerald: {
    cardBg: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
    cardBorder: "border-emerald-300/30",
    cardShadow: "shadow-emerald-400/40",
    glowBg: "bg-white/10",
    iconBg: "bg-white/20",
    iconText: "text-white",
    labelText: "text-emerald-100/90",
    valueText: "text-white",
    barTrack: "bg-white/20",
    barFill: "bg-white/80",
    dotColor: "bg-white",
  },
  rose: {
    cardBg: "bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600",
    cardBorder: "border-rose-300/30",
    cardShadow: "shadow-rose-400/40",
    glowBg: "bg-white/10",
    iconBg: "bg-white/20",
    iconText: "text-white",
    labelText: "text-rose-100/90",
    valueText: "text-white",
    barTrack: "bg-white/20",
    barFill: "bg-white/80",
    dotColor: "bg-white",
  },
  violet: {
    cardBg: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
    cardBorder: "border-violet-300/30",
    cardShadow: "shadow-violet-400/40",
    glowBg: "bg-white/10",
    iconBg: "bg-white/20",
    iconText: "text-white",
    labelText: "text-violet-100/90",
    valueText: "text-white",
    barTrack: "bg-white/20",
    barFill: "bg-white/80",
    dotColor: "bg-white",
  },
  sky: {
    cardBg: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500",
    cardBorder: "border-sky-300/30",
    cardShadow: "shadow-sky-400/40",
    glowBg: "bg-white/10",
    iconBg: "bg-white/20",
    iconText: "text-white",
    labelText: "text-sky-100/90",
    valueText: "text-white",
    barTrack: "bg-white/20",
    barFill: "bg-white/80",
    dotColor: "bg-white",
  },
};

function Stat({
  icon,
  label,
  value,
  accent = "amber",
}: {
  icon: string;
  label: string;
  value: string;
  accent?: StatAccent;
}) {
  const a = accentMap[accent];
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border p-6
        shadow-lg transition-all duration-300
        hover:-translate-y-1 hover:shadow-xl
        ${a.cardBg} ${a.cardBorder} ${a.cardShadow}
      `}
    >
      {/* Top-right decorative glow circle */}
      <div
        className={`
          pointer-events-none absolute -right-8 -top-8
          h-32 w-32 rounded-full blur-2xl
          ${a.glowBg}
        `}
      />
      {/* Bottom-left subtle circle */}
      <div
        className={`
          pointer-events-none absolute -bottom-6 -left-6
          h-20 w-20 rounded-full blur-xl
          ${a.glowBg}
        `}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        {/* Left — label + big number */}
        <div className="min-w-0">
          {/* Live dot + label */}
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${a.dotColor} opacity-80`} />
            <p className={`text-xs font-bold uppercase tracking-widest ${a.labelText}`}>
              {label}
            </p>
          </div>
          <p className={`mt-3 font-display text-5xl font-black tracking-tight leading-none ${a.valueText}`}>
            {value}
          </p>
        </div>

        {/* Right — icon pill */}
        <span
          className={`
            flex h-14 w-14 shrink-0 items-center justify-center
            rounded-2xl text-2xl
            ${a.iconBg} ${a.iconText}
            backdrop-blur-sm
          `}
        >
          <i className={`fas ${icon}`} />
        </span>
      </div>

      {/* Bottom accent bar */}
      <div className={`relative z-10 mt-6 h-1 w-full overflow-hidden rounded-full ${a.barTrack}`}>
        <div className={`h-full w-3/4 rounded-full ${a.barFill}`} />
      </div>
    </div>
  );
}