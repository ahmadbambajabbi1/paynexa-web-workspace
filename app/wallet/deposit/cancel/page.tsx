"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APP_NAME } from "@/src/config/constants";
import { buildAppDepositDeepLink, withDepositState } from "@/src/lib/modempay-return-urls";

function DepositCancelRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appHandoff, setAppHandoff] = useState(false);

  useEffect(() => {
    const source = searchParams.get("source");
    const context = searchParams.get("context") ?? "billings";
    const id = searchParams.get("id");

    if (source === "app") {
      setAppHandoff(true);
      const deepLink = buildAppDepositDeepLink("cancel", context, id);
      window.location.replace(deepLink);
      const fallback = window.setTimeout(() => {
        window.location.replace(deepLink);
      }, 1200);
      return () => window.clearTimeout(fallback);
    }

    const raw = searchParams.get("next");
    const target =
      raw && raw.startsWith("/") && !raw.startsWith("//")
        ? withDepositState(raw, "cancel")
        : withDepositState("/dashboard", "cancel");
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-canvas px-4">
      <div className="text-center">
        <i className="fas fa-circle-notch fa-spin text-2xl text-primaryColorBlack" />
        <p className="mt-4 text-sm font-medium text-gray-600">
          {appHandoff ? `Opening ${APP_NAME} app…` : `Returning you to ${APP_NAME}…`}
        </p>
      </div>
    </div>
  );
}

export default function WalletDepositCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-app-canvas">
          <i className="fas fa-circle-notch fa-spin text-2xl text-primaryColorBlack" />
        </div>
      }
    >
      <DepositCancelRedirect />
    </Suspense>
  );
}
