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
function StatusBadge({ status }: { status: string }) {
  let bg = "bg-amber-100";
  let text = "text-amber-800";
  let dot = "bg-amber-500";
  if (status === "COMPLETED" || status === "CLOSED") {
    bg = "bg-green-100";
    text = "text-green-800";
    dot = "bg-green-500";
  } else if (status === "DISPUTED") {
    bg = "bg-red-100";
    text = "text-red-800";
    dot = "bg-red-500";
  } else if (["FUNDED", "IN_PROGRESS", "INSPECTION"].includes(status)) {
    bg = "bg-blue-100";
    text = "text-blue-800";
    dot = "bg-blue-500";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${bg} ${text}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
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
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-1.5">
      <div className="flex w-full gap-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 py-2.5 ${
                isActive
                  ? "bg-black text-white"
                  : "bg-transparent text-gray-500 hover:text-black"
              }`}
            >
              <i className={`fas ${tab.icon} text-lg`} />
              <span className="text-xs font-extrabold">{tab.label}</span>
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
  isPublicShareable,
  progressPct,
  currency,
}: {
  tx: TransactionRoom["transaction"];
  title: string;
  role: SelfRole;
  isPublicShareable: boolean;
  progressPct: number;
  currency: string | null;
}) {
  const roleLabel = role === "buyer" ? "Buyer" : role === "seller" ? "Seller" : "Collaborator";
  const workflowLabel = isPublicShareable ? "Shareable sale" : "Two-party escrow";
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <StatusBadge status={tx.status} />
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-black">
          {workflowLabel}
        </span>
        <span className="font-mono text-xs text-gray-400">
          #{tx.id.slice(0, 8)}
        </span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 leading-tight">{title}</h1>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase">Amount</p>
          <p className="text-lg font-black text-black mt-1">
            {money(tx.amount, currency)}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase">Role</p>
          <p className="text-base font-black text-gray-900 mt-1">{roleLabel}</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all"
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
  destructive = false,
  busy = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  destructive?: boolean;
  busy?: boolean;
}) {
  const bgColor = destructive ? "bg-red-50" : "bg-white";
  const textColor = destructive ? "text-red-800" : "text-black";
  const borderColor = destructive ? "border-red-200" : "border-gray-200";
  const iconBg = destructive ? "bg-red-100" : "bg-gray-100";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl border ${borderColor} ${bgColor} px-4 py-3 transition active:scale-95 disabled:opacity-50`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBg}`}>
        <i className={`fas ${icon} ${textColor} text-sm`} />
      </div>
      <span className={`flex-1 text-left text-sm font-extrabold ${textColor}`}>
        {busy ? "Please wait..." : label}
      </span>
      <i className={`fas fa-chevron-right ${textColor} text-xs`} />
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
    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
      <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Actions</p>
      {actions}
    </div>
  );
}

// ----------------------------------------------------------------------
// Sale Details Panel (for public shareable)
// ----------------------------------------------------------------------
function SaleDetailsPanel({
  tx,
  terms,
  quantity,
  unitPrice,
  currency,
}: {
  tx: TransactionRoom["transaction"];
  terms: ReturnType<typeof parsePublicTerms>;
  quantity: number;
  unitPrice: string;
  currency: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-900">Sale Details</h2>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 font-medium">Quantity</span>
          <span className="text-sm font-bold text-gray-900">{quantity}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 font-medium">Unit price</span>
          <span className="text-sm font-bold text-gray-900">{money(unitPrice, currency)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Total</span>
          <span className="text-lg font-black text-black">{money(tx.amount, currency)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 font-medium">Delivery</span>
          <span className="text-sm font-bold text-gray-900">
            {terms.deliveryNeeded ? "Delivery tracked" : "Payment only"}
          </span>
        </div>
        {terms.itemDescription && (
          <div className="mt-2 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-black text-gray-500 uppercase">Description</p>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {terms.itemDescription}
            </p>
          </div>
        )}
        {terms.sellerNote && (
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-black text-amber-600 uppercase">Seller note</p>
            <p className="text-sm text-amber-800 mt-1 whitespace-pre-wrap">
              {terms.sellerNote}
            </p>
          </div>
        )}
      </div>
    </div>
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
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-900">Buyer and seller</h2>
      </div>
      <div className="p-5">
        <TransactionRoomParties
          buyer={room.parties?.buyer ?? null}
          seller={room.parties?.seller ?? null}
          selfId={selfId}
        />
      </div>
    </div>
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
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-900">Lawyers & Agents</h2>
      </div>
      <div className="p-4 grid gap-3 sm:grid-cols-2">
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
    </div>
  );
}

// ----------------------------------------------------------------------
// Timeline Tab (exactly as mobile design)
// ----------------------------------------------------------------------
function TimelineTab({ room, selfId }: { room: TransactionRoom; selfId: string }) {
  const events = room.timeline ?? [];
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-900">Timeline</h2>
      </div>
      <div className="divide-y divide-gray-100 max-h-[32rem] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <i className="fas fa-clock text-3xl mb-2 block" />
            <p className="text-sm">No activity yet.</p>
          </div>
        ) : (
          events.map((ev, idx) => {
            const detail = formatTimelineDetail(ev.action, ev.detail);
            return (
              <div key={ev.at} className="flex gap-4 px-5 py-4">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-black shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-gray-900">
                    {formatTimelineAction(ev.action, ev.detail)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(ev.at)}</p>
                  {detail && <p className="text-sm text-gray-600 mt-1">{detail}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    By: {timelineActorLabel(ev.actorId, room, selfId)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
}: {
  room: TransactionRoom;
  token: string;
  selfId: string;
  busy: boolean;
  walletCurrency: string | null;
  onCopyShareLink: (url: string) => Promise<void>;
  onTransition: (next: string) => Promise<void>;
  onReload: () => Promise<void> | void;
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

  // Tabs exactly as mobile: Overview, Sale, Parties, (Analytics if seller), Timeline
  const tabs = [
    { id: "overview", label: "Overview", icon: "fa-tachometer-alt" },
    { id: "sale", label: "Sale", icon: "fa-receipt" },
    { id: "parties", label: "Parties", icon: "fa-users" },
    // ...(isSeller ? [{ id: "analytics", label: "Analytics", icon: "fa-chart-line" }] : []),
    { id: "timeline", label: "Timeline", icon: "fa-history" },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  // Determine available actions for overview
  const canAccept = false; // not applicable in public shareable for seller
  const canClose = canBuyerCloseTransaction(role, tx);
  const nextStates = (() => {
    if (role === "seller" && tx.status === "FUNDED") return ["IN_PROGRESS"];
    if (role === "seller" && tx.status === "IN_PROGRESS") return ["INSPECTION"];
    if (role === "buyer" && tx.status === "INSPECTION") return ["COMPLETED"];
    return [];
  })();

  return (
    <div className="space-y-5">
      <TransactionHero
        tx={tx}
        title={tx.productTitle}
        role={role}
        isPublicShareable
        progressPct={statusApproxProgress(tx.status)}
        currency={walletCurrency}
      />
      <RoomTabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

      {currentTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <StatusBadge status={tx.status} />
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-black">
                    Shareable sale
                  </span>
                </div>
                <h2 className="text-base font-black text-gray-900">Overview</h2>
                <p className="text-sm text-gray-500 mt-1">{tx.productTitle}</p>
                <ProgressCircles progressPct={statusApproxProgress(tx.status)} />
              </div>
            </div>
            {/* <SaleDetailsPanel
              tx={tx}
              terms={terms}
              quantity={quantity}
              unitPrice={unitPrice}
              currency={walletCurrency}
            /> */}
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-black p-5 text-white">
              <p className="text-xs font-bold text-blue-200 uppercase">Total Amount</p>
              <p className="text-4xl font-black mt-1">{money(tx.amount, walletCurrency)}</p>
            </div>
            {isSeller && shareUrl && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-black px-5 py-3">
                  <p className="text-xs font-bold text-blue-200 uppercase">Shareable Payment Link</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                    <p className="flex-1 truncate text-xs font-mono">{shareUrl}</p>
                    <button
                      onClick={() => onCopyShareLink(shareUrl)}
                      className="text-black"
                    >
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                  <ActionButton
                    label="Copy Link"
                    icon="fa-link"
                    onClick={() => onCopyShareLink(shareUrl)}
                  />
                </div>
              </div>
            )}
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
            ) : (
              !isSeller && (
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
              )
            )}
          </aside>
        </div>
      )}

      {currentTab === "sale" && (
        <SaleDetailsPanel
          tx={tx}
          terms={terms}
          quantity={quantity}
          unitPrice={unitPrice}
          currency={walletCurrency}
        />
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
}) {
  const tx = room.transaction;
  const role = selfRoleFor(room, selfId);
  const heading = transactionRoomHeading(room);
  const progressPct = statusApproxProgress(tx.status);
  const canAccept = role === "buyer" && tx.status === "AWAITING_ACCEPTANCE" && !tx.acceptedPartyIds.includes(selfId);
  const canPay = role === "buyer" && tx.status === "AWAITING_FUNDING";

  // Determine next states based on role (same logic as mobile)
  const getNextStates = () => {
    if (role === "buyer") {
      if (tx.status === "AWAITING_ACCEPTANCE") return [];
      if (tx.status === "AWAITING_FUNDING") return [];
      if (tx.status === "FUNDED") return [];
      if (tx.status === "IN_PROGRESS") return [];
      if (tx.status === "INSPECTION") return ["COMPLETED"];
      return [];
    }
    if (role === "seller") {
      if (tx.status === "FUNDED") return ["IN_PROGRESS"];
      if (tx.status === "IN_PROGRESS") return ["INSPECTION"];
      return [];
    }
    return [];
  };
  const nextStates = getNextStates();
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
        isPublicShareable={false}
        progressPct={progressPct}
        currency={walletCurrency}
      />
      <RoomTabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

      {currentTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <StatusBadge status={tx.status} />
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-black">
                  Secure Escrow
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                  {role === "buyer" ? "You are the Buyer" : role === "seller" ? "You are the Seller" : "Collaborator"}
                </span>
              </div>
              <h1 className="text-xl font-black text-gray-900">{heading}</h1>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              <ProgressCircles progressPct={progressPct} />
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-black p-5 text-white">
              <p className="text-xs font-bold text-blue-200 uppercase">Total Amount</p>
              <p className="text-4xl font-black mt-1">{money(tx.amount, walletCurrency)}</p>
            </div>
            {canPay ? (
              <TransactionPaymentPanel
                token={token}
                transactionId={tx.id}
                amount={tx.amount}
                currency={walletCurrency}
                onPaid={async () => await onReload()}
              />
            ) : (
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
            )}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-base font-black text-gray-900">Deal Summary</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-sm font-black text-black">{money(tx.amount, walletCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Type</span>
                  <span className="text-sm font-bold text-gray-900">{formatTransactionType(tx.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Funding</span>
                  <span className="text-sm font-bold text-gray-900">Buyer payment</span>
                </div>
              </div>
            </div>
          </aside>
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
    setBusy(true);
    setErr(null);
    try {
      await txApi.updateTransactionState(token, room.transaction.id, user.id, next);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
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
      </div>
    </div>
  );
}