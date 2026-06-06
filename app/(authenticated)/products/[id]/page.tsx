"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as productsApi from "@/src/lib/api/products";
import type { ProductRow } from "@/src/lib/api/types";
import { productDisplayName } from "@/src/lib/product-display";
import { errorMessage } from "@/src/lib/api/errors";

export default function ProductDetailPage() {
  return (
    <RequireAuth requireProfileComplete>
      <ProductDetailInner />
    </RequireAuth>
  );
}

function ProductDetailInner() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { token } = useAuth();

  const [row, setRow] = useState<ProductRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setErr(null);
    try {
      const p = await productsApi.fetchProduct(token, id);
      setRow(p);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !token || !id) return;
    setBannerBusy(true);
    try {
      const updated = await productsApi.replaceProductBanner(token, id, f);
      setRow(updated);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBannerBusy(false);
    }
  }

  async function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!list.length || !token || !id) return;
    setGalleryBusy(true);
    try {
      const updated = await productsApi.appendProductGallery(token, id, list);
      setRow(updated);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setGalleryBusy(false);
    }
  }

  async function removeGalleryKey(key: string) {
    if (!token || !id || !row) return;
    const keys = row.otherImageKeys ?? [];
    if (keys.length <= 1) {
      setErr("At least one gallery image must remain.");
      return;
    }
    if (!window.confirm("Remove this photo from storage?")) return;
    setRemovingKey(key);
    setErr(null);
    try {
      const updated = await productsApi.removeProductGalleryKeys(token, id, [key]);
      setRow(updated);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setRemovingKey(null);
    }
  }

  async function onDelete() {
    if (!token || !id) return;
    if (
      !window.confirm(
        "Delete this listing and all images from storage? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await productsApi.deleteProduct(token, id);
      router.push("/store?tab=products");
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <p className="text-sm text-red-600">Invalid product.</p>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <i className="fas fa-circle-notch fa-spin text-3xl text-primaryColorBlack" aria-hidden />
      </div>
    );
  }

  if (err && !row) {
    return (
      <div className="space-y-4">
        <Link href="/store?tab=products" className="text-sm font-medium text-primaryColorBlack hover:underline">
          ← Back to products
        </Link>
        <p className="text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const p = row!;
  const bannerUrl =
    Array.isArray(p.productImages) && p.productImages.length > 0 ? p.productImages[0] : null;
  const galleryUrls = p.otherImages ?? [];
  const galleryKeys = p.otherImageKeys ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/store?tab=products" className="text-sm font-medium text-primaryColorBlack hover:underline">
          ← Back to products
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products/${id}/edit`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            <i className="fas fa-pen mr-2 text-xs" aria-hidden />
            Edit details
          </Link>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void onDelete()}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? (
              <i className="fas fa-circle-notch fa-spin mr-2" aria-hidden />
            ) : (
              <i className="fas fa-trash-alt mr-2 text-xs" aria-hidden />
            )}
            Delete
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primaryColorBlack">
          {p.productType?.name ?? "Product"}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold text-gray-900">
          {productDisplayName(p)}
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          Updated {new Date(p.updatedAt).toLocaleString()}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Cover</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <div className="relative aspect-video w-full bg-gray-100">
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 768px) 100vw, 720px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <i className="fas fa-image text-4xl" aria-hidden />
              </div>
            )}
          </div>
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickBanner}
        />
        <button
          type="button"
          disabled={bannerBusy || !token}
          onClick={() => bannerInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {bannerBusy ? (
            <i className="fas fa-circle-notch fa-spin" aria-hidden />
          ) : (
            <i className="fas fa-camera" aria-hidden />
          )}
          {bannerBusy ? "Uploading…" : "Change cover"}
        </button>
        <p className="text-xs text-gray-500">
          Replacing the cover removes the previous file from storage.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Gallery</h2>
          <div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickGallery}
            />
            <button
              type="button"
              disabled={galleryBusy || !token}
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-primaryColorBlack px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primaryColorBlack/90 disabled:opacity-50"
            >
              {galleryBusy ? (
                <i className="fas fa-circle-notch fa-spin" aria-hidden />
              ) : (
                <i className="fas fa-plus" aria-hidden />
              )}
              {galleryBusy ? "Adding…" : "Add photos"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {galleryUrls.map((url, i) => {
            const key = galleryKeys[i] ?? "";
            const busy = removingKey === key;
            return (
              <div
                key={`${key || url}-${i}`}
                className="relative h-28 w-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="112px"
                />
                {key ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeGalleryKey(key)}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/75 disabled:opacity-50"
                    aria-label="Remove photo"
                  >
                    {busy ? (
                      <i className="fas fa-circle-notch fa-spin text-xs" aria-hidden />
                    ) : (
                      "×"
                    )}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-900">Description</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {p.description}
        </p>
      </section>

      {p.attributes && Object.keys(p.attributes).length > 0 ? (
        <section className="space-y-2 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-semibold text-gray-900">Details</h2>
          <dl className="grid gap-2 text-sm">
            {Object.entries(p.attributes).map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
                <dt className="font-medium text-gray-500">{k}</dt>
                <dd className="text-gray-900 sm:col-span-2">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
