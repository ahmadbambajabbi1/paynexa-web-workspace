import type { WalletLedgerEntry, WalletTransferSummary } from "@/src/lib/api/escrow";

export type WalletActivityRow = {
  id: string;
  label: string;
  createdAt: string;
  signedAmount: number;
  status?: string;
  isEscrow: boolean;
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
    action.startsWith("Received for transaction") ||
    action.startsWith("Refunded for transaction")
  );
}

function ledgerLabel(action: string): string {
  const parts = action.split(" — ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const title = parts[1];
    if (action.startsWith("Paid transaction")) return `Escrow payment · ${title}`;
    if (action.startsWith("Received for transaction")) return `Escrow payout · ${title}`;
    if (action.startsWith("Refunded for transaction")) return `Escrow refund · ${title}`;
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
    rows.push({
      id: `ledger-${entry.id}`,
      label: ledgerLabel(entry.action),
      createdAt: entry.createdAt,
      signedAmount: Number(entry.amount),
      isEscrow: true,
    });
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
