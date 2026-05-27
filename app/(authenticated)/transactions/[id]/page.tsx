"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { isProfileComplete } from "@/src/lib/auth/profile";
import * as txApi from "@/src/lib/api/transactions";
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
import { CURRENCY_PREFIX } from "@/src/config/constants";

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

const EMPTY_ANALYTICS: PublicTransactionAnalytics = {
  totalViews: 0,
  uniqueViewers: 0,
  paidCount: 0,
  totalEarnings: "0.00",
  conversionRate: "0.0",
  viewedNotBought: 0,
  recentViewers: [],
};

type RoomTabId =
  | "overview"
  | "buyers"
  | "details"
  | "parties"
  | "team"
  | "analytics"
  | "timeline"
  | "deliveryDetails";

type RoomTab = {
  id: RoomTabId;
  label: string;
  icon: string;
};

function selfRoleFor(room: TransactionRoom, userId: string): SelfRole {
  const tx = room.transaction;
  if (userId === tx.buyerId) return "buyer";
  if (userId === tx.sellerId) return "seller";
  return "other";
}

function statusColor(status: string): { bg: string; text: string; dot: string } {
  if (status === "COMPLETED" || status === "CLOSED")
    return { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" };
  if (status === "DISPUTED")
    return { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" };
  if (status === "FUNDED" || status === "IN_PROGRESS" || status === "INSPECTION")
    return { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" };
  return { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" };
}

function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY_PREFIX}${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
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

function canShowInviteButton(opts: {
  isOwner: boolean;
  pricingEnabled: boolean;
  invitedUserId?: string | null;
  inviteStatus?: string | null;
}): { show: boolean; label: string } {
  if (!opts.isOwner || !opts.pricingEnabled)
    return { show: false, label: "Invite" };
  const hasInvite = !!opts.invitedUserId;
  const status = (opts.inviteStatus ?? "NONE").toUpperCase();
  if (!hasInvite) return { show: true, label: "Invite" };
  if (status === "PENDING") return { show: true, label: "Change invite" };
  return { show: false, label: "Invite" };
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {formatStatus(status)}
    </span>
  );
}

// ─────────────────────────────────────────────
// TAB BAR — big, clear, easy to tap
// ─────────────────────────────────────────────

function RoomTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: RoomTab[];
  active: RoomTabId;
  onChange: (tab: RoomTabId) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex min-w-max items-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold transition-all ${selected
                ? "bg-gambian-blue text-white shadow-md"
                : "bg-white text-gambian-blue border-2 border-gambian-blue/20 hover:border-gambian-blue/50 hover:bg-gambian-blue/5"
              }`}
          >
            <i className={`fas ${tab.icon}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRESS STEPS — simple numbered circles
// ─────────────────────────────────────────────

function StepDot({ num, done, active, label }: { num: number; done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black border-2 transition-all ${done
            ? "bg-gambian-blue border-gambian-blue text-white"
            : active
              ? "bg-white border-gambian-blue text-gambian-blue shadow-[0_0_0_4px_rgba(11,37,69,0.10)]"
              : "bg-white border-gray-200 text-gray-400"
          }`}
      >
        {done ? <i className="fas fa-check text-xs" /> : num}
      </div>
      <span className={`text-center text-xs font-semibold leading-tight ${done || active ? "text-gambian-blue" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

function ProgressStepper({ steps }: { steps: { label: string; done: boolean; active: boolean }[] }) {
  return (
    <div className="relative mt-4 flex items-start justify-between">
      <div className="absolute left-[18px] right-[18px] top-[18px] h-0.5 bg-gray-100" />
      {steps.map((step, i) => (
        <StepDot key={step.label} num={i + 1} done={step.done} active={step.active} label={step.label} />
      ))}
    </div>
  );
}

function PublicProgress({ status, viewed }: { status: string; viewed: boolean }) {
  const steps = [
    { label: "Created", done: true, active: false },
    {
      label: "Viewed",
      done: viewed || FUNDED_STATUSES.includes(status),
      active: status === "AWAITING_ACCEPTANCE" && viewed,
    },
    {
      label: "Paid",
      done: FUNDED_STATUSES.includes(status),
      active: status === "AWAITING_FUNDING",
    },
    {
      label: "Delivery",
      done: ["IN_PROGRESS", "INSPECTION", "COMPLETED", "CLOSED"].includes(status),
      active: status === "FUNDED",
    },
    {
      label: "Complete",
      done: ["COMPLETED", "CLOSED"].includes(status),
      active: status === "INSPECTION",
    },
  ];
  if (status === "COMPLETED" || status === "CLOSED") steps[4].active = true;
  return <ProgressStepper steps={steps} />;
}

function SecureEscrowSteps({ status }: { status: string }) {
  const steps = [
    { label: "Agreement", done: true, active: status === "AWAITING_ACCEPTANCE" },
    {
      label: "Funding",
      done: FUNDED_STATUSES.includes(status) || ["IN_PROGRESS", "INSPECTION", "COMPLETED", "CLOSED"].includes(status),
      active: status === "AWAITING_FUNDING",
    },
    {
      label: "Delivery",
      done: ["IN_PROGRESS", "INSPECTION", "COMPLETED", "CLOSED"].includes(status),
      active: status === "FUNDED",
    },
    {
      label: "Inspection",
      done: ["INSPECTION", "COMPLETED", "CLOSED"].includes(status),
      active: status === "IN_PROGRESS",
    },
    {
      label: "Complete",
      done: ["COMPLETED", "CLOSED"].includes(status),
      active: status === "INSPECTION",
    },
  ];
  if (status === "COMPLETED" || status === "CLOSED") steps[4].active = true;
  return <ProgressStepper steps={steps} />;
}

// ─────────────────────────────────────────────
// INFO ROW — simple label + value
// ─────────────────────────────────────────────

function InfoRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className={`font-bold text-gray-900 text-right ${big ? "text-lg" : "text-sm"}`}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// CARD wrapper
// ─────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// ACTION BUTTON — big, easy to press
// ─────────────────────────────────────────────

function PrimaryBtn({
  label,
  busy,
  onClick,
  icon,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gambian-blue px-6 py-4 text-base font-bold text-white shadow transition hover:bg-gambian-blue/90 active:scale-95 disabled:opacity-50"
    >
      {busy ? <i className="fas fa-circle-notch fa-spin" /> : icon ? <i className={`fas ${icon}`} /> : null}
      <span>{busy ? "Please wait..." : label}</span>
    </button>
  );
}

function DangerBtn({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-base font-bold text-red-700 transition hover:bg-red-100 active:scale-95 disabled:opacity-50"
    >
      {busy ? <i className="fas fa-circle-notch fa-spin" /> : null}
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// AMOUNT HERO
// ─────────────────────────────────────────────

function AmountHero({ amount, quantity, unitPrice }: { amount: string; quantity: number; unitPrice: string }) {
  return (
    <div className="rounded-2xl bg-gambian-blue p-6 text-white shadow-lg">
      <p className="text-sm font-semibold text-blue-200 mb-1">Total Amount</p>
      <p className="text-5xl font-black tracking-tight leading-none">{money(amount)}</p>
      {quantity > 1 && (
        <p className="mt-2 text-sm text-blue-200">
          {quantity} items × {money(unitPrice)} each
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// NEXT STEP CARD — prominent call-to-action
// ─────────────────────────────────────────────

function NextStepCard({
  icon,
  title,
  description,
  action,
  actionNext,
  dangerLabel,
  dangerNext,
  busy,
  onAction,
}: {
  icon: string;
  title: string;
  description: string;
  action?: string;
  actionNext?: string;
  dangerLabel?: string;
  dangerNext?: string;
  busy: boolean;
  onAction: (next: string) => void;
}) {
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gambian-blue/10 text-gambian-blue">
            <i className={`fas ${icon} text-xl`} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        </div>
        {action && actionNext && (
          <PrimaryBtn label={action} busy={busy} onClick={() => onAction(actionNext)} />
        )}
        {dangerLabel && dangerNext && (
          <div className="mt-3">
            <DangerBtn label={dangerLabel} busy={busy} onClick={() => onAction(dangerNext)} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────────

function TimelinePanel({ room, selfId }: { room: TransactionRoom; selfId: string }) {
  const events = room.timeline ?? [];
  return (
    <Card>
      <CardHeader title="Activity History" subtitle="Everything that happened in this transaction" />
      <div className="divide-y divide-gray-50 max-h-[32rem] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <i className="fas fa-clock text-3xl text-gray-200 mb-3 block" />
            <p className="text-sm text-gray-400">No activity yet</p>
          </div>
        ) : (
          events.map((ev) => {
            const detail = formatTimelineDetail(ev.action, ev.detail);
            return (
            <div key={`${ev.at}-${ev.action}`} className="flex gap-4 px-5 py-4">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gambian-blue mt-2" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{formatTimelineAction(ev.action, ev.detail)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(ev.at)}</p>
                {detail && (
                  <p className="text-sm text-gray-600 mt-1">{detail}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  By: {timelineActorLabel(ev.actorId, room, selfId)}
                </p>
              </div>
            </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// COLLABORATION / TEAM
// ─────────────────────────────────────────────

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
  const btn = canShowInviteButton({ isOwner, pricingEnabled, invitedUserId, inviteStatus });
  const pendingForSelf = selfId === invitedUserId && inviteStatus === "PENDING";

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black ${role === "LAWYER" ? "bg-gambian-blue" : "bg-gambian-blue/60"}`}>
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
      {btn.show && (
        <button
          type="button"
          disabled={busy}
          onClick={() => openInvite(role, partySide)}
          className="w-full rounded-xl bg-gambian-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-gambian-blue/90 disabled:opacity-50 transition"
        >
          {btn.label}
        </button>
      )}
      {pendingForSelf && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onAcceptParticipant(role, partySide)}
          className="w-full rounded-xl border-2 border-gambian-blue bg-white px-4 py-2.5 text-sm font-bold text-gambian-blue hover:bg-gambian-blue/5 disabled:opacity-50 transition mt-2"
        >
          Accept invite
        </button>
      )}
    </div>
  );
}

function CollaborationPanel({
  room, selfId, busy, openInvite, onAcceptParticipant,
}: {
  room: TransactionRoom;
  selfId: string;
  busy: boolean;
  openInvite: (role: ParticipantRole, partySide: PartySide) => void;
  onAcceptParticipant: (role: ParticipantRole, partySide: PartySide) => Promise<void>;
}) {
  const tx = room.transaction;
  const agentPricingEnabled = room.product?.productType.agentPricingEnabled ?? false;
  const lawyerPricingEnabled = room.product?.productType.lawyerPricingEnabled ?? false;
  return (
    <Card>
      <CardHeader title="Lawyers & Agents" subtitle="Professionals helping with this transaction" />
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <ProfessionalSlot title="Buyer's Lawyer" role="LAWYER" partySide="buyer" pricingEnabled={lawyerPricingEnabled} isOwner={selfId === tx.buyerId} invitedUserId={tx.buyerLawyerId} inviteStatus={tx.buyerLawyerInviteStatus} party={room.parties?.buyerLawyer ?? null} selfId={selfId} busy={busy} openInvite={openInvite} onAcceptParticipant={onAcceptParticipant} />
        <ProfessionalSlot title="Buyer's Agent" role="AGENT" partySide="buyer" pricingEnabled={agentPricingEnabled} isOwner={selfId === tx.buyerId} invitedUserId={tx.buyerAgentId} inviteStatus={tx.buyerAgentInviteStatus} party={room.parties?.buyerAgent ?? null} selfId={selfId} busy={busy} openInvite={openInvite} onAcceptParticipant={onAcceptParticipant} />
        <ProfessionalSlot title="Seller's Lawyer" role="LAWYER" partySide="seller" pricingEnabled={lawyerPricingEnabled} isOwner={selfId === tx.sellerId} invitedUserId={tx.sellerLawyerId} inviteStatus={tx.sellerLawyerInviteStatus} party={room.parties?.sellerLawyer ?? null} selfId={selfId} busy={busy} openInvite={openInvite} onAcceptParticipant={onAcceptParticipant} />
        <ProfessionalSlot title="Seller's Agent" role="AGENT" partySide="seller" pricingEnabled={agentPricingEnabled} isOwner={selfId === tx.sellerId} invitedUserId={tx.sellerAgentId} inviteStatus={tx.sellerAgentInviteStatus} party={room.parties?.sellerAgent ?? null} selfId={selfId} busy={busy} openInvite={openInvite} onAcceptParticipant={onAcceptParticipant} />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// BUYERS TABLE
// ─────────────────────────────────────────────

function ShareableBuyersPanel({
  orders, busy, onOrderTransition,
}: {
  orders: NonNullable<TransactionRoom["shareBuyerOrders"]>;
  busy: boolean;
  onOrderTransition: (orderId: string, next: string) => Promise<void>;
}) {
  function sellerAction(status: string): { label: string; next: string } | null {
    if (status === "FUNDED") return { label: transitionActionLabel("IN_PROGRESS"), next: "IN_PROGRESS" };
    if (status === "IN_PROGRESS") return { label: "Send to buyer", next: "INSPECTION" };
    return null;
  }

  if (!orders.length) {
    return (
      <Card>
        <div className="px-5 py-14 text-center">
          <i className="fas fa-users text-4xl text-gray-200 mb-3 block" />
          <p className="text-base font-bold text-gray-400">No buyers yet</p>
          <p className="text-sm text-gray-300 mt-1">Share your payment link to get started</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Buyers" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"}`} />
      <div className="divide-y divide-gray-50">
        {orders.map((order) => {
          const action = sellerAction(order.status);
          const c = statusColor(order.status);
          return (
            <div key={order.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {order.buyer?.displayName || order.buyer?.email || order.buyer?.phone || "Buyer"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} /> {formatStatus(order.status)}
                  </span>
                  <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-gray-900">{money(order.amount)}</p>
                {action ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onOrderTransition(order.id, action.next)}
                    className="mt-1.5 rounded-xl bg-gambian-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-gambian-blue/90 disabled:opacity-50 transition"
                  >
                    {action.label}
                  </button>
                ) : order.status === "INSPECTION" ? (
                  <span className="text-xs text-gray-400 mt-1 block">Awaiting buyer</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// SALE DETAILS PANEL
// ─────────────────────────────────────────────

function SaleDetailsPanel({
  tx, terms, quantity, unitPrice,
}: {
  tx: TransactionRoom["transaction"];
  terms: ReturnType<typeof parsePublicTerms>;
  quantity: number;
  unitPrice: string;
}) {
  return (
    <Card>
      <CardHeader title="Sale Details" subtitle="What is being bought and sold" />
      <div className="px-5 py-4">
        <InfoRow label="Quantity" value={String(quantity)} />
        <InfoRow label="Price per item" value={money(unitPrice)} />
        <InfoRow label="Total amount" value={money(tx.amount)} big />
        <InfoRow label="Delivery" value={terms.deliveryNeeded ? "Delivery tracked" : "Payment only"} />
        <InfoRow label="Status" value={formatStatus(tx.status)} />
        {terms.itemDescription && (
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{terms.itemDescription}</p>
          </div>
        )}
        {terms.sellerNote && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">Note from seller</p>
            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{terms.sellerNote}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// PAYMENT LINK CARD
// ─────────────────────────────────────────────

function PaymentLinkCard({
  shareUrl, sharePath, onCopyShareLink,
}: {
  shareUrl: string;
  sharePath: string;
  onCopyShareLink: (url: string) => Promise<void>;
}) {
  return (
    <Card>
      <div className="rounded-t-2xl bg-gambian-blue px-5 py-4">
        <p className="text-xs font-bold text-blue-200 uppercase tracking-wide">Payment Link</p>
        <p className="text-sm font-bold text-white mt-0.5">Share this link with your buyers</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="flex-1 truncate font-mono text-xs text-gray-600">{shareUrl}</p>
          <button
            type="button"
            onClick={() => void onCopyShareLink(shareUrl)}
            className="shrink-0 text-gambian-blue hover:text-gambian-blue/70 transition"
            title="Copy link"
          >
            <i className="fas fa-copy" />
          </button>
        </div>
        <PrimaryBtn label="Copy Link" busy={false} onClick={() => void onCopyShareLink(shareUrl)} icon="fa-link" />
        <Link
          href={sharePath}
          className="block w-full rounded-2xl border-2 border-gambian-blue/20 bg-white px-5 py-3.5 text-center text-sm font-bold text-gambian-blue hover:bg-gambian-blue/5 transition"
        >
          Open Checkout Page →
        </Link>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// PUBLIC ACTION PANEL
// ─────────────────────────────────────────────

function PublicActionPanel({
  role, tx, status, busy, isPaid, onTransition,
}: {
  role: SelfRole;
  tx: TransactionRoom["transaction"];
  status: string;
  busy: boolean;
  isPaid: boolean;
  onTransition: (next: string) => Promise<void>;
}) {
  const canClose = canBuyerCloseTransaction(role, tx);

  let icon = "fa-hourglass-half";
  let title = "Waiting for buyer";
  let description = "Share your payment link to start receiving payments.";
  let action: { label: string; next: string } | null = null;
  let dangerAction: { label: string; next: string } | null = null;

  if (status === "FUNDED" && role === "seller") {
    icon = "fa-box-open";
    title = "Payment is secured!";
    description = "The buyer's money is safely held. Start delivery when ready.";
    action = { label: transitionActionLabel("IN_PROGRESS"), next: "IN_PROGRESS" };
  } else if (status === "IN_PROGRESS" && role === "seller") {
    icon = "fa-truck";
    title = "Delivery in progress";
    description = "Once you have delivered or completed the service, send it to the buyer for inspection.";
    action = { label: "Send to Buyer for Inspection", next: "INSPECTION" };
  } else if (status === "INSPECTION" && role === "buyer") {
    icon = "fa-check-circle";
    title = "Did you receive the item?";
    description = "If you are happy with what you received, confirm to release the money to the seller.";
    action = { label: "Confirm & Release Money", next: "COMPLETED" };
  } else if (status === "COMPLETED" || status === "CLOSED") {
    icon = "fa-check-circle";
    title = "Done! Transaction complete";
    description = "Money has been released to the seller. Thank you for using SafePay Gambia.";
  } else if (status === "DISPUTED") {
    icon = "fa-exclamation-triangle";
    title = "Dispute in progress";
    description = "Our team is reviewing this dispute. We will contact both parties soon.";
  } else if (isPaid) {
    icon = "fa-shield-alt";
    title = "Money is held safely";
    description = "Payment is secured in escrow. Waiting for the seller to begin.";
  }

  if (canClose) {
    dangerAction = { label: "Close Transaction", next: "CLOSED" };
  }

  return (
    <NextStepCard
      icon={icon}
      title={title}
      description={description}
      action={action?.label}
      actionNext={action?.next}
      dangerLabel={dangerAction?.label}
      dangerNext={dangerAction?.next}
      busy={busy}
      onAction={(next) => void onTransition(next)}
    />
  );
}

// ─────────────────────────────────────────────
// SECURE ACTION PANEL
// ─────────────────────────────────────────────

function SecureActionPanel({
  role, tx, status, busy, canAccept, onAccept, onTransition,
}: {
  role: SelfRole;
  tx: TransactionRoom["transaction"];
  status: string;
  busy: boolean;
  canAccept: boolean;
  onAccept: () => Promise<void>;
  onTransition: (next: string) => Promise<void>;
}) {
  const canClose = canBuyerCloseTransaction(role, tx);
  const canDispute = ["FUNDED", "IN_PROGRESS", "INSPECTION"].includes(status) && (role === "buyer" || role === "seller");

  if (canAccept) {
    return (
      <Card>
        <div className="rounded-t-2xl bg-gambian-blue p-5 text-white">
          <i className="fas fa-handshake text-3xl mb-2 block" />
          <h3 className="text-lg font-extrabold">Accept This Deal</h3>
          <p className="text-sm text-blue-200 mt-1">Review the terms, then accept to continue.</p>
        </div>
        <div className="p-5">
          <PrimaryBtn label="Accept Transaction" busy={busy} onClick={() => void onAccept()} icon="fa-check" />
        </div>
      </Card>
    );
  }

  let icon = "fa-hourglass-half";
  let title = "Escrow room";
  let description = "Waiting for the next party to act.";
  let action: { label: string; next: string } | null = null;

  if (status === "AWAITING_ACCEPTANCE") { icon = "fa-user-check"; title = "Waiting for buyer"; description = "The buyer needs to accept the deal first."; }
  else if (status === "AWAITING_FUNDING") { icon = "fa-money-bill"; title = "Waiting for payment"; description = "Buyer needs to fund the escrow."; }
  else if (status === "FUNDED" && role === "seller") { icon = "fa-box-open"; title = "Money is secured"; description = "Begin delivery when ready."; action = { label: transitionActionLabel("IN_PROGRESS"), next: "IN_PROGRESS" }; }
  else if (status === "IN_PROGRESS" && role === "seller") { icon = "fa-truck"; title = "Deliver to buyer"; description = "Move to inspection after delivery."; action = { label: "Send to Inspection", next: "INSPECTION" }; }
  else if (status === "INSPECTION" && role === "buyer") { icon = "fa-check"; title = "Inspect & release"; description = "Confirm when you have received and checked the item."; action = { label: "Confirm and Release Money", next: "COMPLETED" }; }
  else if (status === "COMPLETED" || status === "CLOSED") { icon = "fa-check-circle"; title = "Complete!"; description = "Money has been released. Transaction finished."; }
  else if (status === "DISPUTED") { icon = "fa-exclamation"; title = "Dispute active"; description = "Our support team is investigating. Both parties will be contacted."; }

  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gambian-blue/10 text-gambian-blue">
            <i className={`fas ${icon} text-xl`} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        {action && <PrimaryBtn label={action.label} busy={busy} onClick={() => void onTransition(action!.next)} />}
        {canDispute && (
          <DangerBtn label="Open Dispute" busy={busy} onClick={() => void onTransition("DISPUTED")} />
        )}
        {canClose && (
          <DangerBtn label="Close Transaction" busy={busy} onClick={() => void onTransition("CLOSED")} />
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// DEAL SUMMARY CARD
// ─────────────────────────────────────────────

function DealSummaryCard({ tx }: { tx: TransactionRoom["transaction"] }) {
  return (
    <Card>
      <CardHeader title="Deal Summary" />
      <div className="px-5 py-2">
        <InfoRow label="Amount" value={money(tx.amount)} big />
        <InfoRow label="Type" value={formatTransactionType(tx.type)} />
        <InfoRow label="Funding" value="Buyer payment" />
        <InfoRow label="Release" value="Buyer confirmation" />
      </div>
    </Card>
  );
}

function TransactionHero({
  tx,
  title,
  role,
  isPublicShareable,
  progressPct,
  subtitle,
}: {
  tx: TransactionRoom["transaction"];
  title: string;
  role: SelfRole;
  isPublicShareable: boolean;
  progressPct: number;
  subtitle?: string;
}) {
  const roleLabel = role === "buyer" ? "Buyer" : role === "seller" ? "Seller" : "Collaborator";
  return (
    <Card>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={tx.status} />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-gambian-blue">
            {isPublicShareable ? "Shareable sale" : "Two-party escrow"}
          </span>
          <span className="font-mono text-xs text-gray-400">#{tx.id.slice(0, 8)}</span>
        </div>
        <h1 className="text-2xl font-black leading-tight text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm font-semibold text-gray-500">{subtitle}</p> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Amount</p>
            <p className="mt-1 text-xl font-black text-gambian-blue">{money(tx.amount)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Role</p>
            <p className="mt-1 text-base font-black text-gray-900">{roleLabel}</p>
          </div>
        </div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gambian-blue transition-all duration-700"
            style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

function PublicAnalyticsPanel({
  analytics,
  orders,
  busy,
  onOrderTransition,
}: {
  analytics: PublicTransactionAnalytics;
  orders: NonNullable<TransactionRoom["shareBuyerOrders"]>;
  busy: boolean;
  onOrderTransition: (orderId: string, next: string) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Link analytics" subtitle="Views and payments from your shareable link" />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Views</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{analytics.totalViews}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Unique</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{analytics.uniqueViewers}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Paid</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{analytics.paidCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Conversion</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{analytics.conversionRate}%</p>
          </div>
        </div>
      </Card>
      <ShareableBuyersPanel orders={orders} busy={busy} onOrderTransition={onOrderTransition} />
    </div>
  );
}

// ─────────────────────────────────────────────
// PUBLIC SHAREABLE ROOM
// ─────────────────────────────────────────────

function PublicShareableTransactionRoom({
  room, token, selfId, busy, onCopyShareLink, onTransition, onOrderTransition, onReload,
}: {
  room: TransactionRoom;
  token: string;
  selfId: string;
  busy: boolean;
  onCopyShareLink: (url: string) => Promise<void>;
  onTransition: (next: string) => Promise<void>;
  onOrderTransition: (orderId: string, next: string) => Promise<void>;
  onReload: () => Promise<void> | void;
}) {
  const tx = room.transaction;
  const role = selfRoleFor(room, selfId);
  const isTemplate = !!tx.shareToken;
  const isSellerTemplate = isTemplate && role === "seller";
  const buyerOrders = room.shareBuyerOrders ?? [];
  const analytics = room.publicAnalytics ?? EMPTY_ANALYTICS;
  const terms = parsePublicTerms(tx.terms);
  const sharePath = tx.sharePath ?? (tx.shareToken ? `/pay/${tx.shareToken}` : null);
  const shareUrl = sharePath && typeof window !== "undefined"
    ? new URL(sharePath, window.location.origin).toString()
    : sharePath;
  const isPaid = FUNDED_STATUSES.includes(tx.status);
  const canPay = !isTemplate && role === "buyer" && tx.status === "AWAITING_FUNDING";
  const quantity = tx.quantity ?? 1;
  const unitPrice = tx.unitPrice ?? tx.amount;

  const tabs = useMemo<RoomTab[]>(() => {
    const items: RoomTab[] = [
      { id: "overview", label: "Overview", icon: "fa-home" },
      { id: "details", label: "Sale", icon: "fa-receipt" },
      { id: "parties", label: "Parties", icon: "fa-users" },
    ];
    if (isSellerTemplate) {
      items.push({ id: "analytics", label: "Analytics", icon: "fa-chart-line" });
    }
    items.push({ id: "timeline", label: "Timeline", icon: "fa-clock" });
    return items;
  }, [isSellerTemplate]);

  const [activeTab, setActiveTab] = useState<RoomTabId>("overview");
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? "overview";

  return (
    <div className="space-y-5">
      <TransactionHero
        tx={tx}
        title={tx.productTitle}
        role={role}
        isPublicShareable
        progressPct={statusApproxProgress(tx.status)}
        subtitle={isSellerTemplate ? `${buyerOrders.length} buyer order${buyerOrders.length === 1 ? "" : "s"}` : undefined}
      />
      <RoomTabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

      {/* OVERVIEW TAB */}
      {currentTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Card>
              <CardHeader title="Overview" subtitle={tx.productTitle} />
              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={tx.status} />
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-gambian-blue">Shareable sale</span>
                </div>
                <PublicProgress status={tx.status} viewed={false} />
              </div>
            </Card>
            <SaleDetailsPanel tx={tx} terms={terms} quantity={quantity} unitPrice={unitPrice} />
          </div>
          <aside className="space-y-4">
            <AmountHero amount={tx.amount} quantity={quantity} unitPrice={unitPrice} />
            {isSellerTemplate && shareUrl && sharePath && (
              <PaymentLinkCard shareUrl={shareUrl} sharePath={sharePath} onCopyShareLink={onCopyShareLink} />
            )}
            {!isSellerTemplate && canPay ? (
              <TransactionPaymentPanel
                token={token}
                transactionId={tx.id}
                amount={tx.amount}
                onPaid={async (paidTransactionId) => {
                  if (paidTransactionId !== tx.id) {
                    window.location.href = `/transactions/${paidTransactionId}`;
                    return;
                  }
                  await onReload();
                }}
              />
            ) : !isSellerTemplate ? (
              <PublicActionPanel role={role} tx={tx} status={tx.status} busy={busy} isPaid={isPaid} onTransition={onTransition} />
            ) : null}
          </aside>
        </div>
      )}

      {/* DETAILS TAB */}
      {currentTab === "details" && (
        <SaleDetailsPanel tx={tx} terms={terms} quantity={quantity} unitPrice={unitPrice} />
      )}

      {/* PARTIES TAB */}
      {currentTab === "parties" && (
        <Card>
          <CardHeader title="Buyer and seller" />
          <div className="p-5">
            <TransactionRoomParties
              buyer={room.parties?.buyer ?? null}
              seller={room.parties?.seller ?? null}
              selfId={selfId}
            />
          </div>
        </Card>
      )}

      {/* ANALYTICS TAB */}
      {currentTab === "analytics" && isSellerTemplate && (
        <PublicAnalyticsPanel
          analytics={analytics}
          orders={buyerOrders}
          busy={busy}
          onOrderTransition={onOrderTransition}
        />
      )}

      {/* TIMELINE TAB */}
      {currentTab === "timeline" && <TimelinePanel room={room} selfId={selfId} />}

      {/* DELIVERY TAB */}
      {currentTab === "deliveryDetails" && (
        <Card>
          <CardHeader title="Delivery Details" />
          <div className="px-5 py-6">
            <div className="flex items-center gap-3">
              <i className={`fas fa-${terms.deliveryNeeded ? "truck" : "money-bill"} text-2xl text-gambian-blue`} />
              <p className="text-base text-gray-700 font-medium">
                {terms.deliveryNeeded
                  ? "Delivery tracking is enabled for this transaction."
                  : "No delivery. This is a payment-only transaction."}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECURE ESCROW ROOM
// ─────────────────────────────────────────────

function SecureEscrowTransactionRoom({
  room, token, selfId, busy, onAccept, onTransition, openInvite, onAcceptParticipant, onReload,
}: {
  room: TransactionRoom;
  token: string;
  selfId: string;
  busy: boolean;
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
  const buyerCanPay = role === "buyer" && tx.status === "AWAITING_FUNDING";

  const tabs = useMemo<RoomTab[]>(() => [
    { id: "overview", label: "Overview", icon: "fa-home" },
    { id: "details", label: "Product", icon: "fa-box-open" },
    { id: "parties", label: "People", icon: "fa-users" },
    { id: "team", label: "Lawyers", icon: "fa-user-tie" },
    { id: "timeline", label: "History", icon: "fa-clock" },
  ], []);

  const [activeTab, setActiveTab] = useState<RoomTabId>("overview");
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : "overview";

  return (
    <div className="space-y-5">
      <TransactionHero
        tx={tx}
        title={heading}
        role={role}
        isPublicShareable={false}
        progressPct={progressPct}
      />
      <RoomTabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

      {/* OVERVIEW */}
      {currentTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Card>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <StatusBadge status={tx.status} />
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Secure Escrow
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${role === "buyer" ? "bg-green-50 text-green-700" : role === "seller" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                    {role === "buyer" ? "You are the Buyer" : role === "seller" ? "You are the Seller" : "Collaborator"}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-gray-900 leading-tight">{heading}</h1>

                {/* progress bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gambian-blue transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <SecureEscrowSteps status={tx.status} />
              </div>
            </Card>
          </div>

          <aside className="space-y-4">
            <AmountHero amount={tx.amount} quantity={1} unitPrice={tx.amount} />
            {buyerCanPay ? (
              <TransactionPaymentPanel
                token={token}
                transactionId={tx.id}
                amount={tx.amount}
                onPaid={async () => { await onReload(); }}
              />
            ) : (
              <SecureActionPanel
                role={role}
                tx={tx}
                status={tx.status}
                busy={busy}
                canAccept={canAccept}
                onAccept={onAccept}
                onTransition={onTransition}
              />
            )}
            <DealSummaryCard tx={tx} />
          </aside>
        </div>
      )}

      {/* PRODUCT */}
      {currentTab === "details" && (
        room.product ? (
          <TransactionRoomProduct product={room.product} />
        ) : (
          <Card>
            <div className="p-6 text-center text-gray-400">
              <i className="fas fa-box-open text-3xl mb-3 block" />
              <p>Product details are not available right now.</p>
            </div>
          </Card>
        )
      )}

      {/* PARTIES */}
      {currentTab === "parties" && (
        <Card>
          <CardHeader title="Buyer & Seller" subtitle="The two parties in this transaction" />
          <div className="p-5">
            <TransactionRoomParties
              buyer={room.parties?.buyer ?? null}
              seller={room.parties?.seller ?? null}
              selfId={selfId}
            />
          </div>
        </Card>
      )}

      {/* TEAM */}
      {currentTab === "team" && (
        <CollaborationPanel room={room} selfId={selfId} busy={busy} openInvite={openInvite} onAcceptParticipant={onAcceptParticipant} />
      )}

      {/* TIMELINE */}
      {currentTab === "timeline" && <TimelinePanel room={room} selfId={selfId} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────

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

  const load = useCallback(async () => {
    if (!id || !token) return;
    setErr(null);
    try {
      const r = await txApi.getTransactionRoom(token, id);
      setRoom(r);
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

  async function onOrderTransition(orderId: string, next: string) {
    if (!user || !token) return;
    setBusy(true);
    setErr(null);
    try {
      await txApi.updateTransactionState(token, orderId, user.id, next);
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
    window.setTimeout(() => setToast(null), 2500);
  }

  if (loading || !user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin text-3xl text-gambian-blue mb-3 block" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const tx = room?.transaction;
  const isPublicShareable = tx?.workflow === "PUBLIC_SHAREABLE";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-6">

        {/* Toast */}
        {toast && (
          <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl bg-gambian-blue px-5 py-3.5 text-sm font-bold text-white shadow-xl">
            <i className="fas fa-check-circle" />
            {toast}
          </div>
        )}

        {/* Back */}
        <Link
          href="/transactions"
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          <i className="fas fa-arrow-left text-xs" />
          Back to Transactions
        </Link>

        {/* Error */}
        {err && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <i className="fas fa-exclamation-circle text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-800 font-medium">{err}</p>
          </div>
        )}

        {/* Loading */}
        {!room && !err && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
            <i className="fas fa-circle-notch fa-spin text-2xl text-gambian-blue mb-3 block" />
            <p className="text-gray-400 text-sm">Loading transaction details...</p>
          </div>
        )}

        {/* Room content */}
        {room && tx && (
          isPublicShareable ? (
            <PublicShareableTransactionRoom
              room={room}
              token={token}
              selfId={user.id}
              busy={busy}
              onCopyShareLink={copyShareLink}
              onTransition={onTransition}
              onOrderTransition={onOrderTransition}
              onReload={load}
            />
          ) : (
            <>
              <SecureEscrowTransactionRoom
                room={room}
                token={token}
                selfId={user.id}
                busy={busy}
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
