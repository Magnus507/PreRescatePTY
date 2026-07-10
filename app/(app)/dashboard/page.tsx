"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, Shield, Bell, Loader2, ShieldAlert
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
  const profileCount = allProfiles.length;
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
        <div className="lg:col-span-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">PreRescue ID</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Tu protección, lista
            </h1>
            <p className="max-w-2xl text-sm md:text-base text-muted-foreground font-medium">
              Gestiona tus perfiles y chips de emergencia.
            </p>
          </div>

          <button
            onClick={refreshData}
            className="relative h-12 w-12 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center text-slate-400 hover:text-primary transition-all"
            aria-label="Actualizar panel"
          >
            <Bell className="h-5 w-5" />
            {data?.notifications?.some((n) => !n.read) && (
              <span className="absolute top-3 right-3 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-bounce" />
            )}
          </button>
        </div>

        <div className="lg:col-span-12 rounded-[2.5rem] border border-border bg-[linear-gradient(135deg,rgba(0,122,255,0.18),rgba(220,38,38,0.08),rgba(255,255,255,0.95))] dark:bg-[linear-gradient(135deg,rgba(0,122,255,0.22),rgba(220,38,38,0.10),rgba(8,15,27,0.95))] p-6 md:p-8 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-stretch">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary backdrop-blur">
                <Shield className="h-3.5 w-3.5" />
                {state.isInactive ? "Cuenta lista para activar" : "Cuenta activa"}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {state.isInactive ? "Activa tu protección" : "Tu protección está lista"}
                </h2>
                <p className="max-w-2xl text-sm md:text-base text-slate-700/80 dark:text-white/75 font-medium leading-relaxed">
                  Gestiona tus perfiles, dispositivos y chips de emergencia.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <MetricPill label="Chips activos" value={activeChips} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={primaryCtaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
                >
                  {primaryCtaLabel}
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard/perfiles-medicos"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/85 px-5 py-3.5 text-sm font-black text-slate-900 shadow-sm transition-all hover:bg-white"
                >
                  Ver perfiles
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/90 dark:bg-[#0f1419]/80 border border-white/70 dark:border-white/10 backdrop-blur p-5 shadow-lg shadow-slate-900/5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Perfiles médicos</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{profileCount} perfiles</h3>
                </div>
                <Link href="/dashboard/perfiles-medicos" className="text-xs font-black uppercase tracking-widest text-primary">
                  Gestionar
                </Link>
              </div>

              <div className="space-y-3">
                {previewProfiles.length > 0 ? previewProfiles.map((profile) => {
                  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Perfil por configurar";
                  const hasChip = (profile.assignedChips?.length || 0) > 0;
                  return (
                    <div key={profile.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/80 p-3.5">
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-900 dark:text-white truncate">{fullName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {hasChip ? "Protegido" : "Sin chip"}
                          {profile.bloodType ? ` · ${profile.bloodType}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${hasChip ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {hasChip ? "Protegido" : "Sin chip"}
                      </span>
                    </div>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
                    Aún no tienes perfiles registrados.
                  </div>
                )}
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
          className="lg:col-span-4"
        />

        <HomeCard
          title="Tienda"
          description="Compra stickers, chips o accesorios."
          ctaLabel="Ir a tienda"
          href="/dashboard/compras"
          accent="dark"
          className="lg:col-span-4"
        />

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-4 lg:col-span-12 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Mis pedidos</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pedidos recientes</h2>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Revisa tus pedidos cuando necesites ver estados o historial.
            </p>
          </div>
          <Link
            href="/dashboard/pedidos"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-black text-slate-700 dark:text-slate-200 transition-all hover:border-primary/30 hover:text-primary"
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
  accent = "light",
  className = "",
}: {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  count?: number;
  accent?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={`rounded-[2rem] border p-6 shadow-sm flex flex-col justify-between gap-4 ${className} ${accent === "dark" ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-border bg-card"}`}>
      <div className="space-y-3">
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${accent === "dark" ? "text-white/60" : "text-muted-foreground"}`}>{title}</p>
        {count !== undefined && <p className={`text-4xl font-black tracking-tighter ${accent === "dark" ? "text-white" : "text-slate-900 dark:text-white"}`}>{count}</p>}
        <p className={`text-sm font-medium leading-relaxed ${accent === "dark" ? "text-white/70" : "text-muted-foreground"}`}>{description}</p>
      </div>
      <Link
        href={href}
        className={`inline-flex w-fit items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black transition-all ${accent === "dark" ? "bg-white text-slate-900" : "border border-border bg-background text-slate-700 dark:text-slate-200 hover:border-primary/30 hover:text-primary"}`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
