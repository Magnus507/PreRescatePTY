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
  ChevronRight,
  Settings,
  LogOut,
  ShoppingCart,
  Package,
  Loader2,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Gift,
} from "lucide-react";
import { AccountState } from "@/domains/accounts/account.types";
import { ScanMonitor } from "./_components/ScanMonitor";

const SIDEBAR_COLLAPSE_KEY = "pr_dashboard_sidebar_collapsed";

const consumerNavItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/perfiles-medicos", label: "Perfiles médicos", icon: UsersRound },
  { href: "/dashboard/chips", label: "Mis dispositivos", icon: Cpu },
  { href: "/dashboard/tienda", label: "Tienda", icon: ShoppingCart },
  { href: "/dashboard/drops", label: "Drops", icon: Gift },
  { href: "/dashboard/pedidos", label: "Mis pedidos", icon: ReceiptText },
  { href: "/dashboard/configuracion", label: "Ajustes", icon: Settings },
] as const;

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
};

function getMobilePageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/perfiles-medicos")) return "Perfiles médicos";
  if (pathname.startsWith("/dashboard/chips")) return "Mis dispositivos";
  if (pathname.startsWith("/dashboard/tienda")) return "Tienda";
  if (pathname.startsWith("/dashboard/drops")) return "Drops";
  if (pathname.startsWith("/dashboard/pedidos")) return "Mis pedidos";
  if (pathname.startsWith("/dashboard/configuracion")) return "Ajustes";
  return "Inicio";
}

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
      className={`group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-[1.05rem] border px-3 py-2.5 text-sm font-black transition-[background-color,border-color,color,transform,box-shadow] duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        collapsed ? "justify-center" : "justify-between"
      } ${
        active
          ? "border-white/10 bg-[linear-gradient(135deg,#ef222b_0%,#bd1119_100%)] text-white shadow-[0_18px_34px_-24px_rgba(218,26,33,0.78)]"
          : "border-transparent bg-white/[0.025] text-slate-300 hover:translate-x-0.5 hover:border-white/[0.08] hover:bg-white/[0.065] hover:text-white"
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
    const corporatePrefixes = [
      "/dashboard/empresas",
      "/dashboard/empresa",
      "/dashboard/empresa-perfil",
      "/dashboard/colaboradores",
      "/dashboard/solicitudes",
      "/dashboard/pedidos-corporativos",
    ];
    if (corporatePrefixes.some((prefix) => pathname.startsWith(prefix))) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

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

  const mobileLinks = [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    { href: "/dashboard/perfiles-medicos", label: "Perfiles", icon: UsersRound },
    { href: "/dashboard/chips", label: "Dispositivos", icon: Cpu },
    { href: "/dashboard/tienda", label: "Tienda", icon: ShoppingCart },
  ];
  const mobilePageTitle = getMobilePageTitle(pathname);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(218,26,33,0.04),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] selection:bg-[#DA1A21] selection:text-white dark:bg-[radial-gradient(circle_at_top,rgba(218,26,33,0.08),transparent_18%),linear-gradient(180deg,#050812_0%,#0a1120_100%)]">
      <ScanMonitor />
      <div className="flex h-[100dvh] w-full overflow-hidden">
        <aside
          className={`client-desktop-sidebar m-3 mr-0 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.075] bg-[#07111d]/95 p-3.5 shadow-[24px_0_70px_-48px_rgba(2,6,23,.95)] backdrop-blur-2xl transition-[width] duration-300 lg:flex ${
            isSidebarCollapsed ? "w-[5.4rem]" : "w-[17.5rem]"
          }`}
        >
          <div className={`flex gap-3 border-b border-white/[0.075] pb-3.5 ${isSidebarCollapsed ? "flex-col items-center" : "items-center"}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/10 bg-white shadow-[0_14px_30px_-22px_rgba(0,0,0,.75)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="PreRescue ID" className="h-8 w-8 object-contain" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">PreRescue ID</p>
                <p className="mt-0.5 truncate text-sm font-black tracking-[-0.02em] text-white">Panel cliente</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[.9rem] border border-white/[0.08] bg-white/[0.045] text-slate-400 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 motion-reduce:transition-none"
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-5 custom-scrollbar">
            <div className="space-y-1.5">
              {!isSidebarCollapsed && <p className="mb-2 px-2 text-[9px] font-black uppercase tracking-[0.24em] text-slate-600">Navegación</p>}
              {consumerNavItems.map((item) => (
                <ShellNavLink key={item.href} {...item} pathname={pathname} activateMode={activateMode} collapsed={isSidebarCollapsed} />
              ))}
            </div>
          </div>

          <div className="space-y-2.5 border-t border-white/[0.075] pt-3.5">
            <div className={`rounded-[1.2rem] border border-white/[0.075] bg-white/[0.045] p-2.5 shadow-inner ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[.9rem] bg-white text-xs font-black text-[#DA1A21] shadow-sm">
                  {session?.user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black text-white">{session?.user?.email}</p>
                    {state && (
                      <p className={`mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.14em] ${state.isInactive ? "text-red-300" : "text-emerald-400"}`}>
                        {state.isInactive ? "Cuenta inactiva" : state.isFamily ? "Multi-perfil" : "Protección individual"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={async () => {
                setIsLoggingOut(true);
                await signOut({ redirect: false });
                window.location.href = "/login";
              }}
              title={isSidebarCollapsed ? "Salir" : undefined}
              aria-label={isSidebarCollapsed ? "Salir" : undefined}
              className={`flex min-h-10 w-full items-center rounded-[1rem] border border-rose-400/15 bg-rose-500/[0.06] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-rose-300 transition-all duration-200 hover:border-rose-400/25 hover:bg-rose-500/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/45 disabled:opacity-50 motion-reduce:transition-none ${isSidebarCollapsed ? "justify-center" : "justify-center gap-2"}`}
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {!isSidebarCollapsed && <span>{isLoggingOut ? "Saliendo" : "Salir"}</span>}
            </button>
          </div>
        </aside>

        <nav aria-label="Navegación móvil del panel" className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200/80 bg-white/94 px-2 py-1.5 backdrop-blur-xl shadow-[0_-10px_30px_-24px_rgba(15,23,42,0.45)] dark:border-[#1a2333] dark:bg-[#0f1419]/94 safe-area-bottom sm:px-3 sm:py-2">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {mobileLinks.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[.9rem] px-1.5 py-1.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none sm:rounded-[1rem] sm:px-2.5 sm:py-2 ${
                    active
                      ? "bg-[linear-gradient(135deg,rgba(218,26,33,0.15)_0%,rgba(218,26,33,0.08)_100%)] text-[#DA1A21]"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <item.icon className={`h-6 w-6 ${active ? "scale-105" : "opacity-90"}`} />
                  <span className="max-w-full truncate text-[8px] font-black leading-none tracking-[0.04em] sm:text-[9px] sm:tracking-[0.08em]">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[.9rem] px-1.5 py-1.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none sm:rounded-[1rem] sm:px-2.5 sm:py-2 ${
                isMoreMenuOpen
                  ? "bg-[linear-gradient(135deg,rgba(218,26,33,0.15)_0%,rgba(218,26,33,0.08)_100%)] text-[#DA1A21]"
                  : "text-slate-500 dark:text-slate-400"
              }`}
              aria-label="Abrir más opciones"
              aria-expanded={isMoreMenuOpen}
            >
              <Menu className="h-6 w-6" />
              <span className="text-[8px] font-black uppercase leading-none tracking-[0.14em] sm:text-[9px] sm:tracking-[0.22em]">Más</span>
            </button>
          </div>
        </nav>

        {isMoreMenuOpen && (
          <>
            <div className="lg:hidden fixed inset-0 z-[68] bg-slate-950/50 backdrop-blur-sm" onClick={() => setIsMoreMenuOpen(false)} />

            <div className="lg:hidden fixed inset-x-0 bottom-0 z-[70] max-h-[75vh] overflow-y-auto rounded-t-[1.6rem] border-t border-slate-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl dark:border-[#1a2333] dark:bg-[#0f1419]">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">PreRescue ID</p>
                  <p className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-white">{session?.user?.email}</p>
                </div>
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
                  { href: "/dashboard/tienda", label: "Tienda", icon: ShoppingCart },
                  { href: "/dashboard/drops", label: "Pre-Rescate Drops", icon: Gift },
                  { href: "/dashboard/pedidos", label: "Mis pedidos", icon: Package },
                  { href: "/dashboard/configuracion", label: "Ajustes", icon: Settings },
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

        <main className="flex-1 overflow-y-auto overscroll-y-contain bg-[linear-gradient(180deg,rgba(248,250,252,0.82)_0%,rgba(248,250,252,0.45)_100%)] dark:bg-[linear-gradient(180deg,rgba(5,8,18,0.36)_0%,rgba(5,8,18,0.16)_100%)]">
          <header className="client-mobile-topbar sticky top-0 z-[55] lg:hidden">
            <div className="flex items-center justify-between gap-2.5 px-3 pb-2 pt-[max(.45rem,env(safe-area-inset-top))] sm:px-4 sm:pt-[max(.55rem,env(safe-area-inset-top))]">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-[1rem] border border-white/80 bg-white/90 shadow-[0_12px_30px_-20px_rgba(15,23,42,.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">PreRescue ID</p>
                  <p className="truncate text-[15px] font-black tracking-[-0.025em] text-slate-950 dark:text-white">{mobilePageTitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(true)}
                className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-[1rem] border border-slate-200/80 bg-white/90 px-3 text-slate-700 shadow-[0_12px_28px_-22px_rgba(15,23,42,.3)] backdrop-blur-xl transition active:scale-[0.98] dark:border-white/10 dark:bg-[#101826]/90 dark:text-slate-100"
                aria-label="Abrir menú del panel"
                aria-expanded={isMoreMenuOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DA1A21]/10 text-[11px] font-black text-[#DA1A21]">
                  {session?.user?.email?.[0]?.toUpperCase() ?? "U"}
                </span>
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="w-full max-w-none px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] min-[390px]:px-4 min-[390px]:py-4 sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom)+6.25rem)] md:px-6 md:py-8 md:pb-12 lg:px-8 lg:py-10 xl:px-10 xl:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
