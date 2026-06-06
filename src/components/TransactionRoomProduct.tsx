"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { formatMoney } from "@/src/lib/currency";
import type { ProductRow, ProductTypeFieldDef } from "@/src/lib/api/types";
import { productDisplayName } from "@/src/lib/product-display";
import { cardPanel } from "@/src/components/ui/form-classes";
import { ImageLightbox } from "@/src/components/ImageLightbox";

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

function formatAttrValue(
  v: unknown,
  valueType: string,
): { kind: "text"; text: string } | { kind: "image"; url: string } {
  if (v === null || v === undefined) return { kind: "text", text: "—" };
  if (valueType === "boolean") return { kind: "text", text: v === true ? "Yes" : "No" };
  if (typeof v === "string") {
    if (
      (valueType === "image" || valueType === "url") &&
      (v.startsWith("http://") || v.startsWith("https://"))
    ) {
      return { kind: "image", url: v };
    }
    return { kind: "text", text: v };
  }
  if (typeof v === "number") return { kind: "text", text: String(v) };
  try {
    return { kind: "text", text: JSON.stringify(v) };
  } catch {
    return { kind: "text", text: String(v) };
  }
}

function collectProductImageUrls(product: ProductRow): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (u: unknown) => {
    if (typeof u !== "string" || !u.trim()) return;
    const s = u.trim();
    if (seen.has(s)) return;
    seen.add(s);
    urls.push(s);
  };
  if (Array.isArray(product.productImages)) {
    for (const u of product.productImages) push(u);
  }
  if (Array.isArray(product.otherImages)) {
    for (const u of product.otherImages) push(u);
  }
  const defs = normalizeFieldDefs(product.productType.fieldDefinitions);
  for (const d of defs) {
    const raw = product.attributes[d.name];
    const formatted = formatAttrValue(raw, d.valueType);
    if (formatted.kind === "image") push(formatted.url);
  }
  return urls;
}

type Props = {
  product: ProductRow;
  currency?: string | null;
};

const zoomableThumb =
  "cursor-pointer transition duration-200 hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryColorBlack focus-visible:ring-offset-2";

export function TransactionRoomProduct({ product, currency }: Props) {
  const defs = normalizeFieldDefs(product.productType.fieldDefinitions);
  const banner =
    Array.isArray(product.productImages) && product.productImages.length > 0
      ? product.productImages[0]
      : null;
  const gallery = Array.isArray(product.otherImages) ? product.otherImages : [];
  const imageUrls = useMemo(() => collectProductImageUrls(product), [product]);
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const openLightboxAtUrl = useCallback(
    (url: string) => {
      if (imageUrls.length === 0) return;
      const i = imageUrls.indexOf(url);
      setLightbox({ open: true, index: i >= 0 ? i : 0 });
    },
    [imageUrls, setLightbox],
  );

  return (
    <div className={`${cardPanel} overflow-hidden border-blue-100 p-0`}>
      <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primaryColorBlack/70">Product</p>
        <h2 className="mt-1 font-display text-xl font-bold text-gray-900">{productDisplayName(product)}</h2>
        <p className="mt-0.5 text-xs font-semibold text-gray-500">
          {product.productType?.name ?? "Listing"}
        </p>
      </div>

      {banner ? (
        <button
          type="button"
          className={`relative aspect-[16/9] w-full border-0 bg-gray-100 p-0 ${zoomableThumb}`}
          aria-label="View product image larger"
          onClick={() => openLightboxAtUrl(banner)}
        >
          <Image
            src={banner}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        </button>
      ) : null}

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {product.description}
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primaryColorBlack/70">Price</p>
            <p className="mt-2 text-2xl font-bold text-primaryColorBlack">
              {formatMoney(product.price, currency)}
            </p>
          </div>
        </div>

        {gallery.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Gallery
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gallery.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={`relative aspect-square overflow-hidden rounded-xl border border-blue-100 bg-gray-50 ${zoomableThumb}`}
                  aria-label="View gallery image larger"
                  onClick={() => openLightboxAtUrl(url)}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="200px"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {defs.length > 0 ? (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Details
            </p>
            <dl className="space-y-3">
              {defs.map((d) => {
                const raw = product.attributes[d.name];
                const label = d.label || d.name;
                const formatted = formatAttrValue(raw, d.valueType);
                return (
                  <div
                    key={d.name}
                    className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <dt className="text-xs font-medium text-gray-500">{label}</dt>
                    <dd className="mt-1">
                      {formatted.kind === "image" ? (
                        <button
                          type="button"
                          className={`relative mt-1 block h-24 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${zoomableThumb}`}
                          aria-label="View detail image larger"
                          onClick={() => openLightboxAtUrl(formatted.url)}
                        >
                          <Image
                            src={formatted.url}
                            alt=""
                            fill
                            className="object-contain"
                            unoptimized
                            sizes="200px"
                          />
                        </button>
                      ) : (
                        <span className="text-sm text-gray-900">{formatted.text}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : null}
      </div>

      {imageUrls.length > 0 ? (
        <ImageLightbox
          urls={imageUrls}
          initialIndex={lightbox.index}
          open={lightbox.open}
          onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        />
      ) : null}
    </div>
  );
}
