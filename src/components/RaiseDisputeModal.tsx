"use client";

import { useState } from "react";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";

const MAX = 500;

type Props = {
  title?: string;
  busy?: boolean;
  onSubmit: (reason: string) => Promise<void> | void;
  onClose: () => void;
};

export function RaiseDisputeModal({ title = "Raise dispute", busy, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-primaryColorBlack">{title}</h2>
        <p className="mt-2 text-sm text-primaryColorBlack/70">Please describe the issue with this transaction.</p>
        <div className="mt-4">
          <label className={fieldLabel} htmlFor="dispute-reason">Problem description</label>
          <textarea
            id="dispute-reason"
            maxLength={MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${fieldInput} min-h-32`}
            placeholder="Explain what went wrong…"
          />
          <p className="mt-1 text-right text-xs text-primaryColorBlack/50">{reason.length}/{MAX}</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-primaryColorBlack/15 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void onSubmit(reason.trim())}
            className="rounded-xl bg-primaryColorBlack px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit dispute"}
          </button>
        </div>
      </div>
    </div>
  );
}
