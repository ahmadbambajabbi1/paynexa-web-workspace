"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";

const steps = [
  {
    n: "1",
    title: "Agreement",
    body: "Buyer and seller agree on terms and create an escrow transaction in the app.",
    accent: "blue" as const,
  },
  {
    n: "2",
    title: "Payment",
    body: "Buyer deposits funds into the secure escrow account (tracked in your escrow service).",
    accent: "blue" as const,
  },
  {
    n: "3",
    title: "Delivery",
    body: "Seller delivers the property or goods; progress moves through your transaction state machine.",
    accent: "blue" as const,
  },
  {
    n: "4",
    title: "Release",
    body: "Buyer confirms receipt and funds are released according to your ledger rules.",
    accent: "green" as const,
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="font-display text-4xl font-bold text-gray-900 text-balance md:text-5xl">
            How SafeTrade works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 text-pretty">
            Four clear steps from agreement to release—implemented in your
            transaction and escrow services.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="relative z-10 h-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg">
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg ${
                    s.accent === "green"
                      ? "bg-gambian-green"
                      : "bg-gambian-blue"
                  }`}
                >
                  {s.n}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-1/2 z-0 hidden h-0.5 w-8 translate-x-full -translate-y-1/2 bg-gray-200 lg:block" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/login"
            className="inline-flex rounded-full bg-gambian-red px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-red-700"
          >
            Get started
          </Link>
        </div>
      </main>
    </>
  );
}
