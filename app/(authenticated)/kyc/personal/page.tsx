"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as kycApi from "@/src/lib/api/kyc";
import { errorMessage } from "@/src/lib/api/errors";
import { cardPanel, fieldLabel } from "@/src/components/ui/form-classes";
import { userMayCreateTransactions } from "@/src/lib/kyc-access";

export default function PersonalKycPage() {
  return (
    <RequireAuth requireProfileComplete>
      <PersonalKycInner />
    </RequireAuth>
  );
}

function PersonalKycInner() {
  const { token, refreshUser, user } = useAuth();
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !idDoc || !selfie) return;
    setBusy(true);
    setErr(null);
    try {
      const idUpload = await kycApi.uploadKycFile(token, idDoc);
      const selfieUpload = await kycApi.uploadKycFile(token, selfie);
      await kycApi.submitKycDocument(token, {
        kind: "PERSONAL",
        fileKey: idUpload.key,
        uploader: "personal:government_id",
      });
      await kycApi.submitKycDocument(token, {
        kind: "PERSONAL",
        fileKey: selfieUpload.key,
        uploader: "personal:selfie",
      });
      await refreshUser();
      setIdDoc(null);
      setSelfie(null);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (user && userMayCreateTransactions(user)) {
    return (
      <div className="mx-auto max-w-xl pb-12">
        <div className={`${cardPanel} p-8 text-center`}>
          <h1 className="font-display text-xl font-bold text-gray-900">Personal KYC approved</h1>
          <p className="mt-2 text-sm text-gray-600">
            You can create escrow transactions. Use the button on the transactions page when you
            are ready.
          </p>
          <Link
            href="/transactions"
            className="mt-6 inline-flex rounded-xl bg-gambian-blue px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to transactions
          </Link>
        </div>
      </div>
    );
  }

  if (user?.personalKycStatus === "PENDING") {
    return (
      <div className="mx-auto max-w-xl pb-12">
        <div className={`${cardPanel} p-8 text-center`}>
          <h1 className="font-display text-xl font-bold text-gray-900">KYC under review</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your documents were submitted (version{" "}
            <span className="font-mono font-semibold">v{user.personalKycVersion ?? "—"}</span>). An
            administrator will approve them shortly. You cannot create transactions until then.
          </p>
          <Link
            href="/transactions"
            className="mt-6 inline-flex rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800"
          >
            Back to transactions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-12">
      <div className="mb-6">
        <Link href="/transactions" className="text-sm font-medium text-gambian-blue hover:underline">
          ← Transactions
        </Link>
      </div>
      <form onSubmit={submit} className={`${cardPanel} space-y-5 p-6`}>
        <h1 className="font-display text-2xl font-bold text-gray-900">Apply Personal KYC</h1>
        <p className="text-sm text-gray-600">
          Upload your ID card and selfie. After you submit, an administrator must approve your KYC
          before you can create transactions.
        </p>
        {user?.personalKycStatus === "REJECTED" && user.personalKycRejectedReason ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-semibold">Previous submission was not approved</p>
            <p className="mt-1">{user.personalKycRejectedReason}</p>
            <p className="mt-2 text-red-800/90">You can upload new documents below.</p>
          </div>
        ) : null}
        <div>
          <label className={fieldLabel} htmlFor="idDoc">
            Government ID card *
          </label>
          <input
            id="idDoc"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="selfie">
            Selfie *
          </label>
          <input
            id="selfie"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy || !idDoc || !selfie}
          className="rounded-xl bg-gambian-blue px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Submitting..." : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
