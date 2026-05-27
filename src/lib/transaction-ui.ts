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

export function formatTimelineAction(action: string, detail?: string | null): string {
  if (action === "state.changed") {
    const state = detail?.startsWith("state=") ? detail.slice(6) : "";
    switch (state) {
      case "IN_PROGRESS":
        return "Delivery started";
      case "INSPECTION":
        return "Sent to buyer for inspection";
      case "COMPLETED":
        return "Transaction completed";
      case "DISPUTED":
        return "Dispute opened";
      case "REFUNDED":
        return "Payment refunded";
      case "CLOSED":
        return "Transaction closed";
      case "AWAITING_FUNDING":
        return "Waiting for payment";
      case "AWAITING_ACCEPTANCE":
        return "Waiting for acceptance";
      default:
        return "Transaction updated";
    }
  }

  switch (action) {
    case "public.created":
      return "Payment link created";
    case "escrow.created":
      return "Transaction created";
    case "transaction.accepted":
      return "Transaction accepted";
    case "public.claimed":
      return "Buyer joined the transaction";
    case "payment.funded":
      return "Payment secured in escrow";
    case "agreement.versioned":
      return "Agreement updated";
    case "dispute.created":
      return "Dispute opened";
    case "document.added":
      return "Document added";
    default:
      return action.replace(/[._]/g, " ");
  }
}

export function formatTimelineDetail(action: string, detail?: string | null): string {
  if (!detail || detail.startsWith("state=")) return "";
  if (action === "payment.funded") return "Escrow was funded from the wallet.";
  if (action === "agreement.versioned" && detail.startsWith("v")) {
    return `Version ${detail.slice(1)}`;
  }
  return detail;
}

export function transitionActionLabel(nextState: string): string {
  switch (nextState) {
    case "IN_PROGRESS":
      return "Start delivery";
    case "INSPECTION":
      return "Send to buyer";
    case "COMPLETED":
      return "Confirm and release money";
    case "DISPUTED":
      return "Open dispute";
    case "REFUNDED":
      return "Refund buyer";
    case "CLOSED":
      return "Close transaction";
    default:
      return formatStatus(nextState);
  }
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
