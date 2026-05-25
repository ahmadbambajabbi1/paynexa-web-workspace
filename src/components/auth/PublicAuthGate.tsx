"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { isProfileComplete } from "@/src/lib/auth/profile";

/**
 * For login-only routes: signed-in users are redirected away from public auth pages.
 */
export function PublicAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!token || !user) return;
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const nextRaw = params?.get("next");
    const nextPath = nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
    if (isProfileComplete(user)) {
      router.replace(nextPath);
    } else {
      router.replace(`/complete-profile?next=${encodeURIComponent(nextPath)}`);
    }
  }, [loading, token, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-24">
        <div className="flex items-center gap-3 text-gray-600">
          <i className="fas fa-circle-notch fa-spin text-gambian-blue" />
          Loading…
        </div>
      </div>
    );
  }

  if (token && user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-24">
        <div className="flex items-center gap-3 text-gray-600">
          <i className="fas fa-circle-notch fa-spin text-gambian-blue" />
          Redirecting…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
