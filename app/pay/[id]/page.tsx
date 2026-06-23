"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/src/components/SiteHeader";
import { TransactionPaymentPanel } from "@/src/components/TransactionPaymentPanel";
import { DeliveryAddressSection } from "@/src/components/DeliveryAddressSection";
import type { DeliveryFormValues } from "@/src/components/DeliveryAddressPicker";
import * as txApi from "@/src/lib/api/transactions";
import * as escrowApi from "@/src/lib/api/escrow";
import { errorMessage } from "@/src/lib/api/errors";
import { useAuth } from "@/src/lib/auth/auth-context";
import { isProfileComplete } from "@/src/lib/auth/profile";
import { APP_DEEP_LINK_SCHEME } from "@/src/config/constants";
import { formatMoney } from "@/src/lib/currency";

type PublicSummary = Awaited<ReturnType<typeof txApi.getPublicTransactionSummary>>;

export default function PayTransactionPage() {
  const params = useParams();
  const router = useRouter();
  const ref = typeof params.id === "string" ? params.id : "";
  const { user, token, loading } = useAuth();
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<string | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<Awaited<ReturnType<typeof escrowApi.getTransactionPaymentQuote>> | null>(null);
  const [checkoutTxId, setCheckoutTxId] = useState<string | null>(null);
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState<DeliveryFormValues | null>(null);

  const returnPath = `/pay/${encodeURIComponent(ref)}`;
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const profileHref = `/complete-profile?next=${encodeURIComponent(returnPath)}`;
  const appDeepLink = useMemo(
    () => `${APP_DEEP_LINK_SCHEME}://pay/${encodeURIComponent(ref)}`,
    [ref],
  );

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    txApi
      .getPublicTransactionSummary(ref, token)
      .then((nextSummary) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setCheckoutTxId(nextSummary.id);
        setErr(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSummary(null);
        setErr(errorMessage(e));
      });
    return () => { cancelled = true; };
  }, [ref, token]);

  useEffect(() => {
    if (!token || !checkoutTxId) {
      setPaymentQuote(null);
      return;
    }
    let cancelled = false;
    void escrowApi.getTransactionPaymentQuote(token, checkoutTxId).then((q) => {
      if (!cancelled) setPaymentQuote(q);
    }).catch(() => {
      if (!cancelled) setPaymentQuote(null);
    });
    return () => { cancelled = true; };
  }, [token, checkoutTxId]);

  useEffect(() => {
    if (!token) {
      setWalletCurrency(null);
      return;
    }
    let cancelled = false;
    void escrowApi.getWallet(token).then((wallet) => {
      if (!cancelled) setWalletCurrency(wallet.currency ?? null);
    }).catch(() => {
      if (!cancelled) setWalletCurrency(null);
    });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!ref || typeof window === "undefined") return;
    const key = `paynexa:app-open:${ref}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    const t = window.setTimeout(() => { window.location.href = appDeepLink; }, 350);
    return () => window.clearTimeout(t);
  }, [appDeepLink, ref]);

  async function refreshSummary() {
    if (!ref) return;
    try {
      const nextSummary = await txApi.getPublicTransactionSummary(ref, token);
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
  const transactionCurrency =
    paymentQuote?.transactionCurrency ??
    summary?.currencyCode ??
    null;
  const displayCurrency = transactionCurrency ?? walletCurrency ?? null;
  const payAmount =
    paymentQuote?.conversionApplied
      ? paymentQuote.buyerAmount
      : summary?.totalBuyerPays ?? "0";
  const payCurrency =
    paymentQuote?.conversionApplied
      ? paymentQuote.buyerCurrency
      : transactionCurrency ?? walletCurrency;

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">
        {err ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {err}
          </div>
        ) : null}

        {!summary && !err ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
            Loading checkout…
          </div>
        ) : null}

        {summary ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Card header — contained inside checkout card, not under navbar */}
            <div className="border-b border-slate-200 bg-primaryColorBlack px-6 py-8 sm:px-8">
              <div className="flex flex-wrap gap-2">
                <Badge icon="fa-shield-alt" label="Escrow protected" />
                <Badge icon="fa-lock" label="Secure checkout" />
              </div>
              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                    Secure shared transaction
                  </p>
                  <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {summary.item}
                  </h1>
                  <p className="mt-2 text-sm text-white/70">
                    Sold by <span className="font-semibold text-white">{summary.seller}</span>
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Total</p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {formatMoney(summary.totalBuyerPays, displayCurrency)}
                  </p>
                </div>
              </div>
              <a
                href={appDeepLink}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <i className="fas fa-mobile-alt" />
                Open in app instead
              </a>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Order summary */}
              <section className="border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Order summary</h2>
                <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50">
                  <LineItem label="Seller" value={summary.seller} />
                  <LineItem label="Status" value={formatPublicStatus(summary.status)} highlight />
                  <LineItem label="Quantity" value={String(summary.quantity ?? 1)} />
                  <LineItem label="Unit price" value={formatMoney(summary.unitPrice, displayCurrency)} />
                  <LineItem label="Subtotal" value={formatMoney(summary.amount, displayCurrency)} />
                    {paymentQuote?.conversionApplied ? (
                      <>
                        <LineItem label="Your currency" value={paymentQuote.buyerCurrency} />
                        <LineItem label="You pay" value={formatMoney(paymentQuote.buyerAmount, paymentQuote.buyerCurrency)} />
                        <LineItem label="Exchange rate" value={paymentQuote.displayRate} />
                      </>
                    ) : null}
                  <div className="flex items-center justify-between px-5 py-4">
                    <p className="text-sm font-bold text-slate-700">Total</p>
                    <p className="text-xl font-black text-slate-900">
                      {formatMoney(summary.totalBuyerPays, displayCurrency)}
                    </p>
                  </div>
                </div>

                {summary.itemDescription ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Item details</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {summary.itemDescription}
                    </p>
                  </div>
                ) : null}

                {summary.sellerNote ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-800">Seller note</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-950">
                      {summary.sellerNote}
                    </p>
                  </div>
                ) : null}
              </section>

              {/* Next step */}
              <aside className="p-6 sm:p-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Next step</h2>
                <div className="mt-5">
                  {loading ? (
                    <p className="text-sm text-slate-500">Checking session…</p>
                  ) : !user || !token ? (
                    <ActionCard title="Log in to continue" body="You will return to this checkout after login.">
                      <Link href={loginHref} className={primaryBtnClass}>Login or sign up</Link>
                    </ActionCard>
                  ) : !isProfileComplete(user) ? (
                    <ActionCard title="Complete your profile" body="Finish setup, then you will return here.">
                      <Link href={profileHref} className={primaryBtnClass}>Continue profile</Link>
                    </ActionCard>
                  ) : isSeller ? (
                    <ActionCard title="Seller view" body="Share this link with buyers or open your transaction room.">
                      <Link href={`/transactions/${summary.id}`} className={primaryBtnClass}>View transaction room</Link>
                    </ActionCard>
                  ) : isAssignedOtherBuyer ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-900">
                      This transaction is already assigned to another buyer.
                    </p>
                  ) : isDone ? (
                    <ActionCard title="Payment recorded" body="Track progress in your transaction room.">
                      <Link href={`/transactions/${summary.id}`} className={primaryBtnClass}>Open transaction room</Link>
                    </ActionCard>
                  ) : (
                    <div className="space-y-5">
                      {summary.deliveryNeeded && token && user ? (
                        <DeliveryAddressSection
                          token={token}
                          confirmed={deliverySaved ? deliverySummary : null}
                          onClear={() => {
                            setDeliverySaved(false);
                            setDeliverySummary(null);
                          }}
                          onConfirm={async (values) => {
                            const result = await txApi.saveDeliveryDetails(token, summary.id, {
                              actorId: user.id,
                              ...values,
                            });
                            const nextId = result.transactionId ?? summary.id;
                            setCheckoutTxId(nextId);
                            setDeliverySummary(values);
                            setDeliverySaved(true);
                          }}
                        />
                      ) : null}
                      {checkoutTxId ? (
                        <TransactionPaymentPanel
                          token={token}
                          transactionId={checkoutTxId}
                          amount={payAmount}
                          currency={payCurrency}
                          disabled={summary.deliveryNeeded && !deliverySaved}
                          onPaid={async (paidTransactionId) => {
                            await refreshSummary();
                            router.push(`/transactions/${paidTransactionId}`);
                          }}
                        />
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-center gap-4 border-t border-slate-100 pt-6 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><i className="fas fa-lock" /> Encrypted</span>
                  <span className="h-3 w-px bg-slate-200" />
                  <span className="flex items-center gap-1.5"><i className="fas fa-shield-alt" /> Escrow guaranteed</span>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

const primaryBtnClass =
  "block w-full rounded-xl bg-primaryColorBlack py-3.5 text-center text-sm font-bold text-white transition hover:opacity-90";

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
      <i className={`fas ${icon}`} />
      {label}
    </span>
  );
}

function ActionCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{body}</p>
      {children}
    </div>
  );
}

function LineItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "rounded-full bg-slate-200 px-3 py-1 text-slate-800" : "text-slate-800"}`}>
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
