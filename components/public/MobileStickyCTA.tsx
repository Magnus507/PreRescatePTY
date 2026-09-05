"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function MobileStickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.7);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] transition-all duration-300 md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"
      }`}
      role="complementary"
      aria-label="Acceso rápido a compra"
    >
      <div className="mx-auto max-w-md rounded-[1.25rem] border border-white/[0.08] bg-[#070b13]/88 p-2 shadow-[0_18px_70px_-25px_rgba(0,0,0,.95)] backdrop-blur-2xl">
        <Link
          href="/comprar"
          className="group flex min-h-12 w-full items-center justify-between rounded-2xl bg-[#DA1A21] px-4 text-white shadow-[0_14px_40px_-18px_rgba(218,26,33,.9)] transition-all active:scale-[0.99]"
        >
          <span className="flex items-center gap-2.5 text-sm font-extrabold">
            <ShieldCheck className="h-4 w-4" />
            Obtener PreRescue ID
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
