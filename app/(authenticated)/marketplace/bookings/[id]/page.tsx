// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useParams, useSearchParams } from "next/navigation";
// import { RequireAuth } from "@/src/components/auth/RequireAuth";
// import {
//   ServiceBookingPaymentModal,
//   type PayableBookingRow,
// } from "@/src/components/marketplace/ServiceBookingPaymentModal";
// import { useAuth } from "@/src/lib/auth/auth-context";
// import * as sm from "@/src/lib/api/service-marketplace";
// import { errorMessage } from "@/src/lib/api/errors";
// import { subscribeBookingComments } from "@/src/lib/realtime/booking-comments-socket";

// type Booking = Record<string, unknown> & {
//   id: string;
//   status?: string;
//   amount?: unknown;
//   notes?: string | null;
//   listing?: {
//     id?: string;
//     title?: string;
//     description?: string | null;
//     category?: { name?: string };
//     provider?: {
//       userId?: string;
//       displayName?: string | null;
//       bio?: string | null;
//       ratingAvg?: number;
//       ratingCount?: number;
//     };
//   };
//   workflowFlags?: unknown;
//   participantContact?: {
//     client?: sm.MarketplaceUserContact;
//     provider?: sm.MarketplaceUserContact;
//   };
//   participantTransparency?: {
//     client?: sm.MarketplaceUserContact;
//     provider?: sm.MarketplaceUserContact;
//   };
//   serviceLatitude?: number | null;
//   serviceLongitude?: number | null;
//   serviceAddressText?: string | null;
//   serviceLocationLabel?: string | null;
//   bookingComments?: Array<{
//     createdAt: string;
//     authorUserId: string;
//     authorName: string;
//     authorRole: "client" | "provider" | "participant";
//     message: string;
//   }>;
//   review?: { id: string; rating: number; comment: string | null } | null;
// };

// type BookingAction = Parameters<typeof sm.updateServiceBookingState>[2]["action"];

// type DetailTab = "service" | "provider";

// function mapDirectionsUrl(b: Booking): string | null {
//   const lat = b.serviceLatitude;
//   const lng = b.serviceLongitude;
//   if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
//     return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
//   }
//   const label =
//     (typeof b.serviceLocationLabel === "string" ? b.serviceLocationLabel.trim() : "") ||
//     (typeof b.serviceAddressText === "string" ? b.serviceAddressText.trim() : "");
//   if (label.length >= 4) {
//     return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
//   }
//   return null;
// }

// function bookingParticipantContact(b: Booking): Booking["participantContact"] | undefined {
//   return b.participantContact ?? b.participantTransparency;
// }

// function contactNameLine(u: sm.MarketplaceUserContact): string | null {
//   const name = [u.displayName?.trim(), u.fullName?.trim()].filter(Boolean).join(" · ");
//   return name.length > 0 ? name : null;
// }

// function formatCommentWhen(iso: string): string {
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return iso;
//   return d.toLocaleString();
// }

// function ParticipantContactMini({
//   role,
//   u,
// }: {
//   role: string;
//   u: sm.MarketplaceUserContact;
// }) {
//   const primary = contactNameLine(u);
//   return (
//     <div className="rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-[0_4px_16px_rgba(12,28,140,0.1)]">
//       <p className="text-[10px] font-bold uppercase tracking-wider text-gambian-blue/70">{role}</p>
//       {primary ? <p className="mt-1 font-semibold text-gray-900">{primary}</p> : null}
//       <div className="mt-2 space-y-1.5 text-xs text-gray-700">
//         {u.phone ? (
//           <a className="block font-medium text-gambian-blue hover:underline" href={`tel:${u.phone}`}>
//             {u.phone}
//           </a>
//         ) : null}
//         {u.email ? (
//           <a className="block break-all font-medium text-gambian-blue hover:underline" href={`mailto:${u.email}`}>
//             {u.email}
//           </a>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// function stepSummary(isProvider: boolean, b: Booking): string {
//   const status = String(b.status ?? "");
//   const flags = new Set(
//     Array.isArray(b.workflowFlags)
//       ? b.workflowFlags.filter((x): x is string => typeof x === "string")
//       : [],
//   );
//   if (isProvider) {
//     if (!flags.has("provider_reached")) return "Mark arrived.";
//     if (!flags.has("client_confirmed_reached")) return "Waiting on client.";
//     if (!flags.has("provider_finished")) return "In progress.";
//     if (status === "COMPLETED") return "Awaiting payment.";
//     return status;
//   }
//   if (!flags.has("provider_reached")) return "Upcoming.";
//   if (!flags.has("client_confirmed_reached")) return "Confirm arrival.";
//   if (!flags.has("provider_finished")) return "In progress.";
//   if (!flags.has("client_completed_confirmed")) return "Confirm completion.";
//   if (status === "PENDING_PAYMENT" && !flags.has("funded")) return "Payment due.";
//   if (flags.has("funded")) return "Paid.";
//   return status;
// }

// function actionsFor(
//   isProvider: boolean,
//   status: string,
//   flags: Set<string>,
// ): Array<{ action: BookingAction; label: string; tone?: "primary" | "neutral" }> {
//   if (isProvider) {
//     const canReach =
//       !flags.has("provider_reached") &&
//       !flags.has("provider_finished") &&
//       (status === "PENDING_PAYMENT" || status === "FUNDED" || status === "ACCEPTED");
//     if (canReach) {
//       return [{ action: "PROVIDER_REACHED", label: "I arrived (reached)", tone: "primary" }];
//     }
//     if (
//       status === "IN_PROGRESS" &&
//       flags.has("client_confirmed_reached") &&
//       !flags.has("provider_finished")
//     ) {
//       return [{ action: "PROVIDER_FINISHED", label: "Mark service completed", tone: "primary" }];
//     }
//     return [];
//   }
//   if (status === "IN_PROGRESS" && flags.has("provider_reached") && !flags.has("client_confirmed_reached")) {
//     return [{ action: "CLIENT_CONFIRMED_REACHED", label: "Confirm provider arrived", tone: "neutral" }];
//   }
//   if (status === "COMPLETED" && flags.has("provider_finished") && !flags.has("client_completed_confirmed")) {
//     return [{ action: "CLIENT_CONFIRMED_COMPLETED", label: "Confirm work completed", tone: "primary" }];
//   }
//   if (status === "PENDING_PAYMENT" && flags.has("client_completed_confirmed") && !flags.has("funded")) {
//     return [{ action: "MARK_FUNDED", label: "Confirm Payment Completed", tone: "primary" }];
//   }
//   return [];
// }

// const btnRaised =
//   "inline-flex w-full items-center justify-center rounded-xl border-0 px-4 py-2.5 text-sm font-semibold shadow-[0_4px_14px_rgba(12,28,140,0.15)] transition hover:brightness-105 disabled:opacity-55";

// function BookingCommentForm({
//   bookingId,
//   token,
//   onDone,
// }: {
//   bookingId: string;
//   token: string;
//   onDone: () => void;
// }) {
//   const [msg, setMsg] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [localErr, setLocalErr] = useState<string | null>(null);

//   async function submit() {
//     const note = msg.trim();
//     if (!note) return;
//     setBusy(true);
//     setLocalErr(null);
//     try {
//       await sm.updateServiceBookingState(bookingId, token, { action: "COMMENT", notes: note });
//       setMsg("");
//       onDone();
//     } catch (e) {
//       setLocalErr(errorMessage(e));
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <div className="rounded-xl border border-gambian-blue/10 bg-white px-3 py-3 shadow-[0_4px_16px_rgba(12,28,140,0.06)]">
//       <p className="text-xs font-semibold uppercase tracking-wide text-gambian-blue">Booking comments</p>
//       <textarea
//         value={msg}
//         onChange={(e) => setMsg(e.target.value)}
//         placeholder="Write a comment for this booking"
//         rows={2}
//         className="mt-2 w-full rounded-lg border border-gray-200/80 bg-gray-50/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gambian-blue/35 focus:ring-2 focus:ring-gambian-blue/20"
//       />
//       {localErr ? <p className="mt-2 text-sm text-gambian-red">{localErr}</p> : null}
//       <button
//         type="button"
//         disabled={busy || msg.trim().length === 0}
//         onClick={() => void submit()}
//         className={`${btnRaised} mt-3 bg-gambian-blue text-white`}
//       >
//         {busy ? "Posting..." : "Post comment"}
//       </button>
//     </div>
//   );
// }

// function RateProviderForm({
//   bookingId,
//   token,
//   onDone,
// }: {
//   bookingId: string;
//   token: string;
//   onDone: () => void;
// }) {
//   const [rating, setRating] = useState(5);
//   const [comment, setComment] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [localErr, setLocalErr] = useState<string | null>(null);

//   async function submit() {
//     setBusy(true);
//     setLocalErr(null);
//     try {
//       await sm.submitServiceBookingReview(bookingId, token, {
//         rating,
//         comment: comment.trim() || undefined,
//       });
//       onDone();
//     } catch (e) {
//       setLocalErr(errorMessage(e));
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <div className="rounded-xl border border-gambian-blue/10 bg-white px-3 py-3 shadow-[0_4px_16px_rgba(12,28,140,0.06)]">
//       <p className="text-xs font-semibold uppercase tracking-wide text-gambian-blue">Rate the provider</p>
//       <p className="mt-1 text-xs text-gray-600">Share how the service went. Your rating helps other clients.</p>
//       <div className="mt-2 flex flex-wrap gap-1">
//         {[1, 2, 3, 4, 5].map((n) => (
//           <button
//             key={n}
//             type="button"
//             onClick={() => setRating(n)}
//             className={`rounded-lg border-0 px-2 py-1 text-xl shadow-none ${rating >= n ? "text-gambian-blue" : "text-gray-300"}`}
//             aria-label={`${n} stars`}
//           >
//             ★
//           </button>
//         ))}
//         <span className="ml-2 self-center text-sm font-medium text-gray-800">{rating} / 5</span>
//       </div>
//       <textarea
//         value={comment}
//         onChange={(e) => setComment(e.target.value)}
//         placeholder="Optional feedback"
//         rows={2}
//         className="mt-2 w-full rounded-lg border border-gray-200/80 bg-gray-50/80 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gambian-blue/35 focus:ring-2 focus:ring-gambian-blue/20"
//       />
//       {localErr ? <p className="mt-2 text-sm text-gambian-red">{localErr}</p> : null}
//       <button
//         type="button"
//         disabled={busy}
//         onClick={() => void submit()}
//         className={`${btnRaised} mt-3 bg-gambian-blue text-white`}
//       >
//         {busy ? "Submitting..." : "Submit review"}
//       </button>
//     </div>
//   );
// }

// function Inner() {
//   const { token, user } = useAuth();
//   const params = useParams<{ id: string }>();
//   const bookingId = params?.id ?? "";
//   const [booking, setBooking] = useState<Booking | null>(null);
//   const [isProviderView, setIsProviderView] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);
//   const [payBooking, setPayBooking] = useState<Booking | null>(null);
//   const [detailTab, setDetailTab] = useState<DetailTab>("service");

//   const load = useCallback(async () => {
//     if (!token || !bookingId) return;
//     setLoading(true);
//     setErr(null);
//     try {
//       const me = await sm.listMyServiceBookings(token);
//       const meItems = (me as { bookings?: Booking[] }).bookings ?? [];
//       const mine = meItems.find((b) => b.id === bookingId);
//       if (mine) {
//         setBooking(mine);
//         setIsProviderView(false);
//         return;
//       }
//       const provider = await sm.listProviderServiceBookings(token);
//       const providerItems = (provider as { bookings?: Booking[] }).bookings ?? [];
//       const asProvider = providerItems.find((b) => b.id === bookingId);
//       if (asProvider) {
//         setBooking(asProvider);
//         setIsProviderView(true);
//         return;
//       }
//       setBooking(null);
//       setErr("Booking not found.");
//     } catch (e) {
//       setErr(errorMessage(e));
//     } finally {
//       setLoading(false);
//     }
//   }, [token, bookingId]);

//   useEffect(() => {
//     void load();
//   }, [load]);

//   useEffect(() => {
//     if (!token || !bookingId) return;
//     const socket = subscribeBookingComments({
//       token,
//       bookingId,
//       onComments: (bookingComments) => {
//         setBooking((prev) =>
//           prev && prev.id === bookingId ? { ...prev, bookingComments } : prev,
//         );
//       },
//     });
//     return () => {
//       socket.disconnect();
//     };
//   }, [token, bookingId]);

//   async function act(id: string, action: BookingAction) {
//     if (!token) return;
//     try {
//       await sm.updateServiceBookingState(id, token, { action });
//       await load();
//     } catch (e) {
//       setErr(errorMessage(e));
//     }
//   }

//   const canLeaveReview = useMemo(() => {
//     if (!booking || isProviderView || !token || booking.review) return false;
//     const flags = new Set(
//       Array.isArray(booking.workflowFlags)
//         ? booking.workflowFlags.filter((x): x is string => typeof x === "string")
//         : [],
//     );
//     const status = String(booking.status ?? "");
//     const okStatus = ["COMPLETED", "PENDING_PAYMENT", "FUNDED"].includes(status);
//     return flags.has("provider_finished") && okStatus;
//   }, [booking, isProviderView, token]);

//   if (loading) return <p className="py-10 text-center text-gray-600">Loading booking…</p>;

//   if (err) {
//     return (
//       <div className="max-w-3xl">
//         <p className="mb-4 rounded-xl border-0 bg-gambian-red/10 px-4 py-3 text-sm text-gambian-red shadow-[0_2px_8px_rgba(206,17,38,0.12)]">
//           {err}
//         </p>
//       </div>
//     );
//   }

//   if (!booking) return null;

//   const l = booking.listing;
//   const status = String(booking.status ?? "");
//   const flags = new Set<string>(
//     Array.isArray(booking.workflowFlags)
//       ? booking.workflowFlags.filter((x): x is string => typeof x === "string")
//       : [],
//   );
//   const actions = actionsFor(isProviderView, status, flags);
//   const participants = bookingParticipantContact(booking);
//   const mapUrl = mapDirectionsUrl(booking);

//   const tabCls = (tab: DetailTab) =>
//     `w-full rounded-lg border-0 px-3 py-2.5 text-left text-sm font-semibold transition shadow-[0_2px_8px_rgba(12,28,140,0.06)] md:rounded-xl ${
//       detailTab === tab
//         ? "bg-gambian-blue text-white shadow-[0_4px_14px_rgba(12,28,140,0.28)]"
//         : "bg-white text-gray-800 ring-1 ring-gambian-blue/10 hover:bg-gray-50"
//     }`;

//   return (
//     <div className="mx-auto max-w-6xl px-0 pb-2">
//       <ServiceBookingPaymentModal
//         open={payBooking != null}
//         token={token}
//         booking={payBooking as PayableBookingRow | null}
//         onClose={() => setPayBooking(null)}
//         onPaid={() => void load()}
//       />

//       <div className="mb-3">
//         <Link href="/store?tab=my-bookings" className="text-sm font-medium text-gambian-blue hover:underline">
//           ← {searchParams.get("from") === "provider-bookings" || isProviderView ? "Back to provider bookings" : "Back to my bookings"}
//         </Link>
//       </div>

//       <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,300px)]">
//         <section className="rounded-2xl border-0 bg-white shadow-[0_8px_30px_rgba(12,28,140,0.08)]">
//           <header className="border-b border-gambian-blue/10 px-4 py-4 sm:px-5">
//             <p className="text-xs font-semibold uppercase tracking-wide text-gambian-blue/75">
//               {l?.category?.name ?? "Service"}
//             </p>
//             <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">{l?.title ?? "Service"}</h1>
//             <div className="mt-3 flex flex-wrap">
//               <span className="inline-flex max-w-full rounded-2xl bg-gambian-blue/[0.08] px-3.5 py-2 text-sm font-medium leading-snug text-gray-800 shadow-[0_2px_12px_rgba(12,28,140,0.12)] ring-1 ring-gambian-blue/10">
//                 {stepSummary(isProviderView, booking)}
//               </span>
//             </div>
//           </header>

//           <div className="flex flex-col gap-0 md:flex-row">
//             <nav
//               className="flex shrink-0 gap-2 border-b border-gambian-blue/10 p-3 md:w-44 md:flex-col md:border-b-0 md:border-r md:border-gambian-blue/10 md:p-4"
//               aria-label="Booking details"
//             >
//               <button type="button" className={tabCls("service")} onClick={() => setDetailTab("service")}>
//                 Service details
//               </button>
//               <button type="button" className={tabCls("provider")} onClick={() => setDetailTab("provider")}>
//                 {isProviderView ? "Client details" : "Provider details"}
//               </button>
//             </nav>

//             <div className="min-w-0 flex-1 space-y-4 px-4 py-4 sm:px-5 sm:py-5">
//               {detailTab === "service" ? (
//                 <>
//                   {typeof l?.description === "string" && l.description.trim() ? (
//                     <div>
//                       <p className="text-xs font-semibold uppercase tracking-wide text-gambian-blue/80">
//                         About this service
//                       </p>
//                       <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{l.description.trim()}</p>
//                     </div>
//                   ) : null}

//                   {(typeof booking.serviceLocationLabel === "string" && booking.serviceLocationLabel.trim()) ||
//                   (typeof booking.serviceAddressText === "string" && booking.serviceAddressText.trim()) ? (
//                     <div className="rounded-xl border border-gambian-blue/10 bg-white px-4 py-3 text-sm text-gray-800 shadow-[0_4px_14px_rgba(12,28,140,0.06)]">
//                       <p className="text-xs font-semibold text-gambian-blue">Where</p>
//                       {typeof booking.serviceLocationLabel === "string" && booking.serviceLocationLabel.trim() ? (
//                         <p className="mt-1 font-medium text-gray-900">{booking.serviceLocationLabel.trim()}</p>
//                       ) : null}
//                       {typeof booking.serviceAddressText === "string" && booking.serviceAddressText.trim() ? (
//                         <p className="mt-1 whitespace-pre-wrap text-gray-700">{booking.serviceAddressText.trim()}</p>
//                       ) : null}
//                       {mapUrl ? (
//                         <a
//                           href={mapUrl}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-gambian-blue hover:underline"
//                         >
//                           <i className="fas fa-directions" aria-hidden />
//                           Open in Maps
//                         </a>
//                       ) : null}
//                     </div>
//                   ) : (
//                     <p className="text-sm text-gray-500">No service location recorded for this booking.</p>
//                   )}

//                   {booking.notes ? (
//                     <details className="rounded-xl border border-gray-200/90 bg-white px-3 py-2 text-sm text-gray-700 shadow-[0_2px_10px_rgba(12,28,140,0.05)]">
//                       <summary className="cursor-pointer font-medium text-gambian-blue">Your booking notes</summary>
//                       <p className="mt-2 whitespace-pre-wrap break-words">{String(booking.notes)}</p>
//                     </details>
//                   ) : null}
//                 </>
//               ) : (
//                 <div className="space-y-4">
//                   {!isProviderView && participants?.provider ? (
//                     <>
//                       <ParticipantContactMini role="Provider" u={participants.provider} />
//                       {typeof l?.provider?.bio === "string" && l.provider.bio.trim() ? (
//                         <div className="rounded-xl border border-gambian-blue/10 bg-white px-4 py-3 text-sm shadow-[0_4px_14px_rgba(12,28,140,0.06)]">
//                           <p className="text-xs font-semibold text-gambian-blue">Bio</p>
//                           <p className="mt-1 whitespace-pre-wrap text-gray-700">{l.provider.bio.trim()}</p>
//                         </div>
//                       ) : null}
//                       {l?.provider?.ratingCount != null && Number(l.provider.ratingCount) > 0 ? (
//                         <p className="text-sm text-gray-600">
//                           <span className="font-semibold text-gambian-blue">
//                             {(l.provider?.ratingAvg != null ? Number(l.provider.ratingAvg) : 0).toFixed(1)}
//                           </span>{" "}
//                           average · {Number(l.provider.ratingCount)} review
//                           {Number(l.provider.ratingCount) === 1 ? "" : "s"}
//                         </p>
//                       ) : (
//                         <p className="text-sm text-gray-500">No public reviews yet for this provider.</p>
//                       )}
//                     </>
//                   ) : null}
//                   {isProviderView && participants?.client ? <ParticipantContactMini role="Client" u={participants.client} /> : null}
//                   {!isProviderView && !participants?.provider ? (
//                     <p className="text-sm text-gray-500">Provider contact appears when the booking is active.</p>
//                   ) : null}
//                   {isProviderView && !participants?.client ? (
//                     <p className="text-sm text-gray-500">Client contact appears when the booking is active.</p>
//                   ) : null}
//                 </div>
//               )}
//             </div>
//           </div>

//           <div className="border-t border-gambian-blue/10 bg-gray-50/40 px-4 py-4 sm:px-5">
//             <p className="text-xs font-semibold uppercase tracking-wide text-gambian-blue/80">Comments</p>
//             <p className="mt-0.5 text-xs text-gray-500">Visible to you and the other party on this booking.</p>
//             {token ? (
//               <div className="mt-3">
//                 <BookingCommentForm bookingId={booking.id} token={token} onDone={() => void load()} />
//               </div>
//             ) : null}
//             {(booking.bookingComments?.length ?? 0) > 0 ? (
//               <ul className="mt-4 space-y-3">
//                 {(booking.bookingComments ?? []).map((c, idx) => {
//                   const isSelf = Boolean(user?.id && c.authorUserId === user.id);
//                   const roleLabel =
//                     c.authorRole === "client"
//                       ? "Client"
//                       : c.authorRole === "provider"
//                         ? "Provider"
//                         : "Participant";
//                   return (
//                     <li
//                       key={`${c.authorUserId}-${c.createdAt}-${idx}`}
//                       className="rounded-xl border border-gray-200/90 bg-white px-3 py-2.5 shadow-[0_2px_10px_rgba(12,28,140,0.06)]"
//                     >
//                       <p className="text-xs text-gray-600">
//                         <span className="font-semibold text-gray-900">
//                           {c.authorName || "Someone"}
//                           {isSelf ? <span className="ml-1 font-normal text-gambian-blue">(you)</span> : null}
//                         </span>
//                         <span className="mx-1.5 text-gray-400">·</span>
//                         <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gambian-blue">
//                           {roleLabel}
//                         </span>
//                         <span className="mx-1.5 text-gray-400">·</span>
//                         <span className="text-gray-500">{formatCommentWhen(c.createdAt)}</span>
//                       </p>
//                       <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{c.message}</p>
//                     </li>
//                   );
//                 })}
//               </ul>
//             ) : (
//               <p className="mt-3 text-sm text-gray-500">No comments yet.</p>
//             )}
//           </div>
//         </section>

//         <aside className="space-y-4">
//           <section className="relative overflow-hidden rounded-2xl border border-gambian-blue/10 bg-white shadow-[0_10px_36px_rgba(12,28,140,0.1)]">
//             <div
//               className="h-1 w-full bg-[linear-gradient(90deg,#0c1c8c_0%,#3a7728_50%,#ce1126_100%)]"
//               aria-hidden
//             />
//             <div className="p-5">
//               <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gambian-blue/75">
//                 Booking summary
//               </p>
//               <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
//                 <div>
//                   <p className="text-xs font-medium text-gray-500">Status</p>
//                   <p className="mt-1 inline-flex rounded-full bg-gambian-blue/[0.09] px-3 py-1 text-xs font-bold uppercase tracking-wide text-gambian-blue shadow-[0_2px_8px_rgba(12,28,140,0.12)] ring-1 ring-gambian-blue/15">
//                     {status.replace(/_/g, " ")}
//                   </p>
//                 </div>
//                 <div className="text-right">
//                   <p className="text-xs font-medium text-gray-500">Amount</p>
//                   <p className="font-display mt-0.5 text-2xl font-bold tracking-tight text-gray-900">
//                     <span className="text-lg font-semibold text-gambian-blue">D</span>
//                     {String(booking.amount ?? "")}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </section>

//           {canLeaveReview ? <RateProviderForm bookingId={booking.id} token={token!} onDone={() => void load()} /> : null}

//           {booking.review ? (
//             <div className="rounded-2xl border-0 bg-white px-4 py-3 text-sm shadow-[0_8px_30px_rgba(12,28,140,0.08)]">
//               <p className="text-xs font-semibold uppercase text-gambian-blue/70">Your review</p>
//               <p className="mt-2 text-gambian-blue">
//                 {Array.from({ length: 5 }, (_, i) => (
//                   <span key={i}>{i < booking.review!.rating ? "★" : "☆"}</span>
//                 ))}
//               </p>
//               {booking.review.comment ? (
//                 <p className="mt-2 whitespace-pre-wrap text-gray-700">{booking.review.comment}</p>
//               ) : null}
//             </div>
//           ) : null}

//           <div className="flex flex-col gap-2">
//             {actions.map((a) => (
//               <button
//                 key={a.action}
//                 type="button"
//                 onClick={() => {
//                   if (!isProviderView && a.action === "MARK_FUNDED") {
//                     setPayBooking(booking);
//                     return;
//                   }
//                   void act(booking.id, a.action);
//                 }}
//                 className={`${btnRaised} ${
//                   a.tone === "primary"
//                     ? "bg-gambian-blue text-white shadow-[0_4px_18px_rgba(12,28,140,0.28)]"
//                     : "bg-white text-gray-900 shadow-[0_4px_14px_rgba(12,28,140,0.1)] ring-1 ring-gambian-blue/12 hover:bg-gray-50"
//                 }`}
//               >
//                 {a.label}
//               </button>
//             ))}
//             {actions.length === 0 ? (
//               <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-center text-sm text-gray-500 shadow-inner">
//                 No pending actions.
//               </p>
//             ) : null}
//           </div>
//         </aside>
//       </div>
//     </div>
//   );
// }

// export default function BookingDetailPage() {
//   return (
//     <RequireAuth requireProfileComplete>
//       <Inner />
//     </RequireAuth>
//   );
// }
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import {
  ServiceBookingPaymentModal,
  type PayableBookingRow,
} from "@/src/components/marketplace/ServiceBookingPaymentModal";
import { useAuth } from "@/src/lib/auth/auth-context";
import * as sm from "@/src/lib/api/service-marketplace";
import { errorMessage } from "@/src/lib/api/errors";
import { subscribeBookingComments } from "@/src/lib/realtime/booking-comments-socket";
import { marketplaceLooksLikeOpaqueUserId } from "@/src/lib/marketplace/provider-display";

/* ─── Types ─── */
type Booking = Record<string, unknown> & {
  id: string;
  status?: string;
  amount?: unknown;
  notes?: string | null;
  scheduledAt?: string;
  listing?: {
    id?: string;
    title?: string;
    description?: string | null;
    estimatedDeliveryMins?: number | null;
    category?: { name?: string };
    provider?: {
      userId?: string;
      displayName?: string | null;
      bio?: string | null;
      ratingAvg?: number;
      ratingCount?: number;
    };
  };
  workflowFlags?: unknown;
  participantContact?: {
    client?: sm.MarketplaceUserContact;
    provider?: sm.MarketplaceUserContact;
  };
  participantTransparency?: {
    client?: sm.MarketplaceUserContact;
    provider?: sm.MarketplaceUserContact;
  };
  serviceLatitude?: number | null;
  serviceLongitude?: number | null;
  serviceAddressText?: string | null;
  serviceLocationLabel?: string | null;
  bookingComments?: Array<{
    createdAt: string;
    authorUserId: string;
    authorName: string;
    authorRole: "client" | "provider" | "participant";
    message: string;
  }>;
  review?: { id: string; rating: number; comment: string | null } | null;
};

type BookingAction = Parameters<typeof sm.updateServiceBookingState>[2]["action"];

type DetailTab = "overview" | "service" | "provider";

/* ─── Utilities ─── */
function mapDirectionsUrl(b: Booking): string | null {
  const lat = b.serviceLatitude;
  const lng = b.serviceLongitude;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  const label =
    (typeof b.serviceLocationLabel === "string" ? b.serviceLocationLabel.trim() : "") ||
    (typeof b.serviceAddressText === "string" ? b.serviceAddressText.trim() : "");
  if (label.length >= 4) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  }
  return null;
}

function bookingParticipantContact(b: Booking): Booking["participantContact"] | undefined {
  return b.participantContact ?? b.participantTransparency;
}

function contactNameLine(u: sm.MarketplaceUserContact): string | null {
  const name = [u.displayName?.trim(), u.fullName?.trim()].filter(Boolean).join(" · ");
  return name.length > 0 ? name : null;
}

function bookingListingProviderDisplayName(listing: Booking["listing"]): string | null {
  const p = listing?.provider;
  if (!p) return null;
  const uid = typeof p.userId === "string" ? p.userId : "";
  const dn = p.displayName?.trim();
  if (dn && dn.length > 0 && !marketplaceLooksLikeOpaqueUserId(dn, uid)) return dn;
  return null;
}

function formatBookingScheduledLocal(iso: unknown): string | null {
  if (typeof iso !== "string" || !iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCommentWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Status Config ─── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  ACCEPTED: {
    label: "Accepted",
    color: "text-blue-700",
    bg: "bg-blue-50",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  PENDING_PAYMENT: {
    label: "Payment Due",
    color: "text-rose-700",
    bg: "bg-rose-50",
    icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  },
  FUNDED: {
    label: "Paid",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50",
    icon: "M6 18L18 6M6 6l12 12",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-slate-700",
    bg: "bg-slate-50",
    icon: "M6 18L18 6M6 6l12 12",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${config.bg} ${config.color}`}>
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
      </svg>
      {config.label}
    </span>
  );
}

/* ─── Workflow Stepper ─── */
function WorkflowStepper({ isProvider, booking }: { isProvider: boolean; booking: Booking }) {
  const status = String(booking.status ?? "");
  const flags = new Set(
    Array.isArray(booking.workflowFlags)
      ? booking.workflowFlags.filter((x): x is string => typeof x === "string")
      : [],
  );

  const steps = isProvider
    ? [
        { label: "Accepted", done: status !== "PENDING" && status !== "REJECTED", active: status === "ACCEPTED" },
        { label: "Arrived", done: flags.has("provider_reached"), active: !flags.has("provider_reached") && status !== "PENDING" },
        { label: "In Progress", done: flags.has("client_confirmed_reached"), active: flags.has("provider_reached") && !flags.has("client_confirmed_reached") },
        { label: "Completed", done: flags.has("provider_finished"), active: flags.has("client_confirmed_reached") && !flags.has("provider_finished") },
        { label: "Paid", done: flags.has("funded"), active: status === "PENDING_PAYMENT" || (status === "COMPLETED" && !flags.has("funded")) },
      ]
    : [
        { label: "Booked", done: true, active: false },
        { label: "Provider Arrives", done: flags.has("provider_reached"), active: !flags.has("provider_reached") },
        { label: "Confirm Arrival", done: flags.has("client_confirmed_reached"), active: flags.has("provider_reached") && !flags.has("client_confirmed_reached") },
        { label: "Service Done", done: flags.has("provider_finished"), active: flags.has("client_confirmed_reached") && !flags.has("provider_finished") },
        { label: "Confirm & Pay", done: flags.has("client_completed_confirmed") && flags.has("funded"), active: flags.has("provider_finished") && !flags.has("client_completed_confirmed") },
      ];

  const activeIndex = steps.findIndex((s) => s.active);
  const currentStep = activeIndex >= 0 ? activeIndex : steps.findIndex((s) => !s.done);

  return (
    <div className="relative px-2">
      {/* Connector lines - positioned absolutely within the container */}
      <div className="absolute left-0 right-0 top-4 flex px-8">
        {steps.slice(0, -1).map((_, i) => {
          const isDone = steps[i].done;
          const isPast = i < currentStep;
          return (
            <div key={i} className="flex-1">
              <div className={`mx-4 h-0.5 rounded-full transition-all duration-500 ${isDone || isPast ? "bg-gambian-blue" : "bg-slate-200"}`} />
            </div>
          );
        })}
      </div>

      {/* Steps */}
      <div className="relative flex items-start justify-between">
        {steps.map((step, i) => {
          const isDone = step.done;
          const isActive = step.active;
          return (
            <div key={step.label} className="flex flex-1 flex-col items-center">
              {/* Step circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? "border-gambian-blue bg-gambian-blue text-white"
                    : isActive
                    ? "border-gambian-blue bg-white text-gambian-blue shadow-md shadow-gambian-blue/20"
                    : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>

              {/* Label */}
              <span className={`mt-2 text-center text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${isDone || isActive ? "text-gambian-blue" : "text-slate-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Participant Card ─── */
function ParticipantCard({ role, u, isProviderView }: { role: string; u: sm.MarketplaceUserContact; isProviderView?: boolean }) {
  const primary = contactNameLine(u);
  const initials = primary?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-gambian-blue/15 hover:shadow-[0_8px_24px_-8px_rgba(12,28,140,0.12)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gambian-blue/10 text-sm font-bold text-gambian-blue">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gambian-blue/70">{role}</span>
            {isProviderView && role === "Client" && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Booked you</span>
            )}
          </div>
          {primary ? <p className="mt-1 text-base font-semibold text-slate-900">{primary}</p> : null}
          <div className="mt-3 space-y-2">
            {u.phone ? (
              <a href={`tel:${u.phone}`} className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-gambian-blue">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {u.phone}
              </a>
            ) : null}
            {u.email ? (
              <a href={`mailto:${u.email}`} className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-gambian-blue">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="truncate">{u.email}</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingPartiesStrip({
  booking,
  participants,
  isProviderView,
}: {
  booking: Booking;
  participants?: { client?: sm.MarketplaceUserContact; provider?: sm.MarketplaceUserContact };
  isProviderView: boolean;
}) {
  const clientLine =
    (participants?.client && contactNameLine(participants.client)) ?? "—";
  const providerLine =
    (participants?.provider && contactNameLine(participants.provider)) ??
    bookingListingProviderDisplayName(booking.listing) ??
    "—";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-slate-900">People on this booking</h2>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex gap-3">
          <span className="w-20 shrink-0 font-semibold text-slate-400">Provider</span>
          <span className="font-semibold text-slate-900">
            {providerLine}
            {!isProviderView ? null : <span className="ml-1 font-medium text-gambian-blue">(you)</span>}
          </span>
        </div>
        <div className="flex gap-3">
          <span className="w-20 shrink-0 font-semibold text-slate-400">Client</span>
          <span className="font-semibold text-slate-900">
            {clientLine}
            {isProviderView ? null : <span className="ml-1 font-medium text-gambian-blue">(you)</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step Summary ─── */
function stepSummary(isProvider: boolean, b: Booking): string {
  const status = String(b.status ?? "");
  const flags = new Set(
    Array.isArray(b.workflowFlags)
      ? b.workflowFlags.filter((x): x is string => typeof x === "string")
      : [],
  );
  if (isProvider) {
    if (!flags.has("provider_reached")) return "Mark arrived when you reach the location";
    if (!flags.has("client_confirmed_reached")) return "Waiting for client to confirm your arrival";
    if (!flags.has("provider_finished")) return "Service in progress — complete when done";
    if (status === "COMPLETED") return "Service completed — awaiting client payment";
    return status;
  }
  if (!flags.has("provider_reached")) return "Provider is on their way";
  if (!flags.has("client_confirmed_reached")) return "Confirm provider has arrived";
  if (!flags.has("provider_finished")) return "Service in progress";
  if (!flags.has("client_completed_confirmed")) return "Confirm service completion";
  if (status === "PENDING_PAYMENT" && !flags.has("funded")) return "Payment required to finalize";
  if (flags.has("funded")) return "Booking paid and completed";
  return status;
}

/* ─── Actions ─── */
function actionsFor(
  isProvider: boolean,
  status: string,
  flags: Set<string>,
): Array<{ action: BookingAction; label: string; tone: "primary" | "neutral"; icon?: string }> {
  if (isProvider) {
    const canReach =
      !flags.has("provider_reached") &&
      !flags.has("provider_finished") &&
      (status === "PENDING_PAYMENT" || status === "FUNDED" || status === "ACCEPTED");
    if (canReach) {
      return [{
        action: "PROVIDER_REACHED",
        label: "I have arrived at location",
        tone: "primary",
        icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
      }];
    }
    if (status === "IN_PROGRESS" && flags.has("client_confirmed_reached") && !flags.has("provider_finished")) {
      return [{
        action: "PROVIDER_FINISHED",
        label: "Mark service as completed",
        tone: "primary",
        icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      }];
    }
    return [];
  }
  if (status === "IN_PROGRESS" && flags.has("provider_reached") && !flags.has("client_confirmed_reached")) {
    return [{
      action: "CLIENT_CONFIRMED_REACHED",
      label: "Confirm provider arrived",
      tone: "neutral",
      icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    }];
  }
  if (status === "COMPLETED" && flags.has("provider_finished") && !flags.has("client_completed_confirmed")) {
    return [{
      action: "CLIENT_CONFIRMED_COMPLETED",
      label: "Confirm work is completed",
      tone: "primary",
      icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    }];
  }
  if (status === "PENDING_PAYMENT" && flags.has("client_completed_confirmed") && !flags.has("funded")) {
    return [{
      action: "MARK_FUNDED",
      label: "Confirm Payment Completed",
      tone: "primary",
      icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    }];
  }
  return [];
}

const btnBase = "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50";

/* ─── Comment Form ─── */
function BookingCommentForm({ bookingId, token, onDone }: { bookingId: string; token: string; onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function submit() {
    const note = msg.trim();
    if (!note) return;
    setBusy(true);
    setLocalErr(null);
    try {
      await sm.updateServiceBookingState(bookingId, token, { action: "COMMENT", notes: note });
      setMsg("");
      onDone();
    } catch (e) {
      setLocalErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 mb-1">
        <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.012z" />
        </svg>
        <p className="text-sm font-semibold text-slate-800">Add a comment</p>
      </div>
      <p className="text-xs text-slate-500">Visible to both parties on this booking</p>

      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Write your message..."
        rows={3}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-gambian-blue/30 focus:bg-white focus:ring-2 focus:ring-gambian-blue/10"
      />

      {localErr ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {localErr}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || msg.trim().length === 0}
        onClick={() => void submit()}
        className={`${btnBase} mt-3 bg-gambian-blue text-white shadow-lg shadow-gambian-blue/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gambian-blue/30 active:translate-y-0`}
      >
        {busy ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Posting...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Post comment
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Review Form ─── */
function RateProviderForm({ bookingId, token, onDone }: { bookingId: string; token: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setLocalErr(null);
    try {
      await sm.submitServiceBookingReview(bookingId, token, {
        rating,
        comment: comment.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setLocalErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 mb-1">
        <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <p className="text-sm font-semibold text-slate-800">Rate your experience</p>
      </div>
      <p className="text-xs text-slate-500">Your feedback helps other clients choose great providers</p>

      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`rounded-lg p-1.5 text-2xl transition-all duration-200 hover:scale-110 ${rating >= n ? "text-amber-400" : "text-slate-200"}`}
            aria-label={`${n} stars`}
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-slate-700">{rating} / 5</span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (optional)"
        rows={3}
        className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-gambian-blue/30 focus:bg-white focus:ring-2 focus:ring-gambian-blue/10"
      />

      {localErr ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {localErr}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className={`${btnBase} mt-3 bg-gambian-blue text-white shadow-lg shadow-gambian-blue/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gambian-blue/30 active:translate-y-0`}
      >
        {busy ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Submitting...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Submit review
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Background Decorations ─── */
function BackgroundDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-60 -right-60 h-[500px] w-[500px] rounded-full bg-gambian-blue/[0.02] blur-3xl" />
      <div className="absolute -bottom-60 -left-60 h-[500px] w-[500px] rounded-full bg-gambian-blue/[0.015] blur-3xl" />
    </div>
  );
}

/* ─── Inner Component ─── */
function Inner() {
  const { token, user } = useAuth();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const bookingId = params?.id ?? "";
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isProviderView, setIsProviderView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payBooking, setPayBooking] = useState<Booking | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const load = useCallback(async () => {
    if (!token || !bookingId) return;
    setLoading(true);
    setErr(null);
    try {
      const me = await sm.listMyServiceBookings(token);
      const meItems = (me as { bookings?: Booking[] }).bookings ?? [];
      const mine = meItems.find((b) => b.id === bookingId);
      if (mine) {
        setBooking(mine);
        setIsProviderView(false);
        return;
      }
      const provider = await sm.listProviderServiceBookings(token);
      const providerItems = (provider as { bookings?: Booking[] }).bookings ?? [];
      const asProvider = providerItems.find((b) => b.id === bookingId);
      if (asProvider) {
        setBooking(asProvider);
        setIsProviderView(true);
        return;
      }
      setBooking(null);
      setErr("Booking not found.");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !bookingId) return;
    const socket = subscribeBookingComments({
      token,
      bookingId,
      onComments: (bookingComments) => {
        setBooking((prev) =>
          prev && prev.id === bookingId ? { ...prev, bookingComments } : prev,
        );
      },
    });
    return () => {
      socket.disconnect();
    };
  }, [token, bookingId]);

  async function act(id: string, action: BookingAction) {
    if (!token) return;
    try {
      await sm.updateServiceBookingState(id, token, { action });
      await load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  const canLeaveReview = useMemo(() => {
    if (!booking || isProviderView || !token || booking.review) return false;
    const flags = new Set(
      Array.isArray(booking.workflowFlags)
        ? booking.workflowFlags.filter((x): x is string => typeof x === "string")
        : [],
    );
    const status = String(booking.status ?? "");
    const okStatus = ["COMPLETED", "PENDING_PAYMENT", "FUNDED"].includes(status);
    return flags.has("provider_finished") && okStatus;
  }, [booking, isProviderView, token]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-gambian-blue border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading booking details...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-red-100 bg-red-50/80 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-800">Error loading booking</p>
              <p className="text-sm text-red-600">{err}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const l = booking.listing;
  const status = String(booking.status ?? "");
  const flags = new Set<string>(
    Array.isArray(booking.workflowFlags)
      ? booking.workflowFlags.filter((x): x is string => typeof x === "string")
      : [],
  );
  const actions = actionsFor(isProviderView, status, flags);
  const participants = bookingParticipantContact(booking);
  const mapUrl = mapDirectionsUrl(booking);

  const tabItems: { id: DetailTab; label: string; icon: string }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
    },
    {
      id: "service",
      label: "Service",
      icon: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.946-4.318l4.718-1.359A3.004 3.004 0 0019.5 3H4.5a3.004 3.004 0 00-2.907 2.629l4.718 1.359a4.5 4.5 0 004.946 4.318c.58-.048 1.193-.024 1.743.14M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.946-4.318l4.718-1.359A3.004 3.004 0 0019.5 3H4.5a3.004 3.004 0 00-2.907 2.629l4.718 1.359a4.5 4.5 0 004.946 4.318c.58-.048 1.193-.024 1.743.14",
    },
    {
      id: "provider",
      label: isProviderView ? "Client" : "Provider",
      icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
    },
  ];

  return (
    <div className="relative mx-auto max-w-6xl">
      <BackgroundDecor />

      <ServiceBookingPaymentModal
        open={payBooking != null}
        token={token}
        booking={payBooking as PayableBookingRow | null}
        onClose={() => setPayBooking(null)}
        onPaid={() => void load()}
      />

      {/* TOP AREA: Only Back Button */}
      <div className="mb-6">
        <Link
          href={`/store?tab=${searchParams.get("from") === "provider-bookings" || isProviderView ? "provider-bookings" : "my-bookings"}`}
          className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-gambian-blue"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm transition-all group-hover:shadow-md group-hover:text-gambian-blue">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </span>
          {searchParams.get("from") === "provider-bookings" || isProviderView ? "Back to provider bookings" : "Back to my bookings"}
        </Link>
      </div>

      {/* STEP 2: Workflow Stepper - directly under back button */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
        <WorkflowStepper isProvider={isProviderView} booking={booking} />
      </div>

      {/* PRICE CARD: Under stepper */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Amount</p>
            <p className="font-display text-2xl font-bold text-slate-900">
              <span className="text-lg font-semibold text-gambian-blue">D</span>
              {String(booking.amount ?? "0")}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
            <div className="flex gap-1">
              {tabItems.map((tab) => {
                const active = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      active
                        ? "bg-gambian-blue text-white shadow-md shadow-gambian-blue/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    <svg className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                    </svg>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {detailTab === "overview" && (
              <div className="space-y-6">
                {/* TITLE CARD - now in Overview tab */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                  <span className="text-xs font-bold uppercase tracking-widest text-gambian-blue/70">
                    {l?.category?.name ?? "Service"}
                  </span>
                  <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
                    {l?.title ?? "Service Booking"}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    {stepSummary(isProviderView, booking)}
                  </p>
                </div>

                <BookingPartiesStrip booking={booking} participants={participants} isProviderView={isProviderView} />

                {/* Service Info Card — client-facing copy; providers use the Service tab for full listing text */}
                {!isProviderView ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gambian-blue/10">
                        <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">About this service</h2>
                    </div>
                    {typeof l?.description === "string" && l.description.trim() ? (
                      <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{l.description.trim()}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No description available</p>
                    )}
                  </div>
                ) : null}

                {/* Location Card */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gambian-blue/10">
                      <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">Location</h2>
                  </div>

                  {(typeof booking.serviceLocationLabel === "string" && booking.serviceLocationLabel.trim()) ||
                  (typeof booking.serviceAddressText === "string" && booking.serviceAddressText.trim()) ? (
                    <div className="space-y-3">
                      {typeof booking.serviceLocationLabel === "string" && booking.serviceLocationLabel.trim() ? (
                        <p className="text-sm font-medium text-slate-800">{booking.serviceLocationLabel.trim()}</p>
                      ) : null}
                      {typeof booking.serviceAddressText === "string" && booking.serviceAddressText.trim() ? (
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{booking.serviceAddressText.trim()}</p>
                      ) : null}
                      {mapUrl ? (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-gambian-blue/5 px-4 py-2 text-sm font-semibold text-gambian-blue transition-all hover:bg-gambian-blue/10"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75V15m6-6v8.25m.503 3.498l-7.5-7.5-7.5 7.5V21.75a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25V15m-6-6v8.25m.503 3.498l-7.5-7.5-7.5 7.5V21.75a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25V15m-6-6v8.25m.503 3.498l-7.5-7.5-7.5 7.5V21.75a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25V15m-6-6v8.25" />
                          </svg>
                          Open in Maps
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                          </svg>
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No location information available</p>
                  )}
                </div>

                {/* Notes */}
                {booking.notes ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      <h2 className="text-base font-semibold text-amber-800">
                        {isProviderView ? "Client notes" : "Your notes"}
                      </h2>
                    </div>
                    <p className="text-sm text-amber-700 whitespace-pre-wrap break-words">{String(booking.notes)}</p>
                  </div>
                ) : null}
              </div>
            )}

            {detailTab === "service" && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                {isProviderView ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gambian-blue/10">
                        <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.946-4.318l4.718-1.359A3.004 3.004 0 0019.5 3H4.5a3.004 3.004 0 00-2.907 2.629l4.718 1.359a4.5 4.5 0 004.946 4.318c.58-.048 1.193-.024 1.743.14M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.946-4.318l4.718-1.359A3.004 3.004 0 0019.5 3H4.5a3.004 3.004 0 00-2.907 2.629l4.718 1.359a4.5 4.5 0 004.946 4.318c.58-.048 1.193-.024 1.743.14" />
                        </svg>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">Service scope (for you)</h2>
                    </div>
                    {typeof l?.description === "string" && l.description.trim() ? (
                      <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{l.description.trim()}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No service details available</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gambian-blue/10">
                        <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 8.25a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98M2.25 8.25v10.5a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V8.25m-19.5 0V18a2.25 2.25 0 002.25 2.25H19.5A2.25 2.25 0 0021.75 18V8.25" />
                        </svg>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">Your booking summary</h2>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{l?.title ?? "This booking"}</p>
                    {l?.category?.name ? (
                      <p className="mt-2 text-sm text-slate-600">Category: {l.category.name}</p>
                    ) : null}
                    {formatBookingScheduledLocal(booking.scheduledAt) ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Scheduled: {formatBookingScheduledLocal(booking.scheduledAt)}
                      </p>
                    ) : null}
                    {l?.estimatedDeliveryMins != null && Number(l.estimatedDeliveryMins) > 0 ? (
                      <p className="mt-1 text-sm text-slate-600">{Math.round(Number(l.estimatedDeliveryMins))} min estimated</p>
                    ) : null}
                    <p className="mt-4 text-sm leading-relaxed text-slate-600">
                      The full public description is in the Overview tab. Use Comments if you need to coordinate details with your
                      provider.
                    </p>
                  </>
                )}
              </div>
            )}

            {detailTab === "provider" && (
              <div className="space-y-6">
                {!participants?.client && !participants?.provider ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <p className="text-sm text-slate-500">Contacts for this booking are unavailable.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {participants?.client ? (
                      <ParticipantCard role="Client" u={participants.client} isProviderView={isProviderView} />
                    ) : null}
                    {participants?.provider ? <ParticipantCard role="Provider" u={participants.provider} /> : null}
                    {!isProviderView && participants?.provider ? (
                      <>
                        {typeof l?.provider?.bio === "string" && l.provider.bio.trim() ? (
                          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                            <h3 className="text-sm font-semibold text-slate-800 mb-2">About</h3>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{l.provider.bio.trim()}</p>
                          </div>
                        ) : null}
                        {l?.provider?.ratingCount != null && Number(l.provider.ratingCount) > 0 ? (
                          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gambian-blue/10">
                                <span className="font-display text-xl font-bold text-gambian-blue">
                                  {(l.provider?.ratingAvg != null ? Number(l.provider.ratingAvg) : 0).toFixed(1)}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <svg key={i} className={`h-4 w-4 ${i < Math.round(Number(l.provider?.ratingAvg ?? 0)) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                    </svg>
                                  ))}
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                  Based on {Number(l.provider.ratingCount)} review{Number(l.provider.ratingCount) === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                            <p className="text-sm text-slate-400">No public reviews yet for this provider</p>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.012z" />
              </svg>
              <h2 className="text-base font-semibold text-slate-900">Comments</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Visible to both parties on this booking</p>

            {token ? (
              <div className="mb-6">
                <BookingCommentForm bookingId={booking.id} token={token} onDone={() => void load()} />
              </div>
            ) : null}

            {(booking.bookingComments?.length ?? 0) > 0 ? (
              <ul className="space-y-3">
                {(booking.bookingComments ?? []).map((c, idx) => {
                  const isSelf = Boolean(user?.id && c.authorUserId === user.id);
                  const roleLabel =
                    c.authorRole === "client" ? "Client" : c.authorRole === "provider" ? "Provider" : "Participant";
                  return (
                    <li
                      key={`${c.authorUserId}-${c.createdAt}-${idx}`}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-gambian-blue/15 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isSelf ? "bg-gambian-blue text-white" : "bg-slate-200 text-slate-600"}`}>
                          {(c.authorName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {c.authorName || "Someone"}
                              {isSelf ? <span className="ml-1 text-xs font-normal text-gambian-blue">(you)</span> : null}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gambian-blue ring-1 ring-gambian-blue/10">
                              {roleLabel}
                            </span>
                            <span className="text-xs text-slate-400">{formatCommentWhen(c.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{c.message}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center">
                <p className="text-sm text-slate-400">No comments yet. Start the conversation!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-5">
          {/* Actions Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-800">Actions</h2>
            </div>

            <div className="flex flex-col gap-2">
              {actions.map((a) => (
                <button
                  key={a.action}
                  type="button"
                  onClick={() => {
                    if (!isProviderView && a.action === "MARK_FUNDED") {
                      setPayBooking(booking);
                      return;
                    }
                    void act(booking.id, a.action);
                  }}
                  className={`${btnBase} ${
                    a.tone === "primary"
                      ? "bg-gambian-blue text-white shadow-lg shadow-gambian-blue/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gambian-blue/30 active:translate-y-0"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
                  }`}
                >
                  {a.icon && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                    </svg>
                  )}
                  {a.label}
                </button>
              ))}
              {actions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                  <p className="text-sm text-slate-400">No pending actions at this time</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Review Form */}
          {canLeaveReview ? <RateProviderForm bookingId={booking.id} token={token!} onDone={() => void load()} /> : null}

          {/* Existing Review */}
          {booking.review ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <h2 className="text-sm font-semibold text-amber-800">Your Review</h2>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={`h-5 w-5 ${i < booking.review!.rating ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                ))}
                <span className="ml-2 text-sm font-semibold text-slate-700">{booking.review.rating} / 5</span>
              </div>
              {booking.review.comment ? (
                <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{booking.review.comment}</p>
              ) : null}
            </div>
          ) : null}

          {/* Booking Info - NOW INCLUDES category, summary, perspective */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <svg className="h-4 w-4 text-gambian-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-800">Booking Info</h2>
            </div>
            <div className="space-y-4">
              {/* Category */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Category</span>
                <span className="text-xs font-semibold text-gambian-blue bg-gambian-blue/5 px-2 py-1 rounded-full">
                  {l?.category?.name ?? "Service"}
                </span>
              </div>
              {/* Status */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Status</span>
                <StatusBadge status={status} />
              </div>
              {/* Amount */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Amount</span>
                <span className="text-sm font-semibold text-slate-900">D{String(booking.amount ?? "0")}</span>
              </div>
              {/* Perspective */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Perspective</span>
                <span className="text-xs font-semibold text-slate-700">{isProviderView ? "Provider" : "Client"}</span>
              </div>
              {/* Booking ID */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Booking ID</span>
                <span className="text-xs font-mono text-slate-700">{booking.id.slice(0, 8)}...</span>
              </div>
              {/* Current Step Summary */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Current Step</span>
                <p className="text-sm font-medium text-slate-700">{stepSummary(isProviderView, booking)}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <RequireAuth requireProfileComplete>
      <Inner />
    </RequireAuth>
  );
}