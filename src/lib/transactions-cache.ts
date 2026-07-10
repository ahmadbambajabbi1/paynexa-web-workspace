import type { TransactionListItem } from "@/src/lib/api/types";

const storageKey = (userId: string) => `paynexa:transactions:${userId}:v1`;

type CachedTransactions = {
  listVersion: string;
  items: TransactionListItem[];
};

function readCache(userId: string): CachedTransactions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTransactions;
    if (!parsed?.listVersion || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(userId: string, payload: CachedTransactions): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

function mergeItems(
  existing: TransactionListItem[],
  incoming: TransactionListItem[],
): TransactionListItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getCachedTransactions(userId: string): TransactionListItem[] {
  return readCache(userId)?.items ?? [];
}

export async function loadTransactionsForParty(
  userId: string,
  fetcher: (opts: {
    listVersion?: string;
    updatedSince?: string;
    limit?: number;
    cursor?: string;
  }) => Promise<{
    listVersion?: string;
    unchanged?: boolean;
    items: TransactionListItem[];
  }>,
): Promise<TransactionListItem[]> {
  const cached = readCache(userId);
  const res = await fetcher({ limit: 40, listVersion: cached?.listVersion });
  const listVersion = res.listVersion ?? cached?.listVersion ?? "";
  if (res.unchanged && cached) {
    return cached.items;
  }
  const merged = cached ? mergeItems(cached.items, res.items) : res.items;
  if (listVersion) {
    writeCache(userId, { listVersion, items: merged });
  }
  return merged;
}

export function mergeTransactionItems(
  existing: TransactionListItem[],
  incoming: TransactionListItem[],
): TransactionListItem[] {
  return mergeItems(existing, incoming);
}

export async function syncTransactionsIncremental(
  userId: string,
  fetcher: (opts: {
    listVersion?: string;
    updatedSince?: string;
    limit?: number;
    cursor?: string;
  }) => Promise<{
    listVersion?: string;
    unchanged?: boolean;
    items: TransactionListItem[];
  }>,
): Promise<TransactionListItem[]> {
  const cached = readCache(userId);
  const base = cached?.items ?? [];
  const latestUpdated = base.reduce<number | null>((max, item) => {
    const ts = Date.parse(item.updatedAt);
    if (Number.isNaN(ts)) return max;
    return max == null || ts > max ? ts : max;
  }, null);
  const res = await fetcher({
    listVersion: cached?.listVersion,
    updatedSince: latestUpdated != null ? new Date(latestUpdated).toISOString() : undefined,
  });
  if (res.unchanged && cached) return cached.items;
  const merged = base.length > 0 ? mergeItems(base, res.items) : res.items;
  const listVersion = res.listVersion ?? cached?.listVersion ?? "";
  if (listVersion) {
    writeCache(userId, { listVersion, items: merged });
  }
  return merged;
}
