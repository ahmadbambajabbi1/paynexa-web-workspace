import { apiFetch } from "@/src/lib/api/client";

export type WalletSummary = { userId: string; currency: string; balance: string };
export type WalletTransferSummary = {
  id: string;
  kind: "DEPOSIT" | "PAYOUT";
  provider: "STRIPE" | "MODERNPAY";
  amount: string;
  currency: string;
  status: string;
  providerReference?: string | null;
  createdAt: string;
};

export async function getEscrowConfig(
  token: string,
): Promise<{ stripePublishableKey: string }> {
  return apiFetch("/escrow/config", { method: "GET", token });
}

export type PaymentMethodSummary = {
  id: string;
  provider: string;
  type: string;
  label: string | null;
  last4?: string | null;
  brand?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  stripePaymentMethodId?: string | null;
  modernpayMsisdn?: string | null;
  createdAt?: string;
};

export async function getWallet(token: string): Promise<WalletSummary> {
  return apiFetch("/escrow/wallet", { method: "GET", token });
}

export type WalletTransferStats = {
  transferCount: number;
  totalDeposited: string;
  totalWithdrawn: string;
};

export async function getWalletTransferStats(token: string): Promise<WalletTransferStats> {
  return apiFetch("/escrow/wallet/stats", { method: "GET", token });
}

export async function getWalletTransfers(
  token: string,
  limit = 20,
): Promise<{ transfers: WalletTransferSummary[] }> {
  return apiFetch(`/escrow/wallet/transfers?limit=${limit}`, { method: "GET", token });
}

export type WalletLedgerEntry = {
  id: string;
  action: string;
  amount: string;
  balanceAfter: string;
  transferId: string | null;
  createdAt: string;
};

export async function getWalletLedger(
  token: string,
  limit = 100,
): Promise<{ entries: WalletLedgerEntry[] }> {
  return apiFetch(`/escrow/wallet/ledger?limit=${limit}`, { method: "GET", token });
}

export async function listPaymentMethods(token: string): Promise<{
  methods: PaymentMethodSummary[];
}> {
  return apiFetch("/escrow/payment-methods", { method: "GET", token });
}

export async function addModernPayMobileMoneyMethod(
  token: string,
  body: { msisdn: string; label?: string },
): Promise<PaymentMethodSummary> {
  return apiFetch("/escrow/payment-methods/modernpay", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function createStripeDepositIntent(
  token: string,
  body: { amount: number; paymentMethodId?: string; clientRequestId?: string },
): Promise<{ transferId: string; paymentIntentId: string; clientSecret: string; currency: string }> {
  return apiFetch("/escrow/wallet/deposits/stripe", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function createModernPayDepositIntent(
  token: string,
  body: {
    amount: number;
    clientRequestId?: string;
    returnUrl?: string;
    cancelUrl?: string;
  },
): Promise<{ transferId: string; checkoutUrl: string; currency: string; status: string }> {
  return apiFetch("/escrow/wallet/deposits/modernpay", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function listDepositCurrencies(token: string): Promise<{ currencies: string[] }> {
  return apiFetch("/escrow/wallet/deposits/currencies", {
    method: "GET",
    token,
  });
}

export async function getDepositQuote(
  token: string,
  body: { amount: number; sourceCurrency?: string },
): Promise<{
  sourceCurrency: string;
  sourceAmount: number;
  fxRate: number;
  spreadPercent: number;
  creditedAmountGmd: number;
  settlementCurrency: string;
}> {
  return apiFetch("/escrow/wallet/deposits/quote", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function confirmModernPayDeposit(
  token: string,
  body: { transferId: string },
): Promise<{ transferId: string; status: string; amount: string; currency: string }> {
  return apiFetch("/escrow/wallet/deposits/modernpay/confirm", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function syncStripeDeposit(
  token: string,
  body: { transferId: string },
): Promise<{ status: string; credited: boolean }> {
  return apiFetch("/escrow/wallet/deposits/stripe/sync", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}


export async function payTransactionFromWallet(
  token: string,
  transactionId: string,
): Promise<{
  alreadyPaid: boolean;
  transactionId: string;
  payerBalance: string;
  escrowLocked: string;
}> {
  return apiFetch(`/escrow/wallet/transactions/${encodeURIComponent(transactionId)}/pay`, {
    method: "POST",
    token,
  });
}

export async function getTransactionPaymentQuote(token: string, transactionId: string) {
  return apiFetch<{
    transactionCurrency: string;
    transactionAmount: string;
    buyerCurrency: string;
    buyerAmount: string;
    exchangeRate: string;
    displayRate: string;
    spreadPercent?: number;
    conversionApplied: boolean;
  }>(`/escrow/wallet/transactions/${encodeURIComponent(transactionId)}/payment-quote`, {
    method: "GET",
    token,
  });
}

/** Client wallet → provider (+ platform fee wallet) using amounts from product-service (idempotent per booking). */
export async function payMarketplaceServiceBooking(
  token: string,
  body: { bookingId: string; providerUserId: string },
): Promise<{ alreadyPaid: boolean; payerBalance: string; payeeBalance: string }> {
  return apiFetch("/escrow/wallet/marketplace-service-bookings/pay", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function createStripeSetupIntent(
  token: string,
): Promise<{ customerId: string; setupIntentId: string; clientSecret: string; currency: string }> {
  return apiFetch("/escrow/payment-methods/stripe/setup-intent", {
    method: "POST",
    token,
  });
}

export async function completeStripeSetupIntent(
  token: string,
  body: { setupIntentId: string; label?: string },
): Promise<PaymentMethodSummary> {
  return apiFetch("/escrow/payment-methods/stripe/complete-setup", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function requestPayout(
  token: string,
  body: {
    amount: number;
    provider: "MODERNPAY" | "STRIPE";
    clientRequestId?: string;
    providerPayload?: Record<string, unknown>;
  },
): Promise<{
  id: string;
  status: string;
  amount: string;
  currency: string;
  provider: string;
}> {
  return apiFetch("/escrow/wallet/payouts", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

