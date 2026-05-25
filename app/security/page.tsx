"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";

const items = [
  {
    icon: "fa-lock",
    title: "Device-bound sessions",
    text: "Tokens are issued per device with the X-Device-Id header; sessions refresh through your user service.",
  },
  {
    icon: "fa-user-shield",
    title: "Identity & profile",
    text: "Sign-in with your mobile number: SMS verification, a 4-digit PIN, then profile completion before creating deals.",
  },
  {
    icon: "fa-file-contract",
    title: "Transaction room",
    text: "Agreements, audit logs, and state transitions are stored in your transaction service.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24">
        <h1 className="font-display text-4xl font-bold text-gray-900 text-balance">
          Security
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 text-pretty">
          SafeTrade is built for high-trust flows: explicit acceptance, audited
          state changes, and integration points for escrow and messaging
          services.
        </p>
        <ul className="mt-12 space-y-6">
          {items.map((it) => (
            <li
              key={it.title}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-gambian-green">
                <i className={`fas ${it.icon} text-xl`} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  {it.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  {it.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center">
          <Link href="/" className="font-medium text-gambian-blue hover:underline">
            ← Back home
          </Link>
        </p>
      </main>
    </>
  );
}
