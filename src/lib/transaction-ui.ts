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

/** Services share-link workflow labels (backend states unchanged). */
export function formatServicesStatus(status: string): string {
  switch (status) {
    case "IN_PROGRESS":
      return "Work started";
    case "INSPECTION":
      return "Buyer review";
    case "COMPLETED":
      return "Funds released";
    case "FUNDED":
      return "Payment secured";
    default:
      return formatStatus(status);
  }
}

export function displayStatus(
  status: string,
  services = false,
): string {
  return services ? formatServicesStatus(status) : formatStatus(status);
}

export function isServicesTransaction(tx: {
  type?: string | null;
  terms?: string | null;
}): boolean {
  if ((tx.type ?? "").toUpperCase() === "SERVICES") return true;
  if (!tx.terms?.trim()) return false;
  try {
    const parsed = JSON.parse(tx.terms) as Record<string, unknown>;
    return String(parsed.shareCategory ?? "").toUpperCase() === "SERVICES";
  } catch {
    return false;
  }
}

export function proofOfWorkRequired(terms?: string | null): boolean {
  if (!terms?.trim()) return false;
  try {
    const parsed = JSON.parse(terms) as Record<string, unknown>;
    return parsed.proofOfWorkRequired === true;
  } catch {
    return false;
  }
}

export function formatTimelineAction(
  action: string,
  detail?: string | null,
  services = false,
): string {
  if (action === "state.changed") {
    const state = detail?.startsWith("state=") ? detail.slice(6) : "";
    switch (state) {
      case "IN_PROGRESS":
        return services ? "Work started" : "Delivery started";
      case "INSPECTION":
        return services ? "Work completed — buyer review" : "Sent to buyer for inspection";
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

export function transitionActionLabel(nextState: string, services = false): string {
  if (services) {
    switch (nextState) {
      case "IN_PROGRESS":
        return "Work started";
      case "INSPECTION":
        return "Work completed";
      case "COMPLETED":
        return "Approve and release funds";
      case "DISPUTED":
        return "Open dispute";
      case "CLOSED":
        return "Close transaction";
      default:
        return formatStatus(nextState);
    }
  }
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

/** Show the Conversation tab once a dispute exists or the transaction is in dispute. */
export function showConversationTab(
  disputes: unknown[] | null | undefined,
  status: string,
): boolean {
  return (disputes?.length ?? 0) > 0 || status === "DISPUTED";
}

/** Transaction actions (accept, pay, state changes) are hidden after completion. */
export function hasTransactionActions(status: string): boolean {
  return status !== "COMPLETED";
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
