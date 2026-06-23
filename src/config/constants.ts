/** API gateway base URL (browser). Default matches api-gateway PORT=5000; Next.js escrow_web uses 3000. */
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL =
  rawBase && rawBase.length > 0
    ? rawBase.replace(/\/$/, "")
    // : "https://paynexa-api-gateway-production.up.railway.app"
: "http://127.0.0.1:5000";

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
