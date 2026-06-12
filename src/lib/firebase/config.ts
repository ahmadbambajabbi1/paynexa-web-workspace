import { type FirebaseOptions } from "firebase/app";

/**
 * PayNexa Web — Firebase app config (PayNexa Web app in project paynexa-fc9ca).
 * From Firebase Console → Project settings → Your apps → PayNexa Web.
 * Same project as mobile, separate web app registration.
 */
const firebaseWebConfig: FirebaseOptions = {
  apiKey: "AIzaSyCg4motBjZg5QrSVcrVCzIeO7XakNUi6WM",
  authDomain: "paynexa-fc9ca.firebaseapp.com",
  projectId: "paynexa-fc9ca",
  storageBucket: "paynexa-fc9ca.firebasestorage.app",
  messagingSenderId: "713673097941",
  appId: "1:713673097941:web:9f5dfc71354644fd08585c",
  measurementId: "G-XC3M770D2R",
};

/** Web Push VAPID key — Firebase Console → Cloud Messaging → Web Push certificates. */
const firebaseWebVapidKey =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ?? "";

export function getFirebaseWebConfig(): FirebaseOptions {
  return firebaseWebConfig;
}

export function getFirebaseWebVapidKey(): string | null {
  return firebaseWebVapidKey.length > 0 ? firebaseWebVapidKey : null;
}
