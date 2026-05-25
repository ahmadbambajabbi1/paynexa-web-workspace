"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as txApi from "@/src/lib/api/transactions";
import * as userApi from "@/src/lib/api/users";
import * as productsApi from "@/src/lib/api/products";
import { errorMessage } from "@/src/lib/api/errors";
import { CURRENCY_PREFIX, ESCROW_FEE_PERCENT } from "@/src/config/constants";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import { productDisplayName } from "@/src/lib/product-display";
import type { ProductRow } from "@/src/lib/api/types";

type CreatedMeta = { workflow?: string; sharePath?: string; shareToken?: string };

type Props = {
  token: string;
  selfId: string;
  onCreated: (id: string, meta?: CreatedMeta) => void;
  onCancel: () => void;
};

const SEARCH_DEBOUNCE_MS = 420;

export function CreatePublicTransactionForm({ token, selfId, onCreated, onCancel }: Props) {
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [deliveryNeeded, setDeliveryNeeded] = useState(false);
  const [sellerNote, setSellerNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => {
    const q = Number(quantity);
    const p = Number(unitPrice);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) return 0;
    return q * p;
  }, [quantity, unitPrice]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const q = Number(quantity);
      const p = Number(unitPrice);
      if (!itemTitle.trim()) {
        setErr("Enter an item or service title.");
        return;
      }
      if (!Number.isInteger(q) || q < 1) {
        setErr("Quantity must be at least 1.");
        return;
      }
      if (!Number.isFinite(p) || p <= 0) {
        setErr("Enter a valid price.");
        return;
      }
      const res = await txApi.createPublicTransaction(token, {
        createdByUserId: selfId,
        itemTitle: itemTitle.trim(),
        itemDescription: itemDescription.trim() || undefined,
        quantity: q,
        unitPrice: p,
        deliveryNeeded,
        sellerNote: sellerNote.trim() || undefined,
      });
      onCreated(res.transactionId, res);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className={fieldLabel} htmlFor="public-title">Item or service</label>
        <input id="public-title" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className={fieldInput} placeholder="e.g. iPhone 14 Pro, website design, delivery service" required />
      </div>

      <div>
        <label className={fieldLabel} htmlFor="public-desc">Details</label>
        <textarea id="public-desc" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className={`${fieldInput} min-h-28 resize-y`} placeholder="Condition, deliverables, pickup details, or service scope" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabel} htmlFor="public-qty">Quantity</label>
          <input id="public-qty" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))} className={fieldInput} inputMode="numeric" required />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="public-price">Unit price ({CURRENCY_PREFIX})</label>
          <input id="public-price" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={fieldInput} inputMode="decimal" placeholder="0.00" required />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <input type="checkbox" checked={deliveryNeeded} onChange={(e) => setDeliveryNeeded(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-gambian-blue" />
        <span>Delivery or fulfillment needs to be tracked for this transaction.</span>
      </label>

      <div>
        <label className={fieldLabel} htmlFor="public-note">Seller note</label>
        <textarea id="public-note" value={sellerNote} onChange={(e) => setSellerNote(e.target.value)} className={`${fieldInput} min-h-24 resize-y`} placeholder="Optional note shown to buyers before payment" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white text-sm shadow-sm">
        <div className="flex items-center justify-between gap-4 bg-blue-50/80 px-4 py-4">
          <span className="font-bold text-gambian-blue">Buyer pays</span>
          <span className="font-display text-3xl font-bold text-gray-950">{CURRENCY_PREFIX}{total.toFixed(2)}</span>
        </div>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity</p>
            <p className="mt-1 font-bold text-gray-900">{quantity || "0"}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unit price</p>
            <p className="mt-1 font-bold text-gray-900">{CURRENCY_PREFIX}{Number(unitPrice || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {err ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700">Cancel</button>
        <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-gambian-blue px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-950 disabled:opacity-60">
          {busy ? "Creating..." : "Create shareable link"}
        </button>
      </div>
    </form>
  );
}

export function CreateEscrowTransactionForm({ token, selfId, onCreated, onCancel }: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productId, setProductId] = useState("");
  const [buyerQuery, setBuyerQuery] = useState("");
  const [buyer, setBuyer] = useState<{ id: string; phone: string | null; email: string | null; displayName: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await productsApi.listMyProducts(token, 1, 100);
        setProducts(res.items);
        setProductId(res.items[0]?.id ?? "");
      } catch {
        setProducts([]);
        setProductId("");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = buyerQuery.trim();
    setSearchErr(null);
    if (q.length < 3) {
      setBuyer(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const found = await userApi.lookupUserByQuery(token, q);
          if (found.id === selfId) {
            setBuyer(null);
            setSearchErr("Buyer must be a different user.");
            return;
          }
          setBuyer(found);
        } catch {
          setBuyer(null);
          setSearchErr("No registered buyer matches that email or phone.");
        } finally {
          setSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buyerQuery, token, selfId]);

  const selectedProduct = useMemo(() => products.find((prod) => prod.id === productId) ?? null, [products, productId]);
  const feePreview = useMemo(() => {
    const n = Number(selectedProduct?.price ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "0.00";
    return ((n * ESCROW_FEE_PERCENT) / 100).toFixed(2);
  }, [selectedProduct?.price]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (!buyer) {
        setErr("Enter a registered buyer by email or phone.");
        return;
      }
      if (!productId) {
        setErr("Select one of your products first.");
        return;
      }
      const res = await txApi.createEscrowTransaction(token, {
        createdByUserId: selfId,
        counterpartyId: buyer.id,
        productId,
      });
      onCreated(res.transactionId, res);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className={fieldLabel}>Product you own</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={fieldInput} required>
          {products.map((prod) => (
            <option key={prod.id} value={prod.id}>{productDisplayName(prod)}</option>
          ))}
        </select>
        {products.length === 0 ? <p className="mt-2 text-xs font-semibold text-gambian-earth">Create a product first.</p> : null}
      </div>

      <div>
        <label className={fieldLabel} htmlFor="buyer-search">Buyer email or phone</label>
        <input id="buyer-search" value={buyerQuery} onChange={(e) => setBuyerQuery(e.target.value)} className={fieldInput} placeholder="Search registered buyer" autoComplete="off" required />
        {searching ? <p className="mt-2 text-xs text-gray-500">Searching...</p> : null}
        {searchErr && !searching ? <p className="mt-2 rounded-lg border border-gambian-sand bg-gambian-sand/40 px-3 py-2 text-xs text-gambian-earth">{searchErr}</p> : null}
        {buyer && !searching && !searchErr ? (
          <div className="mt-3 rounded-xl border border-gambian-sand bg-gambian-sand/50 p-4 text-sm text-gambian-earth">
            <p className="font-semibold text-gray-900">Buyer found</p>
            <p className="mt-1 font-medium">{buyer.displayName || "Registered buyer"}</p>
            <p className="text-xs text-gray-700">{[buyer.email, buyer.phone].filter(Boolean).join(" · ") || buyer.id}</p>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white text-sm shadow-sm">
        <div className="flex items-center justify-between gap-4 bg-blue-50/80 px-4 py-4">
          <span className="font-bold text-gambian-blue">Escrow amount</span>
          <span className="font-display text-3xl font-bold text-gray-950">{CURRENCY_PREFIX}{selectedProduct?.price ?? "0"}</span>
        </div>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated fee</p>
            <p className="mt-1 font-bold text-gray-900">{CURRENCY_PREFIX}{feePreview}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Funding</p>
            <p className="mt-1 font-bold text-gray-900">Buyer</p>
          </div>
        </div>
      </div>

      {err ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700">Cancel</button>
        <button type="submit" disabled={busy || products.length === 0} className="flex-1 rounded-xl bg-gambian-blue px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-950 disabled:opacity-60">
          {busy ? "Creating..." : "Create escrow"}
        </button>
      </div>
    </form>
  );
}

export function CreateTransactionForm(props: Props) {
  return <CreateEscrowTransactionForm {...props} />;
}
