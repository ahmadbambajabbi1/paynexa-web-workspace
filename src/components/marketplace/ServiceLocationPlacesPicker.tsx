"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export type PickedServiceLocation = {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
};

type Prediction = { placeId: string; description: string };

type Props = {
  value: PickedServiceLocation | null;
  onChange: (next: PickedServiceLocation | null) => void;
  disabled?: boolean;
};

/** Uses same-origin `/api/maps/*` routes — API key stays on the server. */
export function ServiceLocationPlacesPicker({ value, onChange, disabled }: Props) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [mapsReady, setMapsReady] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [locBusy, setLocBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const seqRef = useRef(0);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/maps/ready", { method: "GET", cache: "no-store" });
        const j = (await r.json()) as { ready?: boolean };
        setMapsReady(j.ready === true);
      } catch {
        setMapsReady(false);
      }
    })();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const runAutocomplete = useCallback(async (q: string) => {
    if (!q.trim() || mapsReady !== true) {
      setPredictions([]);
      return;
    }
    const seq = ++seqRef.current;
    try {
      const r = await fetch("/api/maps/autocomplete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: q }),
      });
      const j = (await r.json()) as { predictions?: Prediction[] };
      if (seq !== seqRef.current) return;
      setPredictions(Array.isArray(j.predictions) ? j.predictions : []);
      setHighlight(0);
    } catch {
      if (seq === seqRef.current) setPredictions([]);
    }
  }, [mapsReady]);

  function scheduleAutocomplete(q: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void runAutocomplete(q), 280);
  }

  async function selectPrediction(pred: Prediction) {
    setErr(null);
    setOpen(false);
    setPredictions([]);
    setInput("");
    try {
      const r = await fetch("/api/maps/place-details", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: pred.placeId }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        formattedAddress?: string;
        lat?: number;
        lng?: number;
        placeId?: string;
      };
      if (!j.ok || typeof j.lat !== "number" || typeof j.lng !== "number" || !j.formattedAddress) {
        setErr("Could not use that suggestion. Pick another.");
        return;
      }
      onChange({
        formattedAddress: j.formattedAddress,
        lat: j.lat,
        lng: j.lng,
        placeId: j.placeId ?? pred.placeId,
      });
    } catch {
      setErr("Something went wrong. Try again.");
    }
  }

  async function useCurrentLocation() {
    if (mapsReady !== true) return;
    if (!("geolocation" in navigator)) {
      setErr("This browser does not expose location.");
      return;
    }
    setLocBusy(true);
    setErr(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 25_000,
        });
      });
      const r = await fetch("/api/maps/reverse-geocode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        formattedAddress?: string;
        placeId?: string;
      };
      if (!j.ok || !j.formattedAddress) {
        setErr("Could not translate this position into an address. Try searching.");
        return;
      }
      onChange({
        formattedAddress: j.formattedAddress,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        placeId: j.placeId,
      });
    } catch {
      setErr("Location was denied or could not be read. Try searching instead.");
    } finally {
      setLocBusy(false);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !predictions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(predictions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = predictions[highlight];
      if (p) void selectPrediction(p);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (mapsReady === false) {
    return (
      <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
        Location search is not available here.
      </p>
    );
  }

  if (mapsReady === null) {
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500" aria-busy="true">
        Checking…
      </p>
    );
  }

  return (
    <div className="space-y-3" ref={wrapRef}>
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50/80 p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gambian-blue/10 text-gambian-blue">
              <i className="fas fa-map-pin" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected location</p>
              <p className="mt-1 text-sm font-medium leading-snug text-gray-900">{value.formattedAddress}</p>
            </div>
            <button
              type="button"
              className="shrink-0 self-start rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              onClick={() => {
                onChange(null);
                setInput("");
                setPredictions([]);
                setErr(null);
                inputRef.current?.focus();
              }}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="relative min-w-0 w-full">
              <i className="fas fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-autocomplete="list"
                disabled={disabled}
                value={input}
                placeholder="Search for an address or place…"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm shadow-sm outline-none ring-gambian-blue/30 transition focus:ring-2"
                onChange={(e) => {
                  const v = e.target.value;
                  setInput(v);
                  setOpen(true);
                  scheduleAutocomplete(v);
                }}
                onFocus={() => {
                  setOpen(true);
                  if (input.trim().length >= 2) void runAutocomplete(input);
                }}
                onKeyDown={onInputKeyDown}
              />
              {open && predictions.length > 0 ? (
                <ul
                  id={listboxId}
                  role="listbox"
                  className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl"
                >
                  {predictions.map((p, i) => (
                    <li key={p.placeId} role="option" aria-selected={i === highlight}>
                      <button
                        type="button"
                        className={`flex w-full px-3 py-2.5 text-left transition ${
                          i === highlight ? "bg-gambian-blue/10 text-gambian-blue" : "hover:bg-gray-50"
                        }`}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => void selectPrediction(p)}
                      >
                        {p.description}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gambian-blue/25 bg-white px-4 py-3 text-sm font-semibold text-gambian-blue shadow-sm transition hover:bg-gambian-blue/5 disabled:opacity-50"
              onClick={() => void useCurrentLocation()}
              disabled={disabled || locBusy || mapsReady !== true}
            >
              <i className="fas fa-location-crosshairs" aria-hidden />
              {locBusy ? "Locating…" : "Use current location"}
            </button>
          </div>
        </>
      )}

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
