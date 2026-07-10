import { apiUrlForPath, SERVICE_URLS } from "@/src/config/constants";
import { apiFetch } from "@/src/lib/api/client";
import { ApiError } from "@/src/lib/api/errors";
import { getOrCreateDeviceId } from "@/src/lib/device-id";
import type {
  ParticipantSearchResponse,
  TransactionListResponse,
  TransactionRoom,
} from "@/src/lib/api/types";

export async function listTransactionsForParty(
  token: string,
  userId: string,
  opts?: {
    listVersion?: string;
    updatedSince?: string;
    limit?: number;
    cursor?: string;
  },
): Promise<TransactionListResponse> {
  const q = new URLSearchParams({ buyerId: userId, sellerId: userId });
  if (opts?.listVersion?.trim()) q.set("listVersion", opts.listVersion.trim());
  if (opts?.updatedSince?.trim()) q.set("updatedSince", opts.updatedSince.trim());
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  if (opts?.cursor?.trim()) q.set("cursor", opts.cursor.trim());
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
    shareCategory?: "ECOMMERCE" | "SERVICES";
    proofOfWorkRequired?: boolean;
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

export async function getPublicTransactionSummary(
  id: string,
  token?: string | null,
): Promise<{
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
  currencyCode?: string;
  platformFeeAmount?: string | null;
  feeTypeLabel?: string | null;
  sellerNetAmount?: string | null;
  protectionFee: string;
  totalBuyerPays: string;
  deliveryNeeded: boolean;
  shareCategory?: "ECOMMERCE" | "SERVICES" | string;
  proofOfWorkRequired?: boolean;
  status: string;
  sellerNote: string | null;
}> {
  return apiFetch(`/transactions/public/${encodeURIComponent(id)}`, {
    method: "GET",
    token: token ?? undefined,
  });
}

export async function raiseTransactionDispute(
  token: string,
  transactionId: string,
  body: { actorId: string; reason: string; parentDisputeId?: string },
) {
  return apiFetch(`/transactions/${encodeURIComponent(transactionId)}/dispute`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function respondToTransactionDispute(
  token: string,
  transactionId: string,
  disputeId: string,
  body: { actorId: string; message: string },
) {
  return apiFetch(
    `/transactions/${encodeURIComponent(transactionId)}/dispute/${encodeURIComponent(disputeId)}/respond`,
    { method: "POST", token, body: JSON.stringify(body) },
  );
}

export async function approveDisputeRelease(
  token: string,
  transactionId: string,
  actorId: string,
) {
  return apiFetch(`/transactions/${encodeURIComponent(transactionId)}/dispute/approve-release`, {
    method: "POST",
    token,
    body: JSON.stringify({ actorId }),
  });
}

export async function uploadTransactionProofFile(
  token: string,
  transactionId: string,
  file: File,
): Promise<string> {
  const base = SERVICE_URLS.users;
  const deviceId = getOrCreateDeviceId();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("transactionId", transactionId);
  const res = await fetch(`${base}/users/transaction-proofs/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
    },
    body: fd,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      typeof parsed === "object" &&
        parsed &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : undefined,
    );
  }
  const key = (parsed as { key?: string }).key;
  if (!key?.trim()) throw new Error("Upload response missing key");
  return key.trim();
}

export async function addTransactionDocument(
  token: string,
  transactionId: string,
  body: {
    actorId: string;
    fileKey: string;
    fileUrl: string;
    uploader: string;
    purpose?: string;
  },
): Promise<unknown> {
  return apiFetch(`/transactions/${encodeURIComponent(transactionId)}/documents`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function getTransactionDocumentUrl(
  token: string,
  transactionId: string,
  documentId: string,
  actorId: string,
): Promise<{ url: string }> {
  const q = new URLSearchParams({ actorId });
  return apiFetch(
    `/transactions/${encodeURIComponent(transactionId)}/documents/${encodeURIComponent(documentId)}/url?${q.toString()}`,
    { method: "GET", token },
  );
}

export async function saveDeliveryDetails(
  token: string,
  transactionId: string,
  body: {
    actorId: string;
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateRegion: string;
    postalCode: string;
    country: string;
    deliveryInstructions?: string;
  },
) {
  return apiFetch<{ transactionId: string; deliveryDetails: Record<string, unknown> }>(
    `/transactions/${encodeURIComponent(transactionId)}/delivery`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}
