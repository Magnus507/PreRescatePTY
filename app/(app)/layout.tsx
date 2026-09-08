import DynamicRequestBoundary from "@/components/security/DynamicRequestBoundary";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DynamicRequestBoundary>{children}</DynamicRequestBoundary>;
}
