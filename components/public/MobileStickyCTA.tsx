"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function MobileStickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after the hero section (roughly 90vh)
      setVisible(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky-cta md:hidden ${visible ? "visible" : ""}`}
      role="complementary"
      aria-label="Acceso rápido a compra"
    >
      <Link
        href="/comprar"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#DA1A21] text-white text-sm font-bold hover:bg-[#B9141B] transition-all shadow-lg shadow-red-500/30 active:scale-[0.98]"
      >
        <Shield className="h-4 w-4" />
        Protegerse Hoy
      </Link>
    </div>
  );
}