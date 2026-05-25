import { NextResponse } from "next/server";
import { googleMapsApiKey } from "../_key";

/**
 * Lets the client know if map-backed search is configured (no secret exposure).
 */
export async function GET() {
  const hasGoogleKey = Boolean(googleMapsApiKey());
  const isDevFallback = !hasGoogleKey && process.env.NODE_ENV !== "production";
  return NextResponse.json({
    ready: hasGoogleKey || isDevFallback,
    provider: hasGoogleKey ? "google" : isDevFallback ? "nominatim-dev" : "none",
  });
}
