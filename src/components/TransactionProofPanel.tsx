"use client";

import { useRef, useState } from "react";
import * as txApi from "@/src/lib/api/transactions";

type DocumentRow = {
  id: string;
  fileKey: string;
  fileUrl: string;
  uploader: string;
  purpose?: string | null;
  createdAt: string;
};

type Props = {
  token: string;
  transactionId: string;
  actorId: string;
  selfRole: "buyer" | "seller" | "other";
  documents: DocumentRow[];
  proofRequired: boolean;
  status: string;
  onChanged: () => Promise<void> | void;
};

function fileNameFromKey(fileKey: string): string {
  const parts = fileKey.split("/");
  return parts[parts.length - 1] || fileKey;
}

function fileKind(name: string): "image" | "pdf" | "doc" | "other" {
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) return "image";
  if (/\.pdf$/.test(lower)) return "pdf";
  if (/\.(doc|docx|txt|rtf)$/.test(lower)) return "doc";
  return "other";
}

function fileKindIcon(kind: ReturnType<typeof fileKind>): string {
  switch (kind) {
    case "image":
      return "fa-image";
    case "pdf":
      return "fa-file-pdf";
    case "doc":
      return "fa-file-lines";
    default:
      return "fa-file";
  }
}

function formatUploadedAt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionProofPanel({
  token,
  transactionId,
  actorId,
  selfRole,
  documents,
  proofRequired,
  status,
  onChanged,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const proofDocs = documents.filter((d) => d.purpose === "PROOF_OF_WORK");
  const canUpload =
    proofRequired &&
    selfRole === "seller" &&
    ["FUNDED", "IN_PROGRESS"].includes(status);
  const canReview =
    proofRequired &&
    selfRole === "buyer" &&
    ["INSPECTION", "COMPLETED"].includes(status);

  if (!proofRequired) return null;

  async function onPickFiles(fileList: FileList | File[] | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length < 1) return;

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
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openDoc(docId: string) {
    setErr(null);
    try {
      const res = await txApi.getTransactionDocumentUrl(token, transactionId, docId, actorId);
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to open file");
    }
  }

  return (
    <div className="app-card overflow-hidden rounded-[24px]">
      <div className="border-b border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)]/80 px-5 py-4 sm:px-6">
        <p className="app-kicker">Deliverables</p>
        <h3 className="app-section-heading mt-1 text-lg">Proof of work</h3>
        <p className="mt-1 text-xs font-semibold text-[var(--color-app-text-muted)]">
          {selfRole === "seller"
            ? "Upload deliverables before marking work as completed."
            : "Review uploaded files before releasing funds."}
        </p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {proofDocs.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-app-text-muted)]">
                Submitted evidence
              </p>
              <span className="rounded-full bg-[var(--color-app-surface-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-app-text)]">
                {proofDocs.length} file{proofDocs.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {proofDocs.map((doc) => {
                const name = fileNameFromKey(doc.fileKey);
                const kind = fileKind(name);
                return (
                  <div
                    key={doc.id}
                    className="group rounded-[18px] border border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)]/70 p-4 transition hover:border-[var(--color-app-accent)]/30 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--color-app-accent)] shadow-sm">
                        <i className={`fas ${fileKindIcon(kind)} text-base`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--color-app-text)]">{name}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[var(--color-app-text-muted)]">
                          Uploaded {formatUploadedAt(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openDoc(doc.id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-white px-3 py-2.5 text-xs font-bold text-[var(--color-app-text)] transition group-hover:border-[var(--color-app-accent)]/20"
                    >
                      <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                      View file
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--color-app-border)] bg-[var(--color-app-surface-muted)]/60 px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--color-app-accent)] shadow-sm">
              <i className="fas fa-folder-open text-lg" />
            </div>
            <p className="mt-4 text-sm font-bold text-[var(--color-app-text)]">No proof uploaded yet</p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-app-text-muted)]">
              {canUpload
                ? "Add deliverables using the upload card below."
                : "The seller has not submitted proof of work yet."}
            </p>
          </div>
        )}

        {canUpload ? (
          <div
            className={`rounded-[20px] border-2 border-dashed p-5 transition ${
              dragActive
                ? "border-[var(--color-app-accent)] bg-blue-50/70"
                : "border-[var(--color-app-border)] bg-white"
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
              void onPickFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--color-app-surface-muted)] text-[var(--color-app-accent)]">
                <i className={`fas ${busy ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"} text-xl`} />
              </div>
              <p className="mt-4 text-sm font-black text-[var(--color-app-text)]">
                {busy ? "Uploading files…" : "Drop files here or browse"}
              </p>
              <p className="mt-1 max-w-sm text-xs font-semibold text-[var(--color-app-text-muted)]">
                Images, PDFs, and documents are supported. You can upload multiple files.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-xl bg-[var(--color-primaryColorBlack)] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {busy ? "Uploading…" : "Choose files"}
              </button>
            </div>
          </div>
        ) : null}

        {canReview && proofDocs.length === 0 ? (
          <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            Waiting for the seller to upload proof of work.
          </div>
        ) : null}

        {err ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
            {err}
          </div>
        ) : null}
      </div>
    </div>
  );
}
