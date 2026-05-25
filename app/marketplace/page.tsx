"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";

export default function MarketplacePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-gambian-sand to-gambian-gold/40 text-4xl text-gambian-earth shadow-inner">
          <i className="fas fa-store" />
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 text-balance">
          Marketplace
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-gray-600 text-pretty">
          Browse local service providers near you in The Gambia, filter by
          distance, online status, rating, and availability, then book with
          escrow-secured payments.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/marketplace/services"
            className="rounded-full bg-gambian-blue px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-950"
          >
            Browse services
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border-2 border-gray-200 px-8 py-3 font-semibold text-gray-800 transition hover:border-gambian-blue hover:text-gambian-blue"
          >
            Go to dashboard
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-full border-2 border-gray-200 px-8 py-3 font-semibold text-gray-800 transition hover:border-gambian-blue hover:text-gambian-blue"
          >
            How it works
          </Link>
        </div>
      </main>
    </>
  );
}
