import type { Metadata } from "next";
import DynamicRequestBoundary from "@/components/security/DynamicRequestBoundary";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ForgotPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DynamicRequestBoundary>{children}</DynamicRequestBoundary>;
}
