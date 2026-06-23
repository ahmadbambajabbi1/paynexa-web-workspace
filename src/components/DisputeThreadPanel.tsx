"use client";

import { useMemo, useState } from "react";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import * as txApi from "@/src/lib/api/transactions";
import type { TransactionRoom } from "@/src/lib/api/types";

type ThreadMessage = {
  id: string;
  actorRole: string;
  message: string;
  createdAt: string;
  kind: "opening" | "reply" | "resolution";
};

type Dispute = NonNullable<TransactionRoom["disputes"]>[number] & {
  thread?: ThreadMessage[];
};

type Props = {
  token: string;
  transactionId: string;
  actorId: string;
  selfRole: "buyer" | "seller" | null;
  disputes: Dispute[];
  busy?: boolean;
  onReload: () => Promise<void> | void;
  onOpenNewDispute: () => void;
};

function buildThread(dispute: Dispute): ThreadMessage[] {
  if (dispute.thread?.length) return dispute.thread;
  const items: ThreadMessage[] = [
    {
      id: `opening-${dispute.id}`,
      actorRole: dispute.raisedByRole,
      message: dispute.description,
      createdAt: dispute.createdAt,
      kind: "opening",
    },
  ];
  for (const r of dispute.responses ?? []) {
    items.push({
      id: r.id,
      actorRole: r.actorRole,
      message: r.message,
      createdAt: r.createdAt,
      kind: "reply",
    });
  }
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function DisputeThreadPanel({
  token,
  transactionId,
  actorId,
  selfRole,
  disputes,
  busy,
  onReload,
  onOpenNewDispute,
}: Props) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dispute = disputes[0] ?? null;
  const thread = useMemo(() => (dispute ? buildThread(dispute) : []), [dispute]);

  const isResolved =
    dispute?.status === "RESOLVED" || Boolean(dispute?.resolution);

  const hasSubmittedComplaint = useMemo(
    () =>
      selfRole != null &&
      thread.some((m) => m.kind === "opening" && m.actorRole === selfRole),
    [thread, selfRole],
  );

  const canOpenOrJoin = selfRole != null && !hasSubmittedComplaint && !isResolved;

  if (!dispute && !selfRole) return null;

  async function sendNote() {
    if (!dispute) return;
    const message = note.trim();
    if (!message) return;
    setSubmitting(true);
    try {
      await txApi.respondToTransactionDispute(token, transactionId, dispute.id, {
        actorId,
        message,
      });
      setNote("");
      await onReload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Dispute conversation</h3>
          <p className="mt-1 text-sm text-gray-500">
            Buyer and seller share one thread. Both can file a complaint and reply. PayNexa reviews all messages.
          </p>
        </div>
        {canOpenOrJoin ? (
          <button
            type="button"
            onClick={onOpenNewDispute}
            className="rounded-xl bg-primaryColorBlack px-4 py-2 text-sm font-semibold text-white"
          >
            {dispute ? "Add your complaint" : "Open dispute"}
          </button>
        ) : null}
      </div>

      {dispute ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <p className="text-xs text-slate-500">
              Opened {new Date(dispute.createdAt).toLocaleString()}
            </p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
              {dispute.status}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {thread.map((m) => {
              const isSelf = m.actorRole === selfRole;
              const isOpening = m.kind === "opening";
              const isResolution = m.kind === "resolution";
              return (
                <div key={m.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                      isResolution
                        ? "rounded-tl-sm border border-emerald-200 bg-emerald-50 text-slate-900"
                        : isOpening
                          ? "rounded-tl-sm bg-red-50 text-slate-900 ring-1 ring-red-100"
                          : isSelf
                            ? "rounded-tr-sm bg-primaryColorBlack text-white"
                            : "rounded-tl-sm bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase ${
                        isResolution
                          ? "text-emerald-800"
                          : isOpening
                            ? "text-red-800"
                            : isSelf
                              ? "text-white/70"
                              : "text-slate-500"
                      }`}
                    >
                      {isResolution ? "paynexa · admin decision" : m.actorRole}
                      {isOpening ? " · opening complaint" : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isResolution
                          ? "text-emerald-700/70"
                          : isOpening
                            ? "text-red-700/70"
                            : isSelf
                              ? "text-white/60"
                              : "text-slate-400"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {selfRole && hasSubmittedComplaint && !isResolved ? (
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <label className={fieldLabel}>Reply in this conversation</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${fieldInput} min-h-20`}
                placeholder="Add your note for PayNexa and the other party…"
                maxLength={500}
              />
              <button
                type="button"
                disabled={busy || submitting || !note.trim()}
                onClick={() => void sendNote()}
                className="rounded-xl bg-primaryColorBlack px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Send reply
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No dispute messages yet.</p>
      )}
    </div>
  );
}
