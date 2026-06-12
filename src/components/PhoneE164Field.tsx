"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type CountryDial } from "@/src/data/countryDialCodes";
import * as countriesApi from "@/src/lib/api/countries";
import { fieldInput, fieldLabel, fieldSelect } from "@/src/components/ui/form-classes";

function dialByIso(countries: CountryDial[], iso2: string): CountryDial | undefined {
  return countries.find((c) => c.iso2 === iso2);
}

function parseE164ToCountryNational(
  raw: string,
  fallbackIso: string,
  countries: CountryDial[],
): { country: CountryDial | null; national: string } {
  const fallback = dialByIso(countries, fallbackIso) ?? countries[0] ?? null;
  if (!fallback || !raw.startsWith("+")) {
    return { country: fallback, national: "" };
  }
  const digits = raw.slice(1);
  let best: CountryDial | undefined;
  for (const c of countries) {
    if (digits.startsWith(c.dial)) {
      if (!best || c.dial.length > best.dial.length) {
        best = c;
      }
    }
  }
  if (best) {
    return {
      country: best,
      national: digits.slice(best.dial.length),
    };
  }
  return { country: fallback, national: "" };
}

function buildE164(country: CountryDial, nationalDigits: string): string {
  const n = nationalDigits.replace(/\D/g, "").replace(/^0+/, "");
  return `+${country.dial}${n}`;
}

export type PhoneE164FieldProps = {
  id?: string;
  value: string;
  onChange: (e164: string, countryIso2: string) => void;
  defaultCountryIso2?: string;
  disabled?: boolean;
};

export function PhoneE164Field({
  id = "phone-e164",
  value,
  onChange,
  defaultCountryIso2 = "GM",
  disabled,
}: PhoneE164FieldProps) {
  const [countries, setCountries] = useState<CountryDial[]>([]);
  const [countryIso2, setCountryIso2] = useState(defaultCountryIso2);
  const [national, setNational] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialValueRef = useRef(value);

  // Load operating countries once — do not re-fetch when `value` changes (fixes mobile keyboard dismissal).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    countriesApi
      .listOperatingCountries()
      .then((res) => {
        if (cancelled) return;
        const next = res.countries.map((c) => ({
          iso2: c.iso2,
          name: c.name,
          dial: c.dialCode,
        }));
        setCountries(next);
        if (next.length > 0) {
          const parsed = parseE164ToCountryNational(
            initialValueRef.current,
            defaultCountryIso2,
            next,
          );
          if (parsed.country) {
            setCountryIso2(parsed.country.iso2);
            setNational(parsed.national);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCountries([]);
          setLoadError("Operating countries are unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultCountryIso2]);

  const country = useMemo(
    () => dialByIso(countries, countryIso2) ?? countries[0] ?? null,
    [countries, countryIso2],
  );

  const emit = useCallback(
    (iso: string, nat: string) => {
      const c = dialByIso(countries, iso);
      if (!c) {
        onChange("", "");
        return;
      }
      onChange(buildE164(c, nat), iso);
    },
    [countries, onChange],
  );

  const unavailable = loading || countries.length === 0 || !country;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={fieldLabel}>
        Mobile number
      </label>
      <div className="flex flex-row items-stretch gap-2">
        <div className="relative shrink-0">
          <label htmlFor={`${id}-country`} className="sr-only">
            Country code
          </label>
          <select
            id={`${id}-country`}
            disabled={disabled || unavailable}
            value={country?.iso2 ?? ""}
            onChange={(e) => {
              const iso = e.target.value;
              setCountryIso2(iso);
              emit(iso, national);
            }}
            className={`${fieldSelect} !w-[min(7.25rem,32vw)] cursor-pointer py-3 pl-3 text-base font-medium tabular-nums sm:!w-[7.75rem]`}
            aria-label="Country calling code"
          >
            {countries.map((c) => (
              <option key={c.iso2} value={c.iso2} title={`${c.name} (+${c.dial})`}>
                +{c.dial} {c.iso2}
              </option>
            ))}
          </select>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled || unavailable}
          value={national}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            setNational(v);
            emit(countryIso2, v);
          }}
          className={`${fieldInput} min-w-0 flex-1 py-3 text-base`}
          placeholder={loading ? "Loading countries" : "National number"}
        />
      </div>
      {loadError || countries.length === 0 ? (
        <p className="text-xs leading-relaxed text-red-600">
          {loadError ?? "No operating countries are configured."}
        </p>
      ) : national.length > 0 ? (
        <p className="text-xs leading-relaxed text-gray-500">
          Full number:{" "}
          <span className="font-mono text-gray-700">{buildE164(country, national)}</span>
        </p>
      ) : null}
    </div>
  );
}
