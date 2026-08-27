"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, Bell, Loader2, ShieldAlert
} from "lucide-react";

import { AccountState } from "@/domains/accounts/account.types";

interface ChipData {
  id: string;
  serialPublic: string;
  shortCode: string;
}

interface ProfileSummary {
  id: string;
  firstName: string;
  lastName: string;
  bloodType: string;
  photoUrl?: string | null;
  assignedChips: ChipData[];
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface DashboardData {
  state: AccountState;
  ownProfile: ProfileSummary | null;
  familyProfiles: ProfileSummary[];
  notifications?: AppNotification[];
  error?: string;
  details?: string;
  timestamp?: string;
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  

  // Check if data is stale (default 5 minutes = 300000ms)
  

  const refreshData = async () => {
    try {
      const [familiaRes, notifyRes] = await Promise.all([
        fetch("/api/users/perfiles-medicos"),
        fetch("/api/users/notifications")
      ]);

      const familiaJson = await familiaRes.json();
      const notifyJson = await notifyRes.json();

      setData({
        ...familiaJson,
        notifications: notifyJson.notifications || []
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load - listeners are handled by layout.tsx to avoid duplication
    if (status === "authenticated") {
      refreshData();
    }
  }, [status]);

  useEffect(() => {
    if (data?.state?.isOrganization) {
      router.push("/dashboard/empresas");
    }
  }, [data, router]);

  if (loading || data?.state?.isOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-tight">
          {data?.state?.isOrganization ? "Cargando Panel Corporativo..." : "Sincronizando con PreRescue ID Control..."}
        </p>
      </div>
    );
  }

  if (data?.error || !data?.state) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 text-center max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-20 w-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-red-500/10 mb-2">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight">Error de Sincronización</h2>
          <p className="text-muted-foreground font-medium leading-relaxed px-4">
            {data?.error || "No se pudieron cargar los datos de tu cuenta en este momento."}
          </p>
          {process.env.NODE_ENV === 'development' && data?.details && (
            <div className="mt-4 p-3 bg-slate-100 rounded-xl text-[10px] font-mono text-slate-500 overflow-auto max-w-xs mx-auto">
              {data.details}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full px-8">
          <button
            onClick={async () => { setData(null); await refreshData(); }}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Reintentar ahora
          </button>
          <Link 
            href="/contacto"
            className="w-full py-4 bg-muted text-muted-foreground font-bold rounded-2xl hover:bg-muted/80 transition-all text-sm"
          >
            Contactar Soporte
          </Link>
        </div>
      </div>
    );
  }

  const { state, ownProfile, familyProfiles } = data;
  const allProfiles = [ownProfile, ...(familyProfiles || [])].filter(Boolean) as ProfileSummary[];
  const protectedProfiles = allProfiles.filter((profile) => (profile.assignedChips?.length || 0) > 0);
  const unprotectedProfiles = allProfiles.filter((profile) => (profile.assignedChips?.length || 0) === 0);
  const activeChips = state.activeChipsCount || 0;
  const hasActiveChip = protectedProfiles.length > 0;
  const primaryCtaHref = unprotectedProfiles.length > 0
    ? "/dashboard/chips?activate=true"
    : hasActiveChip
      ? "/dashboard/perfiles-medicos"
      : "/dashboard/tienda";
  const primaryCtaLabel = unprotectedProfiles.length > 0
    ? "Activar chip"
    : hasActiveChip
      ? "Ver ficha pública"
      : "Ir a tienda";
  const previewProfiles = allProfiles.slice(0, 2);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.26)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.28)] focus-within:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.28)] sm:p-6 md:p-8 motion-reduce:transition-none dark:border-slate-200/80 dark:bg-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,0.06),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.05),transparent_32%)]" />
            <div className="relative grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
                    <span className="h-2 w-2 rounded-full bg-[#DA1A21]" />
                    PreRescue ID
                  </div>
                  <button
                    onClick={refreshData}
                    className="relative h-11 w-11 rounded-[1rem] border border-slate-200 bg-white text-slate-600 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)] transition-all duration-200 hover:border-[#DA1A21]/20 hover:text-[#DA1A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
                    aria-label="Actualizar panel"
                  >
                    <Bell className="mx-auto h-5 w-5" />
                    {data?.notifications?.some((n) => !n.read) && (
                      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#DA1A21] shadow-[0_0_12px_rgba(218,26,33,0.45)]" />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Dashboard cliente</p>
                  <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
                    {state.isInactive ? "Activa tu protección" : "Tu protección está lista"}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Gestiona perfiles, dispositivos y acceso público desde una experiencia clara, ligera y premium.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.25)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Estado</p>
                    <p className="mt-2 text-sm font-black text-slate-950">{state.isInactive ? "Lista para activar" : "Cuenta activa"}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Visión general de tu protección.</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.25)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Chips activos</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{activeChips}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Seguimiento de tus dispositivos vinculados.</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.25)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Perfil público</p>
                    <p className="mt-2 text-sm font-black text-slate-950">{hasActiveChip ? "Disponible" : "Pendiente"}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Estado visible para emergencias.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:gap-3">
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1.05rem] bg-[#DA1A21] px-5 py-3.25 text-sm font-black text-white shadow-[0_18px_36px_-18px_rgba(218,26,33,0.35)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#B9141B] hover:shadow-[0_22px_40px_-20px_rgba(218,26,33,0.45)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none sm:w-auto"
                  >
                    {primaryCtaLabel}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard/perfiles-medicos"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200 bg-white px-5 py-3.25 text-sm font-black text-slate-800 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)] transition-all duration-200 ease-out hover:-translate-y-px hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none sm:w-auto"
                  >
                    Ver perfiles
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] p-4 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.22)] sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                      Vista rápida
                    </p>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Perfiles médicos</h2>
                  </div>
                  <Link href="/dashboard/perfiles-medicos" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition-all duration-200 hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none">
                    Gestionar
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {previewProfiles.length > 0 ? previewProfiles.map((profile) => {
                    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Perfil por configurar";
                    const hasChip = (profile.assignedChips?.length || 0) > 0;
                    const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.trim().toUpperCase() || "PR";
                    return (
                      <div key={profile.id} className="flex items-center gap-3 rounded-[1.15rem] border border-slate-200 bg-white p-3.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.2)] transition-all duration-200 ease-out hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_18px_36px_-26px_rgba(15,23,42,0.22)]">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-black text-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)]">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">{fullName}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {hasChip ? "Protegido" : "Sin chip"}
                            {profile.bloodType ? ` · ${profile.bloodType}` : ""}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${hasChip ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                          {hasChip ? "Protegido" : "Sin chip"}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Aún no tienes perfiles registrados.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3.5 sm:gap-4 lg:grid-cols-12">
        <HomeCard
          title="Mis dispositivos"
          count={activeChips}
          description="Revisa chips activos y vinculaciones."
          ctaLabel="Ver dispositivos"
          href="/dashboard/chips"
          badge={activeChips > 0 ? "Activo" : "Sin activar"}
          variant="device"
          className="lg:col-span-4 xl:col-span-3"
        />

        <HomeCard
          title="Tienda"
          description="Compra stickers, chips y accesorios."
          ctaLabel="Ir a tienda"
          href="/dashboard/tienda"
          badge="Comercial"
          variant="shop"
          className="lg:col-span-4 xl:col-span-3"
        />

        <div className="rounded-[1.35rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,249,252,1)_100%)] p-4 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.28)] flex flex-col justify-between gap-4 lg:col-span-12 lg:flex-row lg:items-center lg:p-6 transition-all duration-200 ease-out hover:border-slate-300/80 hover:shadow-[0_16px_34px_-24px_rgba(15,23,42,0.32)]">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Mis pedidos</p>
            <h2 className="text-[1.35rem] font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">Pedidos recientes</h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Revisa estados e historial cuando lo necesites.
            </p>
          </div>
          <Link
            href="/dashboard/pedidos"
            className="inline-flex items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-800 transition-all duration-200 ease-out hover:-translate-y-px hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-950"
          >
            Ver pedidos
          </Link>
        </div>
      </section>
    </div>
  );
}

function HomeCard({
  title,
  description,
  ctaLabel,
  href,
  count,
  badge,
  variant = "light",
  className = "",
}: {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  count?: number;
  badge?: string;
  variant?: "light" | "device" | "shop";
  className?: string;
}) {
  const shellClassName = variant === "device"
    ? "border-white/10 bg-[linear-gradient(180deg,rgba(10,17,25,0.98)_0%,rgba(13,20,29,0.98)_55%,rgba(15,20,25,0.96)_100%)] text-[#EFF4FF] shadow-[0_20px_55px_-28px_rgba(0,0,0,0.72)]"
    : variant === "shop"
      ? "border-white/10 bg-[linear-gradient(135deg,rgba(5,7,13,0.98)_0%,rgba(12,18,26,0.96)_55%,rgba(218,26,33,0.16)_100%)] text-[#EFF4FF] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.78)]"
      : "border-border bg-card text-foreground";

  const eyebrowClassName = variant === "light"
    ? "text-muted-foreground"
    : "text-[#EFF4FF]/60";

  const countClassName = variant === "light"
    ? "text-slate-900 dark:text-white"
    : "text-[#EFF4FF]";

  const descriptionClassName = variant === "light"
    ? "text-muted-foreground"
    : "text-[#EFF4FF]/72";

  const buttonClassName = variant === "light"
    ? "border border-border bg-background text-slate-700 dark:text-slate-200 hover:border-primary/30 hover:text-primary"
    : variant === "shop"
      ? "bg-[#DA1A21] text-white shadow-[0_12px_28px_-16px_rgba(218,26,33,0.9)] hover:bg-[#B9141B]"
      : "border-white/14 bg-[#EFF4FF] text-slate-950 shadow-[0_12px_28px_-18px_rgba(239,244,255,0.2)] hover:bg-white";

  return (
    <div className={`group relative overflow-hidden rounded-[1.35rem] border p-4 shadow-sm flex flex-col justify-between gap-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_28px_65px_-34px_rgba(0,0,0,0.84)] focus-within:-translate-y-0.5 focus-within:shadow-[0_28px_65px_-34px_rgba(0,0,0,0.84)] motion-reduce:transition-none sm:p-5 md:p-6 ${className} ${shellClassName}`}>
      <div className="pointer-events-none absolute inset-0 opacity-100">
        {variant === "device" && (
          <>
            <div className="absolute -right-8 top-[-2.5rem] h-24 w-24 rounded-full bg-[#DA1A21]/10 blur-2xl" />
            <div className="absolute bottom-[-3rem] left-[-1rem] h-20 w-20 rounded-full bg-sky-400/6 blur-2xl" />
          </>
        )}
        {variant === "shop" && (
          <>
            <div className="absolute -right-12 top-[-3rem] h-28 w-28 rounded-full bg-white/6 blur-3xl" />
            <div className="absolute bottom-[-2rem] left-[-2rem] h-24 w-24 rounded-full bg-[#DA1A21]/10 blur-3xl" />
          </>
        )}
      </div>

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${eyebrowClassName}`}>{title}</p>
          {badge && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${variant === "shop" ? "bg-white/10 text-white ring-1 ring-white/10" : variant === "device" ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-200/25 shadow-[0_8px_20px_-18px_rgba(16,185,129,0.6)]" : "bg-slate-100 text-slate-600 ring-1 ring-border"}`}>
              {badge}
            </span>
          )}
        </div>
        {count !== undefined && <p className={`text-[2.35rem] font-black tracking-tighter sm:text-4xl ${countClassName}`}>{count}</p>}
        <p className={`text-sm font-medium leading-relaxed ${descriptionClassName}`}>{description}</p>
      </div>
      <Link
        href={href}
        className={`relative inline-flex w-fit items-center justify-center gap-2 rounded-[1.05rem] px-4 py-3 text-sm font-black transition-all duration-200 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:translate-y-0 motion-reduce:transition-none ${buttonClassName} ${variant === "shop" ? "border border-transparent" : "border"}`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}