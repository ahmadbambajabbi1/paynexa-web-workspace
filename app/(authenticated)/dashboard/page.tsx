"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateTransactionForm } from "@/src/components/CreateTransactionForm";
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
import { cardPanel } from "@/src/components/ui/form-classes";
import { userMayCreateTransactions } from "@/src/lib/kyc-access";

export default function DashboardPage() {
  return (
    <RequireAuth requireProfileComplete>
      <DashboardInner />
    </RequireAuth>
  );
}

// ─── tiny helpers ────────────────────────────────────────────────────────────

function statusColor(status: string): { bg: string; text: string; dot: string } {
  if (["COMPLETED", "CLOSED"].includes(status))
    return { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" };
  if (status === "DISPUTED")
    return { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" };
  if (["FUNDED", "IN_PROGRESS", "INSPECTION"].includes(status))
    return { bg: "bg-primaryColorBlack/10", text: "text-primaryColorBlack", dot: "bg-primaryColorBlack" };
  return { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" };
}

function StatusPill({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {formatStatus(status)}
    </span>
  );
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: string;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_2px_16px_rgba(11,37,69,0.08)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(11,37,69,0.14)] hover:-translate-y-0.5">
      {/* subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-3xl bg-primaryColorBlack/20 group-hover:bg-primaryColorBlack/60 transition-colors duration-300" />
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
        <i className={`fas ${icon} text-lg ${iconColor}`} />
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}

// ─── new-transaction CTA card ─────────────────────────────────────────────────

function NewTransactionCard({
  canCreate,
  kycPending,
  onClick,
}: {
  canCreate: boolean;
  kycPending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[140px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-primaryColorBlack p-6 shadow-[0_2px_16px_rgba(11,37,69,0.20)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(11,37,69,0.30)] hover:-translate-y-0.5 active:scale-95"
    >
      {/* decorative circle */}
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/[0.04]" />

      <i
        className={`fas mb-3 text-3xl text-white ${canCreate ? "fa-plus-circle" : kycPending ? "fa-hourglass-half" : "fa-id-card"
          }`}
      />
      <span className="relative z-10 text-base font-bold text-white">
        {canCreate ? "New Transaction" : kycPending ? "KYC Pending Review" : "Apply KYC"}
      </span>
    </button>
  );
}

// ─── transaction row ──────────────────────────────────────────────────────────

function TransactionRow({
  row,
  userId,
}: {
  row: TransactionListItem;
  userId: string;
}) {
  const isProperty =
    row.type.includes("ESTATE") || row.type.includes("LAND");
  const isBuyer = row.buyerId === userId;
  const progress = statusApproxProgress(row.status);

  return (
    <Link
      href={`/transactions/${row.id}`}
      className="group block transition-colors duration-150 hover:bg-primaryColorBlack/[0.025]"
    >
      <div className="flex items-center gap-4 px-6 py-5">
        {/* icon */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg transition-transform duration-200 group-hover:scale-105 ${isProperty
            ? "bg-gambian-sand text-gambian-earth"
            : "bg-primaryColorBlack/10 text-primaryColorBlack"
            }`}
        >
          <i className={`fas ${isProperty ? "fa-home" : "fa-box"}`} />
        </div>

        {/* info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-900">
              Escrow #{row.id.slice(0, 8)}
            </p>
            <StatusPill status={row.status} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatTransactionType(row.type)} ·{" "}
            <span className={`font-semibold ${isBuyer ? "text-primaryColorBlack" : "text-gambian-earth"}`}>
              {isBuyer ? "You are buying" : "You are selling"}
            </span>{" "}
            · {new Date(row.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>

          {/* progress bar */}
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primaryColorBlack transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold text-gray-400">
              {progress}%
            </span>
          </div>
        </div>

        {/* arrow */}
        <i className="fas fa-chevron-right shrink-0 text-sm text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primaryColorBlack" />
      </div>
    </Link>
  );
}

// ─── main inner component ─────────────────────────────────────────────────────

function DashboardInner() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = items.filter((i) =>
      ["AWAITING_ACCEPTANCE", "AWAITING_FUNDING", "FUNDED", "IN_PROGRESS", "INSPECTION"].includes(i.status),
    ).length;
    const done = items.filter((i) =>
      ["COMPLETED", "CLOSED"].includes(i.status),
    ).length;
    return { total: items.length, active, done };
  }, [items]);

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
    return () => { cancelled = true; };
  }, [user, token]);

  if (!user || !token) return null;

  const canCreate = userMayCreateTransactions(user);
  const kycPending = user.personalKycStatus === "PENDING";

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-primaryColorBlack/50 mb-1">
          Welcome back
        </p>
        <h1 className="text-3xl capitalize font-black tracking-tight text-gray-900 md:text-4xl">
          {user.displayName || user.fullName || "My Dashboard"}
        </h1>
      </div>

      {/* ── Stat cards ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon="fa-list"
          label="Total"
          value={stats.total}
          iconBg="bg-primaryColorBlack/10"
          iconColor="text-primaryColorBlack"
        />
        <StatCard
          icon="fa-clock"
          label="In Progress"
          value={stats.active}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          icon="fa-check-double"
          label="Completed"
          value={stats.done}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <NewTransactionCard
          canCreate={canCreate}
          kycPending={kycPending}
          onClick={() => {
            if (!canCreate) {
              router.push("/kyc/personal");
              return;
            }
            router.push("/transactions/new");
          }}
        />
      </div>

      {/* ── Transactions list ── */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(11,37,69,0.08)]">
        {/* list header */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Recent Transactions
            </h2>
            <p className="text-sm text-gray-400">
              {items.length === 0 ? "No transactions yet" : `${items.length} transaction${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-primaryColorBlack/10 px-3 py-1.5 text-xs font-bold text-primaryColorBlack">
            All roles
          </span>
        </div>

        {/* divider */}
        <div className="h-px bg-gray-100" />

        {/* error */}
        {loadErr && (
          <div className="mx-6 my-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <i className="fas fa-exclamation-circle mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm text-red-800">{loadErr}</p>
          </div>
        )}

        {/* empty state */}
        {items.length === 0 && !loadErr && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primaryColorBlack/10">
              <i className="fas fa-inbox text-2xl text-primaryColorBlack" />
            </div>
            <p className="text-base font-bold text-gray-700">No transactions yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Create your first escrow transaction to get started.
            </p>
            {canCreate && (
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primaryColorBlack px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-primaryColorBlack/90 active:scale-95"
                onClick={() => {
                  if (!canCreate) {
                    router.push("/kyc/personal");
                    return;
                  }
                  router.push("/transactions/new");
                }}
              >
                <i className="fas fa-plus" />
                New Transaction
              </button>
            )}
          </div>
        )}

        {/* rows */}
        <div className="divide-y divide-gray-50">
          {items.map((row) => (
            <TransactionRow key={row.id} row={row} userId={user.id} />
          ))}
        </div>
      </div>
    </>
  );
}