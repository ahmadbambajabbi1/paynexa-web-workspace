"use client";

import { useRef, useState } from "react";
import * as txApi from "@/src/lib/api/transactions";

type Props = {
  open: boolean;
  token: string;
  transactionId: string;
  actorId: string;
  onClose: () => void;
  onComplete: () => Promise<void> | void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TransactionProofUploadModal({
  open,
  token,
  transactionId,
  actorId,
  onClose,
  onComplete,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    if (files.length < 1) {
      setErr("Select at least one file to upload.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      for (const file of files) {
        const key = await txApi.uploadTransactionProofFile(token, transactionId, file);
        await txApi.addTransactionDocument(token, transactionId, {
          actorId,
          fileKey: key,
          fileUrl: key,
          uploader: actorId,
          purpose: "PROOF_OF_WORK",
        });
      }
      setFiles([]);
      await onComplete();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="border-b border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)]/80 px-6 py-5">
          <p className="app-kicker">Required step</p>
          <h2 className="app-section-heading mt-1 text-xl">Upload proof of work</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--color-app-text-muted)]">
            Upload deliverables before marking work as completed. You can attach multiple files.
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div
            className={`rounded-[20px] border-2 border-dashed p-5 transition ${
              dragActive
                ? "border-[var(--color-app-accent)] bg-blue-50/70"
                : "border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)]/50"
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const picked = Array.from(e.dataTransfer.files ?? []);
              if (picked.length > 0) setFiles((prev) => [...prev, ...picked]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length > 0) setFiles((prev) => [...prev, ...picked]);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-[var(--color-app-accent)] shadow-sm">
                <i className={`fas ${busy ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"} text-xl`} />
              </div>
              <p className="mt-4 text-sm font-black text-[var(--color-app-text)]">
                Drop files here or browse your device
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-app-text-muted)]">
                Images, PDFs, and documents are supported.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-xl border border-[var(--color-app-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-app-text)] disabled:opacity-60"
              >
                Choose files
              </button>
            </div>
          </div>

          {files.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-app-text-muted)]">
                Ready to upload
              </p>
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--color-app-border)] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-app-text)]">{file.name}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[var(--color-app-text-muted)]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {err ? (
            <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
              {err}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)]/50 px-6 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--color-app-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-app-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || files.length < 1}
            onClick={() => void submit()}
            className="flex-1 rounded-xl bg-[var(--color-primaryColorBlack)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
