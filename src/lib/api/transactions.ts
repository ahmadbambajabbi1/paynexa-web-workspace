import { apiFetch } from "@/src/lib/api/client";
import type {
  ParticipantSearchResponse,
  TransactionListResponse,
  TransactionRoom,
} from "@/src/lib/api/types";

export async function listTransactionsForParty(
  token: string,
  userId: string,
): Promise<TransactionListResponse> {
  const q = new URLSearchParams({ buyerId: userId, sellerId: userId });
  return apiFetch(`/transactions/by-party?${q.toString()}`, {
    method: "GET",
    token,
  });
}

export async function getTransactionRoom(
  token: string,
  id: string,
): Promise<TransactionRoom> {
  return apiFetch(`/transactions/${encodeURIComponent(id)}`, {
    method: "GET",
    token,
  });
}

export async function createEscrowTransaction(
  token: string,
  body: {
    createdByUserId: string;
    counterpartyId: string;
    productId: string;
    type?: string;
  },
): Promise<{ transactionId: string; workflow: string; status: string; roomPath?: string }> {
  return apiFetch("/transactions/escrow", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function createTransaction(
  token: string,
  body: {
    createdByUserId: string;
    counterpartyId: string;
    role?: "seller";
    productId: string;
    fundedBy?: "COUNTERPARTY";
    type?: string;
  },
): Promise<{ transactionId: string; workflow?: string; status: string; roomPath?: string }> {
  return createEscrowTransaction(token, {
    createdByUserId: body.createdByUserId,
    counterpartyId: body.counterpartyId,
    productId: body.productId,
    type: body.type,
  });
}

export async function createPublicTransaction(
  token: string,
  body: {
    createdByUserId: string;
    itemTitle: string;
    itemDescription?: string;
    quantity: number;
    unitPrice: number;
    deliveryNeeded?: boolean;
    sellerNote?: string;
    type?: string;
  },
): Promise<{
  transactionId: string;
  workflow: string;
  status: string;
  shareToken: string;
  sharePath: string;
}> {
  return apiFetch("/transactions/public", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function listNotifications(
  token: string,
  userId: string,
): Promise<{ items: import("@/src/lib/api/types").TransactionNotificationItem[] }> {
  const q = new URLSearchParams({ userId });
  return apiFetch(`/transactions/notifications?${q.toString()}`, {
    method: "GET",
    token,
  });
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/transactions/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    token,
  });
}

export async function acceptTransaction(
  token: string,
  id: string,
  actorId: string,
): Promise<unknown> {
  return apiFetch(`/transactions/${encodeURIComponent(id)}/accept`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ actorId }),
  });
}

export async function updateTransactionState(
  token: string,
  id: string,
  actorId: string,
  newState: string,
): Promise<unknown> {
  return apiFetch(`/transactions/${encodeURIComponent(id)}/state`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ actorId, newState }),
  });
}

export async function searchTransactionParticipants(
  token: string,
  transactionId: string,
  role: "LAWYER" | "AGENT",
  query: string,
  partySide: "buyer" | "seller",
): Promise<ParticipantSearchResponse> {
  const q = new URLSearchParams({ role, query, partySide });
  return apiFetch(
    `/transactions/${encodeURIComponent(transactionId)}/participants/search?${q.toString()}`,
    { method: "GET", token },
  );
}

export async function inviteTransactionParticipant(
  token: string,
  transactionId: string,
  body: {
    actorId: string;
    participantUserId: string;
    role: "LAWYER" | "AGENT";
    partySide: "buyer" | "seller";
    message?: string;
  },
): Promise<unknown> {
  return apiFetch(
    `/transactions/${encodeURIComponent(transactionId)}/invite-participant`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    },
  );
}

export async function acceptTransactionParticipantInvite(
  token: string,
  transactionId: string,
  body: { actorId: string; role: "LAWYER" | "AGENT"; partySide: "buyer" | "seller" },
): Promise<unknown> {
  return apiFetch(
    `/transactions/${encodeURIComponent(transactionId)}/participant-accept`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    },
  );
}

export async function claimPublicTransaction(
  token: string,
  id: string,
  actorId: string,
): Promise<{ transactionId: string; workflow: string; buyerId: string; status: string }> {
  return apiFetch(`/transactions/public/${encodeURIComponent(id)}/claim`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ actorId }),
  });
}

export async function getPublicTransactionSummary(id: string): Promise<{
  id: string;
  workflow: string;
  shareToken: string | null;
  sharePath: string;
  sellerId: string;
  buyerId: string | null;
  seller: string;
  item: string;
  itemDescription: string | null;
  quantity: number;
  unitPrice: string;
  amount: string;
  protectionFee: string;
  totalBuyerPays: string;
  deliveryNeeded: boolean;
  status: string;
  sellerNote: string | null;
}> {
  return apiFetch(`/transactions/public/${encodeURIComponent(id)}`, { method: "GET" });
}
