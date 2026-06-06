// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { RequireAuth } from "@/src/components/auth/RequireAuth";
// import { useAuth } from "@/src/lib/auth/auth-context";
// import {
//   applicationForRole,
//   approvedProfessionalRole,
//   canApplyProfessionalKyc,
// } from "@/src/lib/auth/profile";
// import {
//   fetchProfessionalFees,
//   putProfessionalFee,
//   type ProfessionalFeeItem,
// } from "@/src/lib/api/professional-fees";
// import { CURRENCY_PREFIX } from "@/src/config/constants";
// import { cardPanel } from "@/src/components/ui/form-classes";

// export default function ProfilePage() {
//   return (
//     <RequireAuth requireProfileComplete={false}>
//       <ProfileInner />
//     </RequireAuth>
//   );
// }

// function ProfilePricingSection({ token }: { token: string }) {
//   const [items, setItems] = useState<ProfessionalFeeItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [editAmount, setEditAmount] = useState("");
//   const [savingId, setSavingId] = useState<string | null>(null);
//   const [showAddModal, setShowAddModal] = useState(false);

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const r = await fetchProfessionalFees(token);
//         if (cancelled) return;
//         setItems(r.items);
//       } catch {
//         if (!cancelled) setItems([]);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, [token]);

//   async function savePricing() {
//     if (!editingId || !editAmount.trim()) return;
//     if (!/^\d+(\.\d{1,2})?$/.test(editAmount.trim())) return;
//     setSavingId(editingId);
//     try {
//       const res = await putProfessionalFee(token, editingId, editAmount.trim());
//       setItems((prev) =>
//         prev.map((item) =>
//           item.productTypeId === editingId
//             ? { ...item, feeAmount: res.feeAmount }
//             : item
//         )
//       );
//       setEditingId(null);
//       setEditAmount("");
//     } finally {
//       setSavingId(null);
//     }
//   }

//   function startEdit(item: ProfessionalFeeItem) {
//     setEditingId(item.productTypeId);
//     setEditAmount(item.feeAmount ?? "");
//   }

//   if (loading) {
//     return (
//       <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
//         <div className="space-y-3">
//           <div className="h-6 rounded bg-gray-100 animate-pulse" />
//           <div className="h-6 rounded bg-gray-100 animate-pulse" />
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mt-12">
//       <div className="mb-8 flex items-center justify-between">
//         <div>
//           <h2 className="font-display text-3xl font-bold text-gray-900">
//             personal Pricing
//           </h2>
//           <p className="mt-2 text-base text-gray-600">
//             Set your service rates for each category
//           </p>
//         </div>
//         <button
//           type="button"
//           onClick={() => setShowAddModal(true)}
//           className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primaryColorBlack to-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-105 active:scale-95"
//         >
//           <svg
//             className="h-5 w-5"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M12 4v16m8-8H4"
//             />
//           </svg>
//           Add Rate
//         </button>
//       </div>

//       <div className="grid gap-4 sm:grid-cols-2">
//         {items.length === 0 ? (
//           <div className="col-span-full">
//             <div className="rounded-2xl border-2 border-dashed border-primaryColorBlack/20 bg-gradient-to-br from-primaryColorBlack/5 to-blue-50/50 px-8 py-16 text-center">
//               <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primaryColorBlack/10">
//                 <svg className="h-8 w-8 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//               <h3 className="font-display text-lg font-bold text-gray-900">No pricing set yet</h3>
//               <p className="mt-2 text-sm text-gray-600">
//                 Set your first professional rate to get started
//               </p>
//             </div>
//           </div>
//         ) : (
//           items.map((item) => (
//             <div
//               key={item.productTypeId}
//               className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-primaryColorBlack/30"
//             >
//               <div className="absolute inset-0 bg-gradient-to-br from-primaryColorBlack/0 to-primaryColorBlack/5 transition-all group-hover:from-primaryColorBlack/5 group-hover:to-primaryColorBlack/10"></div>
              
//               <div className="relative flex items-start justify-between gap-4">
//                 <div className="flex-1">
//                   <div className="inline-flex items-center gap-2 rounded-full bg-primaryColorBlack/10 px-3 py-1 mb-3">
//                     <span className="text-xs font-bold text-primaryColorBlack uppercase tracking-wider">{item.code}</span>
//                   </div>
//                   <h3 className="font-display text-lg font-bold text-gray-900">{item.name}</h3>
//                   <p className="mt-3 text-3xl font-bold text-primaryColorBlack">
//                     {CURRENCY_PREFIX}
//                     {item.feeAmount ?? "—"}
//                   </p>
//                   <p className="mt-2 text-xs text-gray-600">Per engagement</p>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => startEdit(item)}
//                   className="flex-shrink-0 rounded-xl bg-gray-100 p-2.5 text-gray-700 shadow-sm transition-all hover:bg-primaryColorBlack/20 hover:text-primaryColorBlack active:scale-90"
//                   title="Edit pricing"
//                 >
//                   <svg
//                     className="h-5 w-5"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
//                     />
//                   </svg>
//                 </button>
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       {editingId && (
//         <PricingModal
//           isOpen={true}
//           title={`Edit ${items.find((i) => i.productTypeId === editingId)?.name}`}
//           value={editAmount}
//           onChange={setEditAmount}
//           onSubmit={savePricing}
//           onClose={() => {
//             setEditingId(null);
//             setEditAmount("");
//           }}
//           isLoading={savingId === editingId}
//         />
//       )}

//       {showAddModal && (
//         <PricingModal
//           isOpen={true}
//           title="Add Pricing"
//           value=""
//           onChange={() => {}}
//           onSubmit={() => setShowAddModal(false)}
//           onClose={() => setShowAddModal(false)}
//           isLoading={false}
//           disabled={true}
//           message="Contact support to add new pricing tiers"
//         />
//       )}
//     </div>
//   );
// }

// function PricingModal({
//   isOpen,
//   title,
//   value,
//   onChange,
//   onSubmit,
//   onClose,
//   isLoading,
//   disabled = false,
//   message,
// }: {
//   isOpen: boolean;
//   title: string;
//   value: string;
//   onChange: (value: string) => void;
//   onSubmit: () => void;
//   onClose: () => void;
//   isLoading: boolean;
//   disabled?: boolean;
//   message?: string;
// }) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
//       <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in">
//         <div className="border-b border-gray-100 px-6 py-4">
//           <h2 className="font-display text-xl font-bold text-gray-900">{title}</h2>
//         </div>

//         <div className="px-6 py-4">
//           {message ? (
//             <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
//               <p className="text-sm text-amber-900">{message}</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-semibold text-gray-900 mb-2">
//                   Amount ({CURRENCY_PREFIX})
//                 </label>
//                 <input
//                   type="text"
//                   inputMode="decimal"
//                   className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base placeholder-gray-400 transition focus:border-primaryColorBlack focus:shadow-lg focus:outline-none"
//                   value={value}
//                   onChange={(e) => onChange(e.target.value)}
//                   placeholder="0.00"
//                   disabled={disabled || isLoading}
//                 />
//               </div>
//               <p className="text-xs text-gray-600">
//                 Set the rate you charge for this service engagement
//               </p>
//             </div>
//           )}
//         </div>

//         <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex gap-3">
//           <button
//             type="button"
//             onClick={onClose}
//             className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95"
//           >
//             Cancel
//           </button>
//           {!message && (
//             <button
//               type="button"
//               onClick={onSubmit}
//               disabled={disabled || isLoading || !value.trim()}
//               className="flex-1 rounded-lg bg-gradient-to-r from-primaryColorBlack to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
//             >
//               {isLoading ? (
//                 <span className="inline-flex items-center gap-2">
//                   <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                   </svg>
//                   Saving...
//                 </span>
//               ) : (
//                 "Save Rate"
//               )}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function ProfileInner() {
//   const { user, token } = useAuth();
//   const [openRolePicker, setOpenRolePicker] = useState(false);
//   if (!user) return null;
//   const proRole = approvedProfessionalRole(user);
//   const canLawyer = canApplyProfessionalKyc(user, "LAWYER");
//   const canAgent = canApplyProfessionalKyc(user, "AGENT");
//   const canApplyAny = canLawyer || canAgent;
//   const lawyerApp = applicationForRole(user, "LAWYER");
//   const agentApp = applicationForRole(user, "AGENT");
//   const approvedApp =
//     (lawyerApp?.status === "APPROVED" ? lawyerApp : null) ??
//     (agentApp?.status === "APPROVED" ? agentApp : null);
//   const professionalLabel = approvedApp
//     ? approvedApp.role === "LAWYER"
//       ? "Lawyer"
//       : "Agent"
//     : "personal account";
//   const displayName =
//     user.displayName?.trim() || user.fullName?.trim() || user.phone || user.email || "Your account";
//   const initials = displayName
//     .split(/\s+/)
//     .filter(Boolean)
//     .slice(0, 2)
//     .map((part) => part[0]?.toUpperCase() ?? "")
//     .join("");
//   const showFullNameLine =
//     Boolean(user.fullName?.trim()) && user.displayName?.trim() !== user.fullName?.trim();

//   return (
//     <>
//       {/* Profile Header */}
//       <div className="mb-8 rounded-2xl bg-gradient-to-br from-primaryColorBlack via-primaryColorBlack/90 to-blue-800 p-8 text-white shadow-lg">
//         <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
//           {/* Avatar */}
//           <div className="flex shrink-0 justify-center sm:justify-start">
//             <div className="flex h-[140px] w-[140px] items-center justify-center rounded-full border-4 border-white/30 bg-white/10 backdrop-blur text-4xl font-bold tracking-wide shadow-lg sm:h-[160px] sm:w-[160px] sm:text-5xl">
//               {initials || "U"}
//             </div>
//           </div>

//           {/* Info */}
//           <div className="min-w-0 flex-1 text-center sm:text-left">
//             <h1 className="font-display text-3xl font-bold sm:text-4xl">
//               {displayName}
//             </h1>
//             {showFullNameLine && (
//               <p className="mt-2 text-lg text-white/80">{user.fullName!.trim()}</p>
//             )}

//             <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
//               <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
//                 {user.emailVerifiedAt && (
//                   <svg className="h-4 w-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                 )}
//                 {professionalLabel}
//               </span>
//               {user.emailVerifiedAt && (
//                 <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 backdrop-blur">
//                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                   </svg>
//                   Email Verified
//                 </span>
//               )}
//             </div>

//             {canApplyAny && (
//               <button
//                 type="button"
//                 onClick={() => setOpenRolePicker(true)}
//                 className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 font-semibold text-primaryColorBlack shadow-lg transition hover:shadow-xl hover:scale-105 active:scale-95"
//               >
//                 <svg
//                   className="h-5 w-5"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M12 4v16m8-8H4"
//                   />
//                 </svg>
//                 Apply for personal
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Contact Info */}
//       <div className="grid gap-4 sm:grid-cols-2 mb-8">
//         <div className="rounded-xl border border-gray-200 bg-white p-6">
//           <div className="flex items-start gap-3">
//             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
//               <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
//                 />
//               </svg>
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
//               <p className="mt-1 break-all text-sm font-medium text-gray-900">{user.email ?? "—"}</p>
//             </div>
//           </div>
//         </div>

//         <div className="rounded-xl border border-gray-200 bg-white p-6">
//           <div className="flex items-start gap-3">
//             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
//               <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
//                 />
//               </svg>
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
//               <p className="mt-1 font-mono text-sm font-medium text-gray-900">{user.phone ?? "—"}</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {token && proRole ? <ProfilePricingSection token={token} /> : null}

//       {openRolePicker && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
//           <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
//             <h2 className="font-display text-xl font-bold text-gray-900">
//               Apply for personal Role
//             </h2>
//             <p className="mt-2 text-sm text-gray-600">
//               Select which professional role you'd like to apply for
//             </p>

//             <div className="mt-6 space-y-3">
//               {canLawyer && (
//                 <Link
//                   href="/kyc/apply?role=LAWYER"
//                   className="block rounded-xl border-2 border-gray-200 bg-white p-4 text-center transition hover:border-primaryColorBlack hover:bg-primaryColorBlack/5"
//                 >
//                   <p className="font-semibold text-gray-900">Lawyer</p>
//                   <p className="mt-1 text-xs text-gray-500">
//                     Provide legal services
//                   </p>
//                 </Link>
//               )}
//               {canAgent && (
//                 <Link
//                   href="/kyc/apply?role=AGENT"
//                   className="block rounded-xl border-2 border-gray-200 bg-white p-4 text-center transition hover:border-primaryColorBlack hover:bg-primaryColorBlack/5"
//                 >
//                   <p className="font-semibold text-gray-900">Agent</p>
//                   <p className="mt-1 text-xs text-gray-500">
//                     Provide escrow facilitation
//                   </p>
//                 </Link>
//               )}
//             </div>

//             <button
//               type="button"
//               onClick={() => setOpenRolePicker(false)}
//               className="mt-6 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import {
  applicationForRole,
  approvedProfessionalRole,
  canApplyProfessionalKyc,
} from "@/src/lib/auth/profile";
import {
  fetchProfessionalFees,
  putProfessionalFee,
  type ProfessionalFeeItem,
} from "@/src/lib/api/professional-fees";
import { CURRENCY_PREFIX } from "@/src/config/constants";

export default function ProfilePage() {
  return (
    <RequireAuth requireProfileComplete={false}>
      <ProfileInner />
    </RequireAuth>
  );
}

/* ───────────────────────────────
   personal Pricing Section
   ─────────────────────────────── */
function ProfilePricingSection({ token }: { token: string }) {
  const [items, setItems] = useState<ProfessionalFeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchProfessionalFees(token);
        if (cancelled) return;
        setItems(r.items);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function savePricing() {
    if (!editingId || !editAmount.trim()) return;
    if (!/^\d+(\.\d{1,2})?$/.test(editAmount.trim())) return;
    setSavingId(editingId);
    try {
      const res = await putProfessionalFee(token, editingId, editAmount.trim());
      setItems((prev) =>
        prev.map((item) =>
          item.productTypeId === editingId
            ? { ...item, feeAmount: res.feeAmount }
            : item
        )
      );
      setEditingId(null);
      setEditAmount("");
    } finally {
      setSavingId(null);
    }
  }

  function startEdit(item: ProfessionalFeeItem) {
    setEditingId(item.productTypeId);
    setEditAmount(item.feeAmount ?? "");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Service Rates</h3>
          <p className="text-xs text-gray-500">Set pricing for each service category</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primaryColorBlack px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primaryColorBlack/90"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Rate
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">No rates configured</p>
          <p className="mt-1 text-xs text-gray-500">Set your first service rate to start earning</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.productTypeId}
              className="group relative rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-primaryColorBlack/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="rounded-md bg-primaryColorBlack/10 px-2 py-0.5 text-[10px] font-bold text-primaryColorBlack uppercase tracking-wide">
                    {item.code}
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                  <p className="mt-1.5 text-xl font-bold text-primaryColorBlack">
                    {CURRENCY_PREFIX}{item.feeAmount ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">per engagement</p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  title="Edit rate"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <PricingModal
          isOpen={true}
          title={`Edit ${items.find((i) => i.productTypeId === editingId)?.name}`}
          value={editAmount}
          onChange={setEditAmount}
          onSubmit={savePricing}
          onClose={() => {
            setEditingId(null);
            setEditAmount("");
          }}
          isLoading={savingId === editingId}
        />
      )}

      {showAddModal && (
        <PricingModal
          isOpen={true}
          title="Add Pricing"
          value=""
          onChange={() => {}}
          onSubmit={() => setShowAddModal(false)}
          onClose={() => setShowAddModal(false)}
          isLoading={false}
          disabled={true}
          message="Contact support to add new pricing tiers"
        />
      )}
    </div>
  );
}

/* ───────────────────────────────
   Pricing Modal
   ─────────────────────────────── */
function PricingModal({
  isOpen,
  title,
  value,
  onChange,
  onSubmit,
  onClose,
  isLoading,
  disabled = false,
  message,
}: {
  isOpen: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isLoading: boolean;
  disabled?: boolean;
  message?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-gray-900">{title}</h2>
        </div>

        <div className="px-6 py-4">
          {message ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-800">{message}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Amount ({CURRENCY_PREFIX})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base placeholder-gray-400 transition focus:border-primaryColorBlack focus:outline-none"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="0.00"
                  disabled={disabled || isLoading}
                />
              </div>
              <p className="text-xs text-gray-500">
                Set the rate you charge for this service engagement
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          {!message && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || isLoading || !value.trim()}
              className="flex-1 rounded-lg bg-primaryColorBlack px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primaryColorBlack/90 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Rate"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────
   Profile Inner
   ─────────────────────────────── */
function ProfileInner() {
  const { user, token } = useAuth();
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "pricing">("profile");

  if (!user) return null;

  const proRole = approvedProfessionalRole(user);
  const canLawyer = canApplyProfessionalKyc(user, "LAWYER");
  const canAgent = canApplyProfessionalKyc(user, "AGENT");
  const canApplyAny = canLawyer || canAgent;
  const lawyerApp = applicationForRole(user, "LAWYER");
  const agentApp = applicationForRole(user, "AGENT");
  const approvedApp =
    (lawyerApp?.status === "APPROVED" ? lawyerApp : null) ??
    (agentApp?.status === "APPROVED" ? agentApp : null);

  const professionalLabel = approvedApp
    ? approvedApp.role === "LAWYER"
      ? "Lawyer"
      : "Agent"
    : "personal account";

  const displayName =
    user.displayName?.trim() || user.fullName?.trim() || user.phone || user.email || "Your account";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const showFullNameLine =
    Boolean(user.fullName?.trim()) && user.displayName?.trim() !== user.fullName?.trim();

  return (
    <div className="h-full w-full">
      {/* ── Profile Header Card ── */}
      <div className="relative overflow-hidden bg-primaryColorBlack">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-3 border-white/25 bg-white/15 text-xl font-bold text-white backdrop-blur sm:h-24 sm:w-24 sm:text-2xl">
                {initials || "U"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primaryColorBlack bg-green-500">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Name & Role */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {displayName}
              </h1>
              {showFullNameLine && (
                <p className="mt-0.5 text-sm text-white/70">{user.fullName!.trim()}</p>
              )}
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  {professionalLabel}
                </span>
                {user.emailVerifiedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Apply Button */}
            {canApplyAny && (
              <button
                type="button"
                onClick={() => setOpenRolePicker(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-primaryColorBlack shadow-lg transition hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Apply Pro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="border-b border-gray-200 bg-white px-5 sm:px-8">
        <nav className="-mb-px flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`border-b-2 pb-3 pt-4 text-sm font-semibold transition ${
              activeTab === "profile"
                ? "border-primaryColorBlack text-primaryColorBlack"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Profile Info
          </button>
          {proRole && (
            <button
              type="button"
              onClick={() => setActiveTab("pricing")}
              className={`border-b-2 pb-3 pt-4 text-sm font-semibold transition ${
                activeTab === "pricing"
                  ? "border-primaryColorBlack text-primaryColorBlack"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Service Rates
            </button>
          )}
        </nav>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-2 py-5 sm:px-3">
        {activeTab === "profile" ? (
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">
                Contact Information
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Email */}
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <svg className="h-4.5 w-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-500">Email Address</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.email ?? "—"}</p>
                  </div>
                  {user.emailVerifiedAt && (
                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      VERIFIED
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                    <svg className="h-4.5 w-4.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-500">Phone Number</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{user.phone ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">
                Account Details
              </h3>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-600">Account Type</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{professionalLabel}</span>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-600">Verification Status</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      user.emailVerifiedAt
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {user.emailVerifiedAt ? (
                        <>
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Verified
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Pending
                        </>
                      )}
                    </span>
                  </div>

                  {approvedApp && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">personal Role</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{approvedApp.role}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          token && proRole ? <ProfilePricingSection token={token} /> : null
        )}
      </div>

      {/* ── Role Picker Modal ── */}
      {openRolePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            {/* <div className="mb-1">
              <h2 className="font-display text-lg font-bold text-gray-900">
                Apply for Profesional Role
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select which professional role you would like to apply for
              </p>
            </div> */}

            <div className="mt-5 space-y-3">
              {canLawyer && (
                <Link
                  href="/kyc/apply?role=LAWYER"
                  className="group flex items-center gap-4 rounded-xl border-2 border-gray-100 bg-white p-4 transition hover:border-primaryColorBlack/30 hover:bg-primaryColorBlack/5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primaryColorBlack/10 transition group-hover:bg-primaryColorBlack/20">
                    <svg className="h-6 w-6 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Lawyer</p>
                    <p className="text-xs text-gray-500">Provide legal services and consultations</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-300 group-hover:text-primaryColorBlack transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
              {canAgent && (
                <Link
                  href="/kyc/apply?role=AGENT"
                  className="group flex items-center gap-4 rounded-xl border-2 border-gray-100 bg-white p-4 transition hover:border-primaryColorBlack/30 hover:bg-primaryColorBlack/5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primaryColorBlack/10 transition group-hover:bg-primaryColorBlack/20">
                    <svg className="h-6 w-6 text-primaryColorBlack" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Agent</p>
                    <p className="text-xs text-gray-500">Provide escrow facilitation services</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-300 group-hover:text-primaryColorBlack transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpenRolePicker(false)}
              className="mt-5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}