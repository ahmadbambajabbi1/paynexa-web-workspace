"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import { errorMessage } from "@/src/lib/api/errors";
import { fieldInput, fieldLabel, cardPanel } from "@/src/components/ui/form-classes";

function CompleteProfileContent() {
  const { user, profileReady, submitProfileDetails } = useAuth();
  const router = useRouter();
  const seededRef = useRef(false);

  function nextPath() {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const raw = params?.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  }

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profileReady) {
      router.replace(nextPath());
    }
  }, [profileReady, router]);

  useEffect(() => {
    if (!user || seededRef.current) return;
    setDisplayName(user.displayName ?? "");
    setFullName(user.fullName ?? "");
    seededRef.current = true;
  }, [user]);

  async function onFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await submitProfileDetails({
        displayName: displayName.trim(),
        fullName: fullName.trim(),
      });
      router.replace(nextPath());
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none absolute inset-0 pattern-bg opacity-40" />
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className={`${cardPanel} p-8 sm:p-10`}>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-gambian-red via-primaryColorBlack to-gambian-green text-2xl text-white shadow-lg">
              <i className="fas fa-user-check" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              Complete your profile
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Add your display name and legal full name to start using Paynexa.
            </p>
          </div>

          <form onSubmit={onFormSubmit} className="space-y-5">
            <div>
              <label htmlFor="cp-display" className={fieldLabel}>
                Display name
              </label>
              <input
                id="cp-display"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={fieldInput}
                placeholder="How you appear in the app"
                autoComplete="nickname"
              />
            </div>
            <div>
              <label htmlFor="cp-full" className={fieldLabel}>
                Full legal name
              </label>
              <input
                id="cp-full"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={fieldInput}
                placeholder="As on your ID or records"
                autoComplete="name"
              />
            </div>
            {err && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gambian-green py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-green-800 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-primaryColorBlack hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <RequireAuth requireProfileComplete={false}>
      <CompleteProfileContent />
    </RequireAuth>
  );
}
