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
   Professional Pricing Section
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
   Profile Inner – full width, no top padding
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
    <div className="min-h-screen bg-gray-50">
      {/* Full-width profile hero */}
      <div className="relative overflow-hidden bg-primaryColorBlack">
        <div className="absolute inset-0 " />
        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:gap-8 sm:text-left">
            <div className="relative shrink-0">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-3xl font-bold text-white shadow-2xl backdrop-blur-sm sm:h-32 sm:w-32 sm:text-4xl">
                {initials || "U"}
              </div>
              <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-primaryColorBlack bg-emerald-500 shadow-lg">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Your profile</p> */}
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                {displayName}
              </h1>
              {showFullNameLine && (
                <p className="mt-2 text-base text-white/70">{user.fullName!.trim()}</p>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/10">
                  {professionalLabel}
                </span>
                {user.emailVerifiedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-4 py-1.5 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
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
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
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
                        <span className="text-sm text-gray-600">Professional Role</span>
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

      {/* Role Picker Modal */}
      {openRolePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
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