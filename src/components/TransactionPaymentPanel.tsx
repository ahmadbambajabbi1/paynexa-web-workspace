// "use client";

// import Link from "next/link";
// import { useCallback, useEffect, useMemo, useState } from "react";
// import { loadStripe } from "@stripe/stripe-js";
// import { CURRENCY_PREFIX } from "@/src/config/constants";
// import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
// import * as escrowApi from "@/src/lib/api/escrow";
// import { errorMessage } from "@/src/lib/api/errors";

// function cleanPaymentError(value: unknown): string {
//   const raw = errorMessage(value);
//   const lowered = raw.toLowerCase();
//   if (lowered.includes("secret") || lowered.includes("apikey") || lowered.includes("database_url")) {
//     return "Payment request failed. Please try again.";
//   }
//   return raw || "Payment request failed. Please try again.";
// }

// type Props = {
//   token: string;
//   transactionId: string;
//   amount: string;
//   disabled?: boolean;
//   onPaid: () => Promise<void> | void;
// };

// export function TransactionPaymentPanel({ token, transactionId, amount, disabled, onPaid }: Props) {
//   const [balance, setBalance] = useState("0");
//   const [methods, setMethods] = useState<escrowApi.PaymentMethodSummary[]>([]);
//   const [stripeKey, setStripeKey] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [depositOpen, setDepositOpen] = useState(false);
//   const [depositSource, setDepositSource] = useState<"card" | "mobile">("card");
//   const [depositAmount, setDepositAmount] = useState(amount);
//   const [paymentMethodId, setPaymentMethodId] = useState("");
//   const [clientRequestId, setClientRequestId] = useState("");
//   const [pendingModernPayTransferId, setPendingModernPayTransferId] = useState("");
//   const [returnPath, setReturnPath] = useState("");

//   const amountNumber = Number(amount) || 0;
//   const balanceNumber = Number(balance) || 0;
//   const deficit = Math.max(amountNumber - balanceNumber, 0);
//   const cardMethods = methods.filter((method) => method.provider === "STRIPE");
//   const stripePromise = useMemo(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey]);
//   const addCardHref = returnPath
//     ? `/billings/add-card?next=${encodeURIComponent(returnPath)}`
//     : "/billings/add-card";

//   const refresh = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const [wallet, methodList, cfg] = await Promise.all([
//         escrowApi.getWallet(token),
//         escrowApi.listPaymentMethods(token),
//         escrowApi.getEscrowConfig(token),
//       ]);
//       setBalance(wallet.balance ?? "0");
//       setMethods(methodList.methods ?? []);
//       setStripeKey(cfg.stripePublishableKey?.trim() ?? "");
//     } catch (e) {
//       setError(cleanPaymentError(e));
//     } finally {
//       setLoading(false);
//     }
//   }, [token]);

//   useEffect(() => {
//     void refresh();
//   }, [refresh]);

//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       setReturnPath(window.location.pathname + window.location.search);
//     }
//   }, []);

//   useEffect(() => {
//     if (!depositOpen) return;
//     if (!clientRequestId) setClientRequestId(crypto.randomUUID());
//   }, [clientRequestId, depositOpen]);

//   async function payNow() {
//     if (disabled) return;
//     setBusy(true);
//     setError(null);
//     try {
//       await escrowApi.payTransactionFromWallet(token, transactionId);
//       await refresh();
//       await onPaid();
//     } catch (e) {
//       const msg = cleanPaymentError(e);
//       setError(msg);
//       if (msg.toLowerCase().includes("insufficient wallet balance")) {
//         setDepositAmount(String(deficit > 0 ? deficit.toFixed(2) : amount));
//         setDepositOpen(true);
//       }
//     } finally {
//       setBusy(false);
//     }
//   }

//   async function submitDeposit() {
//     setBusy(true);
//     setError(null);
//     try {
//       const n = Number(depositAmount);
//       if (!Number.isFinite(n) || n <= 0) {
//         setError("Enter a valid deposit amount.");
//         return;
//       }
//       if (depositSource === "mobile") {
//         const res = await escrowApi.createModernPayDepositIntent(token, {
//           amount: n,
//           clientRequestId: clientRequestId || undefined,
//         });
//         setPendingModernPayTransferId(res.transferId);
//         window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
//         return;
//       }

//       if (!paymentMethodId) {
//         setError("Select a saved card or add one first.");
//         return;
//       }
//       const selectedCard = methods.find((method) => method.id === paymentMethodId);
//       if (!selectedCard?.stripePaymentMethodId) {
//         setError("Selected card is invalid. Re-add the card and try again.");
//         return;
//       }
//       const stripe = await stripePromise;
//       if (!stripe) {
//         setError("Card checkout is unavailable right now.");
//         return;
//       }
//       const intent = await escrowApi.createStripeDepositIntent(token, {
//         amount: n,
//         paymentMethodId,
//         clientRequestId: clientRequestId || undefined,
//       });
//       const confirmed = await stripe.confirmCardPayment(intent.clientSecret, {
//         payment_method: selectedCard.stripePaymentMethodId,
//       });
//       if (confirmed.error) {
//         setError(confirmed.error.message ?? "Card confirmation failed.");
//         return;
//       }
//       await escrowApi.syncStripeDeposit(token, { transferId: intent.transferId });
//       setDepositOpen(false);
//       setClientRequestId("");
//       setPendingModernPayTransferId("");
//       await refresh();
//       await payNow();
//     } catch (e) {
//       setError(cleanPaymentError(e));
//     } finally {
//       setBusy(false);
//     }
//   }

//   async function confirmMobileDeposit() {
//     if (!pendingModernPayTransferId) return;
//     setBusy(true);
//     setError(null);
//     try {
//       const res = await escrowApi.confirmModernPayDeposit(token, {
//         transferId: pendingModernPayTransferId,
//       });
//       if (res.status === "SUCCEEDED") {
//         setDepositOpen(false);
//         setClientRequestId("");
//         setPendingModernPayTransferId("");
//         await refresh();
//         await payNow();
//         return;
//       }
//       if (res.status === "FAILED" || res.status === "CANCELED") {
//         setError("Mobile wallet payment was not successful.");
//         return;
//       }
//       setError("Payment is still processing. Try confirm again in a moment.");
//     } catch (e) {
//       setError(cleanPaymentError(e));
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
//       <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//         <div>
//           <p className="text-xs font-bold uppercase tracking-widest text-gambian-blue/70">Payment</p>
//           <h2 className="mt-1 font-display text-xl font-bold text-gray-900">Pay without leaving this transaction</h2>
//           <p className="mt-1 text-sm text-gray-600">Fund wallet and pay from this panel.</p>
//         </div>
//         <button type="button" onClick={() => void refresh()} disabled={loading || busy} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
//           {loading ? "Refreshing..." : "Refresh"}
//         </button>
//       </div>

//       <div className="mt-5 grid gap-3 sm:grid-cols-3">
//         <Metric label="Wallet balance" value={`${CURRENCY_PREFIX}${Number(balanceNumber).toFixed(2)}`} />
//         <Metric label="Amount due" value={`${CURRENCY_PREFIX}${amountNumber.toFixed(2)}`} />
//         <Metric label="Needed" value={`${CURRENCY_PREFIX}${deficit.toFixed(2)}`} muted={deficit <= 0} />
//       </div>

//       {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

//       <div className="mt-5 flex flex-col gap-3 sm:flex-row">
//         <button
//           type="button"
//           onClick={() => {
//             setDepositAmount(String(deficit > 0 ? deficit.toFixed(2) : amountNumber.toFixed(2)));
//             setDepositOpen(true);
//           }}
//           className="rounded-xl border border-gambian-blue/20 bg-blue-50 px-5 py-3 text-sm font-bold text-gambian-blue"
//         >
//           Fund wallet here
//         </button>
//         <button
//           type="button"
//           onClick={() => void payNow()}
//           disabled={busy || loading || disabled}
//           className="flex-1 rounded-xl bg-gambian-blue px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:opacity-60"
//         >
//           {busy ? "Processing..." : deficit > 0 ? "Fund wallet to pay" : "Pay from wallet"}
//         </button>
//       </div>

//       {depositOpen ? (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
//           <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
//             <div className="flex items-start justify-between gap-3">
//               <div>
//                 <h3 className="font-display text-lg font-bold text-gray-900">Fund wallet</h3>
//                 <p className="mt-1 text-sm text-gray-600">After funding, payment is retried automatically.</p>
//               </div>
//               <button type="button" onClick={() => setDepositOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close">
//                 <i className="fas fa-times" />
//               </button>
//             </div>

//             <div className="mt-5 space-y-4">
//               <div>
//                 <label className={fieldLabel}>Deposit source</label>
//                 <div className="grid grid-cols-2 gap-2">
//                   <button type="button" onClick={() => setDepositSource("card")} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${depositSource === "card" ? "border-gambian-blue bg-blue-50 text-gambian-blue" : "border-gray-200 text-gray-700"}`}>Card</button>
//                   <button type="button" onClick={() => setDepositSource("mobile")} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${depositSource === "mobile" ? "border-gambian-blue bg-blue-50 text-gambian-blue" : "border-gray-200 text-gray-700"}`}>Mobile wallet</button>
//                 </div>
//               </div>

//               {depositSource === "card" ? (
//                 <div>
//                   <label className={fieldLabel}>Saved card</label>
//                   <select className={fieldInput} value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
//                     <option value="">Select a card</option>
//                     {cardMethods.map((method) => (
//                       <option key={method.id} value={method.id}>
//                         {(method.label ?? "Card").slice(0, 40)} {method.last4 ? `•••• ${method.last4}` : ""}
//                       </option>
//                     ))}
//                   </select>
//                   <Link href={addCardHref} className="mt-2 inline-flex text-xs font-semibold text-gambian-blue">Add a card</Link>
//                 </div>
//               ) : (
//                 <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-gambian-blue">Modem Pay opens in a new tab.</p>
//               )}

//               <div>
//                 <label className={fieldLabel}>Amount (GMD)</label>
//                 <input className={fieldInput} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} inputMode="decimal" />
//               </div>

//               {pendingModernPayTransferId ? (
//                 <button type="button" onClick={() => void confirmMobileDeposit()} disabled={busy} className="w-full rounded-xl border border-gambian-blue bg-blue-50 px-4 py-2.5 text-sm font-bold text-gambian-blue disabled:opacity-60">
//                   I completed payment, confirm now
//                 </button>
//               ) : null}
//             </div>

//             <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
//               <button type="button" onClick={() => setDepositOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
//               <button type="button" onClick={() => void submitDeposit()} disabled={busy} className="rounded-xl bg-gambian-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
//                 {busy ? "Working..." : depositSource === "mobile" ? "Open checkout" : "Deposit and pay"}
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
//   return (
//     <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
//       <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
//       <p className={`mt-1 text-lg font-bold ${muted ? "text-gambian-blue" : "text-gray-900"}`}>{value}</p>
//     </div>
//   );
// }
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CURRENCY_PREFIX } from "@/src/config/constants";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import * as escrowApi from "@/src/lib/api/escrow";
import { errorMessage } from "@/src/lib/api/errors";

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
  disabled?: boolean;
  onPaid: (paidTransactionId: string) => Promise<void> | void;
};

export function TransactionPaymentPanel({ token, transactionId, amount, disabled, onPaid }: Props) {
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
          <Metric label="Balance" value={`${CURRENCY_PREFIX}${balanceNumber.toFixed(2)}`} />
          <Metric label="Due" value={`${CURRENCY_PREFIX}${amountNumber.toFixed(2)}`} />
          <Metric label="Needed" value={`${CURRENCY_PREFIX}${deficit.toFixed(2)}`} zero={deficit <= 0} />
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
            onClick={() => void payNow()}
            disabled={busy || loading || disabled}
            className="w-full rounded-xl bg-gambian-blue py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:opacity-60"
          >
            {busy ? "Processing…" : deficit > 0 ? "Fund wallet to pay" : "Pay from wallet"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDepositAmount(String(deficit > 0 ? deficit.toFixed(2) : amountNumber.toFixed(2)));
              setDepositOpen(true);
            }}
            className="w-full rounded-xl border border-gambian-blue/20 bg-gambian-blue/5 py-2.5 text-sm font-semibold text-gambian-blue transition hover:bg-gambian-blue/10"
          >
            Fund wallet
          </button>
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || busy}
          className="self-end text-xs font-semibold text-gambian-blue/50 underline underline-offset-2 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "Refresh balance"}
        </button>
      </div>

      {/* ── Fund wallet modal ── */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="bg-gambian-blue px-6 py-5">
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
                          ? "border-gambian-blue bg-gambian-blue text-white"
                          : "border-gambian-blue/20 text-gambian-blue hover:bg-gambian-blue/5"
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
                  <Link href={addCardHref} className="mt-1.5 inline-flex text-xs font-semibold text-gambian-blue underline underline-offset-2">
                    + Add a card
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-gambian-blue/15 bg-gambian-blue/5 px-4 py-3 text-xs font-medium text-gambian-blue">
                  Mobile Pay opens in a new tab. Complete payment there, then click confirm below.
                </div>
              )}

              {/* Amount */}
              <div>
                <label className={fieldLabel}>Amount (GMD)</label>
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
                  className="w-full rounded-xl border border-gambian-blue bg-gambian-blue/5 py-2.5 text-sm font-bold text-gambian-blue disabled:opacity-60"
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
            <div className="flex flex-col-reverse gap-2 border-t border-gambian-blue/10 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDepositOpen(false)}
                className="rounded-xl border border-gambian-blue/20 px-4 py-2.5 text-sm font-semibold text-gambian-blue/70 transition hover:bg-gambian-blue/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDeposit()}
                disabled={busy}
                className="rounded-xl bg-gambian-blue px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-950 disabled:opacity-60"
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
    <div className="rounded-xl border border-gambian-blue/10 bg-[#f4f6fb] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gambian-blue/50">{label}</p>
      <p className={`mt-1 text-sm font-extrabold ${zero ? "text-gambian-blue/40" : "text-gambian-blue"}`}>
        {value}
      </p>
    </div>
  );
}