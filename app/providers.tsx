"use client";

import { AuthProvider } from "@/src/lib/auth/auth-context";
import { PushNotificationBootstrap } from "@/src/components/PushNotificationBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PushNotificationBootstrap />
      {children}
    </AuthProvider>
  );
}
