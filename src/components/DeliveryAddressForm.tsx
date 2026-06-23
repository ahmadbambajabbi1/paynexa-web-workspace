"use client";

import { useState } from "react";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import type { DeliveryFormValues } from "@/src/components/DeliveryAddressPicker";

type Props = {
  disabled?: boolean;
  initial?: Partial<DeliveryFormValues>;
  label?: string;
  onSubmit: (values: DeliveryFormValues, label: string) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
};

const empty: DeliveryFormValues = {
  fullName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  country: "",
  deliveryInstructions: "",
};

export function DeliveryAddressForm({
  disabled,
  initial,
  label: initialLabel = "",
  onSubmit,
  onCancel,
  submitLabel = "Save address",
}: Props) {
  const [form, setForm] = useState<DeliveryFormValues>({ ...empty, ...initial });
  const [label, setLabel] = useState(initialLabel);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof DeliveryFormValues>(key: K, value: DeliveryFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await onSubmit(form, label.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label className={fieldLabel}>Address label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Home, Office…"
          className={fieldInput}
          disabled={disabled || busy}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabel}>Full name</label>
          <input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>Phone</label>
          <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Email</label>
          <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Address line 1</label>
          <input required value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Address line 2</label>
          <input value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>City</label>
          <input required value={form.city} onChange={(e) => update("city", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>State / region</label>
          <input required value={form.stateRegion} onChange={(e) => update("stateRegion", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>Postal code</label>
          <input required value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>Country</label>
          <input required value={form.country} onChange={(e) => update("country", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Delivery instructions</label>
          <textarea value={form.deliveryInstructions} onChange={(e) => update("deliveryInstructions", e.target.value)} className={`${fieldInput} min-h-20`} disabled={disabled || busy} />
        </div>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-3">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={disabled || busy} className="flex-1 rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
