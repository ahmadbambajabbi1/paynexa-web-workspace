"use client";

import { useEffect } from "react";
import { useAuth } from "@/src/lib/auth/auth-context";
import { registerWebPushToken } from "@/src/lib/push-notifications";
import { getFirebaseWebConfig } from "@/src/lib/firebase/config";

/** Registers PayNexa web FCM token after sign-in. */
export function PushNotificationBootstrap() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    (window as Window & { __FIREBASE_CONFIG__?: unknown }).__FIREBASE_CONFIG__ =
      getFirebaseWebConfig();
    void registerWebPushToken(token);
  }, [token]);

  return null;
}
