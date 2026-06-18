"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Menu, X, LogOut, User, LayoutDashboard, ChevronDown,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/como-funciona", label: "Cómo Funciona" },
  { href: "/comprar", label: "Comprar" },
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
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      // Focus the close button when menu opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
      // Return focus to trigger when menu closes
      menuTriggerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Focus trap: keep focus inside menu when open
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeMenu();
      return;
    }

    if (e.key === "Tab" && mobileOpen) {
      const menu = menuPanelRef.current;
      if (!menu) return;

      const focusableElements = menu.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [mobileOpen, closeMenu]);

  return (
    <>
      {/* Skip to content */}
      <a href="#main-content" className="skip-to-content">
        Ir al contenido principal
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-nav shadow-lg" : "bg-transparent"
        }`}
      >
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="PreRescue ID — Inicio">
            <div className="relative h-9 w-9 md:h-10 md:w-10 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="object-contain"
                aria-hidden
              />
            </div>
            <span className="font-bold tracking-tight text-[#EFF4FF] hidden sm:inline-block text-lg">
              PreRescue <span className="text-[#DA1A21]">ID</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium text-[#A0AEC0] hover:text-[#EFF4FF] rounded-xl transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="Abrir menú de usuario"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-[#EFF4FF] hover:bg-white/10 transition-all"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{session.user?.email}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#0A1128]/95 backdrop-blur-xl shadow-2xl py-2 z-50">
                    <Link
                      href={isAdmin ? "/admin" : "/dashboard"}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#EFF4FF] hover:bg-white/10 transition-colors rounded-xl mx-1"
                    >
                      <LayoutDashboard className="h-4 w-4" /> {isAdmin ? "Panel Admin" : "Dashboard"}
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#DA1A21] hover:bg-white/10 transition-colors rounded-xl mx-1 mt-1"
                    >
                      <LogOut className="h-4 w-4" /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-[#A0AEC0] hover:text-[#EFF4FF] transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/comprar"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#DA1A21] text-white text-sm font-bold hover:bg-[#B9141B] transition-all shadow-lg shadow-red-500/20"
                >
                  Protegerse Hoy
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            ref={menuTriggerRef}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="md:hidden min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[#EFF4FF] hover:bg-white/10 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-40 md:hidden"
          onKeyDown={handleMenuKeyDown}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu panel */}
          <div
            ref={menuPanelRef}
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#05070D] border-l border-white/10 overflow-y-auto animate-slide-up"
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
              <span className="font-bold text-[#EFF4FF]">Menú</span>
              <button
                ref={closeButtonRef}
                onClick={closeMenu}
                aria-label="Cerrar menú"
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[#EFF4FF] hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-1">
              <Link
                href="/"
                onClick={closeMenu}
                className="flex min-h-11 items-center px-3 py-2 rounded-xl text-sm font-medium text-[#A0AEC0] hover:text-[#EFF4FF] hover:bg-white/10 transition-all"
              >
                Inicio
              </Link>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="flex min-h-11 items-center px-3 py-2 rounded-xl text-sm font-medium text-[#A0AEC0] hover:text-[#EFF4FF] hover:bg-white/10 transition-all"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-3 border-white/10" />
              {session ? (
                <>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    onClick={closeMenu}
                    className="flex min-h-11 items-center px-3 py-2 rounded-xl text-sm font-medium text-[#DA1A21] hover:bg-white/10 transition-all"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    {isAdmin ? "Panel Admin" : "Dashboard"}
                  </Link>
                  <button
                    onClick={() => { closeMenu(); signOut({ callbackUrl: "/" }); }}
                    className="flex min-h-11 w-full items-center px-3 py-2 rounded-xl text-sm font-medium text-[#DA1A21] hover:bg-white/10 transition-all"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="flex min-h-11 items-center px-3 py-2 rounded-xl text-sm font-medium text-[#A0AEC0] hover:text-[#EFF4FF] hover:bg-white/10 transition-all"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/comprar"
                    onClick={closeMenu}
                    className="flex min-h-11 items-center justify-center px-3 py-3 mt-2 rounded-xl bg-[#DA1A21] text-white text-sm font-bold transition-all"
                  >
                    Protegerse Hoy
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}