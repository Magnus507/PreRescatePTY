"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  Menu, X, ChevronDown, LogOut, User, LayoutDashboard,
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Helper for admin check
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin";

  return (
    <nav aria-label="Navegación principal" className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/70 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image 
            src="/logo.png" 
            alt="PreRescue ID" 
            width={48} 
            height={48} 
            className="h-10 w-10 md:h-12 md:w-12 object-contain transition-transform group-hover:scale-105" 
          />
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:inline-block">
            PreRescue <span className="text-brand">ID</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/como-funciona" className="relative px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-white rounded-2xl transition-all after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-brand after:transition-all hover:after:w-1/2">
            Cómo Funciona
          </Link>
          <Link href="/comprar" className="relative px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-white rounded-2xl transition-all after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-brand after:transition-all hover:after:w-1/2">
            Comprar
          </Link>
          <Link href="/faq" className="relative px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-white rounded-2xl transition-all after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-brand after:transition-all hover:after:w-1/2">
            FAQ
          </Link>
          <Link href="/contacto" className="relative px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-white rounded-2xl transition-all after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-brand after:transition-all hover:after:w-1/2">
            Contacto
          </Link>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Abrir menú de usuario"
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/80 px-3 py-1.5 text-sm font-medium hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-glow-sm"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{session.user?.email}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-[1.5rem] border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-premium py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 transition-colors rounded-xl mx-1"
                  >
                    <LayoutDashboard className="h-4 w-4" /> {isAdmin ? "Panel Admin" : "Dashboard"}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-white/10 transition-all duration-300 hover:shadow-glow-sm rounded-xl mx-1 mt-1"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-white transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/activar" className="btn-premium px-4 py-2 text-sm font-semibold rounded-2xl bg-gradient-to-r from-brand to-red-700 text-white hover:shadow-button hover:shadow-red-500/20 transition-all duration-300 active:scale-[0.98]">
                Activar Chip
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          className="md:hidden min-h-11 min-w-11 p-2 rounded-md hover:bg-accent transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-4 space-y-1">
            <Link href="/como-funciona" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center px-3 py-2 rounded-2xl text-sm font-medium text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">Cómo Funciona</Link>
            <Link href="/comprar" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center px-3 py-2 rounded-2xl text-sm font-medium text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">Comprar</Link>
            <Link href="/faq" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center px-3 py-2 rounded-2xl text-sm font-medium text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">FAQ</Link>
            <Link href="/contacto" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center px-3 py-2 rounded-2xl text-sm font-medium text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">Contacto</Link>
            <hr className="my-2 border-border" />
            {session ? (
              <>
                <Link href={isAdmin ? "/admin" : "/dashboard"} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-accent">{isAdmin ? "Panel Admin" : "Dashboard"}</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="flex min-h-11 w-full items-center text-left px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-accent">Cerrar Sesión</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center px-3 py-2 rounded-2xl text-sm font-medium text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">Iniciar Sesión</Link>
                <Link href="/activar" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center justify-center px-3 py-2 mt-1 rounded-2xl text-sm font-semibold bg-gradient-to-r from-brand to-red-700 text-white transition-all duration-300 hover:shadow-button hover:shadow-red-500/20 active:scale-[0.98]">Activar Chip</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
