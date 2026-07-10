"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Cpu, UsersRound,
  Building2, ChevronRight, Settings,
  LogOut, Home, ShoppingCart, Package,
  Loader2, Menu, X, PanelLeftClose, PanelLeftOpen, Shield, ReceiptText
} from "lucide-react";
import { AccountState } from "@/domains/accounts/account.types";
import { ScanMonitor } from "./_components/ScanMonitor";

const SIDEBAR_COLLAPSE_KEY = "pr_dashboard_sidebar_collapsed";

// === CONSUMER Navigation — Reorganized ===
const consumerNavItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/perfiles-medicos", label: "Perfiles médicos", icon: UsersRound },
  { href: "/dashboard/chips", label: "Mis dispositivos", icon: Cpu },
  { href: "/dashboard/chips?activate=true", label: "Activar chip", icon: Shield },
  { href: "/dashboard/compras", label: "Tienda", icon: ShoppingCart },
  { href: "/dashboard/pedidos", label: "Mis pedidos", icon: ReceiptText },
  { href: "/dashboard/empresas", label: "Empresa", icon: Building2 },
  { href: "/dashboard/configuracion", label: "Ajustes", icon: Settings },
];

// === CORPORATE Navigation ===
const corporateNavItems = [
  { href: "/dashboard/empresa", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/empresa-perfil", label: "Perfil Empresarial", icon: Building2 },
  { href: "/dashboard/colaboradores", label: "Colaboradores", icon: UsersRound },
  { href: "/dashboard/solicitudes", label: "Solicitudes", icon: Package },
  { href: "/dashboard/pedidos-corporativos", label: "Pedidos", icon: ShoppingCart },
];
//// Configuración es eliminado del sidebar corporativo porque no aplica a cuentas empresa

function NavLink({ href, label, icon: Icon, pathname, activateMode, collapsed }: {
  href: string; label: string; icon: React.ElementType; pathname: string; activateMode: boolean; collapsed: boolean;
}) {
  const normalizedHref = href.split("?")[0];
  const isActive = href.includes("?")
    ? pathname === normalizedHref && activateMode
    : pathname === href;
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`flex items-center ${collapsed ? "justify-center px-3" : "justify-between px-4"} group py-3.5 rounded-2xl text-sm font-black transition-all duration-300 ${
        isActive
          ? "bg-primary text-white shadow-xl shadow-primary/20 translate-x-1"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
        <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 opacity-70"}`} />
        {!collapsed && <span>{label}</span>}
      </div>
      {!collapsed && isActive && <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<AccountState | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activateMode, setActivateMode] = useState(false);

  const refreshState = useCallback(() => {
    if (status === "authenticated") {
      fetch("/api/account/state")
        .then(r => r.json())
        .then(data => setState(data))
        .catch((err: unknown) => console.error("Error loading account state", err));
    }
  }, [status]);

  useEffect(() => {
    refreshState();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshState();
      }
    };

    window.addEventListener('focus', refreshState);
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('focus', refreshState);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshState]);

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setActivateMode(window.location.search.includes("activate=true"));
  }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
    if (saved !== null) {
      setIsSidebarCollapsed(saved === "1");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  // The middleware handles redirections to /login.
  // We keep the loading state for visual feedback during hydration.
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#050812]">
        <div className="h-16 w-16 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="mt-6 font-black text-slate-400 uppercase tracking-[0.3em] text-[10px] animate-pulse">Autenticando Acceso...</p>
      </div>
    );
  }

  // The middleware ensures only authenticated users reach this point.
  if (!session?.user && !isLoggingOut) {
    router.push("/login");
    return null;
  }

  const isCorporate = state?.isOrganization === true;

  const mobileLinks = isCorporate
    ? corporateNavItems
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/chips", label: "Mis Dispositivos", icon: Cpu },
        { href: "/dashboard/compras", label: "Tienda", icon: ShoppingCart },
      ];
  // Mobile menu handled via lucide icons imported above (Menu/X)

  return (
    <div className="min-h-screen bg-white dark:bg-[#050812] selection:bg-primary selection:text-white">
      <ScanMonitor />
      <div className="max-w-[1600px] mx-auto flex h-screen">
        {/* Sidebar */}
        <aside className={`hidden lg:flex flex-col bg-slate-50/80 dark:bg-[#0f1419]/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-[#1a2333]/60 p-4 z-10 transition-all duration-300 ${isSidebarCollapsed ? "w-24" : "w-80"}`}>
          <div className="flex items-center justify-between gap-3 px-2 pb-4 border-b border-slate-200/70 dark:border-[#1a2333]">
            {!isSidebarCollapsed && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">Panel Cliente</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">PreRescatePTY</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-[#2a3a4f] bg-white/80 dark:bg-[#141c29] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 transition-all"
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

          <div className="space-y-8 flex-1 overflow-y-auto pr-1 pt-6 custom-scrollbar">
            
            {isCorporate ? (
              /* ========== CORPORATE SIDEBAR ========== */
              <>
                <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500 dark:bg-indigo-600 text-white flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-300">Cuenta Corporativa</p>
                      <p className="text-sm font-black text-indigo-900 dark:text-indigo-200 tracking-tight">Gestión Industrial</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Gestión Corporativa</p>
                  {corporateNavItems.map((item) => (
                    <NavLink key={item.href} {...item} pathname={pathname} activateMode={activateMode} collapsed={isSidebarCollapsed} />
                  ))}
                </div>
              </>
            ) : (
              /* ========== CONSUMER SIDEBAR ========== */
              <>
                <div className="space-y-2">
                  {!isSidebarCollapsed && <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Navegación</p>}
                  {consumerNavItems.map((item) => (
                    <NavLink key={item.href} {...item} pathname={pathname} activateMode={activateMode} collapsed={isSidebarCollapsed} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#1a2333]">
             <div className={`p-4 rounded-3xl bg-slate-50 dark:bg-[#1a2333]/40 border border-slate-100 dark:border-[#2a3a4f] group hover:border-primary/20 dark:hover:border-primary/30 transition-all cursor-pointer ${isSidebarCollapsed ? "text-center" : ""}`}>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-2xl bg-white dark:bg-[#2a3a4f] border border-slate-200 dark:border-[#3a4a5f] flex items-center justify-center font-black text-primary text-sm shadow-sm dark:shadow-primary/10">
                      {session?.user?.email?.[0].toUpperCase()}
                   </div>
                   {!isSidebarCollapsed && (
                     <div className="overflow-hidden">
                        <p className="text-xs font-black truncate dark:text-white">{session?.user?.email}</p>
                        {state && (
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${state.isInactive ? "text-red-500" : "text-primary"}`}>
                            {state.isInactive ? "Cuenta Inactiva" : state.isCorporate ? "Cuenta Empresa" : (state.isFamily ? "Multi-Perfil" : "Protección Individual")}
                          </p>
                        )}
                     </div>
                   )}
                </div>
             </div>
              {!isCorporate && (
                <div className={`grid ${isSidebarCollapsed ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-3`}>
                  <Link href="/dashboard/pedidos" className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-xs hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 transition-all shadow-lg shadow-indigo-600/20">
                     <Package className="h-3.5 w-3.5" /> {!isSidebarCollapsed && "Pedidos"}
                  </Link>
                  {!isSidebarCollapsed && (
                    <Link href="/dashboard/compras" className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-800 text-white font-black text-xs hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 transition-all shadow-lg shadow-slate-900/10">
                       <ShoppingCart className="h-3.5 w-3.5" /> Tienda
                    </Link>
                  )}
                </div>
              )}
             
			  <div className={`grid gap-2 mt-3 ${isSidebarCollapsed ? "grid-cols-1" : "grid-cols-2"}`}>
                <Link href="/" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-[#1a2333] border border-slate-200 dark:border-[#2a3a4f] text-slate-600 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-[#2a3a4f] transition-all">
                  <Home className="h-3.5 w-3.5" /> Inicio
                </Link>
                <button 
                  disabled={isLoggingOut}
                  onClick={async () => {
                    setIsLoggingOut(true);
                    await signOut({ redirect: false });
                    window.location.href = "/login";
                  }}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold text-[10px] uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-500/20 transition-all disabled:opacity-50 border border-red-200 dark:border-red-500/30"
                >
                  {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  {isLoggingOut ? "Saliendo..." : "Salir"}
                </button>
             </div>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/90 dark:bg-[#0f1419]/90 backdrop-blur-xl border-t border-slate-200 dark:border-[#1a2333] flex items-center gap-2 overflow-x-auto px-3 py-2 safe-area-bottom">
          {mobileLinks.map((item) => {
            const active = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-all duration-300 ${
                  active ? "bg-primary/20 dark:bg-primary/30 text-primary" : "text-slate-500 dark:text-slate-400"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={`h-6 w-6 ${active ? "fill-primary/10" : ""}`} />
                <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}

          {!isCorporate && (
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-all duration-300 ${
                isMoreMenuOpen ? "bg-primary/20 dark:bg-primary/30 text-primary" : "text-slate-500 dark:text-slate-400"
              }`}
              aria-label="Abrir más opciones"
              aria-expanded={isMoreMenuOpen}
            >
              <Menu className="h-6 w-6" />
              <span className="text-[9px] font-black uppercase tracking-tighter leading-none">Más</span>
            </button>
          )}
        </nav>

        {!isCorporate && isMoreMenuOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-[68] bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setIsMoreMenuOpen(false)}
            />

            <div className="lg:hidden fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl border-t border-slate-200 dark:border-[#1a2333] bg-white dark:bg-[#0f1419] shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Menú</p>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="h-10 w-10 rounded-xl border border-slate-200 dark:border-[#2a3a4f] flex items-center justify-center text-slate-500 dark:text-slate-300"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
                  { href: "/dashboard/perfiles-medicos", label: "Perfiles Médicos", icon: UsersRound },
                  { href: "/dashboard/chips", label: "Mis Dispositivos", icon: Cpu },
                  { href: "/dashboard/chips?activate=true", label: "Activar Chip", icon: Shield },
                  { href: "/dashboard/empresas", label: "Empresa", icon: Building2 },
                  { href: "/dashboard/compras", label: "Tienda", icon: ShoppingCart },
                  { href: "/dashboard/pedidos", label: "Mis Pedidos", icon: Package },
                  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#2a3a4f] bg-white dark:bg-[#141c29] px-4 py-3.5 text-sm font-black text-slate-700 dark:text-slate-200"
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </Link>
                ))}

                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={async () => {
                    setIsMoreMenuOpen(false);
                    setIsLoggingOut(true);
                    await signOut({ redirect: false });
                    window.location.href = "/login";
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 text-sm font-black text-red-600 dark:text-red-400 disabled:opacity-50"
                >
                  {isLoggingOut ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <LogOut className="h-4.5 w-4.5" />}
                  <span>{isLoggingOut ? "Saliendo..." : "Salir"}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-[#050812]/30">
          <div className="max-w-6xl mx-auto p-6 md:p-10 lg:p-12 pb-24 md:pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
