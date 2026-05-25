import { apiFetch } from "@/src/lib/api/client";

export type ProfessionalFeeItem = {
  productTypeId: string;
  code: string;
  name: string;
  feeAmount: string | null;
};

export type ProfessionalFeesResponse = {
  role: "LAWYER" | "AGENT";
  items: ProfessionalFeeItem[];
};

export async function fetchProfessionalFees(token: string) {
  return apiFetch<ProfessionalFeesResponse>("/products/me/professional-fees", {
    method: "GET",
    token,
  });
}

export async function putProfessionalFee(
  token: string,
  productTypeId: string,
  feeAmount: string,
) {
  return apiFetch<{ productTypeId: string; feeAmount: string }>(
    `/products/me/professional-fees/${encodeURIComponent(productTypeId)}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({ feeAmount }),
    },
  );
}
