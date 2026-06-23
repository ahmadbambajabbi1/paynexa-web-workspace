"use client";

import { useCallback, useEffect, useState } from "react";
import * as usersApi from "@/src/lib/api/users";
import type { DeliveryAddress } from "@/src/lib/api/users";
import type { DeliveryFormValues } from "@/src/components/DeliveryAddressPicker";
import { DeliveryAddressForm } from "@/src/components/DeliveryAddressForm";

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

function formatAddressBlock(v: DeliveryFormValues): string[] {
  const lines = [
    v.fullName,
    v.phone,
    v.email,
    v.addressLine1,
    v.addressLine2,
    `${v.city}, ${v.stateRegion} ${v.postalCode}`,
    v.country,
  ].filter((line) => line && line.trim());
  if (v.deliveryInstructions?.trim()) {
    lines.push(`Instructions: ${v.deliveryInstructions.trim()}`);
  }
  return lines;
}

type Props = {
  token: string;
  confirmed: DeliveryFormValues | null;
  onConfirm: (values: DeliveryFormValues) => Promise<void> | void;
  onClear: () => void;
};

export function DeliveryAddressSection({ token, confirmed, onConfirm, onClear }: Props) {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.listDeliveryAddresses(token);
      setAddresses(res.items);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function confirmValues(values: DeliveryFormValues) {
    setBusy(true);
    try {
      await onConfirm(values);
    } finally {
      setBusy(false);
    }
  }

  async function useSaved(row: DeliveryAddress) {
    setSelectedId(row.id);
    await confirmValues(toFormValues(row));
  }

  async function saveNew(values: DeliveryFormValues, label: string) {
    await usersApi.createDeliveryAddress(token, {
      label: label || undefined,
      ...values,
      addressLine2: values.addressLine2 || undefined,
      deliveryInstructions: values.deliveryInstructions || undefined,
      isDefault: addresses.length === 0,
    });
    await load();
    setModalOpen(false);
    await confirmValues(values);
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-900">Delivery address</p>
            <ul className="mt-2 space-y-1 text-sm text-emerald-900">
              {formatAddressBlock(confirmed).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedId(null); onClear(); }}
            className="shrink-0 text-xs font-semibold text-emerald-900 underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">Delivery required</p>
        <p className="mt-1 text-sm text-slate-600">Select a saved address or add a new one before paying.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading saved addresses…</p>
      ) : (
        <div className="space-y-2">
          {addresses.map((row) => (
            <button
              key={row.id}
              type="button"
              disabled={busy}
              onClick={() => void useSaved(row)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selectedId === row.id
                  ? "border-primaryColorBlack bg-primaryColorBlack/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {row.label || row.fullName}
                {row.isDefault ? (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Default</span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-600">{row.addressLine1}, {row.city}, {row.country}</p>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => setModalOpen(true)}
        className="w-full rounded-xl bg-primaryColorBlack px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        + Add delivery address
      </button>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">New delivery address</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <DeliveryAddressForm
              onCancel={() => setModalOpen(false)}
              onSubmit={saveNew}
              submitLabel="Save & use for this order"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
