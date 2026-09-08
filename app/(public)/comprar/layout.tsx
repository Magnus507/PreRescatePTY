import DynamicRequestBoundary from "@/components/security/DynamicRequestBoundary";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <DynamicRequestBoundary>{children}</DynamicRequestBoundary>;
}
