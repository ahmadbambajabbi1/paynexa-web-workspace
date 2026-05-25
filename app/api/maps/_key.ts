import "server-only";

/** Server-side only — never prefixed with NEXT_PUBLIC. */
export function googleMapsApiKey(): string | null {
  const k = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}
