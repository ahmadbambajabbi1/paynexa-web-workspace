"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import { errorMessage } from "@/src/lib/api/errors";
import { fieldInput, fieldLabel, cardPanel } from "@/src/components/ui/form-classes";

function CompleteProfileContent() {
  const {
    user,
    profileReady,
    submitProfileDetails,
    verifyEmailCode,
    resendEmailVerification,
  } = useAuth();
  const router = useRouter();

  function nextPath() {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const raw = params?.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  }

  const [step, setStep] = useState<"form" | "email">("form");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profileReady) {
      router.replace(nextPath());
    }
  }, [profileReady, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    setFullName(user.fullName ?? "");
    setEmail(user.email ?? "");
    if (user.email && !user.emailVerifiedAt) {
      setStep("email");
    }
  }, [user]);

  async function onFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await submitProfileDetails({
        displayName: displayName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
      });
      if (res.profileComplete && res.profileCompletedAt) {
        router.replace(nextPath());
        return;
      }
      if (res.needsEmailVerification) {
        setStep("email");
        setCode("");
      }
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await verifyEmailCode(code.trim());
      router.replace(nextPath());
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setErr(null);
    setBusy(true);
    try {
      await resendEmailVerification();
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-gambian-red via-gambian-blue to-gambian-green text-2xl text-white shadow-lg">
              <i className="fas fa-user-check" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {step === "form" ? "Complete your profile" : "Verify your email"}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {step === "form"
                ? "Display name, full name, and email. We’ll send a code to verify your email."
                : `Enter the 6-digit code sent to ${email}. Check the user-service console in development.`}
            </p>
          </div>

          {step === "form" && (
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
              <div>
                <label htmlFor="cp-email" className={fieldLabel}>
                  Email
                </label>
                <input
                  id="cp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldInput}
                  placeholder="you@example.com"
                  autoComplete="email"
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
          )}

          {step === "email" && (
            <form onSubmit={onVerifyEmail} className="space-y-5">
              <div>
                <label htmlFor="cp-code" className={fieldLabel}>
                  Email code
                </label>
                <input
                  id="cp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={`${fieldInput} tracking-widest`}
                  placeholder="000000"
                />
              </div>
              {err && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-gambian-blue py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-950 disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
              <button
                type="button"
                onClick={() => void onResend()}
                disabled={busy}
                className="w-full text-sm font-medium text-gambian-blue hover:underline disabled:opacity-60"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setErr(null);
                }}
                className="w-full text-sm font-medium text-gray-600 hover:text-gambian-blue"
              >
                Edit profile details
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-gambian-blue hover:underline">
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
