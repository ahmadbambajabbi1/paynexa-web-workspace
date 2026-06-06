"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { cardPanel, fieldInput, fieldLabel, fieldSelect } from "@/src/components/ui/form-classes";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as productsApi from "@/src/lib/api/products";
import type { CatalogProductType, ProductTypeFieldDef } from "@/src/lib/api/types";
import { errorMessage } from "@/src/lib/api/errors";
import { ListingImageUploader, type LocalListingImage } from "@/src/components/listings/ListingImageUploader";

export default function NewProductPage() {
  return (
    <RequireAuth requireProfileComplete>
      <NewProductInner />
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

type LocalImage = LocalListingImage;

function NewProductInner() {
  const router = useRouter();
  const { token } = useAuth();
  const [types, setTypes] = useState<CatalogProductType[]>([]);
  const [typesErr, setTypesErr] = useState<string | null>(null);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [banner, setBanner] = useState<LocalImage | null>(null);
  const [galleryItems, setGalleryItems] = useState<LocalImage[]>([]);
  const galleryRef = useRef<LocalImage[]>([]);
  galleryRef.current = galleryItems;
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      galleryRef.current.forEach((g) => URL.revokeObjectURL(g.url));
    };
  }, []);

  useEffect(() => {
    return () => {
      if (banner) URL.revokeObjectURL(banner.url);
    };
  }, [banner]);

  const selectedType = useMemo(
    () => types.find((t) => t.id === selectedTypeId) ?? null,
    [types, selectedTypeId],
  );

  const fieldDefs = useMemo(
    () => (selectedType ? normalizeFieldDefs(selectedType.fieldDefinitions) : []),
    [selectedType],
  );

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const rows = await productsApi.fetchCatalogProductTypes(token);
        setTypes(
          rows.map((t) => ({
            ...t,
            fieldDefinitions: normalizeFieldDefs(t.fieldDefinitions),
          })),
        );
        setTypesErr(null);
      } catch (e) {
        setTypesErr(errorMessage(e));
      }
    })();
  }, [token]);

  useEffect(() => {
    setAttributes({});
    if (selectedTypeId && selectedType) {
      const defs = normalizeFieldDefs(selectedType.fieldDefinitions);
      const next: Record<string, unknown> = {};
      for (const d of defs) {
        if (d.valueType === "boolean") next[d.name] = false;
      }
      setAttributes(next);
    }
  }, [selectedTypeId, selectedType]);

  async function onPickAttributeImage(
    fieldName: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
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

  async function createWithVisibility(visibility: "DRAFT" | "PUBLISHED") {
    if (!token || !selectedTypeId) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      if (!banner?.file) {
        setSubmitErr("Add a banner image.");
        return;
      }
      if (galleryItems.length < 1) {
        setSubmitErr("Add at least one gallery image.");
        return;
      }
      await productsApi.createProductComplete(token, {
        productTypeId: selectedTypeId,
        name: name.trim(),
        description,
        price: Number(price || "0"),
        banner: banner.file,
        gallery: galleryItems.map((g) => g.file),
        attributes: cleanAttributes(fieldDefs, attributes),
        visibility,
      });
      router.push("/store?tab=products");
    } catch (err) {
      setSubmitErr(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function setAttr(name: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <div className="mb-6">
        <Link
          href="/store?tab=products"
          className="text-sm font-medium text-primaryColorBlack hover:underline"
        >
          ← Back to products
        </Link>
      </div>

      {typesErr && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load product types: {typesErr}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void createWithVisibility("PUBLISHED");
        }}
        className={`${cardPanel} p-6 sm:p-8`}
      >
        <h1 className="font-display text-2xl font-bold text-gray-900">Create product</h1>

        <div className="mt-6 space-y-8">
          <div>
            <label className={fieldLabel} htmlFor="product-type">
              Product type
            </label>
            <select
              id="product-type"
              className={fieldSelect}
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              required
            >
              <option value="">Select type…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabel} htmlFor="listing-name">
              Listing name
            </label>
            <input
              id="listing-name"
              type="text"
              maxLength={200}
              className={fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Short title — shown in lists and when picking a product"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Keep it brief. The description below can be as long as you need.
            </p>
          </div>

          <div>
            <label className={fieldLabel} htmlFor="price">
              Price
            </label>
            <input
              id="price"
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
            <label className={fieldLabel} htmlFor="desc">
              Description
            </label>
            <textarea
              id="desc"
              className={fieldInput}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product, condition, and what the buyer should know."
              required
            />
          </div>

          <ListingImageUploader
            disabled={!token}
            banner={banner}
            galleryItems={galleryItems}
            onBannerFile={(file) => {
              setSubmitErr(null);
              setBanner((prev) => {
                if (prev) URL.revokeObjectURL(prev.url);
                return file ? { id: crypto.randomUUID(), file, url: URL.createObjectURL(file) } : null;
              });
            }}
            onAddGalleryFiles={(files) => {
              setSubmitErr(null);
              setGalleryItems((prev) => [
                ...prev,
                ...files.map((file) => ({
                  id: crypto.randomUUID(),
                  file,
                  url: URL.createObjectURL(file),
                })),
              ]);
            }}
            onRemoveGalleryItem={(id) => {
              setGalleryItems((prev) => {
                const found = prev.find((x) => x.id === id);
                if (found) URL.revokeObjectURL(found.url);
                return prev.filter((x) => x.id !== id);
              });
            }}
            onClearGallery={() => {
              setGalleryItems((prev) => {
                prev.forEach((g) => URL.revokeObjectURL(g.url));
                return [];
              });
            }}
          />

          {fieldDefs.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <p className="text-sm font-semibold text-gray-900">Details for this type</p>
              {fieldDefs.map((d) => {
                const label = d.label || d.name;
                const id = `attr-${d.name}`;
                if (d.valueType === "boolean") {
                  return (
                    <label
                      key={d.name}
                      className="flex items-center gap-3 text-sm text-gray-800"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primaryColorBlack focus:ring-primaryColorBlack"
                        checked={Boolean(attributes[d.name])}
                        onChange={(e) => setAttr(d.name, e.target.checked)}
                      />
                      {label}
                      {d.required && (
                        <span className="text-red-500" title="Required">
                          *
                        </span>
                      )}
                    </label>
                  );
                }
                if (d.valueType === "text") {
                  return (
                    <div key={d.name}>
                      <label className={fieldLabel} htmlFor={id}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </label>
                      <textarea
                        id={id}
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
                      <label className={fieldLabel} htmlFor={id}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        id={id}
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
                      <label className={fieldLabel} htmlFor={id}>
                        {label}
                        {d.required && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        id={id}
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
                            onChange={(e) => onPickAttributeImage(d.name, e)}
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
                    <label className={fieldLabel} htmlFor={id}>
                      {label}
                      {d.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      id={id}
                      type={
                        d.valueType === "email"
                          ? "email"
                          : d.valueType === "string"
                            ? "text"
                            : "text"
                      }
                      className={fieldInput}
                      required={d.required}
                      value={String(attributes[d.name] ?? "")}
                      onChange={(e) => setAttr(d.name, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {submitErr && (
            <p className="text-sm text-red-600" role="alert">
              {submitErr}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void createWithVisibility("DRAFT")}
              disabled={
                submitting ||
                !selectedTypeId ||
                !banner?.file ||
                galleryItems.length < 1 ||
                !name.trim() ||
                !price.trim() ||
                !description.trim()
              }
              className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save draft"}
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !selectedTypeId ||
                !banner?.file ||
                galleryItems.length < 1 ||
                !name.trim() ||
                !price.trim() ||
                !description.trim()
              }
              className="rounded-xl bg-primaryColorBlack px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primaryColorBlack/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Uploading & saving…" : "Publish product"}
            </button>
            <Link
              href="/store?tab=products"
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
