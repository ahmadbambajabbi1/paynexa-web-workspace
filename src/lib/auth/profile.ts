import type { MeUser } from "@/src/lib/api/types";

/** Profile + verified email — required before dashboard and escrow actions. */
export function isProfileComplete(user: MeUser | null | undefined): boolean {
  return Boolean(user?.profileCompletedAt && user?.emailVerifiedAt);
}

export function applicationForRole(
  user: MeUser,
  role: "LAWYER" | "AGENT",
): MeUser["professionalApps"][number] | undefined {
  const items = user.professionalApps
    .filter((a) => a.role === role)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return items[0];
}

/** Approved lawyer or agent role for pricing and professional-only UI. */
export function approvedProfessionalRole(
  user: MeUser,
): "LAWYER" | "AGENT" | null {
  const lawyer = applicationForRole(user, "LAWYER");
  if (lawyer && lawyer.status.toUpperCase() === "APPROVED") return "LAWYER";
  const agent = applicationForRole(user, "AGENT");
  if (agent && agent.status.toUpperCase() === "APPROVED") return "AGENT";
  return null;
}

export function canApplyProfessionalKyc(user: MeUser, role: "LAWYER" | "AGENT"): boolean {
  const hasOtherRole = user.professionalApps.some((item) => item.role !== role);
  if (hasOtherRole) return false;
  const a = applicationForRole(user, role);
  if (!a) return true;
  if (a.status === "APPROVED") return false;
  if (a.status === "SUBMITTED" || a.status === "UNDER_REVIEW" || a.status === "DRAFT") {
    return false;
  }
  return a.status === "REJECTED";
}
