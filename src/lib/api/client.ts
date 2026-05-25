import { API_BASE_URL } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";
import { ApiError } from "@/src/lib/api/errors";

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  const deviceId = getOrCreateDeviceId();
  if (deviceId) {
    headers.set("X-Device-Id", deviceId);
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Cache-Control", "no-cache");
  headers.set("Pragma", "no-cache");
  const hasBody = rest.body !== undefined && rest.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}${path}`, {
    ...rest,
    headers,
  });

  const text = await res.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { message: text };
    }
  } else {
    parsed = {};
  }

  if (!res.ok) {
    const msg =
      typeof parsed === "object" &&
      parsed &&
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : undefined;
    throw new ApiError(res.status, parsed, msg);
  }

  return parsed as T;
}
