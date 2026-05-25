import { redirect } from "next/navigation";

export default function MarketplaceBookingsRedirectPage() {
  redirect("/store?tab=my-bookings");
}
