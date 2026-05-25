import { redirect } from "next/navigation";

export default function ProductsListRedirectPage() {
  redirect("/store?tab=products");
}
