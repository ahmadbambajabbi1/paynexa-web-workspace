import type { OperatingCountry } from "@/src/lib/api/countries";

const STORAGE_KEY = "paynexa:operating-countries:v1";

type CachedOperatingCountries = {
  version: string;
  countries: OperatingCountry[];
};

function readCache(): CachedOperatingCountries | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOperatingCountries;
    if (!parsed?.version || !Array.isArray(parsed.countries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: CachedOperatingCountries): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function mergeCountries(
  existing: OperatingCountry[],
  incoming: OperatingCountry[],
): OperatingCountry[] {
  const byIso = new Map(existing.map((c) => [c.iso2, c]));
  for (const country of incoming) {
    byIso.set(country.iso2, country);
  }
  return Array.from(byIso.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function getCachedOperatingCountries(): OperatingCountry[] {
  return readCache()?.countries ?? [];
}

export async function loadOperatingCountries(
  fetcher: (sinceVersion?: string) => Promise<{
    version?: string;
    unchanged?: boolean;
    countries: OperatingCountry[];
  }>,
): Promise<OperatingCountry[]> {
  const cached = readCache();
  const res = await fetcher(cached?.version);
  const version = res.version ?? cached?.version ?? "";
  if (res.unchanged && cached) {
    return cached.countries;
  }
  const merged = cached
    ? mergeCountries(cached.countries, res.countries)
    : res.countries;
  if (version) {
    writeCache({ version, countries: merged });
  }
  return merged;
}
