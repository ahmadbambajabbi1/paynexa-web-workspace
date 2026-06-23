"use client";

import { DeliveryAddressPicker } from "@/src/components/DeliveryAddressPicker";
import type { DeliveryFormValues } from "@/src/components/DeliveryAddressPicker";

type Props = {
  token: string;
  onClose: () => void;
  onSubmit: (values: DeliveryFormValues) => Promise<void> | void;
};

export function DeliveryAddressModal({ token, onClose, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="delivery-modal-title" className="text-lg font-bold text-slate-900">
              Delivery address
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a saved address or add a new one before you pay.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <DeliveryAddressPicker
          token={token}
          onSaved={onSubmit}
        />
      </div>
    </div>
  );
}
