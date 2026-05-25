import type { MeUser } from "@/src/lib/api/types";

/** True when the user may open the new-transaction flow (server enforces the same rule). */
export function userMayCreateTransactions(user: MeUser): boolean {
  if (user.personalKycStatus === "APPROVED") {
    return true;
  }
  if (
    (user.personalKycStatus === undefined || user.personalKycStatus === null) &&
    user.personalKycApprovedAt
  ) {
    return true;
  }
  return false;
}
