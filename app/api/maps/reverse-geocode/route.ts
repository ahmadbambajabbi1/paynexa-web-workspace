import { NextRequest, NextResponse } from "next/server";
import { googleMapsApiKey } from "../_key";

function scoreGoogleGeocodeResult(r: {
  geometry?: { location_type?: string };
  types?: string[];
}): number {
  const lt = r.geometry?.location_type ?? "";
  let s = 0;
  if (lt === "ROOFTOP") s += 120;
  else if (lt === "RANGE_INTERPOLATED") s += 95;
  else if (lt === "GEOMETRIC_CENTER") s += 55;
  else if (lt === "APPROXIMATE") s += 25;
  const types = Array.isArray(r.types) ? r.types : [];
  const tset = new Set(types);
  if (tset.has("street_address")) s += 45;
  if (tset.has("premise")) s += 40;
  if (tset.has("subpremise")) s += 12;
  if (tset.has("route")) s += 22;
  if (tset.has("establishment") || tset.has("point_of_interest")) s += 28;
  /* Prefer a real place over country/region-only hits (often wrongly first). */
  if (tset.has("country") && types.length <= 2) s -= 45;
  if (tset.has("administrative_area_level_1")) s -= 15;
  if (tset.has("locality") || tset.has("postal_code")) s += 8;
  return s;
}

export async function POST(req: NextRequest) {
  const key = googleMapsApiKey();
  const useDevFallback = !key && process.env.NODE_ENV !== "production";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const });
  }
  const lat = Number((body as { lat?: unknown })?.lat);
  const lng = Number((body as { lng?: unknown })?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false as const });
  }

  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  u.searchParams.set("latlng", `${lat},${lng}`);
  if (key) u.searchParams.set("key", key);

  try {
    if (!key && useDevFallback) {
      const nu = new URL("https://nominatim.openstreetmap.org/reverse");
      nu.searchParams.set("lat", String(lat));
      nu.searchParams.set("lon", String(lng));
      nu.searchParams.set("format", "jsonv2");
      const nr = await fetch(nu.toString(), {
        headers: { "User-Agent": "escrow-web-dev/1.0" },
      });
      const nj = (await nr.json()) as {
        display_name?: string;
        place_id?: string | number;
      };
      const formattedAddress = (nj.display_name ?? "").trim();
      if (!formattedAddress) {
        return NextResponse.json({ ok: false as const });
      }
      return NextResponse.json({
        ok: true as const,
        formattedAddress,
        placeId: String(nj.place_id ?? ""),
      });
    }
    if (!key) return NextResponse.json({ ok: false as const });
    const r = await fetch(u.toString());
    const j = (await r.json()) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        place_id?: string;
        geometry?: { location_type?: string };
        types?: string[];
      }>;
    };
    if (j.status !== "OK" || !j.results?.length) {
      return NextResponse.json({ ok: false as const });
    }
    const scored = j.results.map((result, idx) => ({
      result,
      score: scoreGoogleGeocodeResult(result) + (j.results!.length - idx) * 0.01,
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]?.result;
    const formattedAddress = best?.formatted_address?.trim();
    if (!formattedAddress) {
      return NextResponse.json({ ok: false as const });
    }
    return NextResponse.json({
      ok: true as const,
      formattedAddress,
      placeId: best?.place_id,
    });
  } catch {
    return NextResponse.json({ ok: false as const });
  }
}
