"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ArrowRight, ChevronDown, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/para-quien-es", label: "Para quién es" },
  { href: "/comprar", label: "Planes" },
  { href: "/empresas", label: "Empresas" },
  { href: "/faq", label: "FAQ" },
  { href: "/demo", label: "Demo" },
  { href: "/contacto", label: "Contacto" },
];

export default function PublicNavbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      closeMenu();
      menuTriggerRef.current?.focus();
      return;
    }

    if (event.key === "Tab" && mobileOpen) {
      const menu = menuPanelRef.current;
      if (!menu) return;
      const focusableElements = menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }, [closeMenu, mobileOpen]);

  return (
    <>
      <a href="#main-content" className="skip-to-content">Ir al contenido principal</a>

      <header className="fixed inset-x-0 top-0 z-50 px-2 pt-[max(.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
        <nav
          aria-label="Navegación principal"
          className={`mx-auto flex h-14 max-w-7xl items-center justify-between rounded-[1.1rem] border px-2.5 transition-all duration-500 sm:h-16 sm:rounded-[1.25rem] sm:px-4 lg:px-5 ${
            scrolled
              ? "border-white/[0.10] bg-[#050914]/90 shadow-[0_18px_60px_-30px_rgba(0,0,0,.95)] backdrop-blur-2xl"
              : "border-white/[0.055] bg-[#050914]/50 backdrop-blur-xl"
          }`}
        >
          <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2" aria-label="PreRescue ID — Inicio">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.045] shadow-[0_8px_25px_-15px_rgba(56,189,248,.8)] transition-all group-hover:border-sky-300/20 group-hover:bg-white/[0.07] sm:h-10 sm:w-10">
              <Image src="/logo.png" alt="" width={40} height={40} className="h-7 w-7 object-contain sm:h-8 sm:w-8" aria-hidden />
            </span>
            <span className="hidden truncate text-[13px] font-black tracking-[-0.025em] text-slate-50 min-[360px]:inline-block sm:text-[15px]">
              PreRescue <span className="text-[#ff4d55]">ID</span>
            </span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl px-2.5 py-2 text-[12px] font-bold text-slate-400 transition-all hover:bg-white/[0.05] hover:text-slate-100 lg:px-3">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2.5 md:flex">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((value) => !value)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="Abrir menú de usuario"
                  className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-bold text-slate-200 transition-all hover:border-white/[0.13] hover:bg-white/[0.07]"
                >
                  <User className="h-3.5 w-3.5 text-sky-300" />
                  <span className="max-w-[110px] truncate">{session.user?.email}</span>
                  <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080d16]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                    <Link href={isAdmin ? "/admin" : "/dashboard"} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.06]">
                      <LayoutDashboard className="h-4 w-4 text-sky-300" /> {isAdmin ? "Panel Admin" : "Dashboard"}
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/" })} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-400/[0.06]">
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="hidden px-2 py-2 text-xs font-bold text-slate-400 transition-colors hover:text-white lg:block">Ingresar</Link>
                <Link href="/comprar" className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#DA1A21] px-4 text-xs font-extrabold text-white shadow-[0_12px_30px_-15px_rgba(218,26,33,.85)] transition-all hover:bg-[#ef2d35]">
                  Obtener ID
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          <button
            ref={menuTriggerRef}
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-100 transition-colors active:bg-white/[0.09] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </header>

      {mobileOpen && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación" className="fixed inset-0 z-40 md:hidden" onKeyDown={handleMenuKeyDown}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={closeMenu} aria-hidden="true" />
          <div
            ref={menuPanelRef}
            className="absolute left-2 right-2 top-[max(.5rem,env(safe-area-inset-top))] bottom-[max(.5rem,env(safe-area-inset-bottom))] overscroll-contain overflow-y-auto rounded-[1.45rem] border border-white/[0.09] bg-[#060a12] p-3 shadow-2xl sm:left-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-[390px] sm:rounded-[1.7rem] sm:p-4"
          >
            <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-1">
              <Link href="/" onClick={closeMenu} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04]"><Image src="/logo.png" alt="" width={32} height={32} className="h-7 w-7 object-contain" /></span>
                <span className="text-sm font-black text-white">PreRescue <span className="text-[#ff4d55]">ID</span></span>
              </Link>
              <button ref={closeButtonRef} onClick={closeMenu} aria-label="Cerrar menú" className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-200"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-3 space-y-0.5">
              <Link href="/" onClick={closeMenu} className="flex min-h-12 touch-manipulation items-center rounded-xl px-3 text-sm font-bold text-slate-300 transition-colors active:bg-white/[0.07] active:text-white">Inicio</Link>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className="flex min-h-12 touch-manipulation items-center rounded-xl px-3 text-sm font-bold text-slate-300 transition-colors active:bg-white/[0.07] active:text-white">{link.label}</Link>
              ))}
            </div>

            <div className="sticky bottom-0 mt-4 border-t border-white/[0.06] bg-[#060a12]/95 pt-4 pb-[max(.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              {session ? (
                <>
                  <Link href={isAdmin ? "/admin" : "/dashboard"} onClick={closeMenu} className="flex min-h-12 touch-manipulation items-center gap-2 rounded-xl px-3 text-sm font-bold text-sky-200 transition-colors active:bg-white/[0.06]"><LayoutDashboard className="h-4 w-4" />{isAdmin ? "Panel Admin" : "Dashboard"}</Link>
                  <button onClick={() => { closeMenu(); signOut({ callbackUrl: "/" }); }} className="flex min-h-12 w-full touch-manipulation items-center gap-2 rounded-xl px-3 text-sm font-bold text-rose-300 transition-colors active:bg-rose-400/[0.07]"><LogOut className="h-4 w-4" />Cerrar sesión</button>
                </>
              ) : (
                <div className="grid gap-2">
                  <Link href="/login" onClick={closeMenu} className="flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-bold text-slate-200">Iniciar sesión</Link>
                  <Link href="/comprar" onClick={closeMenu} className="flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#DA1A21] text-sm font-extrabold text-white">Obtener PreRescue ID <ArrowRight className="h-4 w-4" /></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
