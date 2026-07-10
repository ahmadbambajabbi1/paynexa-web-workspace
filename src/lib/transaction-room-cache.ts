import type { TransactionRoom } from "@/src/lib/api/types";

const storageKey = (transactionId: string) => `paynexa:tx-room:${transactionId}:v1`;

export function getCachedTransactionRoom(transactionId: string): TransactionRoom | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(transactionId));
    if (!raw) return null;
    return JSON.parse(raw) as TransactionRoom;
  } catch {
    return null;
  }
}

export function writeCachedTransactionRoom(
  transactionId: string,
  room: TransactionRoom,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(transactionId), JSON.stringify(room));
}
