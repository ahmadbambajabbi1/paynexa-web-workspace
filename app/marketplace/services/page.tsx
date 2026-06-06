"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/src/components/SiteHeader";
import { STORAGE_ACCESS_TOKEN } from "@/src/config/constants";
import * as sm from "@/src/lib/api/service-marketplace";
import {
  providerDisplayNameFromListing,
  providerLocationLine,
} from "@/src/lib/marketplace/provider-display";

type GeoState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; latitude: number; longitude: number; accuracyMeters: number | null }
  | { state: "error"; message: string };

function statusPill(status: string) {
  if (status === "ONLINE") return "bg-emerald-100 text-emerald-800";
  if (status === "AWAY") return "bg-amber-100 text-amber-900";
  return "bg-gray-100 text-gray-700";
}

function listingCoverUrl(listing: sm.ServiceListing): string | null {
  const c = listing.coverImage;
  if (typeof c === "string" && /^https?:\/\//i.test(c.trim())) return c.trim();
  return null;
}

export default function ServiceMarketplaceBrowsePage() {
  const [categories, setCategories] = useState<sm.ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [geo, setGeo] = useState<GeoState>({ state: "idle" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<
    { listing: sm.ServiceListing; distanceKm: number | null; rankScore: number }[]
  >([]);

  const authed = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(STORAGE_ACCESS_TOKEN));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await sm.listServiceCategories();
        setCategories(res.categories);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function requestPreciseLocation() {
    if (!("geolocation" in navigator)) {
      setGeo({ state: "error", message: "Geolocation not supported on this device." });
      return;
    }
    setGeo({ state: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          state: "ready",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      (e) => {
        setGeo({ state: "error", message: e.message || "Location permission denied." });
      },
      {
        enableHighAccuracy: true, // precise location
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  const geoLat = geo.state === "ready" ? geo.latitude : undefined;
  const geoLng = geo.state === "ready" ? geo.longitude : undefined;

  const runSearch = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await sm.searchServiceListings({
        categoryId: categoryId || undefined,
        onlineOnly,
        latitude: geoLat,
        longitude: geoLng,
        page: 1,
        pageSize: 50,
      });
      setItems(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [categoryId, onlineOnly, geoLat, geoLng]);

  useEffect(() => {
    void requestPreciseLocation();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void runSearch(), 400);
    return () => window.clearTimeout(t);
  }, [runSearch]);

  /** Throttled provider rendering-location ping while browsing (logged-in sellers). */
  const geoLatForPing = geo.state === "ready" ? geo.latitude : null;
  const geoLngForPing = geo.state === "ready" ? geo.longitude : null;

  /** Providers with listings: save a readable place name on ServiceLocation (buyers skip geocode). */
  useEffect(() => {
    if (geoLatForPing == null || geoLngForPing == null) return;
    const tok = window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
    if (!tok) return;
    let cancelled = false;
    void (async () => {
      try {
        const mine = await sm.listMyServiceListings(tok);
        if (cancelled || !mine.listings?.length) return;
        const r = await fetch("/api/maps/reverse-geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: geoLatForPing, lng: geoLngForPing }),
        });
        const j = (await r.json()) as { ok?: boolean; formattedAddress?: string };
        if (cancelled || !j.ok || !j.formattedAddress?.trim()) return;
        await sm.pingRenderingLocation(tok, {
          latitude: geoLatForPing,
          longitude: geoLngForPing,
          locationLabel: j.formattedAddress.trim(),
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geoLatForPing, geoLngForPing]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const tok = window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
      if (!tok || !("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void sm.pingRenderingLocation(tok, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 180_000, timeout: 20_000 },
      );
    }, 180_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-white pb-24 pt-[4.75rem]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[2.65rem]">
              Marketplace
            </h1>
            <div className="mt-5 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <i className="fas fa-layer-group pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="field-select-chevron w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-gray-900 shadow-sm transition focus:border-primaryColorBlack focus:ring-2 focus:ring-primaryColorBlack/20"
                    aria-label="Category filter"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-primaryColorBlack/15 bg-gray-50/90 px-4 py-3.5 transition hover:border-primaryColorBlack/35 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={onlineOnly}
                    onChange={(e) => setOnlineOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primaryColorBlack focus:ring-primaryColorBlack"
                  />
                  <span className="text-sm font-semibold text-gray-800">Online providers only</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {err ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <i className="fas fa-circle-exclamation mr-2" aria-hidden />
              {err}
            </p>
          </div>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="aspect-[16/10] w-full rounded-xl bg-gray-200" />
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-gray-200" />
                    <div className="h-3 w-full rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-8 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <i className="fas fa-search text-2xl text-gray-400" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No services found</h3>
              <p className="mt-2 text-sm text-gray-600">
                Try adjusting your filters or check back later for new listings
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((row) => {
              const l = row.listing;
              const p = l.provider;
              const cover = listingCoverUrl(l);
              const provLocName = providerLocationLine(p);
              const provName = providerDisplayNameFromListing(p);
              return (
                <Link
                  key={l.id}
                  href={`/marketplace/services/${encodeURIComponent(l.id)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryColorBlack focus-visible:ring-offset-2"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={l.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                        <i className="fas fa-image text-4xl" aria-hidden />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <span
                      className={`absolute right-3 top-3 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm ${statusPill(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    {/* Title Section */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-primaryColorBlack">
                        {l.category?.name ?? "Service"}
                      </p>
                      <h3 className="mt-2 text-base font-bold text-gray-900 line-clamp-2 group-hover:text-primaryColorBlack transition">
                        {l.title}
                      </h3>
                      {provName ? (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-1">{provName}</p>
                      ) : null}
                    </div>

                    {/* Rating & Stats */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                        <i className="fas fa-star text-amber-500" aria-hidden />
                        {p.ratingAvg.toFixed(1)}
                        <span className="text-gray-500">({p.ratingCount})</span>
                      </span>
                      
                      {row.distanceKm != null ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primaryColorBlack">
                          <i className="fas fa-location-dot" aria-hidden />
                          {row.distanceKm.toFixed(1)} km
                        </span>
                      ) : null}
                      
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        <i className="fas fa-bolt" aria-hidden />
                        ~{Math.round((p.avgResponseTimeSec || 0) / 60)}m
                      </span>
                    </div>

                    {/* Location */}
                    {provLocName ? (
                      <p className="flex items-start gap-2 text-xs text-gray-600 line-clamp-2">
                        <i className="fas fa-map-pin mt-0.5 shrink-0 text-gray-400" aria-hidden />
                        <span>{provLocName}</span>
                      </p>
                    ) : null}

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 flex-1">{l.description}</p>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between gap-4 border-t border-gray-100/60 pt-4 mt-auto">
                      <span className="font-display text-lg font-bold text-gray-900">
                        {l.priceType === "FIXED"
                          ? `D${l.priceAmount ?? ""}`
                          : `D${l.priceMin ?? ""}–D${l.priceMax ?? ""}`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primaryColorBlack opacity-0 transition group-hover:opacity-100">
                        {authed ? "View" : "Sign in"}
                        <i className="fas fa-arrow-right text-xs" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            },)}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

