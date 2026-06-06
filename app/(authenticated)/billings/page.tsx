"use client";

import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { cardPanel, fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as escrowApi from "@/src/lib/api/escrow";
import { currencySymbol, formatMoney } from "@/src/lib/currency";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function publicErrorMessage(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value ?? "");
  const lowered = raw.toLowerCase();
  if (
    lowered.includes("secret") ||
    lowered.includes("token") ||
    lowered.includes("apikey") ||
    lowered.includes("database_url")
  ) {
    return "Payment request failed. Please try again.";
  }
  return raw || "Payment request failed. Please try again.";
}

export default function BillingsPage() {
  return (
    <RequireAuth requireProfileComplete>
      <BillingsInner />
    </RequireAuth>
  );
}

function BillingsInner() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState("0");
  const [walletCurrency, setWalletCurrency] = useState<string | null>(null);
  const [methods, setMethods] = useState<escrowApi.PaymentMethodSummary[]>([]);
  const [transfers, setTransfers] = useState<escrowApi.WalletTransferSummary[]>([]);
  const [ledger, setLedger] = useState<escrowApi.WalletLedgerEntry[]>([]);
  const [walletStats, setWalletStats] = useState<escrowApi.WalletTransferStats>({
    transferCount: 0,
    totalDeposited: "0",
    totalWithdrawn: "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [stripeKey, setStripeKey] = useState<string>("");

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [depositSource, setDepositSource] = useState<"card" | "mobile">("card");
  const [depositPaymentMethodId, setDepositPaymentMethodId] = useState<string>("");
  const [pendingModernPayTransferId, setPendingModernPayTransferId] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  const [redirectHandled, setRedirectHandled] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions">("overview");

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("50");

  const [showBalance, setShowBalance] = useState(true);
  const [animatingBalance, setAnimatingBalance] = useState(false);

  const stripePromise = useMemo(() => {
    if (!stripeKey) return null;
    return loadStripe(stripeKey);
  }, [stripeKey]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cfg, w, m, t, stats, ledgerRes] = await Promise.all([
        escrowApi.getEscrowConfig(token),
        escrowApi.getWallet(token),
        escrowApi.listPaymentMethods(token),
        escrowApi.getWalletTransfers(token, 200),
        escrowApi.getWalletTransferStats(token),
        escrowApi.getWalletLedger(token, 200),
      ]);
      setStripeKey(cfg.stripePublishableKey?.trim() ?? "");
      setBalance(w.balance ?? "0");
      setWalletCurrency(w.currency ?? null);
      setMethods(m.methods ?? []);
      setTransfers(t.transfers ?? []);
      setLedger(ledgerRes.entries ?? []);
      setWalletStats(stats);
    } catch (e) {
      setError(publicErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addFundsStripe() {
    if (!token) return;
    if (!stripePromise) {
      setError("Stripe is not configured (missing STRIPE_PUBLISHABLE_KEY on backend)");
      return;
    }
    setDepositSource("card");
    setRequestId("");
    setDepositOpen(true);
  }

  async function submitDeposit() {
    if (!token) return;
    setError(null);
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Invalid amount");
      return;
    }
    try {
      if (depositSource === "mobile") {
        const res = await escrowApi.createModernPayDepositIntent(token, {
          amount,
          clientRequestId: requestId || undefined,
        });
        setPendingModernPayTransferId(res.transferId);
        window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (!depositPaymentMethodId) {
        setError("Select a card payment method first");
        return;
      }
      const selectedCard = methods.find((m) => m.id === depositPaymentMethodId);
      if (!selectedCard?.stripePaymentMethodId) {
        setError("Selected card is invalid. Re-add card and try again.");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) {
        setError("Card checkout is unavailable");
        return;
      }
      const res = await escrowApi.createStripeDepositIntent(token, {
        amount,
        paymentMethodId: depositPaymentMethodId,
        clientRequestId: requestId || undefined,
      });
      const { clientSecret } = res;
      const confirm = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: selectedCard.stripePaymentMethodId,
        },
      );
      if (confirm.error) {
        setError(confirm.error.message ?? "Card confirmation failed");
        return;
      }
      if (confirm.paymentIntent?.status !== "succeeded" && confirm.paymentIntent?.status !== "processing") {
        setError("Card payment is still pending");
        return;
      }
      setDepositOpen(false);
      setPendingModernPayTransferId("");
      setRequestId("");
      await refresh();
    } catch (e) {
      setError(publicErrorMessage(e));
    }
  }

  useEffect(() => {
    if (!depositOpen) return;
    if (!requestId) {
      setRequestId(crypto.randomUUID());
    }
  }, [depositOpen, requestId]);

  useEffect(() => {
    if (!token || redirectHandled) return;
    const depositState = searchParams.get("deposit");
    if (!depositState) return;
    setRedirectHandled(true);
    if (depositState === "cancel") {
      setError("Payment was cancelled.");
      window.history.replaceState({}, "", "/billings");
      return;
    }
    if (depositState !== "success") return;

    void (async () => {
      try {
        const list = await escrowApi.getWalletTransfers(token, 20);
        const candidate = (list.transfers ?? []).find(
          (t) =>
            t.kind === "DEPOSIT" &&
            t.provider === "MODERNPAY" &&
            (t.status === "REQUIRES_ACTION" || t.status === "PROCESSING"),
        );
        if (!candidate) {
          await refresh();
          window.history.replaceState({}, "", "/billings");
          return;
        }
        const res = await escrowApi.confirmModernPayDeposit(token, {
          transferId: candidate.id,
        });
        if (res.status === "SUCCEEDED") {
          setError(null);
        } else if (res.status === "FAILED" || res.status === "CANCELED") {
          setError("Mobile wallet payment did not complete.");
        } else {
          setError("Payment is still processing. It will update shortly.");
        }
        await refresh();
      } catch (e) {
        setError(publicErrorMessage(e));
      } finally {
        window.history.replaceState({}, "", "/billings");
      }
    })();
  }, [redirectHandled, refresh, searchParams, token]);

  useEffect(() => {
    const cardState = searchParams.get("card");
    if (cardState === "added") {
      setError(null);
      void refresh();
      window.history.replaceState({}, "", "/billings");
    }
  }, [refresh, searchParams]);

  async function confirmMobileDeposit() {
    if (!token || !pendingModernPayTransferId) return;
    setError(null);
    try {
      const res = await escrowApi.confirmModernPayDeposit(token, {
        transferId: pendingModernPayTransferId,
      });
      if (res.status === "SUCCEEDED") {
        setDepositOpen(false);
        setPendingModernPayTransferId("");
        await refresh();
        return;
      }
      if (res.status === "FAILED" || res.status === "CANCELED") {
        setError("Mobile wallet payment was not successful.");
        return;
      }
      setError("Payment is still processing. Try confirm again in a moment.");
    } catch (e) {
      setError(publicErrorMessage(e));
    }
  }

  async function requestPayout() {
    if (!token) return;
    setPayoutOpen(true);
  }

  async function submitPayout() {
    if (!token) return;
    setError(null);
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Invalid amount");
      return;
    }
    try {
      await escrowApi.requestPayout(token, {
        amount,
        provider: "MODERNPAY",
        providerPayload: { note: "MVP: payout execution not wired yet" },
      });
      setPayoutOpen(false);
      await refresh();
    } catch (e) {
      setError(publicErrorMessage(e));
    }
  }

  // Derived data
  // Only use walletTransfer records for the combined activity view.
  // Ledger entries are internal accounting records — showing both would create
  // duplicate rows for every deposit (one walletTransfer + one ledger entry).
  const walletActivity = useMemo(() => {
    type Row = {
      id: string;
      label: string;
      createdAt: string;
      signedAmount: number;
      status?: string;
      isEscrow: boolean;
    };

    const friendlyLabel = (item: escrowApi.WalletTransferSummary): string => {
      if (item.kind === "DEPOSIT") {
        return item.provider === "STRIPE"
          ? "Deposited through card"
          : "Deposited through mobile wallet";
      }
      if (item.kind === "PAYOUT") return "Withdrawn through Modem Pay";
      return item.kind;
    };

    const rows: Row[] = transfers.map((item) => ({
      id: `transfer-${item.id}`,
      label: friendlyLabel(item),
      createdAt: item.createdAt,
      signedAmount: item.kind === "DEPOSIT" ? Number(item.amount) : -Number(item.amount),
      status: item.status,
      isEscrow: false,
    }));

    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transfers]);

  const recentTransfers = walletActivity.slice(0, 5);
  const cardMethods = methods.filter((m) => m.provider === "STRIPE");
  const mobileMethods = methods.filter((m) => m.provider === "MODERNPAY");

  const totalDeposits = Number(walletStats.totalDeposited) || 0;
  const totalWithdrawals = Number(walletStats.totalWithdrawn) || 0;

  const toggleBalance = () => {
    setAnimatingBalance(true);
    setTimeout(() => {
      setShowBalance((prev) => !prev);
      setAnimatingBalance(false);
    }, 150);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return "text-green-600 bg-green-50 border-green-200";
      case "FAILED":
      case "CANCELED":
        return "text-red-600 bg-red-50 border-red-200";
      case "PROCESSING":
      case "REQUIRES_ACTION":
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "FAILED":
      case "CANCELED":
        return (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "PROCESSING":
        return (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-0 py-4 sm:py-6">
        {/* Error Banner */}
        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto rounded-md p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Main Wallet Card */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-primaryColorBlack shadow-xl">
          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="absolute right-4 top-4 z-10 rounded-lg border border-white/25 bg-white/10 p-2 text-white/85 transition hover:bg-white/20 hover:text-white disabled:opacity-50 sm:right-6 sm:top-6"
              title="Refresh"
              aria-label="Refresh wallet"
            >
              <svg className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                {/* Balance Display */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white/70">Available Balance</span>
                    <button
                      type="button"
                      onClick={toggleBalance}
                      className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white/80"
                    >
                      {showBalance ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.058 10.058 0 01-3.7 5.39m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className={`transition-all duration-150 ${animatingBalance ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
                    <p className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
                      {showBalance ? formatMoney(balance, walletCurrency) : `${currencySymbol(walletCurrency)}••••••`}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-white/60">
                      <span className="font-semibold text-white/80">{cardMethods.length}</span> cards
                    </span>
                    <span className="text-white/30">|</span>
                    <span className="text-white/60">
                      <span className="font-semibold text-white/80">{mobileMethods.length}</span> mobile
                    </span>
                    <span className="text-white/30">|</span>
                    <span className="text-white/60">
                      <span className="font-semibold text-white/80">{walletStats.transferCount}</span> transactions
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void addFundsStripe()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gambian-gold px-5 py-2.5 text-sm font-bold text-amber-950 shadow-lg transition hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 active:translate-y-0"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Deposit
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void requestPayout()}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white border border-white/20 transition hover:bg-white/20 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs font-medium text-white/60">Total Deposited</p>
                  <p className="mt-1 text-lg font-bold text-white">{formatMoney(totalDeposits, walletCurrency)}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs font-medium text-white/60">Total Withdrawn</p>
                  <p className="mt-1 text-lg font-bold text-white">{formatMoney(totalWithdrawals, walletCurrency)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === "overview"
                  ? "border-gambian-gold text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === "transactions"
                  ? "border-gambian-gold text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Transactions
              {walletActivity.length > 0 && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {walletActivity.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-8">
            {/* Payment Methods */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">Payment Methods</h2>
                    <div className="mt-2 h-1 w-14 rounded-full bg-gambian-gold" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/billings/add-card"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primaryColorBlack px-3 py-2 text-xs font-bold text-white transition hover:bg-primaryColorBlack/90"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Card
                  </Link>
                </div>
              </div>

              {methods.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h10M3 20h18" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No payment methods</p>
                  <p className="mt-1 text-xs text-gray-500">Add a card or mobile money to start transacting</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {methods.map((m) => (
                    <div
                      key={m.id}
                      className={`group relative rounded-xl border p-4 transition-all hover:shadow-md ${
                        m.provider === "STRIPE"
                          ? "border-blue-100 bg-white hover:border-blue-200"
                          : "border-green-100 bg-white hover:border-green-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${
                          m.provider === "STRIPE" ? "bg-blue-50" : "bg-green-50"
                        }`}>
                          {m.provider === "STRIPE" ? (
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h10M3 20h18" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {m.label ?? (m.provider === "STRIPE" ? "Card" : "Mobile Money")}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {m.provider === "STRIPE"
                              ? `${m.brand ?? "Card"} •••• ${m.last4 ?? ""}`
                              : m.modernpayMsisdn ?? "Mobile money"}
                          </p>
                        </div>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          m.provider === "STRIPE"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-green-50 text-green-700"
                        }`}>
                          {m.provider === "STRIPE" ? "Card" : "Mobile"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Activity Preview */}
            {walletActivity.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                    <p className="text-sm text-gray-500">Latest transactions</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("transactions")}
                    className="text-sm font-semibold text-primaryColorBlack hover:text-primaryColorBlack/80 transition"
                  >
                    View all →
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {recentTransfers.map((item) => {
                      const positive = item.signedAmount >= 0;
                      return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`rounded-lg p-2 shrink-0 ${
                            positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          }`}>
                            {item.isEscrow ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            ) : positive ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                            <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className={`text-sm font-bold ${positive ? "text-green-600" : "text-red-600"}`}>
                            {positive ? "+" : "-"}{formatMoney(Math.abs(item.signedAmount), walletCurrency)}
                          </p>
                          {item.status ? (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            {item.status}
                          </span>
                          ) : null}
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Full Transactions Tab */
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">All Transactions</h2>
              <p className="text-sm text-gray-500">Deposits, withdrawals, and escrow payments</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {walletActivity.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No transactions yet</p>
                  <p className="mt-1 text-xs text-gray-500">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {walletActivity.map((item) => {
                    const positive = item.signedAmount >= 0;
                    return (
                    <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`rounded-lg p-2 shrink-0 ${
                          positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        }`}>
                          {item.isEscrow ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          ) : positive ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                          <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-sm font-bold ${positive ? "text-green-600" : "text-red-600"}`}>
                          {positive ? "+" : "-"}{formatMoney(Math.abs(item.signedAmount), walletCurrency)}
                        </p>
                        {item.status ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                        ) : null}
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {depositOpen ? (
        <Modal
          title="Add funds"
          onClose={() => {
            setDepositOpen(false);
            setRequestId("");
          }}
          primaryLabel="Continue"
          onPrimary={() => void submitDeposit()}
        >
          <label className={fieldLabel}>Deposit source</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDepositSource("card");
                setDepositPaymentMethodId("");
                setPendingModernPayTransferId("");
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                depositSource === "card"
                  ? "border-primaryColorBlack bg-primaryColorBlack/10 text-primaryColorBlack"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h10M3 20h18" />
                </svg>
                Card
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setDepositSource("mobile");
                setDepositPaymentMethodId("");
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                depositSource === "mobile"
                  ? "border-gambian-green bg-gambian-green/10 text-gambian-green"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile
              </div>
            </button>
          </div>
          {depositSource === "card" ? (
            <>
              <div className="mt-4 border-t border-gray-100 pt-4" />
              <label className={fieldLabel}>Payment method</label>
              <select
                className={fieldInput}
                value={depositPaymentMethodId}
                onChange={(e) => setDepositPaymentMethodId(e.target.value)}
              >
                <option value="">Select a card</option>
                {cardMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {(m.label ?? "Card").slice(0, 40)} {m.last4 ? `•••• ${m.last4}` : ""}
                  </option>
                ))}
              </select>
              {cardMethods.length === 0 && (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-800">
                    No cards saved. <Link href="/billings/add-card" className="font-semibold underline">Add a card first</Link>.
                  </p>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Card deposits are charged and settled in your wallet currency.
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-3">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-green-800">
                  You will be redirected to Modem Pay to complete your mobile wallet payment.
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 border-t border-gray-100 pt-4" />
          <label className={fieldLabel}>Amount ({walletCurrency})</label>
          <input
            className={fieldInput}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 250"
          />
          <p className="mt-2 text-xs text-gray-500">
            {depositSource === "mobile"
              ? "After paying in Modem Pay, click confirm below to update your wallet."
              : "Your wallet balance updates after payment confirmation."}
          </p>
          {depositSource === "mobile" && pendingModernPayTransferId ? (
            <button
              type="button"
              onClick={() => void confirmMobileDeposit()}
              className="mt-3 w-full rounded-xl border border-gambian-green bg-gambian-green/10 px-4 py-2.5 text-sm font-semibold text-gambian-green transition hover:bg-gambian-green/20"
            >
              I completed payment, confirm now
            </button>
          ) : null}
        </Modal>
      ) : null}

      {/* Payout Modal */}
      {payoutOpen ? (
        <Modal
          title="Withdraw funds"
          onClose={() => setPayoutOpen(false)}
          primaryLabel="Request payout"
          onPrimary={() => void submitPayout()}
        >
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-amber-800">
                Available balance: <span className="font-bold">{formatMoney(balance, walletCurrency)}</span>. Withdrawals are processed via Modem Pay.
              </p>
            </div>
          </div>
          <label className={fieldLabel}>Amount ({walletCurrency})</label>
          <input
            className={fieldInput}
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 100"
          />
          <p className="mt-2 text-xs text-gray-500">
            MVP: payout execution will be wired to Modem Pay next.
          </p>
        </Modal>
      ) : null}

    </div>
  );
}

function Modal(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  const { title, children, onClose, onPrimary, primaryLabel } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className={`${cardPanel} w-full max-w-lg p-6 shadow-2xl`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className="rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primaryColorBlack/90"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
