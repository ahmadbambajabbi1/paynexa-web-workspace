"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { isProfileComplete } from "@/src/lib/auth/profile";
import * as txApi from "@/src/lib/api/transactions";
import * as escrowApi from "@/src/lib/api/escrow";
import type {
  PublicTransactionAnalytics,
  TransactionPartyProfile,
  TransactionRoom,
} from "@/src/lib/api/types";
import { errorMessage } from "@/src/lib/api/errors";
import {
  canBuyerCloseTransaction,
  formatStatus,
  formatTimelineAction,
  formatTimelineDetail,
  formatTransactionType,
  statusApproxProgress,
  transitionActionLabel,
} from "@/src/lib/transaction-ui";
import {
  timelineActorLabel,
  transactionRoomHeading,
} from "@/src/lib/transaction-room-title";
import { TransactionRoomParties } from "@/src/components/TransactionRoomParties";
import { TransactionRoomProduct } from "@/src/components/TransactionRoomProduct";
import { InviteParticipantModal } from "@/src/components/InviteParticipantModal";
import { TransactionPaymentPanel } from "@/src/components/TransactionPaymentPanel";
import { RaiseDisputeModal } from "@/src/components/RaiseDisputeModal";
import { DisputeThreadPanel } from "@/src/components/DisputeThreadPanel";
import { formatMoney } from "@/src/lib/currency";

type ParticipantRole = "LAWYER" | "AGENT";
type PartySide = "buyer" | "seller";
type SelfRole = "buyer" | "seller" | "other";

const FUNDED_STATUSES = [
  "FUNDED",
  "IN_PROGRESS",
  "INSPECTION",
  "COMPLETED",
  "CLOSED",
  "DISPUTED",
];

// --- Status transition map (exactly as in the Flutter app) ---
const kStatusTransitions: Record<string, string[]> = {
  "AWAITING_ACCEPTANCE": ["AWAITING_FUNDING"],
  "AWAITING_FUNDING": ["FUNDED"],
  "FUNDED": ["IN_PROGRESS"],
  "IN_PROGRESS": ["INSPECTION"],
  "INSPECTION": ["COMPLETED", "DISPUTED"],
  "COMPLETED": [],
  "CLOSED": [],
  "DISPUTED": [],
};

function visibleTransitions(status: string, role: SelfRole): string[] {
  const all = kStatusTransitions[status] || [];
  if (role === "buyer") {
    return all.filter(s => ["COMPLETED", "DISPUTED"].includes(s));
  }
  if (role === "seller") {
    return all.filter(s => ["IN_PROGRESS", "INSPECTION", "DISPUTED"].includes(s));
  }
  return [];
}

function selfRoleFor(room: TransactionRoom, userId: string): SelfRole {
  const tx = room.transaction;
  if (userId === tx.buyerId) return "buyer";
  if (userId === tx.sellerId) return "seller";
  return "other";
}

function money(value: string | number | null | undefined, currency: string | null): string {
  return formatMoney(value, currency);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parsePublicTerms(terms: string): {
  itemDescription: string | null;
  sellerNote: string | null;
  deliveryNeeded: boolean;
} {
  try {
    const raw = JSON.parse(terms) as Record<string, unknown>;
    return {
      itemDescription:
        typeof raw.itemDescription === "string" && raw.itemDescription.trim()
          ? raw.itemDescription.trim()
          : null,
      sellerNote:
        typeof raw.sellerNote === "string" && raw.sellerNote.trim()
          ? raw.sellerNote.trim()
          : null,
      deliveryNeeded: raw.deliveryNeeded === true,
    };
  } catch {
    return { itemDescription: null, sellerNote: null, deliveryNeeded: false };
  }
}

function inviterLabelFromUser(user: {
  displayName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  for (const s of [user.displayName, user.fullName, user.email, user.phone]) {
    const t = s?.trim();
    if (t) return t;
  }
  return "Transaction participant";
}

// ----------------------------------------------------------------------
// Status Badge (exactly as mobile)
// ----------------------------------------------------------------------
function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E8EBF2] bg-white shadow-[0_6px_16px_rgba(0,0,0,0.035)]">
      <div className="border-b border-[#E8EBF2] px-4 py-4 sm:px-5">
        <h2 className="font-display text-lg font-bold text-gray-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs font-semibold text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = "bg-amber-100/80";
  let text = "text-amber-900";
  if (status === "COMPLETED" || status === "CLOSED") {
    bg = "bg-green-100/80";
    text = "text-green-900";
  } else if (status === "DISPUTED") {
    bg = "bg-red-100";
    text = "text-red-900";
  } else if (
    ["AWAITING_FUNDING", "FUNDED", "IN_PROGRESS", "INSPECTION"].includes(status)
  ) {
    bg = "bg-blue-50";
    text = "text-primaryColorBlack";
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${bg} ${text}`}>
      {formatStatus(status)}
    </span>
  );
}

// ----------------------------------------------------------------------
// Tab Bar – FULL WIDTH (tabs stretch equally)
// ----------------------------------------------------------------------
function RoomTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; icon: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E8EBF2] bg-white p-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.04)]">
      <div className="flex w-full gap-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 transition-all duration-200 ${
                isActive
                  ? "bg-primaryColorBlack text-white"
                  : "bg-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <i className={`fas ${tab.icon} text-base`} />
              <span className="max-w-full truncate text-xs font-black">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Progress circles (exactly as mobile: 4 steps with numbered circles)
// ----------------------------------------------------------------------
function ProgressCircles({ progressPct }: { progressPct: number }) {
  const steps = [
    { label: "Created", value: 25 },
    { label: "Funded", value: 50 },
    { label: "Delivered", value: 75 },
    { label: "Completed", value: 100 },
  ];
  return (
    <div className="flex justify-between mt-2">
      {steps.map((step, idx) => {
        const done = progressPct >= step.value;
        return (
          <div key={step.label} className="flex flex-col items-center flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black border-2 ${
                done
                  ? "bg-black border-black text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {idx + 1}
            </div>
            <span className="text-[10px] font-semibold text-gray-500 mt-1 text-center">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// Hero Card (matches mobile: status, title, amount row, role, linear progress + circles)
// ----------------------------------------------------------------------
function TransactionHero({
  tx,
  title,
  role,
  progressPct,
  currency,
}: {
  tx: TransactionRoom["transaction"];
  title: string;
  role: SelfRole;
  progressPct: number;
  currency: string | null;
}) {
  const roleLabel = role === "buyer" ? "Buyer" : role === "seller" ? "Seller" : "Collaborator";
  return (
    <div className="rounded-[20px] border border-[#E8EBF2] bg-white p-5 shadow-[0_6px_16px_rgba(0,0,0,0.035)] sm:p-[18px]">
      <p className="font-mono text-xs text-gray-400">#{tx.id.slice(0, 8)}</p>
      <h1 className="mt-2.5 font-display text-2xl font-black leading-tight text-gray-900 sm:text-[25px]">
        {title}
      </h1>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-[14px] border border-[#E8EBF2] bg-[#F8FAFC] p-3">
          <p className="text-[11px] font-bold text-gray-600">Amount</p>
          <p className="mt-1 text-lg font-black text-primaryColorBlack">
            {money(tx.amount, currency)}
          </p>
        </div>
        <div className="rounded-[14px] border border-[#E8EBF2] bg-[#F8FAFC] p-3">
          <p className="text-[11px] font-bold text-gray-600">Role</p>
          <p className="mt-1 text-sm font-black text-gray-900">{roleLabel}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primaryColorBlack transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
        <ProgressCircles progressPct={progressPct} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Action Button (matches mobile: icon on left with colored circle, label, chevron)
// ----------------------------------------------------------------------
function ActionButton({
  label,
  icon,
  onClick,
  variant = "secondary",
  destructive = false,
  busy = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "destructive";
  destructive?: boolean;
  busy?: boolean;
}) {
  const resolved = destructive ? "destructive" : variant;
  const styles =
    resolved === "destructive"
      ? {
          shell: "border-red-200 bg-red-50 text-red-800",
          icon: "bg-red-100 text-red-800",
        }
      : resolved === "primary"
        ? {
            shell: "border-primaryColorBlack bg-primaryColorBlack text-white",
            icon: "bg-white/15 text-white",
          }
        : {
            shell: "border-[#E8EBF2] bg-white text-primaryColorBlack",
            icon: "bg-primaryColorBlack/8 text-primaryColorBlack",
          };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`flex w-full min-h-[50px] items-center gap-3 rounded-[14px] border px-3.5 py-3 transition active:scale-[0.99] disabled:opacity-50 ${styles.shell}`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${styles.icon}`}>
        <i className={`fas ${icon} text-sm`} />
      </div>
      <span className="flex-1 text-left text-sm font-black">
        {busy ? "Please wait..." : label}
      </span>
      <i className="fas fa-chevron-right text-xs opacity-70" />
    </button>
  );
}

// ----------------------------------------------------------------------
// Actions Group (matches mobile: grey container, title "Actions", list of buttons)
// ----------------------------------------------------------------------
function ActionsGroup({
  canAccept,
  canPay,
  nextStates,
  canClose,
  busy,
  onAccept,
  onPay,
  onTransition,
}: {
  canAccept: boolean;
  canPay: boolean;
  nextStates: string[];
  canClose: boolean;
  busy: boolean;
  onAccept: () => void;
  onPay: () => void;
  onTransition: (next: string) => void;
}) {
  const actions = [];
  if (canAccept) {
    actions.push(
      <ActionButton
        key="accept"
        label="Accept transaction"
        icon="fa-check"
        onClick={onAccept}
        variant="primary"
        busy={busy}
      />
    );
  }
  if (canPay) {
    actions.push(
      <ActionButton
        key="pay"
        label="Pay from wallet"
        icon="fa-wallet"
        onClick={onPay}
        variant="primary"
        busy={busy}
      />
    );
  }
  for (const next of nextStates) {
    let label = transitionActionLabel(next);
    let icon = "fa-arrow-right";
    if (next === "COMPLETED") icon = "fa-check-double";
    if (next === "DISPUTED") icon = "fa-gavel";
    actions.push(
      <ActionButton
        key={next}
        label={label}
        icon={icon}
        onClick={() => onTransition(next)}
        destructive={next === "DISPUTED"}
        busy={busy}
      />
    );
  }
  if (canClose) {
    actions.push(
      <ActionButton
        key="close"
        label="Close transaction"
        icon="fa-times"
        onClick={() => onTransition("CLOSED")}
        destructive
        busy={busy}
      />
    );
  }
  if (actions.length === 0) return null;
  return (
    <SectionCard title="Actions" subtitle="Available actions">
      <div className="space-y-2">{actions}</div>
    </SectionCard>
  );
}

// ----------------------------------------------------------------------
// Sale Details Panel (for public shareable)
// ----------------------------------------------------------------------
function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-[14px] border border-[#E8EBF2] bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-extrabold text-gray-600">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg font-black text-primaryColorBlack" : "text-sm font-bold text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function TransactionFinancialSummary({
  tx,
  payment,
  currency,
  viewerRole,
}: {
  tx: TransactionRoom["transaction"];
  payment: TransactionRoom["payment"];
  currency: string | null;
  viewerRole?: SelfRole | null;
}) {
  const txCurrency = tx.currencyCode ?? currency;
  const isSeller = viewerRole === "seller";
  const hasPlatformFee =
    isSeller && tx.platformFeeAmount != null && Number(tx.platformFeeAmount) > 0;
  const hasPayment = payment != null;
  const showFx =
    hasPayment &&
    payment.paidCurrency &&
    payment.transactionCurrency &&
    payment.paidCurrency.toUpperCase() !== payment.transactionCurrency.toUpperCase();

  if (!hasPlatformFee && !hasPayment && !(isSeller && tx.sellerNetAmount)) return null;

  return (
    <SectionCard
      title="Fees & payment"
      subtitle={
        isSeller
          ? "Platform fees are separate from Stripe card processing costs"
          : "Payment details for this transaction"
      }
    >
      <div className="space-y-2.5">
        <SummaryRow
          label="Transaction list price"
          value={money(tx.amount, txCurrency)}
          strong
        />
        {isSeller ? (
          hasPlatformFee ? (
            <SummaryRow
              label={`Platform fee${tx.platformFeeTypeLabel ? ` (${tx.platformFeeTypeLabel})` : ""}`}
              value={money(tx.platformFeeAmount, txCurrency)}
            />
          ) : (
            <SummaryRow label="Platform fee" value="None" />
          )
        ) : null}
        {isSeller && tx.sellerNetAmount ? (
          <SummaryRow
            label="Seller payout (estimated)"
            value={money(tx.sellerNetAmount, txCurrency)}
          />
        ) : null}
        {hasPayment ? (
          <>
            <div className="border-t border-[#E8EBF2] pt-3">
              <p className="mb-2 text-xs font-bold text-gray-600">Buyer payment</p>
            </div>
            <SummaryRow
              label="Payment method"
              value={payment.paymentMethod === "WALLET" ? "Wallet" : payment.paymentMethod ?? "—"}
            />
            {showFx ? (
              <>
                <SummaryRow
                  label="Paid amount"
                  value={money(payment.paidAmount, payment.paidCurrency ?? currency)}
                />
                <SummaryRow
                  label="Exchange rate"
                  value={
                    payment.exchangeRate
                      ? `1 ${payment.transactionCurrency} = ${payment.exchangeRate} ${payment.paidCurrency}`
                      : "—"
                  }
                />
              </>
            ) : null}
            {payment.stripeFeeAmount && Number(payment.stripeFeeAmount) > 0 ? (
              <SummaryRow
                label="Stripe processing fee"
                value={money(payment.stripeFeeAmount, payment.paidCurrency ?? currency)}
              />
            ) : null}
            {payment.netReceivedAmount ? (
              <SummaryRow
                label="Net received in escrow"
                value={money(payment.netReceivedAmount, payment.transactionCurrency ?? currency)}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}

function SaleDetailsPanel({
  tx,
  terms,
  quantity,
  unitPrice,
  currency,
  shareUrl,
  onCopyShareLink,
}: {
  tx: TransactionRoom["transaction"];
  terms: ReturnType<typeof parsePublicTerms>;
  quantity: number;
  unitPrice: string;
  currency: string | null;
  shareUrl?: string | null;
  onCopyShareLink?: (url: string) => void;
}) {
  return (
    <SectionCard title="Sale details" subtitle="Item, quantity, delivery, and buyer checkout link">
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryRow label="Quantity" value={String(quantity)} />
          <SummaryRow label="Unit price" value={money(unitPrice, currency)} />
        </div>
        <SummaryRow label="Total" value={money(tx.amount, currency)} strong />
        <SummaryRow
          label="Delivery"
          value={terms.deliveryNeeded ? "Delivery tracked" : "Payment only"}
        />
        {terms.itemDescription ? (
          <div className="rounded-[14px] border border-[#E8EBF2] bg-[#F8FAFC] p-4">
            <p className="text-xs font-black text-gray-700">Description</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {terms.itemDescription}
            </p>
          </div>
        ) : null}
        {terms.sellerNote ? (
          <div className="rounded-[14px] border border-[#E8EBF2] bg-[#F8FAFC] p-4">
            <p className="text-xs font-black text-gray-700">Seller note</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {terms.sellerNote}
            </p>
          </div>
        ) : null}
        {shareUrl && onCopyShareLink ? (
          <div className="mt-1 rounded-2xl border border-primaryColorBlack/15 bg-primaryColorBlack/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <i className="fas fa-link text-primaryColorBlack" />
              <p className="text-sm font-bold text-primaryColorBlack">Shareable payment link</p>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-700">
              Send this link to the buyer via WhatsApp, SMS, or any app so they can pay into escrow securely.
            </p>
            <div className="flex items-center gap-2 rounded-[14px] border border-[#E8EBF2] bg-white p-3">
              <p className="flex-1 truncate font-mono text-xs text-gray-700">{shareUrl}</p>
              <button
                type="button"
                onClick={() => onCopyShareLink(shareUrl)}
                className="text-primaryColorBlack"
                aria-label="Copy link"
              >
                <i className="fas fa-copy" />
              </button>
            </div>
            <div className="mt-3">
              <ActionButton
                label="Copy link"
                icon="fa-link"
                variant="primary"
                onClick={() => onCopyShareLink(shareUrl)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

// ----------------------------------------------------------------------
// Product Details (for secure escrow)
// ----------------------------------------------------------------------
function ProductDetails({ room, currency }: { room: TransactionRoom; currency: string | null }) {
  if (!room.product) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-10 text-center text-gray-400">
        <i className="fas fa-box-open text-3xl mb-2 block" />
        <p>Product details not available</p>
      </div>
    );
  }
  return <TransactionRoomProduct product={room.product} currency={currency} />;
}

// ----------------------------------------------------------------------
// Parties Tab (matches mobile)
// ----------------------------------------------------------------------
function PartiesTab({ room, selfId }: { room: TransactionRoom; selfId: string }) {
  return (
    <SectionCard title="Buyer and seller">
      <TransactionRoomParties
        buyer={room.parties?.buyer ?? null}
        seller={room.parties?.seller ?? null}
        selfId={selfId}
      />
    </SectionCard>
  );
}

// ----------------------------------------------------------------------
// Team Tab (Lawyers & Agents)
// ----------------------------------------------------------------------
function ProfessionalSlot({
  title,
  role,
  partySide,
  pricingEnabled,
  isOwner,
  invitedUserId,
  inviteStatus,
  party,
  selfId,
  busy,
  openInvite,
  onAcceptParticipant,
}: {
  title: string;
  role: ParticipantRole;
  partySide: PartySide;
  pricingEnabled: boolean;
  isOwner: boolean;
  invitedUserId?: string | null;
  inviteStatus?: string | null;
  party: TransactionPartyProfile | null;
  selfId: string;
  busy: boolean;
  openInvite: (role: ParticipantRole, partySide: PartySide) => void;
  onAcceptParticipant: (role: ParticipantRole, partySide: PartySide) => Promise<void>;
}) {
  const canInvite = isOwner && pricingEnabled && (!invitedUserId || inviteStatus === "PENDING");
  const pendingForSelf = selfId === invitedUserId && inviteStatus === "PENDING";
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white font-black ${role === "LAWYER" ? "bg-black" : "bg-black/70"}`}>
          {role === "LAWYER" ? "L" : "A"}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{inviteStatus ?? "Not assigned"}</p>
        </div>
      </div>
      {party ? (
        <div className="rounded-xl bg-white border border-gray-100 px-3 py-2 mb-3">
          <p className="text-sm font-semibold text-gray-900">{party.displayName || "Assigned"}</p>
          <p className="text-xs text-gray-400">{party.email || party.phone || ""}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-3">Nobody assigned yet</p>
      )}
      {canInvite && (
        <button
          type="button"
          disabled={busy}
          onClick={() => openInvite(role, partySide)}
          className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-black/90 disabled:opacity-50"
        >
          {invitedUserId ? "Change invite" : "Invite"}
        </button>
      )}
      {pendingForSelf && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAcceptParticipant(role, partySide)}
          className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-black/5 disabled:opacity-50 mt-2"
        >
          Accept invite
        </button>
      )}
    </div>
  );
}

function TeamTab({
  room,
  selfId,
  busy,
  openInvite,
  onAcceptParticipant,
}: {
  room: TransactionRoom;
  selfId: string;
  busy: boolean;
  openInvite: (role: ParticipantRole, partySide: PartySide) => void;
  onAcceptParticipant: (role: ParticipantRole, partySide: PartySide) => Promise<void>;
}) {
  const tx = room.transaction;
  const agentPricing = room.product?.productType.agentPricingEnabled ?? false;
  const lawyerPricing = room.product?.productType.lawyerPricingEnabled ?? false;
  return (
    <SectionCard title="Lawyers & agents">
      <div className="grid gap-3 sm:grid-cols-2">
        <ProfessionalSlot
          title="Buyer's Lawyer"
          role="LAWYER"
          partySide="buyer"
          pricingEnabled={lawyerPricing}
          isOwner={selfId === tx.buyerId}
          invitedUserId={tx.buyerLawyerId}
          inviteStatus={tx.buyerLawyerInviteStatus}
          party={room.parties?.buyerLawyer ?? null}
          selfId={selfId}
          busy={busy}
          openInvite={openInvite}
          onAcceptParticipant={onAcceptParticipant}
        />
        <ProfessionalSlot
          title="Buyer's Agent"
          role="AGENT"
          partySide="buyer"
          pricingEnabled={agentPricing}
          isOwner={selfId === tx.buyerId}
          invitedUserId={tx.buyerAgentId}
          inviteStatus={tx.buyerAgentInviteStatus}
          party={room.parties?.buyerAgent ?? null}
          selfId={selfId}
          busy={busy}
          openInvite={openInvite}
          onAcceptParticipant={onAcceptParticipant}
        />
        <ProfessionalSlot
          title="Seller's Lawyer"
          role="LAWYER"
          partySide="seller"
          pricingEnabled={lawyerPricing}
          isOwner={selfId === tx.sellerId}
          invitedUserId={tx.sellerLawyerId}
          inviteStatus={tx.sellerLawyerInviteStatus}
          party={room.parties?.sellerLawyer ?? null}
          selfId={selfId}
          busy={busy}
          openInvite={openInvite}
          onAcceptParticipant={onAcceptParticipant}
        />
        <ProfessionalSlot
          title="Seller's Agent"
          role="AGENT"
          partySide="seller"
          pricingEnabled={agentPricing}
          isOwner={selfId === tx.sellerId}
          invitedUserId={tx.sellerAgentId}
          inviteStatus={tx.sellerAgentInviteStatus}
          party={room.parties?.sellerAgent ?? null}
          selfId={selfId}
          busy={busy}
          openInvite={openInvite}
          onAcceptParticipant={onAcceptParticipant}
        />
      </div>
    </SectionCard>
  );
}

// ----------------------------------------------------------------------
// Timeline Tab (matches mobile vertical timeline)
// ----------------------------------------------------------------------
function TimelineTab({ room, selfId }: { room: TransactionRoom; selfId: string }) {
  const events = room.timeline ?? [];
  return (
    <SectionCard title="Timeline">
      {events.length === 0 ? (
        <div className="rounded-[14px] border border-gray-200 bg-gray-50 px-4 py-10 text-center text-gray-500">
          No activity yet.
        </div>
      ) : (
        <div className="max-h-[32rem] space-y-0 overflow-y-auto pr-1">
          {events.map((ev, idx) => {
            const detail = formatTimelineDetail(ev.action, ev.detail);
            const isLast = idx === events.length - 1;
            return (
              <div key={`${ev.at}-${idx}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-blue-50">
                    <div className="h-[7px] w-[7px] rounded-full bg-primaryColorBlack" />
                  </div>
                  {!isLast ? <div className="min-h-[46px] w-0.5 flex-1 bg-gray-200" /> : null}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-4"}`}>
                  <div className="rounded-[14px] border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-extrabold text-gray-900">
                      {formatTimelineAction(ev.action, ev.detail)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(ev.at)}</p>
                    {detail ? <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{detail}</p> : null}
                    <p className="mt-1.5 text-xs text-gray-500">
                      By: {timelineActorLabel(ev.actorId, room, selfId)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ----------------------------------------------------------------------
// Public Shareable Room (with tabs: Overview, Sale, Parties, Analytics (seller), Timeline)
// ----------------------------------------------------------------------
function PublicShareableRoom({
  room,
  token,
  selfId,
  busy,
  walletCurrency,
  onCopyShareLink,
  onTransition,
  onReload,
  onOpenDispute,
}: {
  room: TransactionRoom;
  token: string;
  selfId: string;
  busy: boolean;
  walletCurrency: string | null;
  onCopyShareLink: (url: string) => Promise<void>;
  onTransition: (next: string) => Promise<void>;
  onReload: () => Promise<void> | void;
  onOpenDispute: () => void;
}) {
  const tx = room.transaction;
  const role = selfRoleFor(room, selfId);
  const isTemplate = !!tx.shareToken;
  const isSeller = role === "seller";
  const canPay = !isTemplate && role === "buyer" && tx.status === "AWAITING_FUNDING";
  const quantity = tx.quantity ?? 1;
  const unitPrice = tx.unitPrice ?? tx.amount;
  const terms = parsePublicTerms(tx.terms);
  const sharePath = tx.sharePath ?? (tx.shareToken ? `/pay/${tx.shareToken}` : null);
  const shareUrl = sharePath && typeof window !== "undefined"
    ? new URL(sharePath, window.location.origin).toString()
    : sharePath;

  // Tabs: Overview (sale details + actions), Parties, Timeline
  const tabs = [
    { id: "overview", label: "Overview", icon: "fa-tachometer-alt" },
    { id: "parties", label: "Parties", icon: "fa-users" },
    // { id: "analytics", label: "Analytics", icon: "fa-chart-line" },
    { id: "timeline", label: "Timeline", icon: "fa-history" },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  // Determine available actions for overview – using the same transition logic as mobile
  const canAccept = false; // not applicable in public shareable for seller
  const canClose = canBuyerCloseTransaction(role, tx);
  const nextStates = visibleTransitions(tx.status, role);

  return (
    <div className="space-y-5">
      <TransactionHero
        tx={tx}
        title={tx.productTitle}
        role={role}
        progressPct={statusApproxProgress(tx.status)}
        currency={walletCurrency}
      />
      <RoomTabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

      {currentTab === "overview" && (
        <div className="w-full space-y-5">
          <SaleDetailsPanel
            tx={tx}
            terms={terms}
            quantity={quantity}
            unitPrice={unitPrice}
            currency={walletCurrency}
            shareUrl={isSeller ? shareUrl : null}
            onCopyShareLink={onCopyShareLink}
          />
          <TransactionFinancialSummary
            tx={tx}
            payment={room.payment}
            currency={walletCurrency}
            viewerRole={role}
          />
          {(room.disputes?.length ?? 0) > 0 || tx.status === "DISPUTED" ? (
            <DisputeThreadPanel
              token={token}
              transactionId={tx.id}
              actorId={selfId}
              selfRole={role === "buyer" || role === "seller" ? role : null}
              disputes={room.disputes ?? []}
              busy={busy}
              onReload={onReload}
              onOpenNewDispute={onOpenDispute}
            />
          ) : null}
          {canPay ? (
            <TransactionPaymentPanel
              token={token}
              transactionId={tx.id}
              amount={tx.amount}
              currency={walletCurrency}
              onPaid={async (paidId) => {
                if (paidId !== tx.id) window.location.href = `/transactions/${paidId}`;
                else await onReload();
              }}
            />
          ) : null}
          {(nextStates.length > 0 || canClose) && !canPay ? (
            <ActionsGroup
              canAccept={canAccept}
              canPay={false}
              nextStates={nextStates}
              canClose={canClose}
              busy={busy}
              onAccept={() => {}}
              onPay={() => {}}
              onTransition={onTransition}
            />
          ) : null}
        </div>
      )}
      {currentTab === "parties" && <PartiesTab room={room} selfId={selfId} />}
      {/* {currentTab === "analytics" && isSeller && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 text-center text-gray-400">
          <i className="fas fa-chart-line text-3xl mb-2 block" />
          <p>Analytics coming soon</p>
        </div>
      )} */}
      {currentTab === "timeline" && <TimelineTab room={room} selfId={selfId} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// Secure Escrow Room (tabs: Overview, Product, Parties, Team, Timeline)
// ----------------------------------------------------------------------
function SecureEscrowRoom({
  room,
  token,
  selfId,
  busy,
  walletCurrency,
  onAccept,
  onTransition,
  openInvite,
  onAcceptParticipant,
  onReload,
  onOpenDispute,
}: {
  room: TransactionRoom;
  token: string;
  selfId: string;
  busy: boolean;
  walletCurrency: string | null;
  onAccept: () => Promise<void>;
  onTransition: (next: string) => Promise<void>;
  openInvite: (role: ParticipantRole, partySide: PartySide) => void;
  onAcceptParticipant: (role: ParticipantRole, partySide: PartySide) => Promise<void>;
  onReload: () => Promise<void> | void;
  onOpenDispute: () => void;
}) {
  const tx = room.transaction;
  const role = selfRoleFor(room, selfId);
  const heading = transactionRoomHeading(room);
  const progressPct = statusApproxProgress(tx.status);
  const canAccept = role === "buyer" && tx.status === "AWAITING_ACCEPTANCE" && !tx.acceptedPartyIds.includes(selfId);
  const canPay = role === "buyer" && tx.status === "AWAITING_FUNDING";

  // Use the same transition logic as the Flutter app
  const nextStates = visibleTransitions(tx.status, role);
  const canClose = canBuyerCloseTransaction(role, tx);

  const tabs = [
    { id: "overview", label: "Overview", icon: "fa-tachometer-alt" },
    { id: "product", label: "Product", icon: "fa-box-open" },
    { id: "parties", label: "Parties", icon: "fa-users" },
    { id: "team", label: "Team", icon: "fa-user-plus" },
    { id: "timeline", label: "Timeline", icon: "fa-history" },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  return (
    <div className="space-y-5">
      <TransactionHero
        tx={tx}
        title={heading}
        role={role}
        progressPct={progressPct}
        currency={walletCurrency}
      />
      <RoomTabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

      {currentTab === "overview" && (
        <div className="w-full space-y-5">
          <SectionCard title="Deal summary" subtitle="Funding and amount for this escrow">
            <div className="space-y-2.5">
              <SummaryRow label="Amount" value={money(tx.amount, walletCurrency)} strong />
              <SummaryRow label="Type" value={formatTransactionType(tx.type)} />
              <SummaryRow label="Funding" value="Buyer payment" />
            </div>
          </SectionCard>
          <TransactionFinancialSummary
            tx={tx}
            payment={room.payment}
            currency={walletCurrency}
            viewerRole={role}
          />
          {(room.disputes?.length ?? 0) > 0 || tx.status === "DISPUTED" ? (
            <DisputeThreadPanel
              token={token}
              transactionId={tx.id}
              actorId={selfId}
              selfRole={role === "buyer" || role === "seller" ? role : null}
              disputes={room.disputes ?? []}
              busy={busy}
              onReload={onReload}
              onOpenNewDispute={onOpenDispute}
            />
          ) : null}
          {canPay ? (
            <TransactionPaymentPanel
              token={token}
              transactionId={tx.id}
              amount={tx.amount}
              currency={walletCurrency}
              onPaid={async () => await onReload()}
            />
          ) : null}
          {(canAccept || nextStates.length > 0 || canClose) && !canPay ? (
            <ActionsGroup
              canAccept={canAccept}
              canPay={false}
              nextStates={nextStates}
              canClose={canClose}
              busy={busy}
              onAccept={onAccept}
              onPay={() => {}}
              onTransition={onTransition}
            />
          ) : null}
        </div>
      )}

      {currentTab === "product" && <ProductDetails room={room} currency={walletCurrency} />}
      {currentTab === "parties" && <PartiesTab room={room} selfId={selfId} />}
      {currentTab === "team" && (
        <TeamTab
          room={room}
          selfId={selfId}
          busy={busy}
          openInvite={openInvite}
          onAcceptParticipant={onAcceptParticipant}
        />
      )}
      {currentTab === "timeline" && <TimelineTab room={room} selfId={selfId} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// Page Root
// ----------------------------------------------------------------------
export default function TransactionDetailPage() {
  const params = useParams();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : typeof rawId === "string" ? rawId : "";
  const router = useRouter();
  const { user, loading, token } = useAuth();
  const [room, setRoom] = useState<TransactionRoom | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<ParticipantRole>("AGENT");
  const [invitePartySide, setInvitePartySide] = useState<PartySide>("buyer");
  const [walletCurrency, setWalletCurrency] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id || !token) return;
    setErr(null);
    try {
      const [r, wallet] = await Promise.all([
        txApi.getTransactionRoom(token, id),
        escrowApi.getWallet(token),
      ]);
      setRoom(r);
      setWalletCurrency(wallet.currency ?? null);
    } catch (e) {
      setErr(errorMessage(e));
      setRoom(null);
    }
  }, [id, token]);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      router.replace(`/login?next=${encodeURIComponent(`/transactions/${id}`)}`);
      return;
    }
    if (!isProfileComplete(user)) {
      router.replace(`/complete-profile?next=${encodeURIComponent(`/transactions/${id}`)}`);
      return;
    }
    void load();
  }, [id, loading, user, token, load, router]);

  async function onAccept() {
    if (!user || !room || !token) return;
    setBusy(true);
    setErr(null);
    try {
      await txApi.acceptTransaction(token, room.transaction.id, user.id);
      await load();
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function onTransition(next: string) {
    if (!user || !room || !token) return;
    if (next === "DISPUTED") {
      setDisputeOpen(true);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await txApi.updateTransactionState(token, room.transaction.id, user.id, next);
      await load();
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function submitDispute(reason: string) {
    if (!user || !room || !token) return;
    setBusy(true);
    setErr(null);
    try {
      await txApi.raiseTransactionDispute(token, room.transaction.id, { actorId: user.id, reason });
      setDisputeOpen(false);
      await load();
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function onAcceptParticipant(role: ParticipantRole, partySide: PartySide) {
    if (!user || !room || !token) return;
    setBusy(true);
    setErr(null);
    try {
      await txApi.acceptTransactionParticipantInvite(token, room.transaction.id, { actorId: user.id, role, partySide });
      await load();
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  }

  function openInvite(role: ParticipantRole, partySide: PartySide) {
    setInviteRole(role);
    setInvitePartySide(partySide);
    setInviteOpen(true);
  }

  async function copyShareLink(url: string) {
    await navigator.clipboard?.writeText(url);
    setToast("Link copied!");
    setTimeout(() => setToast(null), 2500);
  }

  if (loading || !user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FB]">
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin text-3xl text-black mb-3" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const tx = room?.transaction;
  const isPublicShareable = tx?.workflow === "PUBLIC_SHAREABLE";

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {toast && (
          <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white shadow-xl">
            <i className="fas fa-check-circle" />
            {toast}
          </div>
        )}

        <Link
          href="/transactions"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 mb-6"
        >
          <i className="fas fa-arrow-left text-xs" />
          Back to Transactions
        </Link>

        {err && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <i className="fas fa-exclamation-circle text-red-500 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{err}</p>
          </div>
        )}

        {!room && !err && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
            <i className="fas fa-circle-notch fa-spin text-2xl text-black mb-3 block" />
            <p className="text-gray-400 text-sm">Loading transaction details...</p>
          </div>
        )}

        {room && tx && (
          isPublicShareable ? (
            <PublicShareableRoom
              room={room}
              token={token}
              selfId={user.id}
              busy={busy}
              walletCurrency={walletCurrency}
              onCopyShareLink={copyShareLink}
              onTransition={onTransition}
              onReload={load}
              onOpenDispute={() => setDisputeOpen(true)}
            />
          ) : (
            <>
              <SecureEscrowRoom
                room={room}
                token={token}
                selfId={user.id}
                busy={busy}
                walletCurrency={walletCurrency}
                onAccept={onAccept}
                onTransition={onTransition}
                openInvite={openInvite}
                onAcceptParticipant={onAcceptParticipant}
                onReload={load}
                onOpenDispute={() => setDisputeOpen(true)}
              />
              <InviteParticipantModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                token={token}
                transactionId={tx.id}
                actorId={user.id}
                role={inviteRole}
                partySide={invitePartySide}
                inviterLabel={inviterLabelFromUser(user)}
                productTitle={tx.productTitle}
                amount={tx.amount}
                onInvited={() => void load()}
              />
            </>
          )
        )}
        {disputeOpen ? (
          <RaiseDisputeModal
            busy={busy}
            onClose={() => setDisputeOpen(false)}
            onSubmit={submitDispute}
          />
        ) : null}
      </div>
    </div>
  );
}