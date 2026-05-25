"use client";

import { useCallback, useState } from "react";
import {
  COUNTRY_DIAL_CODES,
  type CountryDial,
} from "@/src/data/countryDialCodes";
import { fieldInput, fieldLabel, fieldSelect } from "@/src/components/ui/form-classes";

function dialByIso(iso2: string): CountryDial | undefined {
  return COUNTRY_DIAL_CODES.find((c) => c.iso2 === iso2);
}

function parseE164ToCountryNational(
  raw: string,
  fallbackIso: string,
): { country: CountryDial; national: string } {
  const fallback = dialByIso(fallbackIso) ?? COUNTRY_DIAL_CODES[0]!;
  if (!raw.startsWith("+")) {
    return { country: fallback, national: "" };
  }
  const digits = raw.slice(1);
  let best: CountryDial | undefined;
  for (const c of COUNTRY_DIAL_CODES) {
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
  /** E.164 including + */
  value: string;
  onChange: (e164: string, countryIso2: string) => void;
  defaultCountryIso2?: string;
  disabled?: boolean;
};

/**
 * Country selector + national number; reports E.164 and ISO-3166 alpha-2 for the selected country.
 */
export function PhoneE164Field({
  id = "phone-e164",
  value,
  onChange,
  defaultCountryIso2 = "GM",
  disabled,
}: PhoneE164FieldProps) {
  const [countryIso2, setCountryIso2] = useState(
    () => parseE164ToCountryNational(value, defaultCountryIso2).country.iso2,
  );
  const [national, setNational] = useState(
    () => parseE164ToCountryNational(value, defaultCountryIso2).national,
  );

  const country = dialByIso(countryIso2) ?? COUNTRY_DIAL_CODES[0]!;

  const emit = useCallback(
    (iso: string, nat: string) => {
      const c = dialByIso(iso) ?? COUNTRY_DIAL_CODES[0]!;
      onChange(buildE164(c, nat), iso);
    },
    [onChange],
  );

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
            disabled={disabled}
            value={countryIso2}
            onChange={(e) => {
              const iso = e.target.value;
              setCountryIso2(iso);
              emit(iso, national);
            }}
            className={`${fieldSelect} !w-[min(7.25rem,32vw)] cursor-pointer py-3 pl-3 text-sm font-medium tabular-nums sm:!w-[7.75rem]`}
            aria-label="Country calling code"
          >
            {COUNTRY_DIAL_CODES.map((c) => (
              <option
                key={c.iso2}
                value={c.iso2}
                title={`${c.name} (+${c.dial})`}
              >
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
          disabled={disabled}
          value={national}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            setNational(v);
            emit(countryIso2, v);
          }}
          className={`${fieldInput} min-w-0 flex-1 py-3 text-base`}
          placeholder="National number"
        />
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        <span className="font-medium text-gray-600">{country.name}</span> ({country.iso2}
        ) is saved to your profile.
        {national.length > 0 ? (
          <>
            {" "}
            Full number:{" "}
            <span className="font-mono text-gray-700">
              {buildE164(country, national)}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
