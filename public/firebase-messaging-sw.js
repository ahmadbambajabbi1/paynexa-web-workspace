/* eslint-disable no-undef */
importScripts("/firebase-messaging-config.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const cfg = self.__FIREBASE_CONFIG__ ?? {};
if (cfg.apiKey && cfg.projectId && cfg.messagingSenderId && cfg.appId) {
  firebase.initializeApp(cfg);
}

if (!firebase.apps.length) {
  self.addEventListener("notificationclick", () => undefined);
} else {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? "PayNexa";
    const body = payload.notification?.body ?? "";
    const txId = payload.data?.transactionId;
    self.registration.showNotification(title, {
      body,
      data: { transactionId: txId },
      icon: "/favicon.ico",
    });
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const txId = event.notification?.data?.transactionId;
    const target = txId ? `/transactions/${txId}` : "/notifications";
    event.waitUntil(clients.openWindow(target));
  });
}

// Marketplace booking background push — enable when marketplace notifications ship.
// messaging.onBackgroundMessage((payload) => {
//   if (payload.data?.eventType?.startsWith("marketplace.")) {
//     const bookingId = payload.data?.bookingId;
//     if (bookingId) {
//       self.registration.showNotification(payload.notification?.title ?? "PayNexa", {
//         body: payload.notification?.body ?? "",
//         data: { bookingId },
//       });
//     }
//   }
// });
