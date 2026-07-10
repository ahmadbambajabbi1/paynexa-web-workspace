import { apiUrlForPath, SERVICE_URLS } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";
import { apiFetch } from "@/src/lib/api/client";
import { ApiError } from "@/src/lib/api/errors";

const ALLOWED_KYC_EXT = /\.(pdf|png|jpe?g|jfif|webp|gif)$/i;

export function isAllowedKycUploadFile(file: File): boolean {
  return ALLOWED_KYC_EXT.test(file.name);
}

export async function applyProfessionalRole(
  token: string,
  input: { role: "LAWYER" | "AGENT"; details?: Record<string, unknown> },
): Promise<{ applicationId: string; role: string; status: string }> {
  return apiFetch("/users/professional-roles/apply", {
    method: "POST",
    token,
    body: JSON.stringify({
      role: input.role,
      ...(input.details && Object.keys(input.details).length > 0
        ? { details: input.details }
        : {}),
    }),
  });
}

export async function uploadKycFile(token: string, file: File): Promise<{ key: string }> {
  if (!isAllowedKycUploadFile(file)) {
    throw new Error("Unsupported file type. Use PDF, JPEG, PNG, WebP, or GIF.");
  }
  const base = SERVICE_URLS.users;
  const deviceId = getOrCreateDeviceId();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${base}/users/kyc/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
    },
    body: fd,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      typeof parsed === "object" &&
        parsed &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : undefined,
    );
  }
  return parsed as { key: string };
}

export async function submitKycDocument(
  token: string,
  input: {
    kind: "PERSONAL" | "LAWYER" | "AGENT";
    professionalApplicationId?: string;
    fileKey: string;
    uploader: string;
  },
): Promise<unknown> {
  return apiFetch("/users/kyc", {
    method: "POST",
    token,
    body: JSON.stringify({
      kind: input.kind,
      professionalApplicationId: input.professionalApplicationId,
      fileKey: input.fileKey,
      fileUrl: input.fileKey,
      uploader: input.uploader,
    }),
  });
}
