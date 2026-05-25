import type { ServiceProvider } from "@/src/lib/api/service-marketplace";

/** True if `value` looks like a user id / cuid mistakenly used as a display name. */
export function marketplaceLooksLikeOpaqueUserId(value: string, userId?: string | null): boolean {
  const v = value.trim();
  if (!v) return true;
  const uid = (userId ?? "").trim();
  if (uid && v === uid) return true;
  if (/^c[a-z0-9]{24,}$/i.test(v)) return true;
  if (/^[0-9a-f-]{36}$/i.test(v)) return true;
  return false;
}

/** Human-readable provider place from ServiceLocation (product-service / pings). */
export function providerLocationLine(provider: ServiceProvider): string | null {
  const loc = provider.location;
  if (!loc) return null;
  const parts = [loc.addressText, loc.region].filter(
    (x): x is string => typeof x === "string" && Boolean(x.trim()),
  );
  const line = parts.join(" · ").trim();
  return line.length >= 2 ? line : null;
}

export function providerDisplayNameFromListing(provider: ServiceProvider): string | null {
  const n = provider.displayName?.trim();
  if (!n || n.length < 1) return null;
  const uid = typeof provider.userId === "string" ? provider.userId : null;
  if (marketplaceLooksLikeOpaqueUserId(n, uid)) return null;
  return n;
}

export function providerBioFromListing(provider: ServiceProvider): string | null {
  const b = provider.bio?.trim();
  return b && b.length > 0 ? b : null;
}
