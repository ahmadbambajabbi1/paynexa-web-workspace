"use client";

import { useState } from "react";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";

type Props = {
  disabled?: boolean;
  onSubmit: (values: {
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
  }) => Promise<void> | void;
};

export function DeliveryDetailsForm({ disabled, onSubmit }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        fullName,
        phone,
        email,
        addressLine1,
        addressLine2,
        city,
        stateRegion,
        postalCode,
        country,
        deliveryInstructions,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-2xl border border-primaryColorBlack/10 bg-white p-5">
      <p className="text-sm font-semibold text-primaryColorBlack">Delivery details</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={fieldLabel}>Full name</label><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div><label className={fieldLabel}>Phone</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div className="sm:col-span-2"><label className={fieldLabel}>Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div className="sm:col-span-2"><label className={fieldLabel}>Address line 1</label><input required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div className="sm:col-span-2"><label className={fieldLabel}>Address line 2</label><input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div><label className={fieldLabel}>City</label><input required value={city} onChange={(e) => setCity(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div><label className={fieldLabel}>State / region</label><input required value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div><label className={fieldLabel}>Postal code</label><input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div><label className={fieldLabel}>Country</label><input required value={country} onChange={(e) => setCountry(e.target.value)} className={fieldInput} disabled={disabled || busy} /></div>
        <div className="sm:col-span-2"><label className={fieldLabel}>Delivery instructions</label><textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} className={`${fieldInput} min-h-20`} disabled={disabled || busy} /></div>
      </div>
      <button type="submit" disabled={disabled || busy} className="rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save delivery details</button>
    </form>
  );
}
