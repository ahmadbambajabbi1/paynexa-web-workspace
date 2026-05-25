"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { isProfileComplete } from "@/src/lib/auth/profile";

type RequireAuthProps = {
  children: React.ReactNode;
  /** When true (default), incomplete profiles are sent to /complete-profile. */
  requireProfileComplete?: boolean;
};

export function RequireAuth({
  children,
  requireProfileComplete = true,
}: RequireAuthProps) {
  const { user, loading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const currentPath = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/dashboard";
    if (!token || !user) {
      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (requireProfileComplete && !isProfileComplete(user)) {
      router.replace(`/complete-profile?next=${encodeURIComponent(currentPath)}`);
    }
  }, [loading, token, user, router, requireProfileComplete]);

  if (loading || !token || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-600">
        <i className="fas fa-circle-notch fa-spin text-gambian-blue" />
      </div>
    );
  }

  if (requireProfileComplete && !isProfileComplete(user)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-600">
        <i className="fas fa-circle-notch fa-spin text-gambian-blue" />
      </div>
    );
  }

  return <>{children}</>;
}
