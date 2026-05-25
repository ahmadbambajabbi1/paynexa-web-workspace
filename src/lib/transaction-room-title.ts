import type { TransactionRoom } from "@/src/lib/api/types";
import { productDisplayName } from "@/src/lib/product-display";
import { termsPreview } from "@/src/lib/parse-terms";

export function transactionRoomHeading(room: TransactionRoom): string {
  const p = room.product;
  if (p) return productDisplayName(p);
  const direct = room.transaction.productTitle?.trim();
  if (direct) return direct;
  return termsPreview(room.transaction.terms);
}

export function timelineActorLabel(
  actorId: string,
  room: TransactionRoom,
  selfId: string,
): string {
  if (actorId === selfId) return "You";
  const b = room.parties?.buyer;
  const s = room.parties?.seller;
  const bl = room.parties?.buyerLawyer;
  const ba = room.parties?.buyerAgent;
  const sl = room.parties?.sellerLawyer;
  const sa = room.parties?.sellerAgent;
  if (b?.id === actorId) {
    return b.displayName?.trim() || "Buyer";
  }
  if (s?.id === actorId) {
    return s.displayName?.trim() || "Seller";
  }
  if (bl?.id === actorId) {
    return bl.displayName?.trim() || "Buyer’s lawyer";
  }
  if (ba?.id === actorId) {
    return ba.displayName?.trim() || "Buyer’s agent";
  }
  if (sl?.id === actorId) {
    return sl.displayName?.trim() || "Seller’s lawyer";
  }
  if (sa?.id === actorId) {
    return sa.displayName?.trim() || "Seller’s agent";
  }
  return "Participant";
}
