"use client";

import type { TransactionPartyProfile } from "@/src/lib/api/types";

type Props = {
  buyer: TransactionPartyProfile | null;
  seller: TransactionPartyProfile | null;
  selfId: string;
};

export function TransactionRoomParties({ buyer, seller, selfId }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PartyCard
        label="Buyer"
        icon="fa-user-check"
        accent="blue"
        party={buyer}
        selfId={selfId}
      />
      <PartyCard
        label="Seller"
        icon="fa-store"
        accent="sand"
        party={seller}
        selfId={selfId}
      />
    </div>
  );
}

function PartyCard({
  label,
  icon,
  accent,
  party,
  selfId,
}: {
  label: string;
  icon: string;
  accent: "blue" | "sand";
  party: TransactionPartyProfile | null;
  selfId: string;
}) {
  const isYou = party?.id === selfId;
  const name = party?.displayName?.trim();
  const email = party?.email?.trim();
  const phone = party?.phone?.trim();
  const fallback = party ? "No contact details on file" : "Profile unavailable";
  const shell = accent === "blue"
    ? "border-blue-100 bg-blue-50/80 text-primaryColorBlack"
    : "border-gambian-sand bg-gambian-sand/70 text-gambian-earth";
  const avatar = accent === "blue" ? "bg-primaryColorBlack text-white" : "bg-gambian-earth text-white";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className={`border-b px-4 py-4 ${shell}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg shadow-sm ${avatar}`}>
              <i className={`fas ${icon}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">{label}</p>
              <p className="mt-1 truncate text-lg font-bold text-gray-950">{name || label}</p>
            </div>
          </div>
          {isYou ? (
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primaryColorBlack shadow-sm">You</span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 p-4 text-sm">
        {email ? <ContactRow icon="fa-envelope" value={email} /> : null}
        {phone ? <ContactRow icon="fa-phone" value={phone} /> : null}
        {!email && !phone ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-gray-500">
            {fallback}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-gray-700">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primaryColorBlack shadow-sm">
        <i className={`fas ${icon} text-xs`} />
      </span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}
