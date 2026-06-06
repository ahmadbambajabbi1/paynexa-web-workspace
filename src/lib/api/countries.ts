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

export async function listOperatingCountries() {
  return await apiFetch<{ countries: OperatingCountry[] }>("/users/countries/operating", {
    method: "GET",
  });
}
