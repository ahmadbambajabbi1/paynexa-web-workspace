"use client";

import { loadStripe } from "@stripe/stripe-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as escrowApi from "@/src/lib/api/escrow";
import { errorMessage } from "@/src/lib/api/errors";
import * as sm from "@/src/lib/api/service-marketplace";

export type PayableBookingRow = {
  id: string;
  amount: unknown;
  paymentBreakdown?: {
    serviceAmount?: string;
    customerPlatformFee?: string;
    providerPlatformFee?: string;
    totalDueFromCustomer?: string;
    providerNetPayout?: string;
    platformTotalCollected?: string;
  };
  listing?: { provider?: { userId?: string } };
};

type Props = {
  open: boolean;
  token: string | null;
  booking: PayableBookingRow | null;
  onClose: () => void;
  onPaid: () => void;
};

export function ServiceBookingPaymentModal({ open, token, booking, onClose, onPaid }: Props) {
  const [mode, setMode] = useState<"wallet" | "card">("wallet");
  const [stripeKey, setStripeKey] = useState("");
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [methods, setMethods] = useState<Awaited<
    ReturnType<typeof escrowApi.listPaymentMethods>
  >["methods"]>([]);
  const [cardMethodId, setCardMethodId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stripePromise = useMemo(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [w, cfg, pm] = await Promise.all([
        escrowApi.getWallet(token),
        escrowApi.getEscrowConfig(token),
        escrowApi.listPaymentMethods(token),
      ]);
      setWalletBalance(w.balance);
      setStripeKey(cfg.stripePublishableKey?.trim() ?? "");
      setMethods(pm.methods);
      const firstCard = pm.methods.find((m) => m.type === "CARD" && m.stripePaymentMethodId);
      setCardMethodId((id) => id || firstCard?.id || "");
    } catch {
      /* optional */
    }
  }, [token]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setMode("wallet");
    void refresh();
  }, [open, refresh]);

  const amt = useMemo(() => {
    const fromBreakdown = booking?.paymentBreakdown?.totalDueFromCustomer;
    if (fromBreakdown != null && fromBreakdown !== "") {
      const n = Number(fromBreakdown);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const raw = booking?.amount;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : Number(String(raw ?? ""));
    return Number.isFinite(n) ? n : 0;
  }, [booking]);

  async function payWallet() {
    if (!token || !booking) return;
    const providerUserId = booking.listing?.provider?.userId;
    if (!providerUserId) {
      setErr("Missing provider reference for this booking.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await escrowApi.payMarketplaceServiceBooking(token, {
        bookingId: booking.id,
        providerUserId,
      });
      await sm.updateServiceBookingState(booking.id, token, { action: "MARK_FUNDED" });
      onPaid();
      onClose();
      await refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function payCard() {
    if (!token || !booking || !stripePromise) {
      setErr("Card payments are not available (configure Stripe or choose wallet).");
      return;
    }
    const providerUserId = booking.listing?.provider?.userId;
    if (!providerUserId) {
      setErr("Missing provider reference for this booking.");
      return;
    }
    const selected = methods.find((m) => m.id === cardMethodId);
    if (!selected?.stripePaymentMethodId) {
      setErr("Select a saved card or add one under Wallet.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setErr("Stripe failed to load.");
        return;
      }
      const deposit = await escrowApi.createStripeDepositIntent(token, {
        amount: amt,
        paymentMethodId: selected.id,
        clientRequestId: `booking-deposit-${booking.id}`,
      });
      const confirm = await stripe.confirmCardPayment(deposit.clientSecret, {
        payment_method: selected.stripePaymentMethodId,
      });
      if (confirm.error) {
        setErr(confirm.error.message ?? "Card confirmation failed");
        return;
      }
      await escrowApi.syncStripeDeposit(token, { transferId: deposit.transferId });

      await escrowApi.payMarketplaceServiceBooking(token, {
        bookingId: booking.id,
        providerUserId,
      });
      await sm.updateServiceBookingState(booking.id, token, { action: "MARK_FUNDED" });
      onPaid();
      onClose();
      await refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open || !booking) return null;

  const balNum = walletBalance != null ? Number(walletBalance) : null;
  const canWallet =
    balNum != null && Number.isFinite(balNum) && balNum + 1e-9 >= amt && amt > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="pay-booking-title"
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="pay-booking-title" className="font-display text-lg font-bold text-gray-900">
            Complete payment
          </h2>
          {booking.paymentBreakdown &&
          (Number(booking.paymentBreakdown.customerPlatformFee ?? 0) > 0 ||
            Number(booking.paymentBreakdown.providerPlatformFee ?? 0) > 0) ? (
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>
                Service price: D{Number(booking.paymentBreakdown.serviceAmount ?? 0).toFixed(2)}
              </li>
              {Number(booking.paymentBreakdown.customerPlatformFee ?? 0) > 0 ? (
                <li>
                  Customer fee: D{Number(booking.paymentBreakdown.customerPlatformFee).toFixed(2)}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="flex gap-2 rounded-xl bg-gray-50 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                mode === "wallet" ? "bg-white text-primaryColorBlack shadow-sm" : "text-gray-600"
              }`}
              onClick={() => setMode("wallet")}
            >
              Wallet
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                mode === "card" ? "bg-white text-primaryColorBlack shadow-sm" : "text-gray-600"
              }`}
              onClick={() => setMode("card")}
            >
              Card
            </button>
          </div>

          {mode === "wallet" ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-700">
              <p>
                Balance:{" "}
                <span className="font-semibold text-gray-900">
                  {walletBalance != null ? `D${walletBalance}` : "—"}
                </span>
              </p>
              {!canWallet ? (
                <p className="mt-2 text-amber-800">
                  Add funds from <span className="font-medium">Wallet</span> or pay with card.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Saved card
              </label>
              <select
                value={cardMethodId}
                onChange={(e) => setCardMethodId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {methods
                  .filter((m) => m.type === "CARD")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label || m.last4 ? `Card •••• ${m.last4 ?? ""}` : m.id}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500">
                Charges your card, tops up your wallet for this amount, then pays the provider in one flow.
              </p>
            </div>
          )}

          {err ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {err}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            disabled={
              busy ||
              (mode === "wallet" ? !canWallet : !stripePromise || !cardMethodId)
            }
            onClick={() => void (mode === "wallet" ? payWallet() : payCard())}
          >
            {busy ? "Working…" : "Pay and confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
