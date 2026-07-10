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
            href="/soporte"
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
      : "/dashboard/compras";
  const primaryCtaLabel = unprotectedProfiles.length > 0
    ? "Activar chip"
    : hasActiveChip
      ? "Ver ficha pública"
      : "Ir a tienda";
  const previewProfiles = allProfiles.slice(0, 2);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-[linear-gradient(135deg,#05070D_0%,#0F1419_52%,rgba(218,26,33,0.22)_100%)] p-5 shadow-[0_28px_80px_-32px_rgba(0,0,0,0.8)] md:p-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 right-[-4rem] h-56 w-56 rounded-full bg-[#DA1A21]/20 blur-3xl" />
              <div className="absolute bottom-[-6rem] left-[-3rem] h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_center,rgba(239,244,255,0.9)_0.8px,transparent_0.8px)] [background-size:18px_18px]" />
            </div>

            <div className="relative grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-[#EFF4FF] backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-[#DA1A21] shadow-[0_0_16px_rgba(218,26,33,0.7)]" />
                    PreRescue ID
                  </div>
                  <button
                    onClick={refreshData}
                    className="relative h-11 w-11 rounded-2xl border border-white/10 bg-white/8 text-[#EFF4FF]/75 backdrop-blur transition-all hover:border-white/20 hover:text-white"
                    aria-label="Actualizar panel"
                  >
                    <Bell className="mx-auto h-5 w-5" />
                    {data?.notifications?.some((n) => !n.read) && (
                      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#DA1A21] shadow-[0_0_12px_rgba(218,26,33,0.75)]" />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-xl text-4xl font-black tracking-tight text-[#EFF4FF] md:text-5xl">
                    {state.isInactive ? "Activa tu protección" : "Tu protección está lista"}
                  </h1>
                  <p className="max-w-xl text-sm font-medium leading-relaxed text-[#EFF4FF]/78 md:text-base">
                    Gestiona tus perfiles y dispositivos desde una experiencia más clara, cálida y lista para actuar.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-left backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#EFF4FF]/55">Estado</p>
                    <p className="mt-1 text-sm font-black text-[#EFF4FF]">{state.isInactive ? "Cuenta lista para activar" : "Cuenta activa"}</p>
                  </div>
                  <MetricPill label="Chips activos" value={activeChips} />
                </div>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DA1A21] to-[#B9141B] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_35px_-16px_rgba(218,26,33,0.9)] transition-all hover:translate-y-[-1px] hover:shadow-[0_20px_40px_-18px_rgba(218,26,33,1)] active:translate-y-0 active:scale-[0.99] sm:w-auto"
                  >
                    {primaryCtaLabel}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard/perfiles-medicos"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 py-3.5 text-sm font-black text-[#EFF4FF] backdrop-blur transition-all hover:border-white/20 hover:bg-white/12 sm:w-auto"
                  >
                    Ver perfiles
                  </Link>
                </div>
              </div>

              <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.72)] backdrop-blur-xl md:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#EFF4FF]/55">Vista rápida</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-[#EFF4FF]">Perfiles médicos</h2>
                  </div>
                  <Link href="/dashboard/perfiles-medicos" className="text-xs font-black uppercase tracking-widest text-[#EFF4FF]/70 transition-colors hover:text-white">
                    Gestionar
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {previewProfiles.length > 0 ? previewProfiles.map((profile) => {
                    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Perfil por configurar";
                    const hasChip = (profile.assignedChips?.length || 0) > 0;
                    const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.trim().toUpperCase() || "PR";
                    return (
                      <div key={profile.id} className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-[#05070D]/35 p-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/18 to-white/8 text-sm font-black text-[#EFF4FF] ring-1 ring-white/10">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#EFF4FF]">{fullName}</p>
                          <p className="truncate text-[11px] text-[#EFF4FF]/60">
                            {hasChip ? "Protegido" : "Sin chip"}
                            {profile.bloodType ? ` · ${profile.bloodType}` : ""}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${hasChip ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20"}`}>
                          {hasChip ? "Protegido" : "Sin chip"}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="rounded-[1.4rem] border border-dashed border-white/12 bg-white/5 p-4 text-sm text-[#EFF4FF]/65">
                      Aún no tienes perfiles registrados.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <HomeCard
          title="Mis dispositivos"
          count={activeChips}
          description="Revisa tus chips activos y vinculaciones."
          ctaLabel="Ver dispositivos"
          href="/dashboard/chips"
          badge={activeChips > 0 ? "Activo" : "Sin activar"}
          variant="device"
          className="lg:col-span-4"
        />

        <HomeCard
          title="Tienda"
          description="Compra stickers, chips o accesorios."
          ctaLabel="Ir a tienda"
          href="/dashboard/compras"
          badge="Comercial"
          variant="shop"
          className="lg:col-span-4"
        />

        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm flex flex-col justify-between gap-4 lg:col-span-12 lg:flex-row lg:items-center lg:p-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Mis pedidos</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pedidos recientes</h2>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Revisa tus pedidos cuando necesites ver estados o historial.
            </p>
          </div>
          <Link
            href="/dashboard/pedidos"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-black text-slate-700 transition-all hover:border-primary/30 hover:text-primary dark:text-slate-200"
          >
            Ver pedidos
          </Link>
        </div>
      </section>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-3 py-3 text-center">
      <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-tight">{label}</p>
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
    ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(15,20,25,0.96)_100%)] text-[#EFF4FF] shadow-[0_20px_55px_-28px_rgba(0,0,0,0.72)]"
    : variant === "shop"
      ? "border-white/10 bg-[linear-gradient(135deg,rgba(5,7,13,0.96)_0%,rgba(15,20,25,0.96)_55%,rgba(218,26,33,0.18)_100%)] text-[#EFF4FF] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.78)]"
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
      : "bg-white/92 text-slate-900 hover:bg-white";

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm flex flex-col justify-between gap-4 ${className} ${shellClassName}`}>
      <div className="pointer-events-none absolute inset-0 opacity-100">
        {variant === "device" && (
          <>
            <div className="absolute -right-8 top-[-2.5rem] h-24 w-24 rounded-full bg-[#DA1A21]/20 blur-2xl" />
            <div className="absolute bottom-[-3rem] left-[-1rem] h-20 w-20 rounded-full bg-sky-400/10 blur-2xl" />
          </>
        )}
        {variant === "shop" && (
          <>
            <div className="absolute -right-12 top-[-3rem] h-28 w-28 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-[-2rem] left-[-2rem] h-24 w-24 rounded-full bg-[#DA1A21]/18 blur-3xl" />
          </>
        )}
      </div>

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${eyebrowClassName}`}>{title}</p>
          {badge && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${variant === "shop" ? "bg-white/10 text-white ring-1 ring-white/10" : variant === "device" ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-slate-100 text-slate-600 ring-1 ring-border"}`}>
              {badge}
            </span>
          )}
        </div>
        {count !== undefined && <p className={`text-4xl font-black tracking-tighter ${countClassName}`}>{count}</p>}
        <p className={`text-sm font-medium leading-relaxed ${descriptionClassName}`}>{description}</p>
      </div>
      <Link
        href={href}
        className={`relative inline-flex w-fit items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black transition-all ${buttonClassName} ${variant === "shop" ? "border border-transparent" : "border"}`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
