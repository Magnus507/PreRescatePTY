import type { ReactNode } from "react";
import LifetimePolicyHardening from "./_components/LifetimePolicyHardening";

export default function ConfiguracionLayout({ children }: { children: ReactNode }) {
  return (
    <div data-lifetime-product-policy>
      <LifetimePolicyHardening />
      {children}
    </div>
  );
}
