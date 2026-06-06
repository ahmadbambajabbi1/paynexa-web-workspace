"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/src/components/SiteHeader";
import { PhoneE164Field } from "@/src/components/PhoneE164Field";
import { PublicAuthGate } from "@/src/components/auth/PublicAuthGate";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as userApi from "@/src/lib/api/users";
import { errorMessage } from "@/src/lib/api/errors";
import { fieldLabel, cardPanel } from "@/src/components/ui/form-classes";
import { getOrCreateDeviceId } from "@/src/lib/device-id";

type Step = "phone" | "code" | "pin_new" | "pin_login";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative min-h-[calc(100vh-4rem)] px-4 pb-20 pt-10 sm:pt-16">
        <div className="absolute inset-0 pattern-bg opacity-40" />
        <div className="relative z-10 mx-auto w-full max-w-md">
          <PublicAuthGate>
            <LoginFlow />
          </PublicAuthGate>
        </div>

        <p className="relative z-10 mx-auto mt-8 max-w-md text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-primaryColorBlack hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </>
  );
}

function LoginFlow() {
  const { applySessionToken } = useAuth();
  const router = useRouter();

  function nextPath() {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const raw = params?.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  }

  const [step, setStep] = useState<Step>("phone");
  const [phoneE164, setPhoneE164] = useState("+220");
  const [countryIso2, setCountryIso2] = useState("GM");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handlePhoneChange(e164: string, iso2: string) {
    setPhoneE164(e164);
    setCountryIso2(iso2);
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await userApi.phoneSendCode(phoneE164.trim(), countryIso2);
      setStep("code");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifySms(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await userApi.phoneVerifySms(phoneE164.trim(), code.trim());
      setPreAuthToken(res.preAuthToken);
      setStep(res.nextStep === "set_pin" ? "pin_new" : "pin_login");
      setPin("");
      setPinConfirm("");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSetPin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pin !== pinConfirm) {
      setErr("PINs do not match.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErr("PIN must be exactly 4 digits.");
      return;
    }
    if (!preAuthToken) {
      setErr("Session expired. Start again.");
      return;
    }
    setBusy(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await userApi.phoneSetPin({
        preAuthToken,
        pin,
        deviceId,
        countryCode: countryIso2,
      });
      await applySessionToken(res.token);
      setPreAuthToken(null);
      if (!res.profileCompleted) {
        router.replace(`/complete-profile?next=${encodeURIComponent(nextPath())}`);
      } else {
        router.replace(nextPath());
      }
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyPinLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4}$/.test(pin)) {
      setErr("PIN must be exactly 4 digits.");
      return;
    }
    if (!preAuthToken) {
      setErr("Session expired. Start again.");
      return;
    }
    setBusy(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await userApi.phoneVerifyPin({
        preAuthToken,
        pin,
        deviceId,
        countryCode: countryIso2,
      });
      await applySessionToken(res.token);
      setPreAuthToken(null);
      if (!res.profileCompleted) {
        router.replace(`/complete-profile?next=${encodeURIComponent(nextPath())}`);
      } else {
        router.replace(nextPath());
      }
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function goBackToPhone() {
    setStep("phone");
    setCode("");
    setPreAuthToken(null);
    setErr(null);
  }

  return (
    <div className={`${cardPanel} p-8 sm:p-10`}>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-gambian-red via-primaryColorBlack to-gambian-green text-2xl text-white shadow-lg">
          <i className="fas fa-mobile-alt" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {step === "phone" &&
            "One account for buying and selling — phone number and secure PIN."}
          {step === "code" && `Enter the code sent to ${phoneE164}`}
          {step === "pin_new" && "Create your 4-digit PIN"}
          {step === "pin_login" && "Enter your PIN"}
        </p>
      </div>

      {step === "phone" && (
        <form onSubmit={onSendCode} className="space-y-5">
          <PhoneE164Field
            id="auth-phone"
            value={phoneE164}
            onChange={handlePhoneChange}
            defaultCountryIso2="GM"
          />
          {err && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !/^\+\d{8,15}$/.test(phoneE164.trim())}
            className="w-full rounded-xl bg-primaryColorBlack py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-950 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send SMS code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onVerifySms} className="space-y-5">
          <div>
            <label htmlFor="auth-code" className={fieldLabel}>
              SMS code
            </label>
            <input
              id="auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none ring-primaryColorBlack/30 transition focus:border-primaryColorBlack focus:ring-2 tracking-widest"
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
            className="w-full rounded-xl bg-primaryColorBlack py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-950 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
          <button
            type="button"
            onClick={goBackToPhone}
            className="w-full text-sm font-medium text-gray-600 hover:text-primaryColorBlack"
          >
            Change number
          </button>
        </form>
      )}

      {step === "pin_new" && (
        <form onSubmit={onSetPin} className="space-y-5">
          <div>
            <label htmlFor="pin1" className={fieldLabel}>
              PIN
            </label>
            <input
              id="pin1"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none ring-primaryColorBlack/30 transition focus:border-primaryColorBlack focus:ring-2 tracking-widest"
              placeholder="••••"
            />
          </div>
          <div>
            <label htmlFor="pin2" className={fieldLabel}>
              Confirm PIN
            </label>
            <input
              id="pin2"
              type="password"
              inputMode="numeric"
              required
              maxLength={4}
              value={pinConfirm}
              onChange={(e) =>
                setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none ring-primaryColorBlack/30 transition focus:border-primaryColorBlack focus:ring-2 tracking-widest"
              placeholder="••••"
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
            {busy ? "Saving…" : "Create PIN and continue"}
          </button>
        </form>
      )}

      {step === "pin_login" && (
        <form onSubmit={onVerifyPinLogin} className="space-y-5">
          <div>
            <label htmlFor="pin-login" className={fieldLabel}>
              PIN
            </label>
            <input
              id="pin-login"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none ring-primaryColorBlack/30 transition focus:border-primaryColorBlack focus:ring-2 tracking-widest"
              placeholder="••••"
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
            className="w-full rounded-xl bg-primaryColorBlack py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-950 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      {step === "phone" && (
        <p className="mt-8 text-center text-sm text-gray-600">
          By continuing you agree to use SMS verification for this account.
        </p>
      )}
    </div>
  );
}
