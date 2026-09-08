import DynamicRequestBoundary from "@/components/security/DynamicRequestBoundary";

export default function EmergencyProfileLayout({ children }: { children: React.ReactNode }) {
  return <DynamicRequestBoundary>{children}</DynamicRequestBoundary>;
}
