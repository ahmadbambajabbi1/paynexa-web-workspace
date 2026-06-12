"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import * as escrowApi from "@/src/lib/api/escrow";
import { errorMessage } from "@/src/lib/api/errors";
import { formatMoney } from "@/src/lib/currency";

function cleanPaymentError(value: unknown): string {
  const raw = errorMessage(value);
  const lowered = raw.toLowerCase();
  if (lowered.includes("secret") || lowered.includes("apikey") || lowered.includes("database_url")) {
    return "Payment request failed. Please try again.";
  }
  return raw || "Payment request failed. Please try again.";
}

type Props = {
  token: string;
  transactionId: string;
  amount: string;
  currency?: string | null;
  disabled?: boolean;
  onPaid: (paidTransactionId: string) => Promise<void> | void;
};

export function TransactionPaymentPanel({ token, transactionId, amount, currency, disabled, onPaid }: Props) {
  const [balance, setBalance] = useState("0");
  const [methods, setMethods] = useState<escrowApi.PaymentMethodSummary[]>([]);
  const [stripeKey, setStripeKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositSource, setDepositSource] = useState<"card" | "mobile">("card");
  const [depositAmount, setDepositAmount] = useState(amount);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [clientRequestId, setClientRequestId] = useState("");
  const [pendingModernPayTransferId, setPendingModernPayTransferId] = useState("");
  const [returnPath, setReturnPath] = useState("");

  const amountNumber = Number(amount) || 0;
  const balanceNumber = Number(balance) || 0;
  const deficit = Math.max(amountNumber - balanceNumber, 0);
  const cardMethods = methods.filter((m) => m.provider === "STRIPE");
  const stripePromise = useMemo(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey]);
  const addCardHref = returnPath
    ? `/billings/add-card?next=${encodeURIComponent(returnPath)}`
    : "/billings/add-card";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wallet, methodList, cfg] = await Promise.all([
        escrowApi.getWallet(token),
        escrowApi.listPaymentMethods(token),
        escrowApi.getEscrowConfig(token),
      ]);
      setBalance(wallet.balance ?? "0");
      setMethods(methodList.methods ?? []);
      setStripeKey(cfg.stripePublishableKey?.trim() ?? "");
    } catch (e) {
      setError(cleanPaymentError(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnPath(window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (!depositOpen) return;
    if (!clientRequestId) setClientRequestId(crypto.randomUUID());
  }, [clientRequestId, depositOpen]);

  async function payNow() {
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await escrowApi.payTransactionFromWallet(token, transactionId);
      await refresh();
      if (res.alreadyPaid && Number(res.escrowLocked) <= 0 && Number(amount) > 0) {
        setError("Payment could not be completed. Please try again or contact support.");
        return;
      }
      if (!res.alreadyPaid && Number(res.escrowLocked) <= 0) {
        setError("Wallet payment did not lock funds in escrow. Please try again.");
        return;
      }
      await onPaid(res.transactionId);
    } catch (e) {
      const msg = cleanPaymentError(e);
      setError(msg);
      if (msg.toLowerCase().includes("insufficient wallet balance")) {
        setDepositAmount(String(deficit > 0 ? deficit.toFixed(2) : amount));
        setDepositOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitDeposit() {
    setBusy(true);
    setError(null);
    try {
      const n = Number(depositAmount);
      if (!Number.isFinite(n) || n <= 0) { setError("Enter a valid deposit amount."); return; }

      if (depositSource === "mobile") {
        const res = await escrowApi.createModernPayDepositIntent(token, {
          amount: n,
          clientRequestId: clientRequestId || undefined,
        });
        setPendingModernPayTransferId(res.transferId);
        window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (!paymentMethodId) { setError("Select a saved card or add one first."); return; }
      const selectedCard = methods.find((m) => m.id === paymentMethodId);
      if (!selectedCard?.stripePaymentMethodId) {
        setError("Selected card is invalid. Re-add the card and try again.");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) { setError("Card checkout is unavailable right now."); return; }

      const intent = await escrowApi.createStripeDepositIntent(token, {
        amount: n,
        paymentMethodId,
        clientRequestId: clientRequestId || undefined,
      });
      const confirmed = await stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: selectedCard.stripePaymentMethodId,
      });
      if (confirmed.error) { setError(confirmed.error.message ?? "Card confirmation failed."); return; }

      await escrowApi.syncStripeDeposit(token, { transferId: intent.transferId });
      setDepositOpen(false);
      setClientRequestId("");
      setPendingModernPayTransferId("");
      await refresh();
      await payNow();
    } catch (e) {
      setError(cleanPaymentError(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmMobileDeposit() {
    if (!pendingModernPayTransferId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await escrowApi.confirmModernPayDeposit(token, { transferId: pendingModernPayTransferId });
      if (res.status === "SUCCEEDED") {
        setDepositOpen(false);
        setClientRequestId("");
        setPendingModernPayTransferId("");
        await refresh();
        await payNow();
        return;
      }
      if (res.status === "FAILED" || res.status === "CANCELED") {
        setError("Mobile wallet payment was not successful.");
        return;
      }
      setError("Payment is still processing. Try confirm again in a moment.");
    } catch (e) {
      setError(cleanPaymentError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ── Inline payment panel (inside the sidebar card) ── */}
      <div className="flex flex-col gap-5">

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Balance" value={formatMoney(balanceNumber, currency)} />
          <Metric label="Due" value={formatMoney(amountNumber, currency)} />
          <Metric label="Needed" value={formatMoney(deficit, currency)} zero={deficit <= 0} />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (deficit > 0) {
                setDepositAmount(String(deficit.toFixed(2)));
                setDepositOpen(true);
                return;
              }
              void payNow();
            }}
            disabled={busy || loading || disabled}
            className="w-full rounded-xl bg-primaryColorBlack py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:opacity-60"
          >
            {busy ? "Processing…" : deficit > 0 ? "Deposit to pay" : "Pay from wallet"}
          </button>
          {deficit > 0 ? (
            <button
              type="button"
              onClick={() => {
                setDepositAmount(String(deficit.toFixed(2)));
                setDepositOpen(true);
              }}
              disabled={busy || loading || disabled}
              className="w-full rounded-xl border border-primaryColorBlack/20 bg-primaryColorBlack/5 py-2.5 text-sm font-semibold text-primaryColorBlack transition hover:bg-primaryColorBlack/10 disabled:opacity-60"
            >
              Fund wallet ({formatMoney(deficit, currency)})
            </button>
          ) : null}
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || busy}
          className="self-end text-xs font-semibold text-primaryColorBlack/50 underline underline-offset-2 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "Refresh balance"}
        </button>
      </div>

      {/* ── Fund wallet modal ── */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="bg-primaryColorBlack px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">Fund Wallet</h3>
                  <p className="mt-0.5 text-xs text-white/70">After funding, payment is retried automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDepositOpen(false)}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                  aria-label="Close"
                >
                  <i className="fas fa-times text-sm" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="space-y-4 p-6">

              {/* Source toggle */}
              <div>
                <label className={fieldLabel}>Deposit source</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["card", "mobile"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setDepositSource(src)}
                      className={`rounded-xl border py-2.5 text-sm font-semibold capitalize transition ${depositSource === src
                          ? "border-primaryColorBlack bg-primaryColorBlack text-white"
                          : "border-primaryColorBlack/20 text-primaryColorBlack hover:bg-primaryColorBlack/5"
                        }`}
                    >
                      {src === "card" ? "Card" : "Mobile wallet"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card selector */}
              {depositSource === "card" ? (
                <div>
                  <label className={fieldLabel}>Saved card</label>
                  <select
                    className={fieldInput}
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                  >
                    <option value="">Select a card</option>
                    {cardMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.label ?? "Card").slice(0, 40)}{m.last4 ? ` •••• ${m.last4}` : ""}
                      </option>
                    ))}
                  </select>
                  <Link href={addCardHref} className="mt-1.5 inline-flex text-xs font-semibold text-primaryColorBlack underline underline-offset-2">
                    + Add a card
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-primaryColorBlack/15 bg-primaryColorBlack/5 px-4 py-3 text-xs font-medium text-primaryColorBlack">
                  Mobile Pay opens in a new tab. Complete payment there, then click confirm below.
                </div>
              )}

              {/* Amount */}
              <div>
                <label className={fieldLabel}>Amount ({currency})</label>
                <input
                  className={fieldInput}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>

              {/* Mobile confirm */}
              {pendingModernPayTransferId && (
                <button
                  type="button"
                  onClick={() => void confirmMobileDeposit()}
                  disabled={busy}
                  className="w-full rounded-xl border border-primaryColorBlack bg-primaryColorBlack/5 py-2.5 text-sm font-bold text-primaryColorBlack disabled:opacity-60"
                >
                  I completed payment — confirm now
                </button>
              )}

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
                  {error}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-primaryColorBlack/10 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDepositOpen(false)}
                className="rounded-xl border border-primaryColorBlack/20 px-4 py-2.5 text-sm font-semibold text-primaryColorBlack/70 transition hover:bg-primaryColorBlack/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDeposit()}
                disabled={busy}
                className="rounded-xl bg-primaryColorBlack px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-950 disabled:opacity-60"
              >
                {busy ? "Working…" : depositSource === "mobile" ? "Open checkout" : "Deposit and pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, zero }: { label: string; value: string; zero?: boolean }) {
  return (
    <div className="rounded-xl border border-primaryColorBlack/10 bg-[#f4f6fb] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primaryColorBlack/50">{label}</p>
      <p className={`mt-1 text-sm font-extrabold ${zero ? "text-primaryColorBlack/40" : "text-primaryColorBlack"}`}>
        {value}
      </p>
    </div>
  );
}
