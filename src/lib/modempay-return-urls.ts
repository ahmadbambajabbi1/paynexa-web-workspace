import { APP_DEEP_LINK_SCHEME } from "@/src/config/constants";

/** Append `deposit=success|cancel` to a same-origin path for post-checkout handling. */
export function withDepositState(path: string, state: "success" | "cancel"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, "http://local");
  url.searchParams.set("deposit", state);
  return `${url.pathname}${url.search}`;
}

/** Deep link that re-opens the PayNexa mobile app after Modem Pay checkout. */
export function buildAppDepositDeepLink(
  outcome: "success" | "cancel",
  context: string,
  id?: string | null,
): string {
  const q = new URLSearchParams({ context });
  if (id?.trim()) q.set("id", id.trim());
  return `${APP_DEEP_LINK_SCHEME}://deposit/${outcome}?${q.toString()}`;
}

/** Build Modem Pay return/cancel URLs that land on our redirect pages first. */
export function buildModernPayReturnUrls(nextPath: string): {
  returnUrl: string;
  cancelUrl: string;
} {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://paynexa-web-workspace.vercel.app";
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const encoded = encodeURIComponent(next);
  return {
    returnUrl: `${origin}/wallet/deposit/success?next=${encoded}`,
    cancelUrl: `${origin}/wallet/deposit/cancel?next=${encoded}`,
  };
}
