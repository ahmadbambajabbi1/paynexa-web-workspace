export default function BillingsLayout({ children }: { children: React.ReactNode }) {
  /** Cancels AuthenticatedLayout horizontal padding (px-4 / sm:px-6 / lg:px-8) for edge-to-edge Wallet content. */
  return <div className="-mx-0 max-w-none sm:-mx-0 lg:-mx-0">{children}</div>;
}
