import { NextRequest, NextResponse } from "next/server";
import { googleMapsApiKey } from "../_key";

type GooglePred = { place_id?: string; description?: string };

export async function POST(req: NextRequest) {
  const key = googleMapsApiKey();
  const useDevFallback = !key && process.env.NODE_ENV !== "production";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ predictions: [] });
  }
  const input =
    typeof (body as { input?: unknown })?.input === "string"
      ? (body as { input: string }).input.trim()
      : "";
  if (input.length < 2 || input.length > 256) {
    return NextResponse.json({ predictions: [] });
  }

  const googleUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  googleUrl.searchParams.set("input", input);
  if (key) googleUrl.searchParams.set("key", key);
  googleUrl.searchParams.set("types", "geocode");

  try {
    if (key) {
      const r = await fetch(googleUrl.toString());
      const j = (await r.json()) as {
        status?: string;
        predictions?: GooglePred[];
      };
      if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
        return NextResponse.json({ predictions: [] });
      }
      const predictions = (j.predictions ?? [])
        .map((p) => ({
          placeId: typeof p.place_id === "string" ? p.place_id : "",
          description: typeof p.description === "string" ? p.description : "",
        }))
        .filter((p) => p.placeId && p.description);
      return NextResponse.json({ predictions });
    }
    if (!useDevFallback) return NextResponse.json({ predictions: [] });
    const u = new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("q", input);
    u.searchParams.set("format", "jsonv2");
    u.searchParams.set("limit", "6");
    const r = await fetch(u.toString(), {
      headers: { "User-Agent": "escrow-web-dev/1.0" },
    });
    const rows = (await r.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      place_id?: number | string;
    }>;
    const predictions = rows
      .map((row) => {
        const lat = Number(row.lat);
        const lon = Number(row.lon);
        const description = (row.display_name ?? "").trim();
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || description.length < 3) return null;
        const placeId = `dev|${lat}|${lon}|${encodeURIComponent(description)}`;
        return { placeId, description };
      })
      .filter((x): x is { placeId: string; description: string } => Boolean(x));
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
