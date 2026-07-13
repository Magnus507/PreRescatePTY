"use client";

import { useEffect, useState, useCallback } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Cpu,
  UsersRound,
  Building2,
  ChevronRight,
  Settings,
  LogOut,
  Home,
  ShoppingCart,
  Package,
  Loader2,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
} from "lucide-react";
import { AccountState } from "@/domains/accounts/account.types";
import { ScanMonitor } from "./_components/ScanMonitor";

const SIDEBAR_COLLAPSE_KEY = "pr_dashboard_sidebar_collapsed";

const consumerNavItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/perfiles-medicos", label: "Perfiles médicos", icon: UsersRound },
  { href: "/dashboard/chips", label: "Mis dispositivos", icon: Cpu },
  { href: "/dashboard/tienda", label: "Tienda", icon: ShoppingCart },
  { href: "/dashboard/pedidos", label: "Mis pedidos", icon: ReceiptText },
  { href: "/dashboard/empresas", label: "Empresa", icon: Building2 },
  { href: "/dashboard/configuracion", label: "Ajustes", icon: Settings },
] as const;

const corporateNavItems = [
  { href: "/dashboard/empresa", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/empresa-perfil", label: "Perfil Empresarial", icon: Building2 },
  { href: "/dashboard/colaboradores", label: "Colaboradores", icon: UsersRound },
  { href: "/dashboard/solicitudes", label: "Solicitudes", icon: Package },
  { href: "/dashboard/pedidos-corporativos", label: "Pedidos", icon: ShoppingCart },
] as const;

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
};

function isItemActive(pathname: string, href: string, activateMode: boolean) {
  const normalizedHref = href.split("?")[0];
  return href.includes("?") ? pathname === normalizedHref && activateMode : pathname === href;
}

function ShellNavLink({
  href,
  label,
  icon: Icon,
  pathname,
  activateMode,
  collapsed,
}: NavItem & {
  pathname: string;
  activateMode: boolean;
  collapsed: boolean;
}) {
  const active = isItemActive(pathname, href, activateMode);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-[1.1rem] border px-3.5 py-3 text-sm font-black transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        collapsed ? "justify-center" : "justify-between"
      } ${
        active
          ? "border-[#DA1A21]/20 bg-[linear-gradient(135deg,rgba(218,26,33,0.98)_0%,rgba(185,20,27,0.98)_100%)] text-white shadow-[0_18px_36px_-24px_rgba(218,26,33,0.65)]"
          : "border-transparent bg-transparent text-slate-520 hover:border-slate-200 hover:bg-white/80 hover:text-slate-950 dark:text-slate-400 dark:hover:border-[#2a3a4f] dark:hover:bg-[#131b27] dark:hover:text-white"
      }`}
    >
      <span className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${active ? "scale-110" : "opacity-70 group-hover:scale-110 group-hover:opacity-100"}`} />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
      {!collapsed && active && <ChevronRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />}
    </Link>
  );
}

function ShellQuickAction({
  href,
  label,
  icon: Icon,
  variant,
}: {
  href: string;
  label: string;
  icon: ElementType;
  variant: "primary" | "secondary";
}) {
  const base =
    "flex items-center justify-center gap-2 rounded-[1.05rem] border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  return (
    <Link
      href={href}
      className={`${base} ${
        variant === "primary"
          ? "border-[#DA1A21]/10 bg-[linear-gradient(135deg,rgba(218,26,33,0.98)_0%,rgba(185,20,27,0.98)_100%)] text-white shadow-[0_16px_32px_-24px_rgba(218,26,33,0.7)] hover:shadow-[0_20px_40px_-26px_rgba(218,26,33,0.8)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-[#2a3a4f] dark:bg-[#141c29] dark:text-slate-200 dark:hover:bg-[#1a2333]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
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
        .then((r) => r.json())
        .then((data) => setState(data))
        .catch((err: unknown) => console.error("Error loading account state", err));
    }
  }, [status]);

  useEffect(() => {
    refreshState();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshState();
      }
    };

    window.addEventListener("focus", refreshState);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", refreshState);
      document.removeEventListener("visibilitychange", handleVisibility);
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(218,26,33,0.06),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(218,26,33,0.08),transparent_35%),linear-gradient(180deg,#050812_0%,#0b1220_100%)]">
        <div className="h-16 w-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-[#DA1A21]/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#DA1A21] border-t-transparent" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500 animate-pulse">Autenticando acceso</p>
      </div>
    );
  }

  if (!session?.user && !isLoggingOut) {
    router.push("/login");
    return null;
  }

  const isCorporate = state?.isOrganization === true;
  const mobileLinks = isCorporate
    ? corporateNavItems
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/chips", label: "Mis dispositivos", icon: Cpu },
        { href: "/dashboard/tienda", label: "Tienda", icon: ShoppingCart },
      ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(218,26,33,0.04),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] selection:bg-[#DA1A21] selection:text-white dark:bg-[radial-gradient(circle_at_top,rgba(218,26,33,0.08),transparent_18%),linear-gradient(180deg,#050812_0%,#0a1120_100%)]">
      <ScanMonitor />
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1920px] overflow-hidden">
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200/70 bg-[linear-gradient(180deg,rgba(250,251,253,0.96)_0%,rgba(243,246,250,0.92)_100%)] p-4 backdrop-blur-xl transition-[width] duration-300 dark:border-[#1a2333]/80 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.96)_0%,rgba(9,14,24,0.94)_100%)] ${
            isSidebarCollapsed ? "w-24" : "w-80"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-1 pb-4 dark:border-[#1a2333]">
            {!isSidebarCollapsed ? (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">Panel cliente</p>
                <p className="text-sm font-black tracking-tight text-slate-950 dark:text-white">PreRescatePTY</p>
              </div>
            ) : (
              <div className="h-11 w-11 rounded-[1.05rem] border border-slate-200 bg-white/90 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.2)] dark:border-[#2a3a4f] dark:bg-[#141c29]" />
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-[1.05rem] border border-slate-200 bg-white/85 text-slate-600 transition-all duration-200 hover:border-[#DA1A21]/20 hover:text-[#DA1A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-[#2a3a4f] dark:bg-[#141c29] dark:text-slate-300 dark:hover:border-[#DA1A21]/25 motion-reduce:transition-none"
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 pr-1 custom-scrollbar">
            {isCorporate ? (
              <div className="space-y-5">
                <div className="rounded-[1.35rem] border border-indigo-500/15 bg-[linear-gradient(180deg,rgba(79,70,229,0.08)_0%,rgba(79,70,229,0.03)_100%)] p-4 shadow-[0_18px_36px_-30px_rgba(79,70,229,0.45)] dark:border-indigo-400/20 dark:bg-[linear-gradient(180deg,rgba(79,70,229,0.18)_0%,rgba(79,70,229,0.06)_100%)]">
                  <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-indigo-600 text-white shadow-[0_16px_30px_-24px_rgba(79,70,229,0.6)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/90 dark:text-indigo-200">Cuenta corporativa</p>
                        <p className="truncate text-sm font-black tracking-tight text-indigo-950 dark:text-indigo-100">Gestión industrial</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {!isSidebarCollapsed && <p className="px-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Gestión corporativa</p>}
                  {corporateNavItems.map((item) => (
                    <ShellNavLink key={item.href} {...item} pathname={pathname} activateMode={activateMode} collapsed={isSidebarCollapsed} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {!isSidebarCollapsed && <p className="px-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Navegación</p>}
                {consumerNavItems.map((item) => (
                  <ShellNavLink key={item.href} {...item} pathname={pathname} activateMode={activateMode} collapsed={isSidebarCollapsed} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-5 dark:border-[#1a2333]">
            <div className={`rounded-[1.35rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.25)] transition-all duration-200 dark:border-[#2a3a4f] dark:bg-[#101826] ${isSidebarCollapsed ? "text-center" : ""}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-50 text-sm font-black text-[#DA1A21] shadow-sm dark:border-[#2a3a4f] dark:bg-[#141c29]">
                  {session?.user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-xs font-black text-slate-950 dark:text-white">{session?.user?.email}</p>
                    {state && (
                      <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${state.isInactive ? "text-[#DA1A21]" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {state.isInactive ? "Cuenta inactiva" : state.isCorporate ? "Cuenta empresa" : state.isFamily ? "Multi-perfil" : "Protección individual"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isCorporate && (
              <div className={`grid gap-2 ${isSidebarCollapsed ? "grid-cols-1" : "grid-cols-2"}`}>
                <ShellQuickAction href="/dashboard/pedidos" label="Pedidos" icon={Package} variant="primary" />
                {!isSidebarCollapsed && <ShellQuickAction href="/dashboard/tienda" label="Tienda" icon={ShoppingCart} variant="secondary" />}
              </div>
            )}

            <div className={`grid gap-2 ${isSidebarCollapsed ? "grid-cols-1" : "grid-cols-2"}`}>
              <ShellQuickAction href="/" label="Inicio" icon={Home} variant="secondary" />
              <button
                disabled={isLoggingOut}
                onClick={async () => {
                  setIsLoggingOut(true);
                  await signOut({ redirect: false });
                  window.location.href = "/login";
                }}
                className="flex items-center justify-center gap-2 rounded-[1.05rem] border border-rose-200 bg-rose-50 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600 transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 motion-reduce:transition-none"
              >
                {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                <span>{isLoggingOut ? "Saliendo" : "Salir"}</span>
              </button>
            </div>
          </div>
        </aside>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200/80 bg-white/92 px-3 py-2 backdrop-blur-xl shadow-[0_-10px_30px_-24px_rgba(15,23,42,0.45)] dark:border-[#1a2333] dark:bg-[#0f1419]/92 safe-area-bottom">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {mobileLinks.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-2.5 py-2 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none ${
                    active
                      ? "bg-[linear-gradient(135deg,rgba(218,26,33,0.15)_0%,rgba(218,26,33,0.08)_100%)] text-[#DA1A21]"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <item.icon className={`h-6 w-6 ${active ? "scale-105" : "opacity-90"}`} />
                  <span className="text-[9px] font-black uppercase tracking-[0.22em] leading-none">
                    {item.label === "Mis dispositivos" ? "Dispositivos" : item.label.split(" ")[0]}
                  </span>
                </Link>
              );
            })}

            {!isCorporate && (
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(true)}
                className={`flex min-h-11 min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-2.5 py-2 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none ${
                  isMoreMenuOpen
                    ? "bg-[linear-gradient(135deg,rgba(218,26,33,0.15)_0%,rgba(218,26,33,0.08)_100%)] text-[#DA1A21]"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                aria-label="Abrir más opciones"
                aria-expanded={isMoreMenuOpen}
              >
                <Menu className="h-6 w-6" />
                <span className="text-[9px] font-black uppercase tracking-[0.22em] leading-none">Más</span>
              </button>
            )}
          </div>
        </nav>

        {!isCorporate && isMoreMenuOpen && (
          <>
            <div className="lg:hidden fixed inset-0 z-[68] bg-slate-950/50 backdrop-blur-sm" onClick={() => setIsMoreMenuOpen(false)} />

            <div className="lg:hidden fixed inset-x-0 bottom-0 z-[70] max-h-[75vh] overflow-y-auto rounded-t-[1.6rem] border-t border-slate-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl dark:border-[#1a2333] dark:bg-[#0f1419]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Menú</p>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-slate-200 text-slate-500 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent hover:border-[#DA1A21]/20 hover:text-[#DA1A21] dark:border-[#2a3a4f] dark:text-slate-300 motion-reduce:transition-none"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
                  { href: "/dashboard/perfiles-medicos", label: "Perfiles médicos", icon: UsersRound },
                  { href: "/dashboard/chips", label: "Mis dispositivos", icon: Cpu },
                  { href: "/dashboard/empresas", label: "Empresa", icon: Building2 },
                  { href: "/dashboard/tienda", label: "Tienda", icon: ShoppingCart },
                  { href: "/dashboard/pedidos", label: "Mis pedidos", icon: Package },
                  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition-all duration-200 hover:border-[#DA1A21]/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-[#2a3a4f] dark:bg-[#141c29] dark:text-slate-200 dark:hover:bg-[#1a2333] motion-reduce:transition-none"
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
                  className="flex items-center gap-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-black text-rose-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 motion-reduce:transition-none"
                >
                  {isLoggingOut ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <LogOut className="h-4.5 w-4.5" />}
                  <span>{isLoggingOut ? "Saliendo" : "Salir"}</span>
                </button>
              </div>
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.82)_0%,rgba(248,250,252,0.45)_100%)] dark:bg-[linear-gradient(180deg,rgba(5,8,18,0.36)_0%,rgba(5,8,18,0.16)_100%)]">
          <div className="w-full max-w-none px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+5.75rem)] md:px-6 md:py-8 md:pb-12 lg:px-8 lg:py-10 xl:px-10 xl:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
