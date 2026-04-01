"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  Shield, Menu, X, ChevronDown, LogOut, User, LayoutDashboard,
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Pre<span className="text-primary">Rescate</span>
            <span className="text-xs font-medium text-muted-foreground ml-0.5">PTY</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/como-funciona" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
            Cómo Funciona
          </Link>
          <Link href="/comprar" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
            Comprar
          </Link>
          <Link href="/faq" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
            FAQ
          </Link>
          <Link href="/contacto" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
            Contacto
          </Link>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{session.user?.email}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
                  <Link
                    href={(session.user as any)?.role === "admin" || (session.user as any)?.role === "superadmin" ? "/admin" : "/dashboard"}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" /> {(session.user as any)?.role === "admin" || (session.user as any)?.role === "superadmin" ? "Panel Admin" : "Dashboard"}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/activar" className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md">
                Activar Chip
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-md hover:bg-accent"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            <Link href="/como-funciona" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">Cómo Funciona</Link>
            <Link href="/comprar" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">Comprar</Link>
            <Link href="/faq" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">FAQ</Link>
            <Link href="/contacto" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">Contacto</Link>
            <hr className="my-2 border-border" />
            {session ? (
              <>
                <Link href={(session.user as any)?.role === "admin" || (session.user as any)?.role === "superadmin" ? "/admin" : "/dashboard"} onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-accent">{(session.user as any)?.role === "admin" || (session.user as any)?.role === "superadmin" ? "Panel Admin" : "Dashboard"}</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-accent">Cerrar Sesión</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">Iniciar Sesión</Link>
                <Link href="/activar" onClick={() => setMobileOpen(false)} className="block px-3 py-2 mt-1 rounded-lg text-sm font-semibold bg-primary text-primary-foreground text-center">Activar Chip</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
