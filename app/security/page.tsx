"use client";

import Link from "next/link";
import { SiteHeader } from "@/src/components/SiteHeader";

const items = [
  {
    icon: "fa-lock",
    title: "Funds held in escrow",
    text: "Buyer payments are locked in escrow until the buyer releases them. Sellers are not paid until the deal is confirmed.",
  },
  {
    icon: "fa-user-shield",
    title: "Phone sign-in & PIN",
    text: "Accounts use SMS verification and a 4-digit PIN. Complete your profile before creating or paying for transactions.",
  },
  {
    icon: "fa-file-contract",
    title: "Shared transaction room",
    text: "Every deal has a transaction room where both parties see status, amounts, and progress from payment through release.",
  },
  {
    icon: "fa-link",
    title: "Secure payment links",
    text: "Share links are unique to each transaction. Only the assigned buyer can pay, and the link returns them to the same checkout session.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24">
        <h1 className="font-display text-4xl font-bold text-gray-900 text-balance">
          Security & trust
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 text-pretty">
          Paynexa is designed for high-trust payments between two people. Your money stays
          protected until you decide to release it.
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
          <Link href="/" className="font-medium text-primaryColorBlack hover:underline">
            ← Back home
          </Link>
        </p>
      </main>
    </>
  );
}
