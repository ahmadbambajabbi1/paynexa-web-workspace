import { Suspense } from "react";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { StorePageClient } from "@/src/components/store/StorePageClient";

function StoreFallback() {
  return (
    <div className="flex justify-center py-24">
      <i className="fas fa-circle-notch fa-spin text-3xl text-primaryColorBlack" aria-hidden />
    </div>
  );
}

export default function StorePage() {
  return (
    <RequireAuth requireProfileComplete>
      <Suspense fallback={<StoreFallback />}>
        <StorePageClient />
      </Suspense>
    </RequireAuth>
  );
}
