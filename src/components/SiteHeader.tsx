"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/lib/auth/auth-context";
import { APP_NAME } from "@/src/config/constants";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`font-medium transition ${
        active
          ? "text-primaryColorBlack"
          : "text-gray-600 hover:text-primaryColorBlack"
      }`}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const { user, logout, profileReady } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-gray-200/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gambian-red via-primaryColorBlack to-gambian-green text-lg font-bold text-white shadow-lg">
            <i className="fas fa-shield-alt" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            {APP_NAME}
          </span>
        </Link>

        {!user ? (
          <div className="hidden items-center space-x-8 md:flex">
            {/* Marketplace — coming soon
            <NavLink href="/marketplace">Marketplace</NavLink>
            */}
            <NavLink href="/how-it-works">How It Works</NavLink>
            <NavLink href="/security">Security</NavLink>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" aria-hidden />
        )}

        <div className="flex items-center space-x-3 sm:space-x-4">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={profileReady ? "/dashboard" : "/complete-profile"}
                className="rounded-full bg-primaryColorBlack px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-950 hover:shadow-xl"
              >
                {profileReady ? "Dashboard" : "Complete profile"}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-gray-400 transition hover:text-red-500"
                aria-label="Sign out"
              >
                <i className="fas fa-sign-out-alt" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-gray-600 hover:text-primaryColorBlack sm:inline"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-primaryColorBlack px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-950 hover:shadow-xl"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
