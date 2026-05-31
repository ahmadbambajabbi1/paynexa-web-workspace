// "use client";

// import Link from "next/link";
// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";
// import { SiteHeader } from "@/src/components/SiteHeader";
// import { TransactionPaymentPanel } from "@/src/components/TransactionPaymentPanel";
// import { CURRENCY_PREFIX } from "@/src/config/constants";
// import * as txApi from "@/src/lib/api/transactions";
// import { errorMessage } from "@/src/lib/api/errors";
// import { useAuth } from "@/src/lib/auth/auth-context";
// import { isProfileComplete } from "@/src/lib/auth/profile";

// type PublicSummary = Awaited<ReturnType<typeof txApi.getPublicTransactionSummary>>;

// export default function PayTransactionPage() {
//   ...all original commented code preserved...
// }
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/src/components/SiteHeader";
import { TransactionPaymentPanel } from "@/src/components/TransactionPaymentPanel";
import { CURRENCY_PREFIX } from "@/src/config/constants";
import * as txApi from "@/src/lib/api/transactions";
import { errorMessage } from "@/src/lib/api/errors";
import { useAuth } from "@/src/lib/auth/auth-context";
import { isProfileComplete } from "@/src/lib/auth/profile";

type PublicSummary = Awaited<ReturnType<typeof txApi.getPublicTransactionSummary>>;

export default function PayTransactionPage() {
  const params = useParams();
  const router = useRouter();
  const ref = typeof params.id === "string" ? params.id : "";
  const { user, token, loading } = useAuth();
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const returnPath = `/pay/${encodeURIComponent(ref)}`;
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const profileHref = `/complete-profile?next=${encodeURIComponent(returnPath)}`;
  const appDeepLink = useMemo(() => `safetrade://pay/${encodeURIComponent(ref)}`, [ref]);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;

    txApi
      .getPublicTransactionSummary(ref)
      .then((nextSummary) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setErr(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSummary(null);
        setErr(errorMessage(e));
      });

    return () => {
      cancelled = true;
    };
  }, [ref]);

  useEffect(() => {
    if (!ref || typeof window === "undefined") return;
    const key = `safetrade:app-open:${ref}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    const t = window.setTimeout(() => { window.location.href = appDeepLink; }, 350);
    return () => window.clearTimeout(t);
  }, [appDeepLink, ref]);

  async function refreshSummary() {
    if (!ref) return;
    try {
      const nextSummary = await txApi.getPublicTransactionSummary(ref);
      setSummary(nextSummary);
      setErr(null);
    } catch (e) {
      setSummary(null);
      setErr(errorMessage(e));
    }
  }

  const isSeller = !!summary && !!user && user.id === summary.sellerId;
  const isAssignedOtherBuyer = !!summary?.buyerId && !!user && summary.buyerId !== user.id;
  const isDone = !!summary && ["FUNDED", "IN_PROGRESS", "INSPECTION", "COMPLETED", "CLOSED"].includes(summary.status);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <SiteHeader />


      {/* ── Page body ── */}
      <main className="flex-1 px-4 py-10 sm:px-6">
        {/* ── Hero band — sits below header, no overlap ── */}
        <div className="relative overflow-hidden bg-gambian-blue">
          {/* Decorative blobs — purely visual, pointer-events none */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

          <div className="relative mx-auto max-w-5xl px-6 pb-10 pt-20 sm:px-10 sm:pb-12 sm:pt-24">
            {/* Trust pill badges */}
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/70">
                <i className="fas fa-shield-alt text-white/70" />
                Escrow Protected
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/70">
                <i className="fas fa-lock text-white/70" />
                Secure Checkout
              </span>
            </div>

            {/* Title row */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Secure Shared Transaction
                </p>
                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {summary?.item ?? "Loading transaction…"}
                </h1>
                {summary && (
                  <p className="mt-1.5 text-sm font-semibold text-white/60">
                    Sold by <span className="text-white/85">{summary.seller}</span>
                  </p>
                )}
              </div>

              {/* Amount callout */}
              {summary && (
                <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Total</p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-white">
                    {CURRENCY_PREFIX}{summary.totalBuyerPays}
                  </p>
                </div>
              )}
            </div>

            {/* Open in App — bottom of hero */}
            <div className="mt-6">
              <a
                href={appDeepLink}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <i className="fas fa-mobile-alt" />
                Open in App instead
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl">

          {err && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
              {err}
            </div>
          )}

          {!summary && !err && (
            <div className="mb-6 rounded-2xl border border-gambian-blue/10 bg-white px-6 py-10 text-center text-sm font-medium text-gambian-blue/50">
              Loading transaction…
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">

            {/* ── Left: transaction details ── */}
            {summary && (
              <section className="flex flex-col gap-5 min-w-0">

                {/* Order summary table */}
                <div className="overflow-hidden rounded-2xl border border-gambian-blue/10 bg-white shadow-sm">
                  <div className="border-b border-gambian-blue/10 bg-white px-6 py-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gambian-blue/50">
                      Order Summary
                    </p>
                  </div>
                  <div className="divide-y divide-gambian-blue/5">
                    <LineItem label="Seller" value={summary.seller} />
                    <LineItem label="Status" value={formatPublicStatus(summary.status)} highlight />
                    <LineItem label="Quantity" value={String(summary.quantity ?? 1)} />
                    <LineItem label="Unit price" value={`${CURRENCY_PREFIX}${summary.unitPrice}`} />
                    <LineItem label="Subtotal" value={`${CURRENCY_PREFIX}${summary.amount}`} />
                  </div>
                  {/* Total row */}
                  <div className="flex items-center justify-between border-t-2 border-gambian-blue/10 bg-white px-6 py-5">
                    <p className="text-sm font-bold uppercase tracking-widest text-gambian-blue/50">Total</p>
                    <p className="text-2xl font-black text-gambian-blue">
                      {CURRENCY_PREFIX}{summary.totalBuyerPays}
                    </p>
                  </div>
                </div>

                {/* Item description */}
                {summary.itemDescription && (
                  <div className="rounded-2xl border border-gambian-blue/10 bg-white p-6 shadow-sm">
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gambian-blue/50">
                      Item Details
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gambian-blue/80">
                      {summary.itemDescription}
                    </p>
                  </div>
                )}

                {/* Seller note */}
                {summary.sellerNote && (
                  <div className="rounded-2xl border border-gambian-blue/10 bg-gambian-blue/5 p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <i className="fas fa-sticky-note text-xs text-gambian-blue/40" />
                      <p className="text-xs font-bold uppercase tracking-widest text-gambian-blue/50">
                        Seller Note
                      </p>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gambian-blue/80">
                      {summary.sellerNote}
                    </p>
                  </div>
                )}

                {/* Session protection notice */}
                <div className="flex items-start gap-4 rounded-2xl border border-gambian-blue/10 bg-gambian-blue/5 px-5 py-4">
                  <i className="fas fa-shield-alt mt-0.5 text-gambian-blue/50" />
                  <div>
                    <p className="text-xs font-bold text-gambian-blue">Session Protected</p>
                    <p className="mt-1 text-xs leading-relaxed text-gambian-blue/60">
                      Login, wallet funding, refreshes, and app handoff all return to this same transaction automatically.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* ── Right: action sidebar ── */}
            <aside className="min-w-0">
              <div className="sticky top-6 overflow-hidden rounded-2xl border border-gambian-blue/10 bg-white shadow-sm">

                <div className="border-b border-gambian-blue/10 bg-white px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gambian-blue/50">Next Step</p>
                </div>

                <div className="p-6">
                  {loading ? (
                    <p className="text-sm font-medium text-gambian-blue/50">Checking session…</p>

                  ) : !user || !token ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-extrabold tracking-tight text-gambian-blue">
                        Log in to continue
                      </h2>
                      <p className="text-sm leading-relaxed text-gambian-blue/70">
                        You will return to this transaction after login.
                      </p>
                      <Link
                        href={loginHref}
                        className="block w-full rounded-xl bg-gambian-blue py-3.5 text-center text-sm font-bold text-white transition hover:opacity-90"
                      >
                        Login or sign up
                      </Link>
                    </div>

                  ) : !isProfileComplete(user) ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-extrabold tracking-tight text-gambian-blue">
                        Complete profile
                      </h2>
                      <p className="text-sm leading-relaxed text-gambian-blue/70">
                        Finish profile setup, then you will return here.
                      </p>
                      <Link
                        href={profileHref}
                        className="block w-full rounded-xl bg-gambian-blue py-3.5 text-center text-sm font-bold text-white transition hover:opacity-90"
                      >
                        Continue profile
                      </Link>
                    </div>

                  ) : isSeller ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-extrabold tracking-tight text-gambian-blue">
                        Seller view
                      </h2>
                      <p className="text-sm leading-relaxed text-gambian-blue/70">
                        Share this link with buyers or track it in your transaction room.
                      </p>
                      {summary && (
                        <Link
                          href={`/transactions/${summary.id}`}
                          className="block w-full rounded-xl bg-gambian-blue py-3.5 text-center text-sm font-bold text-white transition hover:opacity-90"
                        >
                          View transaction room
                        </Link>
                      )}
                    </div>

                  ) : isAssignedOtherBuyer ? (
                    <p className="rounded-xl border border-gambian-blue/10 bg-gambian-blue/5 px-4 py-4 text-sm font-semibold text-gambian-blue">
                      This transaction is already assigned to another buyer.
                    </p>

                  ) : isDone && summary ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-extrabold tracking-tight text-gambian-blue">
                        Payment recorded
                      </h2>
                      <p className="text-sm leading-relaxed text-gambian-blue/70">
                        Continue tracking this transaction until it is completed.
                      </p>
                      <Link
                        href={`/transactions/${summary.id}`}
                        className="block w-full rounded-xl bg-gambian-blue py-3.5 text-center text-sm font-bold text-white transition hover:opacity-90"
                      >
                        Open transaction room
                      </Link>
                    </div>

                  ) : summary ? (
                    <TransactionPaymentPanel
                      token={token}
                      transactionId={summary.id}
                      amount={summary.totalBuyerPays}
                      onPaid={async (paidTransactionId) => {
                        await refreshSummary();
                        router.push(`/transactions/${paidTransactionId}`);
                      }}
                    />
                  ) : null}
                </div>

                {/* Bottom trust strip */}
                <div className="border-t border-gambian-blue/10 bg-white px-6 py-4">
                  <div className="flex items-center justify-center gap-4 text-xs text-gambian-blue/40">
                    <span className="flex items-center gap-1.5">
                      <i className="fas fa-lock" />
                      Encrypted
                    </span>
                    <span className="h-3 w-px bg-gambian-blue/10" />
                    <span className="flex items-center gap-1.5">
                      <i className="fas fa-shield-alt" />
                      Escrow guaranteed
                    </span>
                  </div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LineItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gambian-blue/40">{label}</p>
      <p
        className={`text-sm font-bold ${highlight
          ? "rounded-full bg-gambian-blue/10 px-3 py-1 text-gambian-blue"
          : "text-gambian-blue/80"
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatPublicStatus(status: string): string {
  if (status === "AWAITING_ACCEPTANCE") return "Awaiting buyer";
  if (status === "AWAITING_FUNDING") return "Awaiting payment";
  return status.replaceAll("_", " ").toLowerCase();
}