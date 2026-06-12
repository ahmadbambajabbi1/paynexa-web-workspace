"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";
import { useAuth } from "@/src/lib/auth/auth-context";
import { HERO_SUBTITLE, TAGLINE } from "@/src/config/constants";

const shareSteps = [
  {
    icon: "fa-link",
    title: "Seller shares a link",
    body: "Create a transaction with the item, price, and terms — then send one secure link to your buyer.",
  },
  {
    icon: "fa-wallet",
    title: "Buyer pays safely",
    body: "Your buyer opens the link, signs in, and pays from their wallet or card without leaving checkout.",
  },
  {
    icon: "fa-handshake",
    title: "Funds stay protected",
    body: "Money is held in escrow until delivery is confirmed and both sides are satisfied.",
  },
  {
    icon: "fa-check-circle",
    title: "Release when ready",
    body: "When the deal is complete, the buyer releases payment to the seller from the transaction room.",
  },
];

const highlights = [
  {
    icon: "fa-shield-alt",
    title: "Built for trust",
    body: "Every step is tracked in a shared transaction room with a clear status from payment to release.",
  },
  {
    icon: "fa-mobile-alt",
    title: "Works on web & app",
    body: "Share links open in the browser or the Paynexa app — buyers can pay wherever they are.",
  },
  {
    icon: "fa-credit-card",
    title: "Wallet or card",
    body: "Pay from your Paynexa wallet or top up with card or mobile money, then pay in one flow.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="absolute inset-0 pattern-bg" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up space-y-8">
              <div className="inline-flex items-center space-x-2 rounded-full border border-gambian-gold/30 bg-white/80 px-4 py-2 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gambian-green" />
                <span className="text-sm font-medium text-gray-700">
                  Secure payments between two people
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-gray-900 text-balance lg:text-6xl lg:leading-[1.1]">
                Safe payments between{" "}
                <span className="gradient-text">buyer and seller</span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-gray-600 text-pretty">
                {TAGLINE} {HERO_SUBTITLE}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center space-x-2 rounded-full bg-gambian-red px-8 py-4 text-lg font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-2xl"
                  >
                    <i className="fas fa-th-large" />
                    <span>Go to dashboard</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center justify-center space-x-2 rounded-full bg-gambian-red px-8 py-4 text-lg font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-2xl"
                    >
                      <i className="fas fa-user-plus" />
                      <span>Get started free</span>
                    </Link>
                    <Link
                      href="/how-it-works"
                      className="flex items-center justify-center space-x-2 rounded-full border-2 border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-800 transition hover:border-primaryColorBlack hover:text-primaryColorBlack"
                    >
                      <i className="fas fa-circle-info" />
                      <span>How it works</span>
                    </Link>
                  </>
                )}
                {/* Marketplace — coming soon
                <Link
                  href="/marketplace"
                  className="flex items-center justify-center space-x-2 rounded-full border-2 border-gray-200 bg-white/80 px-8 py-4 text-lg font-semibold text-gray-800 backdrop-blur-sm transition hover:border-primaryColorBlack hover:text-primaryColorBlack"
                >
                  <i className="fas fa-search" />
                  <span>Browse marketplace</span>
                </Link>
                */}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rotate-3 rounded-3xl bg-linear-to-r from-primaryColorBlack/20 to-gambian-green/20" />
              <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-gray-900">
                    Shared payment link
                  </h3>
                  <span className="animate-pulse rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    Awaiting payment
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gambian-sand text-gambian-earth">
                        <i className="fas fa-link text-xl" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Custom deal
                        </p>
                        <p className="text-sm text-gray-500">paynexa.com/pay/…</p>
                      </div>
                    </div>
                    <span className="font-bold text-primaryColorBlack">D2,500</span>
                  </div>
                  <div className="relative">
                    <div className="mb-2 flex justify-between text-xs text-gray-500">
                      <span>Created</span>
                      <span>Paid</span>
                      <span>Released</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div className="relative h-full w-1/3 rounded-full bg-linear-to-r from-primaryColorBlack to-gambian-green">
                        <div className="absolute bottom-0 right-0 top-0 w-2 animate-pulse bg-white/50" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
                      <i className="fas fa-user-shield mb-1 text-primaryColorBlack" />
                      <p className="text-xs font-medium text-gray-700">Verified</p>
                    </div>
                    <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-center">
                      <i className="fas fa-lock mb-1 text-yellow-600" />
                      <p className="text-xs font-medium text-gray-700">In escrow</p>
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

      {/* Share-link flow */}
      <section className="border-t border-gray-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="font-display text-3xl font-bold text-gray-900 text-balance md:text-4xl">
              One link. Two parties. Full protection.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 text-pretty">
              No marketplace needed — just create a transaction, share the link, and let Paynexa
              hold the funds until the deal is done.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {shareSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-gray-100 bg-[#f4f6fb] p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primaryColorBlack text-white">
                  <i className={`fas ${step.icon}`} />
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-gambian-green">
                  <i className={`fas ${item.icon} text-xl`} />
                </div>
                <h3 className="mb-2 font-display text-xl font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-primaryColorBlack py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold text-balance">
            Ready to close your next deal safely?
          </h2>
          <p className="mt-4 text-lg text-white/75 text-pretty">
            Create an account, start a transaction, and share the payment link with your buyer or
            seller in seconds.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={user ? "/transactions/new" : "/login"}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-bold text-primaryColorBlack transition hover:bg-gray-100"
            >
              {user ? "Create transaction" : "Create free account"}
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Learn about security
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Paynexa. Secure escrow for buyers and sellers.</p>
          <div className="flex gap-6">
            <Link href="/how-it-works" className="hover:text-primaryColorBlack">
              How it works
            </Link>
            <Link href="/security" className="hover:text-primaryColorBlack">
              Security
            </Link>
            <Link href="/login" className="hover:text-primaryColorBlack">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
