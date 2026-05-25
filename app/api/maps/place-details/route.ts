import { NextRequest, NextResponse } from "next/server";
import { googleMapsApiKey } from "../_key";

export async function POST(req: NextRequest) {
  const key = googleMapsApiKey();
  const useDevFallback = !key && process.env.NODE_ENV !== "production";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const });
  }
  const placeId =
    typeof (body as { placeId?: unknown })?.placeId === "string"
      ? (body as { placeId: string }).placeId.trim()
      : "";
  if (!placeId || placeId.length > 512) {
    return NextResponse.json({ ok: false as const });
  }

  if (useDevFallback && placeId.startsWith("dev|")) {
    const parts = placeId.split("|");
    if (parts.length >= 4) {
      const lat = Number(parts[1]);
      const lng = Number(parts[2]);
      const formattedAddress = decodeURIComponent(parts.slice(3).join("|"));
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        typeof formattedAddress === "string" &&
        formattedAddress.trim().length >= 3
      ) {
        return NextResponse.json({
          ok: true as const,
          formattedAddress: formattedAddress.trim(),
          lat,
          lng,
          placeId,
        });
      }
    }
    return NextResponse.json({ ok: false as const });
  }

  if (!key) {
    return NextResponse.json({ ok: false as const });
  }

  const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  u.searchParams.set("place_id", placeId);
  u.searchParams.set("key", key);
  u.searchParams.set("fields", "formatted_address,geometry,name,place_id");

  try {
    const r = await fetch(u.toString());
    const j = (await r.json()) as {
      status?: string;
      result?: {
        formatted_address?: string;
        name?: string;
        place_id?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      };
    };
    if (j.status !== "OK" || !j.result) {
      return NextResponse.json({ ok: false as const });
    }
    const res = j.result;
    const lat = res.geometry?.location?.lat;
    const lng = res.geometry?.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false as const });
    }
    const formatted =
      (res.formatted_address?.trim() || res.name?.trim() || "").trim() || "";
    if (formatted.length < 4) {
      return NextResponse.json({ ok: false as const });
    }
    return NextResponse.json({
      ok: true as const,
      formattedAddress: formatted,
      lat,
      lng,
      placeId: res.place_id ?? placeId,
    });
  } catch {
    return NextResponse.json({ ok: false as const });
  }
}
