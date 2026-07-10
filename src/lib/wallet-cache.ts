import type * as escrowApi from "@/src/lib/api/escrow";

const storageKey = (userId: string) => `paynexa:wallet:${userId}:v1`;

export type WalletCacheSnapshot = {
  balance: string;
  currency: string | null;
  methods: escrowApi.PaymentMethodSummary[];
  stats: escrowApi.WalletTransferStats;
  transfers: escrowApi.WalletTransferSummary[];
  ledger: escrowApi.WalletLedgerEntry[];
  savedAt: string;
};

export function getCachedWallet(userId: string): WalletCacheSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as WalletCacheSnapshot;
  } catch {
    return null;
  }
}

export function writeCachedWallet(userId: string, snapshot: WalletCacheSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
}

export async function loadWalletSnapshot(
  userId: string,
  fetcher: () => Promise<WalletCacheSnapshot>,
): Promise<WalletCacheSnapshot> {
  const cached = getCachedWallet(userId);
  const fresh = await fetcher();
  writeCachedWallet(userId, fresh);
  return fresh;
}

export function applyWalletSnapshotToState(
  snapshot: WalletCacheSnapshot,
  setters: {
    setBalance: (v: string) => void;
    setWalletCurrency: (v: string | null) => void;
    setMethods: (v: escrowApi.PaymentMethodSummary[]) => void;
    setWalletStats: (v: escrowApi.WalletTransferStats) => void;
    setTransfers: (v: escrowApi.WalletTransferSummary[]) => void;
    setLedger: (v: escrowApi.WalletLedgerEntry[]) => void;
  },
): void {
  setters.setBalance(snapshot.balance);
  setters.setWalletCurrency(snapshot.currency);
  setters.setMethods(snapshot.methods);
  setters.setWalletStats(snapshot.stats);
  setters.setTransfers(snapshot.transfers);
  setters.setLedger(snapshot.ledger);
}
