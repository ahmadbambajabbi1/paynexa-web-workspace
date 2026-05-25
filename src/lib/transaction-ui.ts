/** Mirrors `transaction-service` state machine for UI affordances. */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  AWAITING_ACCEPTANCE: ["CLOSED"],
  AWAITING_FUNDING: ["CLOSED"],
  FUNDED: ["IN_PROGRESS", "DISPUTED"],
  IN_PROGRESS: ["INSPECTION", "DISPUTED"],
  INSPECTION: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  DISPUTED: ["COMPLETED"],
  REFUNDED: [],
  CLOSED: [],
};

export function formatTransactionType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase();
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

/** Visual progress width for list rows (API does not expose %). */
export function statusApproxProgress(status: string): number {
  const m: Record<string, number> = {
    AWAITING_ACCEPTANCE: 12,
    AWAITING_FUNDING: 28,
    FUNDED: 42,
    IN_PROGRESS: 55,
    INSPECTION: 72,
    COMPLETED: 100,
    DISPUTED: 50,
    REFUNDED: 88,
    CLOSED: 100,
  };
  return m[status] ?? 18;
}

/** Buyer may close their own order before completion (not share-link listings). */
export function canBuyerCloseTransaction(
  role: string,
  tx: { buyerId: string | null; shareToken?: string | null; status: string },
): boolean {
  if (role !== "buyer") return false;
  if (!tx.buyerId) return false;
  if (tx.shareToken) return false;
  return ["AWAITING_ACCEPTANCE", "AWAITING_FUNDING"].includes(
    tx.status,
  );
}
