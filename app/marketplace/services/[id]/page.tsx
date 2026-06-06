// "use client";

// import Image from "next/image";
// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { useParams, useRouter, useSearchParams } from "next/navigation";
// import { SiteHeader } from "@/src/components/SiteHeader";
// import {
//   ServiceLocationPlacesPicker,
//   type PickedServiceLocation,
// } from "@/src/components/marketplace/ServiceLocationPlacesPicker";
// import * as sm from "@/src/lib/api/service-marketplace";
// import { errorMessage } from "@/src/lib/api/errors";
// import { useAuth } from "@/src/lib/auth/auth-context";
// import { providerDisplayNameFromListing } from "@/src/lib/marketplace/provider-display";
// import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";

// function galleryUrls(listing: sm.ServiceListing): string[] {
//   const raw = listing.serviceImages;
//   if (!Array.isArray(raw)) return [];
//   return raw.filter((x): x is string => typeof x === "string" && /^https?:\/\//i.test(x));
// }

// function coverUrl(listing: sm.ServiceListing): string | null {
//   const c = listing.coverImage;
//   if (typeof c === "string" && /^https?:\/\//i.test(c.trim())) return c.trim();
//   return null;
// }

// /** Human-readable response time, or null when product-service has no signal. */
// function formatAvgResponse(sec: number): string | null {
//   if (!Number.isFinite(sec) || sec <= 0) return null;
//   if (sec < 45) return "usually within a minute";
//   if (sec < 3600) return `about ${Math.max(1, Math.round(sec / 60))} min`;
//   const h = Math.round(sec / 3600);
//   return h <= 1 ? "about 1 hour" : `about ${h} hours`;
// }

// function providerAvatarLetters(name: string): string {
//   const parts = name.trim().split(/\s+/).filter(Boolean);
//   if (parts.length >= 2) {
//     return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
//   }
//   if (parts.length === 1 && parts[0].length > 0) {
//     return parts[0].slice(0, 2).toUpperCase();
//   }
//   return "?";
// }

// /**
//  * Real provider name shown to viewers: merged `provider.displayName` from the API first
//  * (product-service merges user-service displayName/fullName into every listing response),
//  * then session-specific contact fields when present.
//  */
// function sellerPublicName(listing: sm.ServiceListing, contact: sm.MarketplaceUserContact | null): string {
//   const fromApi = listing.provider.displayName?.trim();
//   const fromContact = contact?.displayName?.trim() || contact?.fullName?.trim();
//   if (fromApi && fromApi.length > 0) return fromApi;
//   if (fromContact && fromContact.length > 0) return fromContact;
//   return providerDisplayNameFromListing(listing.provider)?.trim() ?? "";
// }

// function sellerAvatarLetters(listing: sm.ServiceListing, contact: sm.MarketplaceUserContact | null): string {
//   const name = sellerPublicName(listing, contact);
//   if (name.length > 0) return providerAvatarLetters(name);
//   return "?";
// }

// function StarRow({ rating }: { rating: number }) {
//   const r = Math.round(Math.min(5, Math.max(0, rating)));
//   return (
//     <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
//       {[1, 2, 3, 4, 5].map((i) => (
//         <span key={i}>{i <= r ? "★" : "☆"}</span>
//       ))}
//     </span>
//   );
// }

// /** Compact provider line above the listing title (user-service name when enriched). */
// function ProviderLead({
//   listing,
//   contact,
//   viewerIsOwner,
// }: {
//   listing: sm.ServiceListing;
//   contact: sm.MarketplaceUserContact | null;
//   viewerIsOwner: boolean;
// }) {
//   const p = listing.provider;
//   const name = sellerPublicName(listing, contact);
//   const avg = p.ratingAvg ?? 0;
//   const count = p.ratingCount ?? 0;
//   const status = p.status === "ONLINE" ? "Online" : p.status === "AWAY" ? "Away" : "Offline";
//   const verified =
//     typeof p.verificationStatus === "string" &&
//     p.verificationStatus.toLowerCase() === "verified";
//   const responseHint = formatAvgResponse(p.avgResponseTimeSec);

//   return (
//     <div className="mb-4 border-b border-gray-100 pb-4">
//       <div className="flex flex-wrap items-center gap-2 gap-y-1">
//         <p className="text-sm font-semibold text-gray-900">
//           {name.length > 0 ? name : "\u2014"}
//         </p>
//         {verified ? (
//           <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
//             Verified
//           </span>
//         ) : null}
//         {viewerIsOwner ? (
//           <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
//             Your listing
//           </span>
//         ) : null}
//       </div>
//       <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
//         <span className="inline-flex items-center gap-1">
//           <StarRow rating={avg} />
//           <span className="font-semibold text-gray-800">{avg.toFixed(1)}</span>
//           <span className="text-gray-500">({count})</span>
//         </span>
//         <span className="text-gray-300">·</span>
//         <span>{status}</span>
//         {responseHint ? (
//           <>
//             <span className="text-gray-300">·</span>
//             <span>Avg. response {responseHint}</span>
//           </>
//         ) : null}
//       </div>
//       {!viewerIsOwner && (contact?.phone || contact?.email) ? (
//         <div className="mt-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-gray-800 shadow-sm">
//           <p className="font-semibold text-primaryColorBlack">Contact provider</p>
//           <div className="mt-1.5 space-y-1">
//             {contact?.phone ? (
//               <a className="block font-medium hover:underline" href={`tel:${contact.phone}`}>
//                 {contact.phone}
//               </a>
//             ) : null}
//             {contact?.email ? (
//               <a className="block break-all font-medium hover:underline" href={`mailto:${contact.email}`}>
//                 {contact.email}
//               </a>
//             ) : null}
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function ServiceTitleAvatarRow({
//   listing,
//   contact,
// }: {
//   listing: sm.ServiceListing;
//   contact: sm.MarketplaceUserContact | null;
// }) {
//   const letters = sellerAvatarLetters(listing, contact);

//   return (
//     <div className="flex min-w-0 gap-4">
//       <div
//         className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primaryColorBlack/15 to-white text-sm font-bold text-primaryColorBlack ring-1 ring-primaryColorBlack/20 md:h-[4.25rem] md:w-[4.25rem]"
//         aria-hidden
//       >
//         {letters}
//       </div>
//       <div className="min-w-0 flex-1 pt-0.5">
//         <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
//           {listing.title}
//         </h1>
//         <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primaryColorBlack">
//           {listing.category?.name ?? "Service"}
//         </p>
//       </div>
//     </div>
//   );
// }

// function ServiceGalleryBlock({
//   listing,
// }: {
//   listing: sm.ServiceListing;
// }) {
//   const hero = coverUrl(listing);
//   const imgs = galleryUrls(listing);
//   const thumbs = hero ? imgs.filter((u) => u !== hero) : imgs;

//   if (!hero && thumbs.length === 0) {
//     return (
//       <section className="mt-10" aria-labelledby="gallery-heading">
//         <h2 id="gallery-heading" className="font-display text-lg font-bold text-gray-900">
//           Gallery
//         </h2>
//         <p className="mt-3 text-sm text-gray-500">No photos for this listing yet.</p>
//       </section>
//     );
//   }

//   return (
//     <section className="mt-10" aria-labelledby="gallery-heading">
//       <h2 id="gallery-heading" className="font-display text-lg font-bold text-gray-900">
//         Gallery
//       </h2>
//       <div className="mt-4 space-y-4">
//         {hero ? (
//           <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-100">
//             <Image
//               src={hero}
//               alt=""
//               fill
//               className="object-cover"
//               unoptimized
//               priority
//               sizes="(max-width: 1024px) 100vw, 60vw"
//             />
//           </div>
//         ) : null}
//         {thumbs.length > 0 ? (
//           <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-1">
//             {thumbs.map((src) => (
//               <div
//                 key={src}
//                 className="relative h-24 w-[7.25rem] shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-100 sm:h-28 sm:w-[8.75rem]"
//               >
//                 <Image src={src} alt="" fill className="object-cover" unoptimized sizes="140px" />
//               </div>
//             ))}
//           </div>
//         ) : hero ? (
//           <p className="text-sm text-gray-500">No extra gallery photos.</p>
//         ) : null}
//       </div>
//     </section>
//   );
// }

// type ReviewSort = "newest" | "oldest" | "rating";

// function GigReviewsPanel({ listing }: { listing: sm.ServiceListing }) {
//   const [sort, setSort] = useState<ReviewSort>("newest");
//   const raw = listing.reviews ?? [];
//   const sorted = useMemo(() => {
//     const copy = [...(listing.reviews ?? [])];
//     if (sort === "newest") {
//       copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//     } else if (sort === "oldest") {
//       copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
//     } else {
//       copy.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//     }
//     return copy;
//   }, [listing.reviews, sort]);

//   if (raw.length === 0) {
//     return (
//       <div className="rounded-xl border border-gray-100 bg-white px-5 py-10 text-center text-sm text-gray-500">
//         No reviews yet for this service.
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <p className="text-sm text-gray-600">
//           <span className="font-medium text-gray-900">{raw.length}</span> review{raw.length === 1 ? "" : "s"}
//         </p>
//         <label className="flex items-center gap-2 text-sm text-gray-600">
//           <span className="shrink-0">Sort by</span>
//           <select
//             value={sort}
//             onChange={(e) => setSort(e.target.value as ReviewSort)}
//             className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-primaryColorBlack/30"
//           >
//             <option value="newest">Newest</option>
//             <option value="oldest">Oldest</option>
//             <option value="rating">Highest rating</option>
//           </select>
//         </label>
//       </div>
//       <ul className="space-y-4">
//         {sorted.map((rev) => (
//           <li
//             key={rev.id}
//             className="rounded-xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-5"
//           >
//             <div className="flex flex-wrap items-start justify-between gap-2">
//               <div className="flex items-center gap-2">
//                 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
//                   C
//                 </span>
//                 <div>
//                   <p className="text-sm font-semibold text-gray-900">Customer</p>
//                   <p className="text-xs text-gray-500">Booking review</p>
//                 </div>
//               </div>
//               <div className="text-right text-sm">
//                 <div className="flex items-center justify-end gap-1 text-amber-500">
//                   <StarRow rating={rev.rating} />
//                 </div>
//                 <p className="text-xs text-gray-500">
//                   {new Date(rev.createdAt).toLocaleDateString(undefined, {
//                     month: "short",
//                     day: "numeric",
//                     year: "numeric",
//                   })}
//                 </p>
//               </div>
//             </div>
//             {rev.comment?.trim() ? (
//               <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{rev.comment.trim()}</p>
//             ) : (
//               <p className="mt-3 text-sm italic text-gray-500">No written feedback.</p>
//             )}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default function ServiceListingDetailPage() {
//   const params = useParams<{ id: string }>();
//   const router = useRouter();
//   const { token } = useAuth();
//   const id = params?.id ?? "";
//   const [listing, setListing] = useState<sm.ServiceListing | null>(null);
//   const [viewerIsOwner, setViewerIsOwner] = useState(false);
//   const [providerContact, setProviderContact] = useState<
//     sm.MarketplaceUserContact | null | undefined
//   >(undefined);
//   const [ownerBookings, setOwnerBookings] = useState<unknown[]>([]);
//   const [err, setErr] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [notes, setNotes] = useState("");
//   const [agreedAmount, setAgreedAmount] = useState("");
//   const [pickedLocation, setPickedLocation] = useState<PickedServiceLocation | null>(null);
//   const [directionsNotes, setDirectionsNotes] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   const rangeBounds = useMemo(() => {
//     if (!listing || listing.priceType !== "RANGE") return null;
//     const min = listing.priceMin != null ? Number(listing.priceMin) : NaN;
//     const max = listing.priceMax != null ? Number(listing.priceMax) : NaN;
//     if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
//     return { min, max };
//   }, [listing]);

//   useEffect(() => {
//     void (async () => {
//       setErr(null);
//       setLoading(true);
//       try {
//         const res = await sm.getServiceListing(id, token);
//         setListing(res.listing);
//         setViewerIsOwner(res.viewerIsOwner);
//         setProviderContact(res.providerContact ?? null);
//         if (res.viewerIsOwner && token) {
//           const b = await sm.listBookingsForMyListing(id, token);
//           setOwnerBookings(b.bookings);
//         } else {
//           setOwnerBookings([]);
//         }
//       } catch (e) {
//         setErr(errorMessage(e));
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [id, token]);

//   function clampAgreedAmount(raw: string): string {
//     if (!rangeBounds) return raw;
//     const n = Number(raw);
//     if (!Number.isFinite(n)) return raw;
//     const clamped = Math.min(rangeBounds.max, Math.max(rangeBounds.min, n));
//     return String(clamped);
//   }

//   async function book() {
//     if (!token) {
//       router.push("/login");
//       return;
//     }
//     if (!pickedLocation) {
//       setErr("Pick where the service should happen — search or use current location.");
//       return;
//     }
//     setErr(null);
//     setSubmitting(true);
//     try {
//       const body: Parameters<typeof sm.createServiceBooking>[2] = {
//         scheduledAt: new Date().toISOString(),
//         notes: notes.trim() || undefined,
//         serviceLatitude: pickedLocation.lat,
//         serviceLongitude: pickedLocation.lng,
//         serviceLocationLabel: pickedLocation.formattedAddress,
//         serviceGooglePlaceId: pickedLocation.placeId,
//         serviceAddressText: directionsNotes.trim() || undefined,
//       };

//       if (listing?.priceType === "RANGE") {
//         if (!rangeBounds) {
//           setErr("This listing has an invalid price range.");
//           setSubmitting(false);
//           return;
//         }
//         const amt = Number(agreedAmount);
//         if (!Number.isFinite(amt)) {
//           setErr("Enter the agreed price within the listed range.");
//           setSubmitting(false);
//           return;
//         }
//         if (amt < rangeBounds.min || amt > rangeBounds.max) {
//           setErr(`Price must be between D${rangeBounds.min} and D${rangeBounds.max}.`);
//           setSubmitting(false);
//           return;
//         }
//         body.agreedAmount = amt;
//       }

//       await sm.createServiceBooking(id, token, body);
//       router.push("/store?tab=my-bookings");
//     } catch (e) {
//       setErr(errorMessage(e));
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <>
//       <SiteHeader />
//       <main className="min-h-screen bg-[#faf8f3] pb-20 pt-[4.75rem] sm:pb-24">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           {loading ? (
//             <p className="py-24 text-center text-gray-500">Loading…</p>
//           ) : err ? (
//             <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
//           ) : !listing ? null : (
//             <div>
//               <div className="py-2">
//                 <Link
//                   href={searchParams.get("from") === "store-services" || viewerIsOwner ? "/store?tab=services" : "/marketplace/services"}
//                   className="inline-flex items-center gap-2 text-sm font-semibold text-primaryColorBlack hover:underline"
//                 >
//                   <i className="fas fa-arrow-left text-xs opacity-90" aria-hidden />
//                   {searchParams.get("from") === "store-services" || viewerIsOwner ? "Back to my services" : "All services"}
//                 </Link>
//               </div>

//               <div className="grid gap-5 lg:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
//                 <article className="min-w-0 rounded-xl border border-gray-200/80 bg-white px-4 py-5 sm:px-5 sm:py-6">
//                   <ProviderLead
//                     listing={listing}
//                     contact={providerContact ?? null}
//                     viewerIsOwner={viewerIsOwner}
//                   />

//                   <ServiceTitleAvatarRow listing={listing} contact={providerContact ?? null} />

//                   <section className="mt-6 border-t border-gray-100 pt-6">
//                     <h2 className="sr-only">Description</h2>
//                     <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
//                       {listing.description}
//                     </p>
//                   </section>

//                   <ServiceGalleryBlock listing={listing} />

//                   <section className="mt-10 border-t border-gray-100 pt-8">
//                     <h2 className="font-display text-lg font-bold text-gray-900">Reviews</h2>
//                     <div className="mt-4">
//                       <GigReviewsPanel listing={listing} />
//                     </div>
//                   </section>
//                 </article>

//                 <aside className="flex flex-col gap-4 md:sticky md:top-[4.75rem] md:self-start">
//                   <div className="overflow-hidden rounded-2xl border-0 bg-white shadow-[0_2px_20px_-4px_rgba(15,23,42,0.08)]">
//                     <div className="border-b border-gray-100 bg-white px-4 py-4 sm:px-5">
//                       <p className="text-[11px] font-semibold uppercase tracking-wider text-primaryColorBlack">Booking</p>
//                       <div className="mt-2 flex flex-wrap items-end gap-3">
//                         <p className="font-display text-2xl font-bold text-gray-900 sm:text-[1.75rem]">
//                           {listing.priceType === "FIXED"
//                             ? `D${listing.priceAmount ?? "—"}`
//                             : `D${listing.priceMin ?? "—"} – D${listing.priceMax ?? "—"}`}
//                         </p>
//                         <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
//                           {listing.priceType === "FIXED" ? "Fixed" : "Range"}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
//                       {viewerIsOwner ? (
//                         <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-800">
//                           <p>This is your listing.</p>
//                           <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
//                             <span className="font-semibold">Bookings ({ownerBookings.length})</span>
//                             <Link
//                               href="/store?tab=my-bookings"
//                               className="rounded-lg bg-primaryColorBlack px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-950"
//                             >
//                               Open bookings
//                             </Link>
//                           </div>
//                         </div>
//                       ) : (
//                         <>
//                           {listing?.priceType === "RANGE" && rangeBounds ? (
//                             <div>
//                               <label className={fieldLabel} htmlFor="agreed-amt">
//                                 Agreed price (GMD)
//                               </label>
//                               <input
//                                 id="agreed-amt"
//                                 type="number"
//                                 inputMode="decimal"
//                                 min={rangeBounds.min}
//                                 max={rangeBounds.max}
//                                 step="0.01"
//                                 value={agreedAmount}
//                                 onChange={(e) => setAgreedAmount(clampAgreedAmount(e.target.value))}
//                                 onBlur={() => setAgreedAmount((v) => clampAgreedAmount(v))}
//                                 placeholder={`${rangeBounds.min} – ${rangeBounds.max}`}
//                                 className={fieldInput}
//                                 required
//                               />
//                               <p className="mt-1 text-xs text-gray-500">
//                                 Between D{rangeBounds.min} and D{rangeBounds.max}.
//                               </p>
//                             </div>
//                           ) : null}

//                           <div className="rounded-xl bg-gray-50/90 p-4">
//                             <p className="text-sm font-bold text-gray-900">Where should this happen?</p>
//                             <p className="mt-1 text-xs leading-relaxed text-gray-600">
//                               Search below, then use current location only if GPS is accurate.
//                             </p>
//                             <div className="mt-4">
//                               <ServiceLocationPlacesPicker
//                                 value={pickedLocation}
//                                 onChange={setPickedLocation}
//                                 disabled={!token || submitting}
//                               />
//                             </div>
//                             <div className="mt-4 border-t border-gray-100 pt-4">
//                               <label className={fieldLabel} htmlFor="svc-extra-dir">
//                                 Extra directions (optional)
//                               </label>
//                               <textarea
//                                 id="svc-extra-dir"
//                                 rows={2}
//                                 value={directionsNotes}
//                                 onChange={(e) => setDirectionsNotes(e.target.value)}
//                                 placeholder="Floor, gate colour, whom to ask for…"
//                                 className={fieldInput}
//                               />
//                             </div>
//                           </div>

//                           <div>
//                             <label className={fieldLabel} htmlFor="svc-notes">
//                               Job notes (optional)
//                             </label>
//                             <textarea
//                               id="svc-notes"
//                               rows={3}
//                               value={notes}
//                               onChange={(e) => setNotes(e.target.value)}
//                               placeholder="Timeline, tools you’ll provide…"
//                               className={fieldInput}
//                             />
//                           </div>

//                           <button
//                             type="button"
//                             onClick={() => void book()}
//                             disabled={submitting || !pickedLocation}
//                             className="w-full rounded-xl bg-primaryColorBlack px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
//                           >
//                             {submitting ? "Booking…" : token ? "Request booking" : "Sign in to book"}
//                           </button>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </aside>
//               </div>
//             </div>
//           )}
//         </div>
//       </main>
//     </>
//   );
// }
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/src/components/SiteHeader";
import {
  ServiceLocationPlacesPicker,
  type PickedServiceLocation,
} from "@/src/components/marketplace/ServiceLocationPlacesPicker";
import * as sm from "@/src/lib/api/service-marketplace";
import { errorMessage } from "@/src/lib/api/errors";
import { useAuth } from "@/src/lib/auth/auth-context";
import {
  marketplaceLooksLikeOpaqueUserId,
  providerDisplayNameFromListing,
} from "@/src/lib/marketplace/provider-display";
import { fieldInput, fieldLabel } from "@/src/components/ui/form-classes";

function galleryUrls(listing: sm.ServiceListing): string[] {
  const raw = listing.serviceImages;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && /^https?:\/\//i.test(x));
}

function coverUrl(listing: sm.ServiceListing): string | null {
  const c = listing.coverImage;
  if (typeof c === "string" && /^https?:\/\//i.test(c.trim())) return c.trim();
  return null;
}

function formatAvgResponse(sec: number): string | null {
  if (!Number.isFinite(sec) || sec <= 0) return null;
  if (sec < 45) return "usually within a minute";
  if (sec < 3600) return `about ${Math.max(1, Math.round(sec / 60))} min`;
  const h = Math.round(sec / 3600);
  return h <= 1 ? "about 1 hour" : `about ${h} hours`;
}

function providerAvatarLetters(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "?";
}

function sellerPublicName(listing: sm.ServiceListing, contact: sm.MarketplaceUserContact | null): string {
  const uid = listing.provider.userId;
  const fromApi = listing.provider.displayName?.trim();
  const fromContact = contact?.displayName?.trim() || contact?.fullName?.trim();
  if (fromApi && fromApi.length > 0 && !marketplaceLooksLikeOpaqueUserId(fromApi, uid)) return fromApi;
  if (fromContact && fromContact.length > 0) return fromContact;
  return providerDisplayNameFromListing(listing.provider)?.trim() ?? "Provider";
}

function sellerAvatarLetters(listing: sm.ServiceListing, contact: sm.MarketplaceUserContact | null): string {
  const name = sellerPublicName(listing, contact);
  if (name.length > 0) return providerAvatarLetters(name);
  return "?";
}

function StarRow({ rating }: { rating: number }) {
  const r = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`h-4 w-4 ${i <= r ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </span>
  );
}

/* ─── Background Decor ─── */
function BackgroundDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-60 -right-60 h-[500px] w-[500px] rounded-full bg-primaryColorBlack/[0.02] blur-3xl" />
      <div className="absolute -bottom-60 -left-60 h-[500px] w-[500px] rounded-full bg-primaryColorBlack/[0.015] blur-3xl" />
    </div>
  );
}

/* ─── Provider Card ─── */
function ProviderCard({
  listing,
  contact,
  viewerIsOwner,
}: {
  listing: sm.ServiceListing;
  contact: sm.MarketplaceUserContact | null;
  viewerIsOwner: boolean;
}) {
  const p = listing.provider;
  const name = sellerPublicName(listing, contact);
  const avg = p.ratingAvg ?? 0;
  const count = p.ratingCount ?? 0;
  const status = p.status === "ONLINE" ? "Online" : p.status === "AWAY" ? "Away" : "Offline";
  const statusColor = p.status === "ONLINE" ? "bg-emerald-500" : p.status === "AWAY" ? "bg-amber-500" : "bg-slate-400";
  const verified = typeof p.verificationStatus === "string" && p.verificationStatus.toLowerCase() === "verified";
  const responseHint = formatAvgResponse(p.avgResponseTimeSec);
  const letters = sellerAvatarLetters(listing, contact);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primaryColorBlack/10 text-lg font-bold text-primaryColorBlack">
          {letters}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{name.length > 0 ? name : "—"}</h3>
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} title={status} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StarRow rating={avg} />
            <span className="text-sm font-semibold text-slate-700">{avg.toFixed(1)}</span>
            <span className="text-sm text-slate-400">({count} reviews)</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Verified
              </span>
            ) : null}
            {viewerIsOwner ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Your listing</span>
            ) : null}
            {responseHint ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">Avg. response {responseHint}</span>
            ) : null}
          </div>
        </div>
      </div>

      {!viewerIsOwner && (contact?.phone || contact?.email) ? (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primaryColorBlack/70">Contact</p>
          {contact?.phone ? (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-primaryColorBlack">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              {contact.phone}
            </a>
          ) : null}
          {contact?.email ? (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-primaryColorBlack">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              <span className="truncate">{contact.email}</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Service Header ─── */
function ServiceHeader({ listing }: { listing: sm.ServiceListing }) {
  return (
    <div className="space-y-2">
      <span className="inline-flex items-center rounded-full bg-primaryColorBlack/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primaryColorBlack ring-1 ring-primaryColorBlack/10">
        {listing.category?.name ?? "Service"}
      </span>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {listing.title}
      </h1>
    </div>
  );
}

/* ─── Gallery ─── */
function ServiceGalleryBlock({ listing }: { listing: sm.ServiceListing }) {
  const hero = coverUrl(listing);
  const imgs = galleryUrls(listing);
  const thumbs = hero ? imgs.filter((u) => u !== hero) : imgs;

  if (!hero && thumbs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12a2.25 2.25 0 002.25 2.25zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
        </div>
        <p className="text-sm text-slate-400">No photos for this listing yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hero ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-100">
          <Image src={hero} alt="" fill className="object-cover" unoptimized priority sizes="(max-width: 1024px) 100vw, 60vw" />
        </div>
      ) : null}
      {thumbs.length > 0 ? (
        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-1">
          {thumbs.map((src) => (
            <div key={src} className="relative h-24 w-[7.25rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100 sm:h-28 sm:w-[8.75rem]">
              <Image src={src} alt="" fill className="object-cover" unoptimized sizes="140px" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ReviewSort = "newest" | "oldest" | "rating";

/* ─── Reviews Panel ─── */
function GigReviewsPanel({ listing }: { listing: sm.ServiceListing }) {
  const [sort, setSort] = useState<ReviewSort>("newest");
  const raw = listing.reviews ?? [];
  const sorted = useMemo(() => {
    const copy = [...(listing.reviews ?? [])];
    if (sort === "newest") {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "oldest") {
      copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      copy.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return copy;
  }, [listing.reviews, sort]);

  if (raw.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
        </div>
        <p className="text-sm text-slate-400">No reviews yet for this service</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{raw.length}</span> review{raw.length === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="shrink-0">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSort)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-primaryColorBlack/30"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="rating">Highest rating</option>
          </select>
        </label>
      </div>
      <ul className="space-y-3">
        {sorted.map((rev) => (
          <li key={rev.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primaryColorBlack/10 text-sm font-bold text-primaryColorBlack">
                  {(rev?.clientUserId || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{rev?.clientUserId || "Customer"}</p>
                  <p className="text-xs text-slate-400">{new Date(rev.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <StarRow rating={rev.rating} />
                <span className="ml-1 text-sm font-semibold text-slate-700">{rev.rating}</span>
              </div>
            </div>
            {rev.comment?.trim() ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{rev.comment.trim()}</p>
            ) : (
              <p className="mt-3 text-sm italic text-slate-400">No written feedback</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Booking Sidebar ─── */
function BookingSidebar({
  listing,
  viewerIsOwner,
  ownerBookings,
  token,
  rangeBounds,
  agreedAmount,
  setAgreedAmount,
  pickedLocation,
  setPickedLocation,
  directionsNotes,
  setDirectionsNotes,
  notes,
  setNotes,
  submitting,
  onBook,
}: {
  listing: sm.ServiceListing;
  viewerIsOwner: boolean;
  ownerBookings: unknown[];
  token: string | null;
  rangeBounds: { min: number; max: number } | null;
  agreedAmount: string;
  setAgreedAmount: (v: string) => void;
  pickedLocation: PickedServiceLocation | null;
  setPickedLocation: (v: PickedServiceLocation | null) => void;
  directionsNotes: string;
  setDirectionsNotes: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  submitting: boolean;
  onBook: () => void;
}) {
  function clampAgreedAmount(raw: string): string {
    if (!rangeBounds) return raw;
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    const clamped = Math.min(rangeBounds.max, Math.max(rangeBounds.min, n));
    return String(clamped);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
      {/* Price Header */}
      <div className="border-b border-slate-100 bg-white px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primaryColorBlack/70">Price</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <p className="font-display text-3xl font-bold text-slate-900">
            {listing.priceType === "FIXED"
              ? `D${listing.priceAmount ?? "—"}`
              : `D${listing.priceMin ?? "—"} – D${listing.priceMax ?? "—"}`}
          </p>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {listing.priceType === "FIXED" ? "Fixed" : "Range"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        {viewerIsOwner ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <p className="font-semibold">This is your listing</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{ownerBookings.length} booking{ownerBookings.length === 1 ? "" : "s"}</span>
              <Link
                href="/store?tab=my-bookings"
                className="rounded-lg bg-primaryColorBlack px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primaryColorBlack/90 hover:shadow-md"
              >
                View bookings
              </Link>
            </div>
          </div>
        ) : (
          <>
            {listing?.priceType === "RANGE" && rangeBounds ? (
              <div>
                <label className={fieldLabel} htmlFor="agreed-amt">
                  Agreed price (GMD)
                </label>
                <input
                  id="agreed-amt"
                  type="number"
                  inputMode="decimal"
                  min={rangeBounds.min}
                  max={rangeBounds.max}
                  step="0.01"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(clampAgreedAmount(e.target.value))}
                  onBlur={() => setAgreedAmount(clampAgreedAmount(agreedAmount))}
                  placeholder={`${rangeBounds.min} – ${rangeBounds.max}`}
                  className={fieldInput}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Enter a price between D{rangeBounds.min} and D{rangeBounds.max}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-4 w-4 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-sm font-semibold text-slate-800">Service location</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">Search or use your current location</p>
              <ServiceLocationPlacesPicker
                value={pickedLocation}
                onChange={setPickedLocation}
                disabled={!token || submitting}
              />
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label className={fieldLabel} htmlFor="svc-extra-dir">
                  Extra directions (optional)
                </label>
                <textarea
                  id="svc-extra-dir"
                  rows={2}
                  value={directionsNotes}
                  onChange={(e) => setDirectionsNotes(e.target.value)}
                  placeholder="Floor, gate colour, whom to ask for..."
                  className={fieldInput}
                />
              </div>
            </div>

            <div>
              <label className={fieldLabel} htmlFor="svc-notes">
                Job notes (optional)
              </label>
              <textarea
                id="svc-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Timeline, tools you will provide..."
                className={fieldInput}
              />
            </div>

            <button
              type="button"
              onClick={() => void onBook()}
              disabled={submitting || !pickedLocation}
              className="w-full rounded-xl bg-primaryColorBlack px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primaryColorBlack/20 transition-all hover:-translate-y-0.5 hover:bg-primaryColorBlack/90 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Booking...
                </span>
              ) : token ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                  </svg>
                  Request booking
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Sign in to book
                </span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ServiceListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const id = params?.id ?? "";
  const [listing, setListing] = useState<sm.ServiceListing | null>(null);
  const [viewerIsOwner, setViewerIsOwner] = useState(false);
  const [providerContact, setProviderContact] = useState<sm.MarketplaceUserContact | null | undefined>(undefined);
  const [ownerBookings, setOwnerBookings] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [agreedAmount, setAgreedAmount] = useState("");
  const [pickedLocation, setPickedLocation] = useState<PickedServiceLocation | null>(null);
  const [directionsNotes, setDirectionsNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rangeBounds = useMemo(() => {
    if (!listing || listing.priceType !== "RANGE") return null;
    const min = listing.priceMin != null ? Number(listing.priceMin) : NaN;
    const max = listing.priceMax != null ? Number(listing.priceMax) : NaN;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
    return { min, max };
  }, [listing]);

  useEffect(() => {
    void (async () => {
      setErr(null);
      setLoading(true);
      try {
        const res = await sm.getServiceListing(id, token);
        setListing(res.listing);
        setViewerIsOwner(res.viewerIsOwner);
        setProviderContact(res.providerContact ?? null);
        if (res.viewerIsOwner && token) {
          const b = await sm.listBookingsForMyListing(id, token);
          setOwnerBookings(b.bookings);
        } else {
          setOwnerBookings([]);
        }
      } catch (e) {
        setErr(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  async function book() {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!pickedLocation) {
      setErr("Pick where the service should happen — search or use current location.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const body: Parameters<typeof sm.createServiceBooking>[2] = {
        scheduledAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
        serviceLatitude: pickedLocation.lat,
        serviceLongitude: pickedLocation.lng,
        serviceLocationLabel: pickedLocation.formattedAddress,
        serviceGooglePlaceId: pickedLocation.placeId,
        serviceAddressText: directionsNotes.trim() || undefined,
      };

      if (listing?.priceType === "RANGE") {
        if (!rangeBounds) {
          setErr("This listing has an invalid price range.");
          setSubmitting(false);
          return;
        }
        const amt = Number(agreedAmount);
        if (!Number.isFinite(amt)) {
          setErr("Enter the agreed price within the listed range.");
          setSubmitting(false);
          return;
        }
        if (amt < rangeBounds.min || amt > rangeBounds.max) {
          setErr(`Price must be between D${rangeBounds.min} and D${rangeBounds.max}.`);
          setSubmitting(false);
          return;
        }
        body.agreedAmount = amt;
      }

      await sm.createServiceBooking(id, token, body);
      router.push("/store?tab=my-bookings");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50/50 pb-20 pt-[4.75rem] sm:pb-24">
        <BackgroundDecor />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-primaryColorBlack border-t-transparent" />
              <p className="mt-4 text-sm text-slate-500">Loading service details...</p>
            </div>
          ) : err ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/80 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-red-800">Error loading service</p>
                  <p className="text-sm text-red-600">{err}</p>
                </div>
              </div>
            </div>
          ) : !listing ? null : (
            <div className="space-y-6">
              {/* Back Link */}
              <div className="py-2">
                <Link
                  href={searchParams.get("from") === "store-services" || viewerIsOwner ? "/store?tab=services" : "/marketplace/services"}
                  className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-primaryColorBlack"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm transition-all group-hover:shadow-md">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </span>
                  {searchParams.get("from") === "store-services" || viewerIsOwner ? "Back to my services" : "All services"}
                </Link>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Provider Card */}
                  <ProviderCard
                    listing={listing}
                    contact={providerContact ?? null}
                    viewerIsOwner={viewerIsOwner}
                  />

                  {/* Service Header */}
                  <ServiceHeader listing={listing} />

                  {/* Description */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primaryColorBlack/10">
                        <svg className="h-4 w-4 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">About this service</h2>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {listing.description}
                    </p>
                  </div>

                  {/* Gallery */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primaryColorBlack/10">
                        <svg className="h-4 w-4 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12a2.25 2.25 0 002.25 2.25zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">Gallery</h2>
                    </div>
                    <ServiceGalleryBlock listing={listing} />
                  </div>

                  {/* Reviews */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primaryColorBlack/10">
                        <svg className="h-4 w-4 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">Reviews</h2>
                    </div>
                    <GigReviewsPanel listing={listing} />
                  </div>
                </div>

                {/* Right Sidebar - Sticky */}
                <aside className="md:sticky md:top-[5.5rem] md:self-start">
                  <BookingSidebar
                    listing={listing}
                    viewerIsOwner={viewerIsOwner}
                    ownerBookings={ownerBookings}
                    token={token}
                    rangeBounds={rangeBounds}
                    agreedAmount={agreedAmount}
                    setAgreedAmount={setAgreedAmount}
                    pickedLocation={pickedLocation}
                    setPickedLocation={setPickedLocation}
                    directionsNotes={directionsNotes}
                    setDirectionsNotes={setDirectionsNotes}
                    notes={notes}
                    setNotes={setNotes}
                    submitting={submitting}
                    onBook={book}
                  />
                </aside>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}