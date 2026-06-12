"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { getFirebaseWebConfig, getFirebaseWebVapidKey } from "@/src/lib/firebase/config";
import * as userApi from "@/src/lib/api/users";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let lastRegisteredToken: string | null = null;

function ensureFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(getFirebaseWebConfig());
  }
  return app;
}

async function ensureMessaging(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  if (!messaging) {
    messaging = getMessaging(ensureFirebaseApp());
  }
  return messaging;
}

export async function registerWebPushToken(accessToken: string): Promise<void> {
  if (typeof window === "undefined" || !accessToken) return;

  const vapidKey = getFirebaseWebVapidKey();
  if (!vapidKey) {
    console.warn(
      "PayNexa web push: set NEXT_PUBLIC_FIREBASE_VAPID_KEY in escrow_web/.env.local (Firebase Console → Cloud Messaging → Web Push certificates).",
    );
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const msg = await ensureMessaging();
    if (!msg) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const fcmToken = await getToken(msg, { vapidKey, serviceWorkerRegistration: reg });
    if (!fcmToken || fcmToken === lastRegisteredToken) return;
    await userApi.registerFcmToken(accessToken, fcmToken, "web");
    lastRegisteredToken = fcmToken;
    console.info("PayNexa web push: FCM token registered");
    onMessage(msg, (payload) => {
      const title = payload.notification?.title ?? "PayNexa";
      const body = payload.notification?.body ?? "";
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const txId = payload.data?.transactionId;
        const n = new Notification(title, {
          body,
          data: { transactionId: txId },
        });
        n.onclick = () => {
          if (txId) {
            window.location.href = `/transactions/${txId}`;
          } else {
            window.location.href = "/notifications";
          }
        };
      }
    });
  } catch (err) {
    console.warn("Web push registration failed", err);
  }
}

// Marketplace booking web push — enable when marketplace notifications ship.
// export async function handleMarketplacePushOpen(data: Record<string, string | undefined>) {
//   const bookingId = data.bookingId;
//   if (bookingId) {
//     window.location.href = `/marketplace/bookings/${bookingId}`;
//   }
// }
