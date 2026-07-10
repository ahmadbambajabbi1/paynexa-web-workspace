/** Per-service API bases when calling backends directly. */

function trimUrl(raw: string | undefined, fallback: string): string {
  const v = raw?.trim();
  return (v && v.length > 0 ? v : fallback).replace(/\/$/, "");
}

const defaults = {
  users: "http://127.0.0.1:5001",
  transactions: "http://127.0.0.1:5002",
  escrow: "http://127.0.0.1:5003",
  messages: "http://127.0.0.1:5004",
  products: "http://127.0.0.1:5005",
} as const;

export const SERVICE_URLS = {
  users: trimUrl(process.env.NEXT_PUBLIC_USER_SERVICE_URL, defaults.users),
  transactions: trimUrl(
    process.env.NEXT_PUBLIC_TRANSACTION_SERVICE_URL,
    defaults.transactions,
  ),
  escrow: trimUrl(process.env.NEXT_PUBLIC_ESCROW_SERVICE_URL, defaults.escrow),
  messages: trimUrl(
    process.env.NEXT_PUBLIC_MESSAGING_SERVICE_URL,
    defaults.messages,
  ),
  products: trimUrl(
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL,
    defaults.products,
  ),
} as const;

/** Resolve the service base URL for an API path (e.g. `/users/me`). */
export function serviceBaseUrlForPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/users" || p.startsWith("/users/")) return SERVICE_URLS.users;
  if (p === "/transactions" || p.startsWith("/transactions/"))
    return SERVICE_URLS.transactions;
  if (p === "/escrow" || p.startsWith("/escrow/")) return SERVICE_URLS.escrow;
  if (p === "/webhooks" || p.startsWith("/webhooks/")) return SERVICE_URLS.escrow;
  if (p === "/messages" || p.startsWith("/messages/"))
    return SERVICE_URLS.messages;
  if (
    p === "/products" ||
    p.startsWith("/products/") ||
    p === "/service-marketplace" ||
    p.startsWith("/service-marketplace/")
  ) {
    return SERVICE_URLS.products;
  }
  throw new Error(`No direct service mapping for API path: ${p}`);
}

export function apiUrlForPath(path: string): string {
  const base = serviceBaseUrlForPath(path);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export const STORAGE_ACCESS_TOKEN = "paynexa_access_token";
export const STORAGE_DEVICE_ID = "paynexa_device_id";

export const APP_NAME = "PayNexa";
export const APP_NAME_REGION = "";

/** Custom URL scheme for deep links back into the mobile app after external checkout. */
export const APP_DEEP_LINK_SCHEME = "paynexa";

export const TAGLINE =
  "Share a payment link. Buyer pays into escrow. Release when the deal is done.";

export const HERO_SUBTITLE =
  "Paynexa helps two people complete a deal safely — seller shares a link, buyer pays from wallet or card, and funds stay protected until you release them.";

/** Shown in create-transaction UI; adjust when pricing is wired server-side. */
export const ESCROW_FEE_PERCENT = 1.5;
export const CURRENCY_PREFIX = "D";
