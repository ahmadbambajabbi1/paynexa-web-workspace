"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { API_BASE_URL } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";

type LiveToast = {
  id: string;
  title: string;
  message: string;
  transactionId?: string;
};

/** Subscribes to transaction notification SSE app-wide and shows lightweight toasts. */
export function TransactionNotificationsLive() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id || !token) return;
    const abort = new AbortController();
    const deviceId = getOrCreateDeviceId();
    const base = API_BASE_URL.replace(/\/$/, "");
    const url = new URL(`${base}/transactions/notifications/stream`);
    url.searchParams.set("userId", user.id);

    void (async () => {
      try {
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Device-Id": deviceId,
          },
          signal: abort.signal,
        });
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buffer = "";
        while (!abort.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(5).trim()) as {
                type?: string;
                id?: string;
                transactionId?: string;
                message?: string;
                eventType?: string;
              };
              if (payload.type !== "notification.created" || !payload.id) continue;
              if (seenRef.current.has(payload.id)) continue;
              seenRef.current.add(payload.id);
              const toast: LiveToast = {
                id: payload.id,
                title: payload.eventType?.includes("dispute") ? "Dispute update" : "Transaction update",
                message: payload.message ?? "You have a new notification.",
                transactionId: payload.transactionId,
              };
              setToasts((prev) => [...prev.slice(-2), toast]);
              window.setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }, 8000);
            } catch {
              // ignore malformed SSE chunks
            }
          }
        }
      } catch {
        // stream ended or aborted
      }
    })();

    return () => abort.abort();
  }, [user?.id, token]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => {
            if (toast.transactionId) router.push(`/transactions/${toast.transactionId}`);
          }}
          className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-lg transition hover:shadow-xl"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-primaryColorBlack">{toast.title}</p>
          <p className="mt-1 text-sm text-slate-700">{toast.message}</p>
        </button>
      ))}
    </div>
  );
}
