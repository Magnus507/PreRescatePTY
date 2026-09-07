import type { ReactNode } from "react";
import LifetimePolicyHardening from "./_components/LifetimePolicyHardening";

export default function ConfiguracionLayout({ children }: { children: ReactNode }) {
  return (
    <div data-lifetime-product-policy>
      <style>{`
        [data-lifetime-product-policy] button[role="switch"] { display: none !important; }
      `}</style>
      <LifetimePolicyHardening />
      {children}
    </div>
  );
}
