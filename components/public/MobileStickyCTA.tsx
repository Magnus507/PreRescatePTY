"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

const HIDDEN_PREFIXES = ["/comprar", "/registro", "/login", "/activar", "/dashboard", "/admin"];

export default function MobileStickyCTA() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  const hiddenOnRoute = HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (hiddenOnRoute) return;

    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.45);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hiddenOnRoute]);

  useEffect(() => {
    if (hiddenOnRoute) return;

    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [hiddenOnRoute]);

  if (hiddenOnRoute) return null;

  const shouldShow = visible && !footerVisible;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[70] px-2.5 pb-[max(.5rem,env(safe-area-inset-bottom))] transition-all duration-300 md:hidden ${
        shouldShow ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"
      }`}
      role="complementary"
      aria-label="Acceso rápido a compra"
    >
      <div className="mx-auto max-w-sm rounded-[1.15rem] border border-white/[0.08] bg-[#070b13]/90 p-1.5 shadow-[0_18px_70px_-25px_rgba(0,0,0,.95)] backdrop-blur-2xl">
        <Link
          href="/comprar"
          className="group flex min-h-13 w-full touch-manipulation items-center justify-between rounded-[0.95rem] bg-[#DA1A21] px-4 text-white shadow-[0_14px_40px_-18px_rgba(218,26,33,.9)] transition-transform active:scale-[0.985]"
        >
          <span className="flex items-center gap-2.5 text-[13px] font-extrabold">
            <ShieldCheck className="h-4 w-4" />
            Obtener PreRescue ID
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
