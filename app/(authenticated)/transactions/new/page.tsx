"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateEscrowTransactionForm, CreatePublicTransactionForm } from "@/src/components/CreateTransactionForm";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { useAuth } from "@/src/lib/auth/auth-context";
import { userMayCreateTransactions } from "@/src/lib/kyc-access";

type Flow = "public" | "escrow";

export default function NewTransactionPage() {
  return (
    <RequireAuth requireProfileComplete>
      <NewTransactionInner />
    </RequireAuth>
  );
}

function NewTransactionInner() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>(() => {
    if (typeof window === "undefined") return "public";
    const params = new URLSearchParams(window.location.search);
    return params.get("flow") === "escrow" ? "escrow" : "public";
  });

  if (!user || !token) return null;

  if (!userMayCreateTransactions(user)) {
    router.replace("/kyc/personal");
    return null;
  }

  return (
    <div >
      <div className="mb-6">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gambian-blue"
        >
          <i className="fas fa-chevron-left text-xs" />
          Back to transactions
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/70 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gambian-blue/70">Create transaction</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-gray-900">New transaction</h1>

          <div className="mt-5 flex gap-3">
            <FlowButton
              active={flow === "public"}
              title="Shareable sale"
              description="Payment link"
              icon="fa-link"
              onClick={() => {
                setFlow("public");
              }}
            />
            {/* <FlowButton
              active={flow === "escrow"}
              title="Two-party escrow"
              description="Private deal"
              icon="fa-people-arrows"
              onClick={() => {
                setFlow("escrow");
              }}
            /> */}
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {flow === "public" ? (
            <CreatePublicTransactionForm
              token={token}
              selfId={user.id}
              onCancel={() => router.push("/transactions")}
              onCreated={(tid) => router.replace(`/transactions/${tid}`)}
            />
          ) : (
            <CreateEscrowTransactionForm
              token={token}
              selfId={user.id}
              onCancel={() => router.push("/transactions")}
              onCreated={(tid) => router.replace(`/transactions/${tid}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FlowButton(props: {
  active: boolean;
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-xl border p-4 text-left transition ${props.active
        ? "border-gambian-blue bg-white shadow-sm ring-2 ring-gambian-blue/10"
        : "border-gray-200 bg-white/70 hover:border-gray-300"
        }`}
    >
      <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${props.active ? "bg-gambian-blue text-white" : "bg-gray-100 text-gray-500"}`}>
        <i className={`fas ${props.icon}`} />
      </span>
      <span className="block font-bold text-gray-900">{props.title}</span>
      <span className="mt-1 block text-sm leading-5 text-gray-600">{props.description}</span>
    </button>
  );
}
