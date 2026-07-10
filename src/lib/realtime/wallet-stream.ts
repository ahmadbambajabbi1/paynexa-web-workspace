import { SERVICE_URLS } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";

/** Subscribe to wallet balance/ledger realtime events (SSE). */
export function subscribeWalletUpdates(opts: {
  token: string;
  onEvent: (payload: Record<string, unknown>) => void;
  signal?: AbortSignal;
}): void {
  const deviceId = getOrCreateDeviceId();
  const url = `${SERVICE_URLS.escrow.replace(/\/$/, "")}/escrow/wallet/stream`;

  void (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${opts.token}`,
          "X-Device-Id": deviceId,
        },
        signal: opts.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) return;
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
            const payload = JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
            if (payload.type === "wallet.updated") {
              opts.onEvent(payload);
            }
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }
    } catch {
      // stream ended or aborted
    }
  })();
}
