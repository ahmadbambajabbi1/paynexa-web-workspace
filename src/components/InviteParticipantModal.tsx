"use client";

import { useCallback, useEffect, useState } from "react";
import * as txApi from "@/src/lib/api/transactions";
import type { TransactionProfessionalSearchItem } from "@/src/lib/api/types";
import { errorMessage } from "@/src/lib/api/errors";
import { buildParticipantInviteMessageTemplate } from "@/src/lib/invite-participant-message";

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  transactionId: string;
  actorId: string;
  role: "LAWYER" | "AGENT";
  partySide: "buyer" | "seller";
  inviterLabel: string;
  productTitle: string;
  amount: string;
  onInvited: () => void;
};

export function InviteParticipantModal({
  open,
  onClose,
  token,
  transactionId,
  actorId,
  role,
  partySide,
  inviterLabel,
  productTitle,
  amount,
  onInvited,
}: Props) {
  const [step, setStep] = useState<"search" | "message">("search");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<TransactionProfessionalSearchItem[]>([]);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionProfessionalSearchItem | null>(null);
  const [message, setMessage] = useState("");

  const runSearch = useCallback(async () => {
    if (!open || step !== "search") return;
    setLoading(true);
    setErr(null);
    try {
      const res = await txApi.searchTransactionParticipants(
        token,
        transactionId,
        role,
        query.trim(),
        partySide,
      );
      setItems(res.items ?? []);
      setDisabledReason(res.disabledReason ?? null);
    } catch (e) {
      setErr(errorMessage(e));
      setItems([]);
      setDisabledReason(null);
    } finally {
      setLoading(false);
    }
  }, [open, step, token, transactionId, role, query, partySide]);

  useEffect(() => {
    if (!open) return;
    if (step !== "search") return;
    const t = window.setTimeout(() => void runSearch(), 350);
    return () => window.clearTimeout(t);
  }, [open, step, runSearch]);

  useEffect(() => {
    if (!open) {
      setStep("search");
      setQuery("");
      setItems([]);
      setDisabledReason(null);
      setErr(null);
      setSelected(null);
      setMessage("");
      setSending(false);
    }
  }, [open]);

  function pickProfessional(item: TransactionProfessionalSearchItem) {
    if (item.invited) return;
    setSelected(item);
    setMessage(
      buildParticipantInviteMessageTemplate({
        inviterLabel,
        partySide,
        role,
        productTitle,
        amount,
        transactionId,
      }),
    );
    setStep("message");
    setErr(null);
  }

  async function sendInvite() {
    if (!selected) return;
    const trimmed = message.trim();
    if (!trimmed) {
      setErr("Please enter a message.");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      await txApi.inviteTransactionParticipant(token, transactionId, {
        actorId,
        participantUserId: selected.id,
        role,
        partySide,
        message: trimmed,
      });
      onInvited();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const roleLabel = role === "LAWYER" ? "lawyer" : "agent";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-participant-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="invite-participant-title" className="font-display text-lg font-bold text-gray-900">
            {step === "search" ? `Invite ${roleLabel}` : `Message to ${roleLabel}`}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {step === "search"
              ? `Search for an approved ${roleLabel} (${partySide} side). Only ${roleLabel}s are listed when this product type has ${roleLabel} pricing enabled.`
              : "Review or edit the invitation. This text is sent to the professional as the in-app notification."}
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          {step === "search" ? (
            <>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-primaryColorBlack focus:ring-2"
                autoComplete="off"
              />
              {disabledReason ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {disabledReason}
                </p>
              ) : null}
              {err ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {err}
                </p>
              ) : null}
              <div className="custom-scrollbar max-h-72 overflow-y-auto rounded-xl border border-gray-100">
                {loading ? (
                  <p className="p-6 text-center text-sm text-gray-500">
                    <i className="fas fa-circle-notch fa-spin mr-2" />
                    Searching…
                  </p>
                ) : items.length === 0 ? (
                  <p className="p-6 text-center text-sm text-gray-500">No matches.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">
                            {item.displayName?.trim() || `${item.id.slice(0, 8)}…`}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {[item.email, item.phone].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        {item.invited ? (
                          <span className="shrink-0 text-xs font-semibold text-primaryColorBlack">Invited</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => pickProfessional(item)}
                            className="shrink-0 rounded-lg bg-primaryColorBlack px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-900"
                          >
                            Next
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              {selected ? (
                <p className="text-sm text-gray-600">
                  To:{" "}
                  <span className="font-semibold text-gray-900">
                    {selected.displayName?.trim() || selected.id.slice(0, 8) + "…"}
                  </span>
                </p>
              ) : null}
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Invitation message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-primaryColorBlack focus:ring-2"
              />
              {err ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {err}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("search");
                    setSelected(null);
                    setErr(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void sendInvite()}
                  className="flex-1 rounded-xl bg-primaryColorBlack py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50"
                >
                  {sending ? <i className="fas fa-circle-notch fa-spin" /> : "Send invite"}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
