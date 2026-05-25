"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { cardPanel, fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as productsApi from "@/src/lib/api/products";
import type { ProductRow, ProductTypeFieldDef } from "@/src/lib/api/types";
import { errorMessage } from "@/src/lib/api/errors";

export default function EditProductPage() {
  return (
    <RequireAuth requireProfileComplete>
      <EditProductInner />
    </RequireAuth>
  );
}

function normalizeFieldDefs(raw: unknown): ProductTypeFieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductTypeFieldDef[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.name !== "string" || typeof o.valueType !== "string") continue;
    out.push({
      name: o.name,
      label: typeof o.label === "string" ? o.label : null,
      valueType: o.valueType,
      required: o.required === false ? false : true,
    });
  }
  return out;
}

function cleanAttributes(
  defs: ProductTypeFieldDef[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    const v = raw[d.name];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "" && !d.required) continue;
    out[d.name] = v;
  }
  return out;
}

function EditProductInner() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { token } = useAuth();

  const [row, setRow] = useState<ProductRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);

  const fieldDefs = row ? normalizeFieldDefs(row.productType.fieldDefinitions) : [];

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const p = await productsApi.fetchProduct(token, id);
      setRow(p);
      setName(p.name ?? "");
      setDescription(p.description ?? "");
      setPrice(p.price ?? "");
      setAttributes({ ...p.attributes });
    } catch (e) {
      setLoadErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  function setAttr(name: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [name]: value }));
  }

  async function onPickAttributeImage(fieldName: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadBusy(`attr:${fieldName}`);
    setSubmitErr(null);
    try {
      const key = await productsApi.uploadProductImage(token, file);
      setAttributes((prev) => ({ ...prev, [fieldName]: key }));
    } catch (err) {
      setSubmitErr(errorMessage(err));
    } finally {
      setUploadBusy(null);
      e.target.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id || !row) return;
    if (!name.trim()) {
      setSubmitErr("Listing name is required.");
      return;
    }
    if (!description.trim()) {
      setSubmitErr("Description is required.");
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await productsApi.updateProductDetails(token, id, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price || "0"),
        attributes: cleanAttributes(fieldDefs, attributes),
      });
      router.push(`/products/${id}`);
      router.refresh();
    } catch (err) {
      setSubmitErr(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-red-600">Invalid product.</p>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <i className="fas fa-circle-notch fa-spin text-3xl text-gambian-blue" aria-hidden />
      </div>
    );
  }

  if (loadErr || !row) {
    return (
      <div className="space-y-4">
        <Link href="/store?tab=products" className="text-sm font-medium text-gambian-blue hover:underline">
          ← Back to products
        </Link>
        <p className="text-sm text-red-600">{loadErr ?? "Not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/products/${id}`}
          className="text-sm font-medium text-gambian-blue hover:underline"
        >
          ← Back to listing
        </Link>
      </div>

      <form onSubmit={(ev) => void onSubmit(ev)} className={`${cardPanel} p-6 sm:p-8`}>
        <h1 className="font-display text-2xl font-bold text-gray-900">Edit details</h1>
        <p className="mt-2 text-sm text-gray-600">
          Description and typed fields only. Change photos on the{" "}
          <Link href={`/products/${id}`} className="font-medium text-gambian-blue hover:underline">
            product page
          </Link>
          .
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gambian-blue">
          {row.productType?.name}
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className={fieldLabel} htmlFor="edit-name">
              Listing name
            </label>
            <input
              id="edit-name"
              type="text"
              maxLength={200}
              className={fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Short title for lists and transaction picks"
              required
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="edit-price">
              Price
            </label>
            <input
              id="edit-price"
              type="number"
              min={0}
              step="0.01"
              className={fieldInput}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="edit-desc">
              Description
            </label>
            <textarea
              id="edit-desc"
              className={fieldInput}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {fieldDefs.length > 0 ? (
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <p className="text-sm font-semibold text-gray-900">Details for this type</p>
              {fieldDefs.map((d) => {
                const label = d.label || d.name;
                const fid = `edit-attr-${d.name}`;
                if (d.valueType === "boolean") {
                  return (
                    <label
                      key={d.name}
                      className="flex items-center gap-3 text-sm text-gray-800"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gambian-blue focus:ring-gambian-blue"
                        checked={Boolean(attributes[d.name])}
                        onChange={(e) => setAttr(d.name, e.target.checked)}
                      />
                      {label}
                      {d.required && <span className="text-red-500">*</span>}
                    </label>
                  );
                }
                if (d.valueType === "text") {
                  return (
                    <div key={d.name}>
                      <label className={fieldLabel} htmlFor={fid}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </label>
                      <textarea
                        id={fid}
                        className={fieldInput}
                        rows={4}
                        required={d.required}
                        value={String(attributes[d.name] ?? "")}
                        onChange={(e) => setAttr(d.name, e.target.value)}
                      />
                    </div>
                  );
                }
                if (d.valueType === "number") {
                  return (
                    <div key={d.name}>
                      <label className={fieldLabel} htmlFor={fid}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        id={fid}
                        type="number"
                        className={fieldInput}
                        required={d.required}
                        value={
                          attributes[d.name] === undefined || attributes[d.name] === null
                            ? ""
                            : String(attributes[d.name])
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            setAttr(d.name, undefined);
                            return;
                          }
                          const n = Number(v);
                          if (!Number.isNaN(n)) setAttr(d.name, n);
                        }}
                      />
                    </div>
                  );
                }
                if (d.valueType === "date") {
                  return (
                    <div key={d.name}>
                      <label className={fieldLabel} htmlFor={fid}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        id={fid}
                        type="date"
                        className={fieldInput}
                        required={d.required}
                        value={String(attributes[d.name] ?? "").slice(0, 10)}
                        onChange={(e) =>
                          setAttr(
                            d.name,
                            e.target.value ? new Date(e.target.value).toISOString() : "",
                          )
                        }
                      />
                    </div>
                  );
                }
                if (d.valueType === "image" || d.valueType === "url") {
                  return (
                    <div key={d.name}>
                      <span className={fieldLabel}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                          <i className="fas fa-upload" aria-hidden />
                          {uploadBusy === `attr:${d.name}` ? "Uploading…" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => void onPickAttributeImage(d.name, e)}
                            disabled={!!uploadBusy}
                          />
                        </label>
                        {typeof attributes[d.name] === "string" && (
                          <span className="max-w-xs truncate text-xs text-gray-500">
                            {attributes[d.name] as string}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={d.name}>
                    <label className={fieldLabel} htmlFor={fid}>
                      {label}
                      {d.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      id={fid}
                      type={d.valueType === "email" ? "email" : "text"}
                      className={fieldInput}
                      required={d.required}
                      value={String(attributes[d.name] ?? "")}
                      onChange={(e) => setAttr(d.name, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {submitErr ? (
            <p className="text-sm text-red-600" role="alert">
              {submitErr}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !description.trim() || !price.trim()}
              className="rounded-xl bg-gambian-blue px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-gambian-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save details"}
            </button>
            <Link
              href={`/products/${id}`}
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
