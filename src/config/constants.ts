/** API gateway base URL (browser). Default matches api-gateway PORT=5000; Next.js escrow_web uses 3000. */
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL =
  rawBase && rawBase.length > 0
    ? rawBase.replace(/\/$/, "")
    : "https://paynexa-api-gateway-production.up.railway.app"
// : "http://127.0.0.1:5000";

export const STORAGE_ACCESS_TOKEN = "paynexa_access_token";
export const STORAGE_DEVICE_ID = "paynexa_device_id";

export const APP_NAME = "Paynexa";
export const APP_NAME_REGION = "Paynexa";

export const TAGLINE =
  "The first escrow platform built specifically for The Gambia";

/** Shown in create-transaction UI; adjust when pricing is wired server-side. */
export const ESCROW_FEE_PERCENT = 1.5;
export const CURRENCY_PREFIX = "D";
