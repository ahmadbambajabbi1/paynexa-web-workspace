"use client";

import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as escrowApi from "@/src/lib/api/escrow";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function publicErrorMessage(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value ?? "");
  const lowered = raw.toLowerCase();
  if (
    lowered.includes("secret") ||
    lowered.includes("token") ||
    lowered.includes("apikey") ||
    lowered.includes("database_url")
  ) {
    return "Card setup failed. Please try again.";
  }
  return raw || "Card setup failed. Please try again.";
}

export default function AddCardPage() {
  return (
    <RequireAuth requireProfileComplete>
      <AddCardInner />
    </RequireAuth>
  );
}

function AddCardInner() {
  const { token } = useAuth();
  const [returnTo, setReturnTo] = useState("/billings?card=added");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("next");
    setReturnTo(raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/billings?card=added");
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeKey, setStripeKey] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");

  const stripePromise = useMemo(
    () => (stripeKey ? loadStripe(stripeKey) : null),
    [stripeKey],
  );

  async function initialize() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const cfg = await escrowApi.getEscrowConfig(token);
      const publishableKey = cfg.stripePublishableKey?.trim() ?? "";
      if (!publishableKey) {
        setError("Stripe is not configured.");
        return;
      }
      const setup = await escrowApi.createStripeSetupIntent(token);
      setStripeKey(publishableKey);
      setClientSecret(setup.clientSecret);
      setSetupIntentId(setup.setupIntentId);
    } catch (e) {
      setError(publicErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold text-gray-900">Add card</h1>
      <p className="mt-2 text-sm text-gray-600">
        Save a card for future wallet deposits.
      </p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!clientSecret ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <button
            type="button"
            onClick={() => void initialize()}
            disabled={loading}
            className="rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Preparing..." : "Start card setup"}
          </button>
        </div>
      ) : stripePromise ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardSetupForm
              setupIntentId={setupIntentId}
              returnTo={returnTo}
              onError={setError}
            />
          </Elements>
        </div>
      ) : null}

      <div className="mt-4">
        <Link href={returnTo.startsWith("/billings") ? "/billings" : returnTo} className="text-sm font-semibold text-primaryColorBlack">
          Back
        </Link>
      </div>
    </div>
  );
}

function CardSetupForm(props: {
  setupIntentId: string;
  returnTo: string;
  onError: (message: string | null) => void;
}) {
  const { token } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!token || !stripe || !elements) return;
    props.onError(null);
    setSaving(true);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (result.error) {
        props.onError(result.error.message ?? "Card setup failed.");
        return;
      }
      if (result.setupIntent?.status !== "succeeded") {
        props.onError("Card setup is not complete yet.");
        return;
      }
      await escrowApi.completeStripeSetupIntent(token, {
        setupIntentId: props.setupIntentId,
      });
      window.location.href = props.returnTo;
    } catch (e) {
      props.onError(publicErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PaymentElement />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="mt-4 rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save card"}
      </button>
    </>
  );
}
