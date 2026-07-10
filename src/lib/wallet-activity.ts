import type { WalletLedgerEntry, WalletTransferSummary } from "@/src/lib/api/escrow";

export type WalletActivityRow = {
  id: string;
  label: string;
  createdAt: string;
  signedAmount: number;
  status?: string;
  isEscrow: boolean;
  isPendingEscrow?: boolean;
  escrowAmount?: number;
};

function transferLabel(item: WalletTransferSummary): string {
  if (item.kind === "DEPOSIT") {
    return item.provider === "STRIPE"
      ? "Deposited through card"
      : "Deposited through mobile wallet";
  }
  if (item.kind === "PAYOUT") return "Withdrawn through Modem Pay";
  return item.kind;
}

function isEscrowLedgerEntry(entry: WalletLedgerEntry): boolean {
  if (entry.transferId) return false;
  const action = entry.action.trim();
  return (
    action.startsWith("Paid transaction") ||
    action.startsWith("Received for ") ||
    action.startsWith("Escrow funded for transaction") ||
    action.startsWith("Refunded for transaction") ||
    action.startsWith("Refunded transaction")
  );
}

function ledgerSignedAmount(action: string, amount: number): number {
  if (action.startsWith("Paid transaction")) return -amount;
  if (action.startsWith("Escrow funded for transaction")) return 0;
  if (action.startsWith("Received for ")) return amount;
  if (
    action.startsWith("Refunded for transaction") ||
    action.startsWith("Refunded transaction")
  ) {
    return amount;
  }
  return amount;
}

function ledgerLabel(action: string): string {
  const parts = action.split(" — ").map((p) => p.trim()).filter(Boolean);
  const title = parts.length >= 2 ? parts[1] : null;
  if (title) {
    if (action.startsWith("Paid transaction")) return `Escrow payment · ${title}`;
    if (action.startsWith("Escrow funded for transaction")) {
      return `Buyer funded escrow · ${title}`;
    }
    if (action.startsWith("Received for ")) return `Escrow payout · ${title}`;
    if (
      action.startsWith("Refunded for transaction") ||
      action.startsWith("Refunded transaction")
    ) {
      return `Escrow refund · ${title}`;
    }
  }
  return action;
}

export function buildWalletActivity(
  transfers: WalletTransferSummary[],
  ledger: WalletLedgerEntry[],
): WalletActivityRow[] {
  const rows: WalletActivityRow[] = transfers.map((item) => ({
    id: `transfer-${item.id}`,
    label: transferLabel(item),
    createdAt: item.createdAt,
    signedAmount: item.kind === "DEPOSIT" ? Number(item.amount) : -Number(item.amount),
    status: item.status,
    isEscrow: false,
  }));

  for (const entry of ledger) {
    if (!isEscrowLedgerEntry(entry)) continue;
    const action = entry.action.trim();
    rows.push({
      id: `ledger-${entry.id}`,
      label: ledgerLabel(action),
      createdAt: entry.createdAt,
      signedAmount: ledgerSignedAmount(action, Number(entry.amount)),
      isEscrow: true,
      isPendingEscrow: action.startsWith("Escrow funded for transaction"),
      escrowAmount: action.startsWith("Escrow funded for transaction")
        ? Number(entry.amount)
        : undefined,
    });
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
