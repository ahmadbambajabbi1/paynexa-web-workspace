import { redirect } from "next/navigation";

export default function MyServicesRedirectPage() {
  redirect("/store?tab=services");
}
