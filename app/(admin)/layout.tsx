import DynamicRequestBoundary from "@/components/security/DynamicRequestBoundary";

export default function AdminRootGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DynamicRequestBoundary>{children}</DynamicRequestBoundary>;
}
