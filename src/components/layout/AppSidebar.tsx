"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/src/config/constants";
import { useAuth } from "@/src/lib/auth/auth-context";

const storePrefixes = [
  "/store",
  "/products",
  "/marketplace/my-services",
  "/marketplace/bookings",
  "/marketplace/create",
] as const;

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "fa-th-large" },
  // { href: "/marketplace/services", label: "Marketplace", icon: "fa-compass" },
  // { href: "/store", label: "Store", icon: "fa-store", matchPrefixes: storePrefixes },
  { href: "/transactions", label: "Transactions", icon: "fa-exchange-alt" },
  { href: "/notifications", label: "Notifications", icon: "fa-bell" },
  { href: "/profile", label: "Profile", icon: "fa-user" },
  { href: "/billings", label: "Wallet", icon: "fa-wallet" },
] as const;

type AppSidebarProps = {
  onNavigate?: () => void;
};

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  function matchesPrefixes(paths: readonly string[]): boolean {
    return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }

  function isNavActive(item: (typeof nav)[number]): boolean {
    if ("matchPrefixes" in item && item.matchPrefixes) {
      return matchesPrefixes(item.matchPrefixes as any);
    }
    const href = item.href;
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-gambian-blue text-white shadow-[4px_0_24px_-8px_rgba(12,28,140,0.35)]">
      <div className="border-b border-white/10 px-5 py-6">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 transition hover:opacity-90"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-lg font-bold text-white shadow-lg ring-1 ring-white/15">
            <i className="fas fa-shield-alt" aria-hidden />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              {APP_NAME}
            </span>
            {/* <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
              Workspace
            </p> */}
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Menu
        </p>
        {nav.map((item) => {
          const active = isNavActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active
                ? "bg-white text-gambian-blue shadow-sm ring-1 ring-white/20"
                : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active
                  ? "bg-gambian-blue text-white shadow-md"
                  : "bg-white/10 text-white/70"
                  }`}
              >
                <i className={`fas ${item.icon} text-sm`} aria-hidden />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
        >
          <i className="fas fa-sign-out-alt" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
