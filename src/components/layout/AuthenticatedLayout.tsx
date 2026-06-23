"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { AppSidebar } from "@/src/components/layout/AppSidebar";
import { TransactionNotificationsLive } from "@/src/components/TransactionNotificationsLive";
import { APP_NAME } from "@/src/config/constants";

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isProfilePage = pathname === "/profile";
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);
  

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-canvas">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-3xl text-primaryColorBlack" />
          <p className="text-sm font-medium text-gray-600">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-canvas">
        <i className="fas fa-circle-notch fa-spin text-2xl text-primaryColorBlack" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-app-canvas">
      <TransactionNotificationsLive />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-200/60 bg-white/85 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm"
            onClick={() => setMobileOpen(true)}
          >
            <i className="fas fa-bars" />
          </button>
          <span className="font-display text-base font-bold text-gray-900">
            {APP_NAME}
            <span className="text-gambian-red">GM</span>
          </span>
          <span className="w-10" aria-hidden />
        </header>

        {/* <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            {children}
          </div>
        </main> */}
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
  <div
    className={`mx-auto max-w-7xl pb-12 ${
      isProfilePage ? "" : "px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8"
    }`}
  >
    {children}
  </div>
</main>
      </div>
    </div>
  );
}
