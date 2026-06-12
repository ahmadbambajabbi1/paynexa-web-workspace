import { apiFetch } from "@/src/lib/api/client";
import type { MeResponse } from "@/src/lib/api/types";

export type PhoneVerifySmsResponse = {
  nextStep: "set_pin" | "enter_pin";
  preAuthToken: string;
  hasAccount: boolean;
};

export async function phoneSendCode(
  phone: string,
  countryCode?: string,
): Promise<{
  ok?: boolean;
  expiresAt?: string;
}> {
  return apiFetch("/users/auth/phone/send-code", {
    method: "POST",
    body: JSON.stringify({ phone, ...(countryCode ? { countryCode } : {}) }),
  });
}

export async function phoneVerifySms(
  phone: string,
  code: string,
): Promise<PhoneVerifySmsResponse> {
  return apiFetch("/users/auth/phone/verify-sms", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function phoneSetPin(params: {
  preAuthToken: string;
  pin: string;
  deviceId: string;
  macAddress?: string;
  countryCode?: string;
}): Promise<{
  token: string;
  deviceId: string;
  userId: string;
  profileCompleted: boolean;
}> {
  return apiFetch("/users/auth/phone/set-pin", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function phoneVerifyPin(params: {
  preAuthToken: string;
  pin: string;
  deviceId: string;
  macAddress?: string;
  countryCode?: string;
}): Promise<{
  token: string;
  deviceId: string;
  userId: string;
  profileCompleted: boolean;
}> {
  return apiFetch("/users/auth/phone/verify-pin", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchMe(token: string): Promise<MeResponse> {
  return apiFetch("/users/me", { method: "GET", token });
}

export async function lookupUserByPhone(
  token: string,
  phone: string,
): Promise<{ userId: string; phone: string }> {
  const q = new URLSearchParams({ phone });
  return apiFetch(`/users/lookup?${q.toString()}`, { method: "GET", token });
}

export async function lookupUserByQuery(
  token: string,
  query: string,
): Promise<{ id: string; phone: string | null; email: string | null; displayName: string | null }> {
  const q = new URLSearchParams({ query });
  return apiFetch(`/users/search?${q.toString()}`, { method: "GET", token });
}

export async function personalKycStatus(
  token: string,
  userId: string,
): Promise<{ approved: boolean; approvedAt: string | null }> {
  const q = new URLSearchParams({ userId });
  return apiFetch(`/users/kyc/personal-status?${q.toString()}`, {
    method: "GET",
    token,
  });
}

export type CompleteProfileResponse = {
  ok: boolean;
  needsEmailVerification: boolean;
  profileComplete?: boolean;
  profileCompletedAt?: string;
};

export async function completeProfile(
  token: string,
  body: { displayName: string; fullName: string; email: string },
): Promise<CompleteProfileResponse> {
  return apiFetch("/users/profile/complete", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function verifyProfileEmail(
  token: string,
  body: { code: string },
): Promise<{ ok: boolean; profileCompletedAt: string }> {
  return apiFetch("/users/profile/verify-email", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function resendProfileEmailVerification(token: string): Promise<{
  ok?: boolean;
  expiresAt?: string;
}> {
  return apiFetch("/users/profile/resend-email-verification", {
    method: "POST",
    token,
  });
}

export async function registerFcmToken(
  token: string,
  fcmToken: string,
  platform?: string,
): Promise<{ ok: boolean }> {
  return apiFetch("/users/devices/fcm-token", {
    method: "POST",
    token,
    body: JSON.stringify({
      fcmToken,
      ...(platform ? { platform } : {}),
    }),
  });
}
