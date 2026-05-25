import { AuthenticatedLayout } from "@/src/components/layout/AuthenticatedLayout";

export default function AuthenticatedRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
