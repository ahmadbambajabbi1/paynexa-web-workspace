"use client";

import { useCallback, useEffect, useState } from "react";
import * as usersApi from "@/src/lib/api/users";
import type { DeliveryAddress, DeliveryAddressInput } from "@/src/lib/api/users";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";

export type DeliveryFormValues = {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
  deliveryInstructions: string;
};

type Props = {
  token: string;
  disabled?: boolean;
  onSaved: (values: DeliveryFormValues) => Promise<void> | void;
};

const emptyForm: DeliveryFormValues = {
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

function toFormValues(row: DeliveryAddress): DeliveryFormValues {
  return {
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2 ?? "",
    city: row.city,
    stateRegion: row.stateRegion,
    postalCode: row.postalCode,
    country: row.country,
    deliveryInstructions: row.deliveryInstructions ?? "",
  };
}

export function DeliveryAddressPicker({ token, disabled, onSaved }: Props) {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [form, setForm] = useState<DeliveryFormValues>(emptyForm);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.listDeliveryAddresses(token);
      setAddresses(res.items);
      if (res.items.length > 0) {
        const preferred = res.items.find((a) => a.isDefault) ?? res.items[0];
        setSelectedId(preferred.id);
        setForm(toFormValues(preferred));
      } else {
        setSelectedId("new");
        setForm(emptyForm);
      }
    } catch {
      setAddresses([]);
      setSelectedId("new");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectAddress(id: string) {
    const row = addresses.find((a) => a.id === id);
    if (!row) return;
    setSelectedId(id);
    setForm(toFormValues(row));
    setLabel(row.label ?? "");
    setErr(null);
  }

  function startNew() {
    setSelectedId("new");
    setForm(emptyForm);
    setLabel("");
    setErr(null);
  }

  function updateField<K extends keyof DeliveryFormValues>(key: K, value: DeliveryFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (selectedId !== "new") setSelectedId("new");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (selectedId === "new") {
        const payload: DeliveryAddressInput = {
          label: label.trim() || undefined,
          ...form,
          addressLine2: form.addressLine2 || undefined,
          deliveryInstructions: form.deliveryInstructions || undefined,
          isDefault: addresses.length === 0,
        };
        await usersApi.createDeliveryAddress(token, payload);
      }
      await onSaved(form);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save delivery details");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading saved addresses…</p>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Delivery details</p>
        <p className="mt-1 text-xs text-slate-500">Choose a saved address or add a new one.</p>
      </div>

      {addresses.length > 0 ? (
        <div className="space-y-2">
          {addresses.map((row) => (
            <button
              key={row.id}
              type="button"
              disabled={disabled || busy}
              onClick={() => selectAddress(row.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selectedId === row.id
                  ? "border-primaryColorBlack bg-primaryColorBlack/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {row.label || row.fullName}
                {row.isDefault ? (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    Default
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {row.addressLine1}, {row.city}, {row.country}
              </p>
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || busy}
            onClick={startNew}
            className={`w-full rounded-xl border border-dashed px-4 py-3 text-left text-sm font-semibold transition ${
              selectedId === "new"
                ? "border-primaryColorBlack bg-primaryColorBlack/5 text-primaryColorBlack"
                : "border-slate-300 text-slate-600 hover:border-slate-400"
            }`}
          >
            + Add another address
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {selectedId === "new" ? (
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Address label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Home, Office…"
              className={fieldInput}
              disabled={disabled || busy}
            />
          </div>
        ) : null}
        <div>
          <label className={fieldLabel}>Full name</label>
          <input required value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>Phone</label>
          <input required value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Email</label>
          <input required type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Address line 1</label>
          <input required value={form.addressLine1} onChange={(e) => updateField("addressLine1", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Address line 2</label>
          <input value={form.addressLine2} onChange={(e) => updateField("addressLine2", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>City</label>
          <input required value={form.city} onChange={(e) => updateField("city", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>State / region</label>
          <input required value={form.stateRegion} onChange={(e) => updateField("stateRegion", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>Postal code</label>
          <input required value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div>
          <label className={fieldLabel}>Country</label>
          <input required value={form.country} onChange={(e) => updateField("country", e.target.value)} className={fieldInput} disabled={disabled || busy} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Delivery instructions</label>
          <textarea value={form.deliveryInstructions} onChange={(e) => updateField("deliveryInstructions", e.target.value)} className={`${fieldInput} min-h-20`} disabled={disabled || busy} />
        </div>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <button
        type="submit"
        disabled={disabled || busy}
        className="w-full rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save & continue to payment"}
      </button>
    </form>
  );
}
