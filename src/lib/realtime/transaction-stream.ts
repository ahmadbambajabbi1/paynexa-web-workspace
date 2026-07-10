import { SERVICE_URLS } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";

export type TransactionStreamEvent = {
  type?: string;
  id?: string;
  transactionId?: string;
  status?: string;
  eventType?: string;
  message?: string;
};

const RECONNECT_MS = 2500;

/** Subscribe to transaction list/detail realtime events (SSE). Reconnects on disconnect. */
export function subscribeTransactionUpdates(opts: {
  token: string;
  userId: string;
  onEvent: (event: TransactionStreamEvent) => void;
  signal?: AbortSignal;
}): void {
  const deviceId = getOrCreateDeviceId();
  const base = SERVICE_URLS.transactions;
  const url = new URL(`${base}/transactions/notifications/stream`);
  url.searchParams.set("userId", opts.userId);

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleReconnect = () => {
    if (opts.signal?.aborted) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, RECONNECT_MS);
  };

  async function connect() {
    if (opts.signal?.aborted) return;
    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${opts.token}`,
          "X-Device-Id": deviceId,
        },
        signal: opts.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) {
        scheduleReconnect();
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      while (!opts.signal?.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(5).trim()) as TransactionStreamEvent;
            if (
              payload.type === "transaction.updated" ||
              payload.type === "notification.created"
            ) {
              opts.onEvent(payload);
            }
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }
      scheduleReconnect();
    } catch {
      if (!opts.signal?.aborted) scheduleReconnect();
    }
  }

  opts.signal?.addEventListener("abort", () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
  });

  void connect();
}
