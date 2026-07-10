"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { ListingImageUploader, type LocalListingImage } from "@/src/components/listings/ListingImageUploader";
import { cardPanel, fieldInput, fieldLabel, fieldSelect } from "@/src/components/ui/form-classes";
import { useAuth } from "@/src/lib/auth/auth-context";
import { SERVICE_URLS, STORAGE_ACCESS_TOKEN } from "@/src/config/constants";
import { errorMessage } from "@/src/lib/api/errors";
import * as sm from "@/src/lib/api/service-marketplace";

export default function CreateServiceListingPage() {
  return (
    <RequireAuth requireProfileComplete>
      <CreateServiceInner />
    </RequireAuth>
  );
}

function CreateServiceInner() {
  const router = useRouter();
  const { token } = useAuth();
  const galleryRef = useRef<LocalListingImage[]>([]);

  const [categories, setCategories] = useState<sm.ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceType, setPriceType] = useState<"FIXED" | "RANGE">("FIXED");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [banner, setBanner] = useState<LocalListingImage | null>(null);
  const [galleryItems, setGalleryItems] = useState<LocalListingImage[]>([]);
  galleryRef.current = galleryItems;

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  useEffect(() => {
    void (async () => {
      try {
        const res = await sm.listServiceCategories();
        setCategories(res.categories);
        if (!categoryId && res.categories[0]?.id) {
          setCategoryId(res.categories[0].id);
        }
      } catch {
        /* explore without categories */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitListing(visibility: "DRAFT" | "PUBLISHED") {
    const t = token ?? (typeof window !== "undefined" ? localStorage.getItem(STORAGE_ACCESS_TOKEN) : null);
    if (!t) {
      router.push("/login");
      return;
    }
    if (!banner?.file) {
      setErr("Add a cover image.");
      return;
    }
    if (galleryItems.length < 1) {
      setErr("Add at least one service image beside the cover.");
      return;
    }
    const numFixed = Number(priceAmount);
    const numMin = Number(priceMin);
    const numMax = Number(priceMax);
    if (priceType === "FIXED" && (!Number.isFinite(numFixed) || numFixed <= 0)) {
      setErr("Enter a valid fixed price.");
      return;
    }
    if (priceType === "RANGE") {
      if (
        !Number.isFinite(numMin) ||
        !Number.isFinite(numMax) ||
        numMin <= 0 ||
        numMax <= 0 ||
        numMin >= numMax
      ) {
        setErr("Enter a valid price range (min must be less than max).");
        return;
      }
    }

    setErr(null);
    setSubmitting(true);
    try {
      const metadata: Record<string, unknown> = {
        title,
        description,
        categoryId,
        priceType,
        visibility,
      };
      if (priceType === "FIXED") metadata.priceAmount = numFixed;
      else {
        metadata.priceMin = numMin;
        metadata.priceMax = numMax;
      }

      if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              metadata.latitude = pos.coords.latitude;
              metadata.longitude = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: false, maximumAge: 120_000, timeout: 12_000 },
          );
        });
      }

      const fd = new FormData();
      fd.set("metadata", JSON.stringify(metadata));
      fd.append("cover", banner.file, banner.file.name);
      for (const g of galleryItems.slice(0, 24)) {
        fd.append("gallery", g.file, g.file.name);
      }

      const base = SERVICE_URLS.products;
      const res = await fetch(`${base}/service-marketplace/listings/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "X-Device-Id": window.localStorage.getItem("paynexa_device_id") ?? "",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      await res.json();
      router.push("/store?tab=services");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-4">
      <div className="mb-6">
        <Link
          href="/store?tab=services"
          className="text-sm font-medium text-primaryColorBlack hover:underline"
        >
          ← Store
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900 md:text-3xl">
          Create a service listing
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Same photo flow as listing a product. We optionally attach GPS when your browser allows it so nearby clients can find you.
        </p>
      </div>

      {err ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </div>
      ) : null}

      <div className={`${cardPanel} p-6 sm:p-8`}>
        <div className="mt-2 space-y-8">
          <ListingImageUploader
            disabled={!token}
            banner={banner}
            galleryItems={galleryItems}
            onBannerFile={(file) =>
              setBanner((prev) => {
                setErr(null);
                if (prev) URL.revokeObjectURL(prev.url);
                return file ? { id: crypto.randomUUID(), file, url: URL.createObjectURL(file) } : null;
              })
            }
            onAddGalleryFiles={(files) => {
              setErr(null);
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

          <div>
            <label className={fieldLabel} htmlFor="svc-title">
              Title
            </label>
            <input
              id="svc-title"
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. House wiring & socket installation"
              className={fieldInput}
              required
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="svc-category">
                Category
              </label>
              <select
                id="svc-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={fieldSelect}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="svc-price-type">
                Pricing
              </label>
              <select
                id="svc-price-type"
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as "FIXED" | "RANGE")}
                className={fieldSelect}
              >
                <option value="FIXED">Fixed</option>
                <option value="RANGE">Range</option>
              </select>
            </div>
          </div>

          {priceType === "FIXED" ? (
            <div>
              <label className={fieldLabel} htmlFor="svc-fixed">
                Amount (GMD)
              </label>
              <input
                id="svc-fixed"
                type="number"
                min={0}
                step="0.01"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className={fieldInput}
                required
              />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="svc-min">
                  Min (GMD)
                </label>
                <input
                  id="svc-min"
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className={fieldInput}
                  required
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="svc-max">
                  Max (GMD)
                </label>
                <input
                  id="svc-max"
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className={fieldInput}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className={fieldLabel} htmlFor="svc-desc">
              Description
            </label>
            <textarea
              id="svc-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you offer, what’s included, response time, and any requirements."
              className={fieldInput}
              required
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void submitListing("DRAFT")}
              disabled={
                submitting ||
                !title.trim() ||
                !description.trim() ||
                !banner?.file ||
                galleryItems.length < 1
              }
              className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => void submitListing("PUBLISHED")}
              disabled={
                submitting ||
                !title.trim() ||
                !description.trim() ||
                !banner?.file ||
                galleryItems.length < 1
              }
              className="rounded-xl bg-primaryColorBlack px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primaryColorBlack/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Publishing…" : "Publish to marketplace"}
            </button>
            <Link
              href="/store?tab=services"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
