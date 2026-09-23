import DynamicRequestBoundary from "@/components/security/DynamicRequestBoundary";
import { Providers } from "@/app/providers";

export default function AdminRootGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers><DynamicRequestBoundary>{children}</DynamicRequestBoundary></Providers>;
}
