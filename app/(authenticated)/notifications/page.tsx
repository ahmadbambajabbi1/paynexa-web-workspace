"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as txApi from "@/src/lib/api/transactions";
import type { TransactionNotificationItem } from "@/src/lib/api/types";
import { API_BASE_URL } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";

export default function NotificationsPage() {
  return (
    <RequireAuth requireProfileComplete>
      <NotificationsInner />
    </RequireAuth>
  );
}

function NotificationsInner() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<TransactionNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await txApi.listNotifications(token, user.id);
        if (!cancelled) setItems(res.items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;
    const abort = new AbortController();
    const deviceId = getOrCreateDeviceId();
    const base = API_BASE_URL.replace(/\/$/, "");
    const url = new URL(`${base}/transactions/notifications/stream`);
    url.searchParams.set("userId", user.id);
    void (async () => {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Device-Id": deviceId,
        },
        signal: abort.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (!abort.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        const txt = decoder.decode(chunk.value, { stream: true });
        if (txt.includes("data:")) {
          const latest = await txApi.listNotifications(token, user.id);
          setItems(latest.items);
        }
      }
    })();
    return () => abort.abort();
  }, [user, token]);

  const getStatusColor = (status: string) => {
    const st = status?.toLowerCase() ?? "";
    if (st.includes("pending")) return { bg: "bg-blue-50", border: "border-primaryColorBlack/20", badge: "bg-primaryColorBlack/10 text-primaryColorBlack" };
    if (st.includes("accepted") || st.includes("approved")) return { bg: "bg-emerald-50", border: "border-gambian-green/20", badge: "bg-gambian-green/10 text-gambian-green" };
    if (st.includes("rejected") || st.includes("failed")) return { bg: "bg-red-50", border: "border-gambian-red/20", badge: "bg-gambian-red/10 text-gambian-red" };
    return { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-700" };
  };

  const getStatusIcon = (status: string) => {
    const st = status?.toLowerCase() ?? "";
    if (st.includes("pending")) return "⏳";
    if (st.includes("accepted") || st.includes("approved")) return "✓";
    if (st.includes("rejected") || st.includes("failed")) return "✕";
    return "•";
  };

  const handleAccept = async (notifId: string, txId: string) => {
    if (!token) return;
    setProcessingId(notifId);
    try {
      await txApi.acceptTransaction(token, txId, user?.id ?? "");
      await txApi.markNotificationRead(token, notifId);
      const res = await txApi.listNotifications(token, user?.id ?? "");
      setItems(res.items);
    } finally {
      setProcessingId(null);
    }
  };

  if (!user || !token) return null;

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
          Notifications
        </h1>
      </div>

      {/* Loading State */}
      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <i className="fas fa-circle-notch fa-spin text-4xl text-primaryColorBlack" />
            </div>
            <p className="text-sm text-gray-600">Loading notifications...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Empty State */}
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-50/50 px-8 py-24 text-center max-w-md">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primaryColorBlack/10 to-primaryColorBlack/5">
                    <svg
                      className="h-10 w-10 text-primaryColorBlack/40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900">
                  All caught up!
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  No notifications at the moment. PayNexa transaction updates will appear here.
                </p>
              </div>
            </div>
          ) : (
            /* Notifications List */
            <div className="space-y-3 flex-1">
              {items.map((item, idx) => {
                const colors = getStatusColor(item.status);
                const icon = getStatusIcon(item.status);
                const isNew = !item.readAt;

                return (
                  <div
                    key={item.id}
                    className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${colors.bg} ${colors.border}`}
                  >
                    {/* Background Gradient Accent */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Timeline Connector - Only on unread items */}
                    {isNew && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primaryColorBlack to-primaryColorBlack/50" />
                    )}

                    <div className="relative p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        {/* Left Section - Message & Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            {/* Status Icon */}
                            <div className="flex-shrink-0 mt-1">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${colors.badge}`}>
                                {icon}
                              </div>
                            </div>

                            {/* Message Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-gray-900 break-words">
                                {item.message}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 items-center text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 border border-gray-200">
                                  <i className="fas fa-circle text-[6px] text-primaryColorBlack" />
                                  {item.role}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${colors.badge}`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - New Badge */}
                        {isNew && (
                          <div className="flex-shrink-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gambian-red to-red-600 px-3 py-1.5 text-white">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                              </span>
                              <span className="text-xs font-bold">New</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 flex flex-col sm:flex-row gap-3">
                        <Link
                          href={`/transactions/${item.transactionId}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primaryColorBlack to-primaryColorBlack/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-primaryColorBlack hover:to-blue-950 active:scale-95"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                          </svg>
                          Review Details
                        </Link>
                        {item.status === "AWAITING_ACCEPTANCE" ? (
                          <button
                            type="button"
                            disabled={processingId === item.id}
                            onClick={() => handleAccept(item.id, item.transactionId)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gambian-green bg-gambian-green/5 px-5 py-2.5 text-sm font-semibold text-gambian-green shadow-sm transition-all hover:bg-gambian-green/10 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === item.id ? (
                              <>
                                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                                Accepting...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Accept
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
