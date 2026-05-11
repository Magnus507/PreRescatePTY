"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Cpu, Users, Building2, Shield, QrCode,
  LogOut, Settings, Package, Activity, ChevronRight, Bell, Search, AlertCircle, Menu, X, Store, Crown,
  Rocket, Sparkles
} from "lucide-react";

import type { Session } from "next-auth";

const ADMIN_ROLES = ["admin", "superadmin", "imprenta"];

function AdminSidebar({ session, closeMobileMenu, isLoggingOut, setIsLoggingOut }: { session: Session; closeMobileMenu?: () => void; isLoggingOut: boolean; setIsLoggingOut: (val: boolean) => void }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";
  const role = session.user?.role;
  const isPrintRole = role === 'imprenta';
  const isFounder = session.user?.email === "admin@prerescatepty.com";

  const branding = isFounder
    ? { title: "Sistema", sub: "RAIZ CORE", icon: Crown, color: "bg-amber-500 shadow-amber-500/40" }
    : isPrintRole
      ? { title: "Imprenta", sub: "GESTIÓN PTY", icon: Store, color: "bg-indigo-600 shadow-indigo-500/40" }
      : { title: "Admin", sub: "CORE ENGINE", icon: Shield, color: "bg-primary shadow-primary/40" };

  const nav = [
    { label: "Dashboard", id: "dashboard", icon: LayoutDashboard },
    { label: "Usuarios", id: "users", icon: Users },
    { label: "Gestión de Chips", id: "chips", icon: Cpu },
    { label: "Tienda Admin", id: "tienda", icon: Store },
    { label: "Cuentas Corporativas", id: "empresas", icon: Building2 },
    { label: "Stock & Fábrica", id: "inventory", icon: Package },
    { label: "Ventas & Pedidos", id: "pedidos", icon: Activity },
    { label: "Perfil VIP", id: "showcase", icon: Sparkles },
    { label: "Ajustes Sistema", id: "settings", icon: Settings },
    { label: "Auditoría", id: "governance", icon: Shield },
    { label: "Administradores", id: "admins", icon: Shield },
    { label: "Labs / Roadmap", id: "roadmap", icon: Rocket, isFuture: true },
  ].filter(item => !isPrintRole || item.id === 'inventory');

  return (
    <aside className="w-full h-full bg-white dark:bg-slate-950 flex flex-col z-40">
      <div className="p-10 flex items-center justify-between">
        <div className="flex items-center gap-4 font-black text-3xl tracking-tighter text-slate-900 dark:text-white">
          <div className={`h-12 w-12 ${branding.color} rounded-[1.25rem] flex items-center justify-center shadow-2xl -rotate-6 group`}>
            <branding.icon className="h-6 w-6 text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none">{branding.title}</span>
            <span className={`text-[10px] uppercase tracking-[0.4em] mt-1 opacity-70 ${isFounder ? 'text-amber-600' : 'text-primary'}`}>{branding.sub}</span>
          </div>
        </div>
        {closeMobileMenu && (
          <button onClick={closeMobileMenu} className="md:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {nav.map((item) => {
          const isActive = currentTab === item.id;
          const isFuture = (item as any).isFuture;

          return (
            <Link
              key={item.id}
              href={`/admin?tab=${item.id}`}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between group px-5 py-4 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] font-black transition-all duration-500 ${isActive
                  ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 translate-x-1"
                  : isFuture
                    ? "text-primary/60 hover:bg-primary/5 hover:text-primary border border-dashed border-primary/20"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 opacity-70"}`} />
                {item.label}
                {isFuture && (
                  <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-[8px] rounded-md font-bold text-primary animate-pulse">
                    Misión
                  </span>
                )}
              </div>
              {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-slate-200 dark:border-slate-700 uppercase">
            {session.user?.email?.[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-none mb-1">{session.user?.email}</p>
            <p className={`text-[10px] font-black uppercase tracking-tighter opacity-60 ${isFounder ? 'text-amber-600' : ''}`}>
              {isFounder ? "Fundador Supremo" : session.user.role === "superadmin" ? "Soberano" : session.user.role === "imprenta" ? "Gestor Imprenta" : "Operador Admin"}
            </p>
          </div>
        </div>
        <button
          disabled={isLoggingOut}
          onClick={async () => {
            setIsLoggingOut(true);
            await signOut({ redirect: false });
            window.location.href = "/login";
          }}
          className="flex items-center justify-center gap-3 px-4 py-3.5 w-full rounded-2xl text-sm font-black text-white bg-slate-950 dark:bg-white dark:text-slate-950 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
        >
          {isLoggingOut ? <Activity className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {isLoggingOut ? "Saliendo..." : "Cerrar Sesión"}
        </button>
      </div>
    </aside>
  );
}

function GlobalSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleGlobalSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("globalSearch") as string;
    if (!query) return;

    const params = new URLSearchParams(searchParams);
    params.set("q", query);
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <form onSubmit={handleGlobalSearch} className="hidden lg:flex relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
      <input
        name="globalSearch"
        type="text"
        placeholder="Búsqueda rápida..."
        autoComplete="off"
        className="bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 w-64 transition-all hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
      />
    </form>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const role = session?.user?.role || "";
  const isFounder = session?.user?.email === "admin@prerescatepty.com";
  const isPrintRole = role === 'imprenta';

  const headerBranding = isFounder
    ? { title: "Sistema Raíz", sub: "Control Maestro", icon: Crown, color: "bg-amber-500 shadow-amber-500/30" }
    : isPrintRole
      ? { title: "Gestión Imprenta", sub: "Producción PTY", icon: Store, color: "bg-indigo-600 shadow-indigo-600/30" }
      : { title: "Admin PTY", sub: "Control Panel", icon: Shield, color: "bg-primary shadow-primary/30" };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (!ADMIN_ROLES.includes(role)) {
        router.push("/login?error=AccessDenied");
      }
    }
  }, [status, role, router]);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Activity className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!session?.user || !ADMIN_ROLES.includes(session.user.role || "")) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary selection:text-white flex flex-col">
      {/* Unified Global Header */}
      <header className="sticky top-0 z-[100] h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 px-6 sm:px-10 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-8">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Brand */}
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className={`h-10 w-10 ${headerBranding.color} rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:rotate-12 group-hover:scale-110`}>
              <headerBranding.icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col hidden xs:flex">
              <span className={`font-black text-xl tracking-tighter leading-none ${isFounder ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{headerBranding.title}</span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 opacity-80 ${isFounder ? 'text-amber-500' : 'text-primary'}`}>{headerBranding.sub}</span>
            </div>
          </Link>

          {/* Search bar - Integrated via URL Params */}
          <Suspense fallback={<div className="w-64" />}>
            <GlobalSearchBar />
          </Suspense>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* User Profile Info */}
          <div className="hidden sm:flex items-center gap-4 pr-4 border-r border-slate-200 dark:border-slate-800">
            <div className="flex flex-col text-right">
              <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-1">{session.user?.email}</p>
              <div className="flex items-center justify-end gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${isFounder ? 'text-amber-600' : 'text-slate-500'}`}>
                  {isFounder ? "Fundador Supremo" : role === "superadmin" ? "Super Admin" : role === "imprenta" ? "Gestor Imprenta" : "Gestor Admin"}
                </span>
              </div>
            </div>
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm border shadow-sm ${isFounder
                ? 'bg-amber-500 text-white border-amber-400'
                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
              }`}>
              {isFounder ? <Crown className="h-5 w-5" /> : session.user?.email?.[0].toUpperCase()}
            </div>
          </div>

          {/* Global Actions */}
          <div className="flex items-center gap-2">
            <Link href="/" title="Ir al Sitio" className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm">
              <Package className="h-4 w-4" />
            </Link>
            <button
              disabled={isLoggingOut}
              onClick={async () => {
                setIsLoggingOut(true);
                await signOut({ redirect: false });
                window.location.href = "/login";
              }}
              title="Cerrar Sesión"
              className="h-10 w-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:opacity-90 active:scale-90 transition-all shadow-lg disabled:opacity-50"
            >
              {isLoggingOut ? <Activity className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div className={`
          fixed inset-y-0 left-0 z-[120] w-80 bg-white dark:bg-slate-950 shadow-2xl transition-transform duration-500 md:hidden
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900" />}>
            <AdminSidebar 
              session={session as Session} 
              closeMobileMenu={() => setIsMobileMenuOpen(false)} 
              isLoggingOut={isLoggingOut} 
              setIsLoggingOut={setIsLoggingOut}
            />
          </Suspense>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-80 border-r border-slate-200 dark:border-slate-800">
          <Suspense fallback={<div className="w-full bg-white dark:bg-slate-900" />}>
            <AdminSidebar 
              session={session as Session} 
              isLoggingOut={isLoggingOut} 
              setIsLoggingOut={setIsLoggingOut}
            />
          </Suspense>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden relative">
          <div className="max-w-[1700px] mx-auto p-6 sm:p-10 lg:p-12">
            {children}
          </div>
        </main>
      </div>

      <footer className="h-12 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 px-10 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <div className="flex gap-4 uppercase tracking-widest">
          <span>© 2026 PreRescate PTY</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-emerald-500" />
          <span>SISTEMA OPERATIVO — LATAM CLUSTER</span>
        </div>
      </footer>
    </div>
  );
}
