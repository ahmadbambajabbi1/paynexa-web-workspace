import { apiFetch } from "@/src/lib/api/client";

export type OperatingCountry = {
  id: string;
  iso2: string;
  name: string;
  dialCode: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  active: boolean;
  sortOrder: number;
};

export async function listOperatingCountries(sinceVersion?: string) {
  const q = sinceVersion?.trim()
    ? `?sinceVersion=${encodeURIComponent(sinceVersion.trim())}`
    : "";
  return await apiFetch<{
    version?: string;
    unchanged?: boolean;
    countries: OperatingCountry[];
  }>(`/users/countries/operating${q}`, {
    method: "GET",
  });
}
