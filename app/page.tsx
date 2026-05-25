"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";
import { useAuth } from "@/src/lib/auth/auth-context";
import { TAGLINE } from "@/src/config/constants";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <SiteHeader />
      <section className="relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div className="absolute inset-0 pattern-bg" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up space-y-8">
              <div className="inline-flex items-center space-x-2 rounded-full border border-gambian-gold/30 bg-white/80 px-4 py-2 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gambian-green" />
                <span className="text-sm font-medium text-gray-700">
                  Now serving The Gambia
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-gray-900 text-balance lg:text-6xl lg:leading-[1.1]">
                Secure transactions for{" "}
                <span className="gradient-text">Real Estate</span> &amp; commerce
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-gray-600 text-pretty">
                {TAGLINE}. Protect land deals, property purchases, and commerce
                with structured escrow backed by your microservices API.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center space-x-2 rounded-full bg-gambian-red px-8 py-4 text-lg font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-2xl"
                  >
                    <i className="fas fa-th-large" />
                    <span>My dashboard</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center justify-center space-x-2 rounded-full bg-gambian-red px-8 py-4 text-lg font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-2xl"
                    >
                      <i className="fas fa-user-plus" />
                      <span>Create account</span>
                    </Link>
                    <Link
                      href="/login"
                      className="flex items-center justify-center space-x-2 rounded-full border-2 border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-800 transition hover:border-gambian-blue hover:text-gambian-blue"
                    >
                      <i className="fas fa-sign-in-alt" />
                      <span>Sign in</span>
                    </Link>
                  </>
                )}
                <Link
                  href="/marketplace"
                  className="flex items-center justify-center space-x-2 rounded-full border-2 border-gray-200 bg-white/80 px-8 py-4 text-lg font-semibold text-gray-800 backdrop-blur-sm transition hover:border-gambian-blue hover:text-gambian-blue"
                >
                  <i className="fas fa-search" />
                  <span>Browse marketplace</span>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rotate-3 rounded-3xl bg-linear-to-r from-gambian-blue/20 to-gambian-green/20" />
              <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-gray-900">
                    Live transaction
                  </h3>
                  <span className="animate-pulse rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    Active
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gambian-sand text-gambian-earth">
                        <i className="fas fa-home text-xl" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Escrow overview
                        </p>
                        <p className="text-sm text-gray-500">From your dashboard</p>
                      </div>
                    </div>
                    <span className="font-bold text-gambian-blue">API</span>
                  </div>
                  <div className="relative">
                    <div className="mb-2 flex justify-between text-xs text-gray-500">
                      <span>Funded</span>
                      <span>Inspection</span>
                      <span>Done</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div className="relative h-full w-2/3 rounded-full bg-linear-to-r from-gambian-blue to-gambian-green">
                        <div className="absolute bottom-0 right-0 top-0 w-2 animate-pulse bg-white/50" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
                      <i className="fas fa-user-shield mb-1 text-gambian-blue" />
                      <p className="text-xs font-medium text-gray-700">Verified</p>
                    </div>
                    <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-center">
                      <i className="fas fa-lock mb-1 text-yellow-600" />
                      <p className="text-xs font-medium text-gray-700">Secured</p>
                    </div>
                    <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
                      <i className="fas fa-check-circle mb-1 text-gambian-green" />
                      <p className="text-xs font-medium text-gray-700">Protected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
