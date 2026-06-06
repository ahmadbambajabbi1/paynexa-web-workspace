"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { errorMessage } from "@/src/lib/api/errors";
import * as sm from "@/src/lib/api/service-marketplace";
import * as productsApi from "@/src/lib/api/products";
import type { ProductRow } from "@/src/lib/api/types";
import { productDisplayName } from "@/src/lib/product-display";

export type StoreTabId = "services" | "products" | "my-bookings" | "provider-bookings";

type BookingRow = Record<string, unknown> & {
  id: string;
  status?: string;
  amount?: unknown;
  listing?: {
    id?: string;
    title?: string;
    category?: { name?: string };
    provider?: { userId?: string; displayName?: string | null };
  };
  participantContact?: {
    client?: sm.MarketplaceUserContact;
    provider?: sm.MarketplaceUserContact;
  };
  participantTransparency?: {
    client?: sm.MarketplaceUserContact;
    provider?: sm.MarketplaceUserContact;
  };
};

function parseTab(raw: string | null): StoreTabId {
  if (raw === "bookings") return "my-bookings";
  if (raw === "products" || raw === "services" || raw === "my-bookings" || raw === "provider-bookings") return raw;
  return "services";
}

function bookingParticipantContact(b: BookingRow): BookingRow["participantContact"] | undefined {
  return b.participantContact ?? b.participantTransparency;
}

function contactNameLine(u?: sm.MarketplaceUserContact): string | null {
  if (!u) return null;
  const name = [u.displayName?.trim(), u.fullName?.trim()].filter(Boolean).join(" · ");
  return name.length > 0 ? name : null;
}

function coverSrcListing(listing: sm.ServiceListing): string | null {
  const c = listing.coverImage;
  return typeof c === "string" && c.trim() ? c : null;
}

function pendingCount(rows: BookingRow[]) {
  return rows.filter((b) => {
    const status = String(b.status ?? "").toUpperCase();
    return status.includes("PENDING") || status === "ACCEPTED" || status === "IN_PROGRESS";
  }).length;
}

function amountTotal(rows: BookingRow[]) {
  return rows.reduce((sum, b) => sum + (Number(b.amount ?? 0) || 0), 0);
}

function OverviewStat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-app-canvas px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primaryColorBlack">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function TabOverviewGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primaryColorBlack/5">{icon}</div>
      <h3 className="mb-1 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

function StoreTabIcon({ tabId, className }: { tabId: StoreTabId; className?: string }) {
  const cn = `h-[18px] w-[18px] shrink-0 ${className ?? ""}`;
  const sw = 1.75;
  const paths: Record<StoreTabId, string> = {
    services: "M6 6.878V6a2.25 2.25 0 012.25-2.25h9.5A2.25 2.25 0 0119.75 6v.878m-15 7.621v5.25A2.25 2.25 0 007.25 21h9.5A2.25 2.25 0 0019.75 19.5v-5.25m-15 0A2.25 2.25 0 007.25 12h9.5a2.25 2.25 0 012.25 2.25v0m-15 0h15",
    products: "m21 7.5-9-5.25L3 7.5m18 0v9l-9 5.25m9-14.25L12 12 3 7.5m9 5.25v9M3 7.5v9l9 5.25",
    "my-bookings": "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5",
    "provider-bookings": "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  };
  return (
    <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={paths[tabId]} />
    </svg>
  );
}

function AnimatedBadge({ count }: { count: number | null }) {
  if (count == null || count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primaryColorBlack px-1.5 text-[11px] font-bold text-white shadow-sm tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function StoreModernTabs({ tab, onChange, myBookingCount, providerBookingCount }: { tab: StoreTabId; onChange: (t: StoreTabId) => void; myBookingCount: number | null; providerBookingCount: number | null }) {
  const items: { id: StoreTabId; label: string; badge: number | null; description: string }[] = [
    { id: "services", label: "Services", badge: null, description: "Your service listings" },
    { id: "products", label: "Products", badge: null, description: "Your product catalog" },
    { id: "my-bookings", label: "My Bookings", badge: myBookingCount, description: "Bookings you made" },
    { id: "provider-bookings", label: "Provider Bookings", badge: providerBookingCount, description: "Bookings for your services" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-app-canvas p-1.5 shadow-sm">
      <div role="tablist" aria-label="Store sections" className="flex flex-wrap items-stretch gap-1">
        {items.map(({ id, label, badge, description }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={`group relative flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold tracking-tight outline-none transition-all duration-300 sm:min-h-0 sm:px-4 sm:py-3 ${active ? "bg-primaryColorBlack text-white shadow-md shadow-primaryColorBlack/25" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"} focus-visible:ring-2 focus-visible:ring-primaryColorBlack/40 focus-visible:ring-offset-2`}
            >
              <StoreTabIcon tabId={id} className={active ? "text-white" : "text-slate-400 group-hover:text-slate-500"} />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 leading-tight">
                  {label}
                  <AnimatedBadge count={badge} />
                </span>
                <span className={`text-[11px] font-normal leading-tight ${active ? "text-white/70" : "text-slate-400"}`}>{description}</span>
              </span>
              {active ? <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="aspect-[4/3] animate-pulse bg-slate-100" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StorePageClient() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  const setTab = useCallback((next: StoreTabId) => router.replace(`${pathname}?tab=${next}`, { scroll: false }), [router, pathname]);
  const [myBookingBadge, setMyBookingBadge] = useState<number | null>(null);
  const [providerBookingBadge, setProviderBookingBadge] = useState<number | null>(null);

  const refreshBookingBadges = useCallback(async () => {
    if (!token) return;
    try {
      const [mine, prov] = await Promise.all([sm.listMyServiceBookings(token), sm.listProviderServiceBookings(token)]);
      setMyBookingBadge(((mine as { bookings?: BookingRow[] }).bookings ?? []).length);
      setProviderBookingBadge(((prov as { bookings?: BookingRow[] }).bookings ?? []).length);
    } catch {
      setMyBookingBadge(null);
      setProviderBookingBadge(null);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshBookingBadges();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshBookingBadges]);

  const createAction = tab === "services" ? (
    <Link href="/marketplace/create" className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primaryColorBlack px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primaryColorBlack/20 transition hover:bg-primaryColorBlack/90 sm:px-6 sm:py-3">
      <span className="text-lg leading-none">+</span>
      Create service
    </Link>
  ) : tab === "products" ? (
    <Link href="/products/new" className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primaryColorBlack px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primaryColorBlack/20 transition hover:bg-primaryColorBlack/90 sm:px-6 sm:py-3">
      <span className="text-lg leading-none">+</span>
      Create product
    </Link>
  ) : null;

  return (
    <div className="relative flex min-h-[calc(100vh-7rem)] flex-col">
      <StoreModernTabs tab={tab} onChange={setTab} myBookingCount={myBookingBadge} providerBookingCount={providerBookingBadge} />
      {createAction ? <div className="mt-4 flex justify-end">{createAction}</div> : null}
      <div className="mt-6 min-h-0 flex-1">
        {tab === "services" ? <StoreServicesPanel /> : tab === "products" ? <StoreProductsPanel /> : tab === "my-bookings" ? <StoreBookingsListPanel variant="my-bookings" /> : <StoreBookingsListPanel variant="provider-bookings" />}
      </div>
    </div>
  );
}

function ServiceCard({ listing, manageToken, onPublished }: { listing: sm.ServiceListing; manageToken?: string | null; onPublished?: () => void }) {
  const [pubBusy, setPubBusy] = useState(false);
  const isDraft = listing.visibility === "DRAFT";
  const src = coverSrcListing(listing);
  const priceLabel = listing.priceType === "FIXED" ? `D${listing.priceAmount ?? ""}` : `D${listing.priceMin ?? ""}–D${listing.priceMax ?? ""}`;
  const shellClass = `flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-primaryColorBlack/20 ${isDraft ? "border-amber-100" : "border-slate-100"}`;
  const inner = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
        {src ? <Image src={src} alt={listing.title} fill className="object-cover" unoptimized sizes="(max-width: 640px) 100vw, 33vw" /> : <div className="flex h-full items-center justify-center text-slate-300"><i className="fas fa-image text-3xl" aria-hidden /></div>}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primaryColorBlack shadow-sm">{listing.category?.name ?? "Service"}</span>
          {isDraft ? <span className="rounded-lg bg-amber-500/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">Draft</span> : null}
        </div>
      </div>
      <div className="flex flex-grow flex-col justify-between p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{listing.title}</h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{listing.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-lg font-bold text-slate-900">{priceLabel}</span>
          <span className="text-xs font-medium text-slate-400">View details</span>
        </div>
      </div>
    </>
  );

  if (isDraft && manageToken) {
    return (
      <div className={shellClass}>
        <Link href={`/marketplace/services/${encodeURIComponent(listing.id)}?from=store-services`} className="group flex flex-col">{inner}</Link>
        <div className="border-t border-slate-100 p-3">
          <button type="button" disabled={pubBusy} onClick={() => void (async () => { setPubBusy(true); try { await sm.publishServiceListing(listing.id, manageToken); onPublished?.(); } catch (e) { alert(errorMessage(e)); } finally { setPubBusy(false); } })()} className="w-full rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {pubBusy ? "Publishing..." : "Publish to marketplace"}
          </button>
        </div>
      </div>
    );
  }
  return <Link href={`/marketplace/services/${encodeURIComponent(listing.id)}?from=store-services`} className={`group ${shellClass}`}>{inner}</Link>;
}

function StoreServicesPanel() {
  const { token } = useAuth();
  const [items, setItems] = useState<sm.ServiceListing[]>([]);
  const [providerBookings, setProviderBookings] = useState<BookingRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const [res, bookingsRes] = await Promise.all([sm.listMyServiceListings(token), sm.listProviderServiceBookings(token)]);
      setItems(res.listings);
      setProviderBookings((bookingsRes as { bookings?: BookingRow[] }).bookings ?? []);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  if (err) return <p className="rounded-2xl border border-red-100 bg-red-50/80 px-5 py-4 text-sm text-red-700">{err}</p>;
  if (loading) return <CardSkeleton count={6} />;

  const draftCount = items.filter((l) => l.visibility === "DRAFT").length;
  const publishedCount = items.length - draftCount;
  const revenue = amountTotal(providerBookings);
  const overview = (
    <TabOverviewGrid>
      <OverviewStat label="Owned services" value={items.length} />
      <OverviewStat label="Published" value={publishedCount} />
      <OverviewStat label="Drafts" value={draftCount} />
      <OverviewStat label="Revenue" value={`D${revenue.toFixed(0)}`} hint={`${pendingCount(providerBookings)} pending`} />
    </TabOverviewGrid>
  );

  if (items.length === 0) {
    return <div className="space-y-5">{overview}<EmptyState icon={<i className="fas fa-briefcase text-2xl text-primaryColorBlack/60" aria-hidden />} title="No services yet" description="Create your first service listing to start offering your skills." action={<Link href="/marketplace/create" className="rounded-xl bg-primaryColorBlack px-6 py-3 text-sm font-semibold text-white">Create your first service</Link>} /></div>;
  }
  return <div className="space-y-5">{overview}<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((listing) => <ServiceCard key={listing.id} listing={listing} manageToken={token} onPublished={load} />)}</div></div>;
}

function ProductCard({ product, manageToken, onPublished }: { product: ProductRow; manageToken?: string | null; onPublished?: () => void }) {
  const [pubBusy, setPubBusy] = useState(false);
  const isDraft = product.visibility === "DRAFT";
  const img = Array.isArray(product.productImages) && product.productImages.length > 0 ? product.productImages[0] : null;
  const shellClass = `flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-primaryColorBlack/20 ${isDraft ? "border-amber-100" : "border-slate-100"}`;
  const inner = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
        {img ? <Image src={img} alt={productDisplayName(product)} fill className="object-cover" unoptimized sizes="(max-width: 640px) 100vw, 33vw" /> : <div className="flex h-full items-center justify-center text-slate-300"><i className="fas fa-image text-3xl" aria-hidden /></div>}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2"><span className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primaryColorBlack shadow-sm">{product.productType?.name ?? "Product"}</span>{isDraft ? <span className="rounded-lg bg-amber-500/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">Draft</span> : null}</div>
      </div>
      <div className="flex flex-grow flex-col justify-between p-5"><div className="space-y-2"><h3 className="line-clamp-2 text-base font-semibold text-slate-900">{productDisplayName(product)}</h3><p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{product.description?.trim()}</p></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-medium text-slate-400">View details</span></div></div>
    </>
  );
  if (isDraft && manageToken) {
    return <div className={shellClass}><Link href={`/products/${product.id}?from=store-products`} className="group flex flex-col">{inner}</Link><div className="border-t border-slate-100 p-3"><button type="button" disabled={pubBusy} onClick={() => void (async () => { setPubBusy(true); try { await productsApi.publishProduct(manageToken, product.id); onPublished?.(); } catch (e) { alert(errorMessage(e)); } finally { setPubBusy(false); } })()} className="w-full rounded-xl bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pubBusy ? "Publishing..." : "Publish listing"}</button></div></div>;
  }
  return <Link href={`/products/${product.id}?from=store-products`} className={`group ${shellClass}`}>{inner}</Link>;
}

function StoreProductsPanel() {
  const { token } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ProductRow[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirst = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setListErr(null);
    try {
      const res = await productsApi.listMyProducts(token, 1, pageSize);
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setNextPage(res.totalPages > 1 ? 2 : res.totalPages + 1);
    } catch (e) {
      setListErr(errorMessage(e));
    } finally {
      setListLoading(false);
    }
  }, [token, pageSize]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!token || loadingMore || listLoading || nextPage > totalPages) return;
    setLoadingMore(true);
    try {
      const res = await productsApi.listMyProducts(token, nextPage, pageSize);
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setNextPage((p) => p + 1);
    } catch (e) {
      setListErr(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }, [token, loadingMore, listLoading, nextPage, totalPages, pageSize]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el || nextPage > totalPages || loadingMore || listLoading) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 320) void loadMore();
  }

  if (listErr && items.length === 0) return <p className="rounded-2xl border border-red-100 bg-red-50/80 px-5 py-4 text-sm text-red-700">{listErr}</p>;
  if (listLoading && items.length === 0) return <CardSkeleton count={6} />;
  const draftCount = items.filter((p) => p.visibility === "DRAFT").length;
  const publishedCount = items.length - draftCount;
  const overview = <TabOverviewGrid><OverviewStat label="Owned products" value={total || items.length} /><OverviewStat label="Loaded" value={items.length} /><OverviewStat label="Published" value={publishedCount} /><OverviewStat label="Drafts" value={draftCount} /></TabOverviewGrid>;
  return <div className="flex flex-col gap-5">{overview}<div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto pr-1">{items.length === 0 ? <EmptyState icon={<i className="fas fa-box text-2xl text-primaryColorBlack/60" aria-hidden />} title="No products yet" description="Add your first product to your store catalog." action={<Link href="/products/new" className="rounded-xl bg-primaryColorBlack px-6 py-3 text-sm font-semibold text-white">Add your first product</Link>} /> : <div className="grid gap-5 pb-10 sm:grid-cols-2 xl:grid-cols-3">{items.map((product) => <ProductCard key={product.id} product={product} manageToken={token} onPublished={loadFirst} />)}</div>}{loadingMore ? <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primaryColorBlack border-t-transparent" /></div> : null}{listErr && items.length > 0 ? <p className="py-4 text-center text-sm text-red-600">{listErr}</p> : null}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const style = normalized.includes("cancel") ? "bg-red-50 text-red-700" : normalized.includes("complete") || normalized.includes("fund") ? "bg-emerald-50 text-emerald-700" : normalized.includes("progress") || normalized.includes("accept") ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{status}</span>;
}

function BookingCard({ booking, perspective }: { booking: BookingRow; perspective: "me" | "provider" }) {
  const l = booking.listing;
  const status = String(booking.status ?? "");
  const participants = bookingParticipantContact(booking);
  const providerLine = contactNameLine(participants?.provider) ?? l?.provider?.displayName ?? null;
  const clientLine = contactNameLine(participants?.client);
  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition hover:border-primaryColorBlack/15">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-primaryColorBlack">{l?.category?.name ?? "Service"}</span><span className="text-slate-300">·</span><StatusBadge status={status} /></div>
          <h3 className="text-lg font-semibold text-slate-900">{l?.title ?? "Service"}</h3>
          <p className="text-sm font-semibold text-slate-700">D{String(booking.amount ?? "0")}</p>
          {perspective === "me" && providerLine ? <p className="text-sm text-slate-600"><span className="text-slate-400">Provider: </span><span className="font-medium text-slate-800">{providerLine}</span></p> : null}
          {perspective === "provider" && clientLine ? <p className="text-sm text-slate-600"><span className="text-slate-400">Client: </span><span className="font-medium text-slate-800">{clientLine}</span></p> : null}
        </div>
        <Link href={`/marketplace/bookings/${encodeURIComponent(booking.id)}?from=${perspective === "provider" ? "provider-bookings" : "my-bookings"}`} className="inline-flex items-center justify-center rounded-xl bg-primaryColorBlack px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primaryColorBlack/20">View booking</Link>
      </div>
    </li>
  );
}

function StoreBookingsListPanel({ variant }: { variant: "my-bookings" | "provider-bookings" }) {
  const { token } = useAuth();
  const perspective = variant === "my-bookings" ? "me" : "provider";
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = perspective === "me" ? await sm.listMyServiceBookings(token) : await sm.listProviderServiceBookings(token);
      setItems((res as { bookings?: BookingRow[] }).bookings ?? []);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token, perspective]);

  useEffect(() => { void load(); }, [load]);
  if (err) return <p className="rounded-2xl border border-red-100 bg-red-50/80 px-5 py-4 text-sm text-red-700">{err}</p>;
  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>;
  const overview = <TabOverviewGrid><OverviewStat label={variant === "my-bookings" ? "My bookings" : "Provider bookings"} value={items.length} /><OverviewStat label="Pending" value={pendingCount(items)} /><OverviewStat label={variant === "provider-bookings" ? "Revenue" : "Booked value"} value={`D${amountTotal(items).toFixed(0)}`} /><OverviewStat label="Completed" value={items.filter((b) => ["COMPLETED", "FUNDED"].includes(String(b.status ?? "").toUpperCase())).length} /></TabOverviewGrid>;
  if (items.length === 0) return <div className="space-y-5">{overview}<EmptyState icon={<i className="fas fa-calendar text-2xl text-primaryColorBlack/60" aria-hidden />} title={variant === "my-bookings" ? "No bookings yet" : "No provider bookings"} description={variant === "my-bookings" ? "You haven't booked any services yet." : "No one has booked your services yet."} action={variant === "my-bookings" ? <Link href="/marketplace/services" className="rounded-xl bg-primaryColorBlack px-6 py-3 text-sm font-semibold text-white">Browse services</Link> : undefined} /></div>;
  return <div className="space-y-5">{overview}<ul className="space-y-4">{items.map((booking) => <BookingCard key={booking.id} booking={booking} perspective={perspective} />)}</ul></div>;
}
