"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";

const steps = [
  {
    n: "1",
    title: "Create & share",
    body: "The seller sets the item, price, and terms in Paynexa, then sends the secure payment link to the buyer.",
    accent: "blue" as const,
  },
  {
    n: "2",
    title: "Buyer pays",
    body: "The buyer opens the link, signs in, and pays from their wallet or card. Funds move into escrow — not to the seller yet.",
    accent: "blue" as const,
  },
  {
    n: "3",
    title: "Deliver the deal",
    body: "The seller fulfills what was agreed. Both sides track progress in the shared transaction room.",
    accent: "blue" as const,
  },
  {
    n: "4",
    title: "Release payment",
    body: "When the buyer is satisfied, they release the funds. The seller receives payment and the transaction is complete.",
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
            How Paynexa works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 text-pretty">
            A simple share-link flow for any deal between two people — from agreement to payment
            release, with funds protected in between.
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
                      : "bg-primaryColorBlack"
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

        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-gray-100 bg-[#f4f6fb] p-8 text-center">
          <h2 className="font-display text-xl font-bold text-gray-900">
            Who is Paynexa for?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Anyone who needs a safe way to pay another person — freelancers, small businesses,
            individuals selling goods or services, or buyers who want protection before money changes
            hands. You do not need a storefront or marketplace listing — just a shared link.
          </p>
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
