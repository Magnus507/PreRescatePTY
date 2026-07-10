"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  AlertCircle, CheckCircle, 
  ChevronRight, Building2, Shield, ShieldCheck, Plus, Zap, Heart, 
  Activity, ArrowUpRight, Smartphone, Bell, Loader2, ExternalLink, ShieldAlert, Truck,
  Camera
} from "lucide-react";

import { AccountState } from "@/domains/accounts/account.types";
import { BUSINESS_RULES } from "@/domains/shared/constants";

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
  const { data: session, status } = useSession();
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
  const isEmployee = state.isCorporate && !state.isOwner;
  const userEmail = session?.user?.email;
  const allProfiles = [ownProfile, ...(familyProfiles || [])].filter(Boolean) as ProfileSummary[];
  const protectedProfiles = allProfiles.filter((profile) => (profile.assignedChips?.length || 0) > 0);
  const unprotectedProfiles = allProfiles.filter((profile) => (profile.assignedChips?.length || 0) === 0);
  const activeChips = state.activeChipsCount || 0;
  const capacityTotal = state.maxChipsAllocated || 0;
  const availableChips = Math.max(capacityTotal - activeChips, 0);
  const pendingChips = state.physicalChipsInTransitCount || 0;
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

  const CHIP_PRICE = BUSINESS_RULES.EXTRA_CHIP_PRICE;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Inicio</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">
              Resumen operativo
            </h1>
            <p className="max-w-2xl text-sm md:text-base text-muted-foreground font-medium">
              Resumen de tus perfiles, dispositivos y acciones pendientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
            >
              {primaryCtaLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-[2.5rem] border border-border bg-gradient-to-br from-primary/5 via-background to-background p-6 md:p-8 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Estado general</p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {state.isInactive ? "Cuenta inactiva" : "Cuenta activa"}
                    </h2>
                  </div>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground font-medium leading-relaxed">
                  {state.isInactive
                    ? "Tu cuenta sigue lista para activarse. Revisa tus perfiles y completa la vinculación de chip cuando estés listo."
                    : "Tu cuenta está operativa. Revisa qué perfiles ya están protegidos y cuáles todavía esperan chip."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
                <MetricPill label="Perfiles médicos" value={allProfiles.length} />
                <MetricPill label="Perfiles protegidos" value={protectedProfiles.length} />
                <MetricPill label="Perfiles sin chip" value={unprotectedProfiles.length} />
                <MetricPill label="Chips activos" value={activeChips} />
                <MetricPill label="Chips disponibles" value={availableChips} />
                <MetricPill label="Pendientes de activar" value={pendingChips} />
                <MetricPill label="Capacidad de cuenta" value={capacityTotal} />
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-border bg-card p-6 md:p-8 shadow-sm flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Activación rápida</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  ¿Ya tienes un código?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
                  Activa tu chip y vincúlalo a un perfil médico.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/chips?activate=true"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-95"
              >
                Activar chip
              </Link>
              <Link
                href="/dashboard/compras"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-black text-slate-700 dark:text-slate-200 transition-all hover:border-primary/30 hover:text-primary"
              >
                Comprar chip
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time System Notifications */}
      {data?.notifications && data.notifications.some(n => !n.read) && (
        <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
           {data.notifications.filter(n => !n.read).map(n => (
             <div key={n.id} className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl shadow-slate-200/50 flex items-start justify-between gap-4 group">
                <div className="flex items-start gap-4">
                   <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${n.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                      {n.type === 'warning' ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                   </div>
                   <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">{n.title}</h4>
                      <p className="text-sm text-slate-400 font-medium mt-1 leading-relaxed">{n.message}</p>
                   </div>
                </div>
                <button 
                  onClick={async () => {
                     await fetch("/api/users/notifications", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: n.id })
                     });
                     refreshData();
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Entendido
                </button>
             </div>
           ))}
        </div>
      )}

      {state.isInactive && (
        <div className="p-1.5 rounded-[3rem] bg-gradient-to-r from-indigo-500 via-primary to-emerald-500 animate-in zoom-in-95 duration-500 shadow-2xl shadow-primary/20">
           <div className="bg-slate-950 rounded-[2.8rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
              <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-300">Bienvenido a PreRescue ID</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                 </div>
                 <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">Activa tu <span className="text-blue-400">Escudo Digital</span> hoy mismo.</h2>
                 <p className="text-slate-400 text-lg font-medium leading-relaxed">
                    Tu cuenta está lista, solo falta elegir el combo que mejor se adapte a ti o a tu familia para comenzar a salvar vidas.
                 </p>
              </div>
              <Link 
                href="/comprar" 
                className="relative z-10 group bg-white text-slate-950 px-10 py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                Ver Combos de Protección
                <ArrowUpRight className="h-6 w-6 group-hover:rotate-45 transition-transform" />
              </Link>
           </div>
        </div>
      )}

      {state.physicalChipsInTransitCount > 0 && (
        <div className="p-6 rounded-[2rem] border border-indigo-100 bg-indigo-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-700">Dispositivos en tránsito</p>
              <h3 className="text-xl font-black tracking-tight text-indigo-950">Hardware en camino</h3>
              <p className="text-sm font-medium text-indigo-900/70 mt-1">
                Tienes {state.physicalChipsInTransitCount} dispositivo(s) físicos vinculados a tu cuenta siendo procesados para envío.
              </p>
            </div>
          </div>
          <span className="px-4 py-2 rounded-2xl bg-indigo-200/60 text-indigo-700 text-[10px] font-black uppercase tracking-widest w-fit">
            Logística activa
          </span>
        </div>
      )}

      {/* Institutional banners */}
      {isEmployee && (
        <div className="p-6 rounded-[2rem] border border-indigo-500/30 bg-indigo-500/5 flex items-start gap-4 shadow-sm">
          <div className="bg-indigo-500 rounded-2xl p-2.5 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tighter">Cuenta Institucional</p>
            <p className="text-sm text-indigo-900/60 dark:text-indigo-400/70 mt-1 font-medium leading-relaxed">
              Tu acceso fue provisto por tu empresa u organización. Completa tu ficha médica.
            </p>
          </div>
        </div>
      )}

      {/* Profiles & Stats follow... */}

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Perfiles médicos</p>
            <h2 className="text-2xl font-black tracking-tight">Protección por persona</h2>
          </div>
          <Link href="/dashboard/perfiles-medicos" className="text-sm font-black text-primary hover:underline">
            Gestionar perfiles
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard title="Perfiles médicos" value={allProfiles.length} description="Perfiles registrados en tu cuenta." />
          <InfoCard title="Perfiles protegidos" value={protectedProfiles.length} description="Perfiles con chip activo." />
          <InfoCard title="Perfiles sin chip" value={unprotectedProfiles.length} description="Perfiles pendientes de vinculación." />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Resumen rápido</p>
                <h3 className="text-xl font-black tracking-tight">Perfiles recientes</h3>
              </div>
              <Link href="/dashboard/perfiles-medicos" className="text-xs font-black uppercase tracking-widest text-primary">
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {allProfiles.slice(0, 3).map((profile) => {
                const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Perfil por configurar";
                const hasChip = (profile.assignedChips?.length || 0) > 0;
                return (
                  <div key={profile.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-4">
                    <div className="space-y-1">
                      <p className="font-black text-sm text-slate-900 dark:text-white">{fullName}</p>
                      <div className="flex flex-wrap gap-2">
                        <BadgePill label={hasChip ? "Protegido" : "Sin chip"} tone={hasChip ? "success" : "warning"} />
                        {profile.bloodType && <BadgePill label={profile.bloodType} tone="neutral" />}
                      </div>
                    </div>
                    <Link href="/dashboard/perfiles-medicos" className="text-xs font-black text-primary">
                      Gestionar
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Estado de cuenta</p>
                <h3 className="text-xl font-black tracking-tight">Protección general</h3>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${state.isInactive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                {state.isInactive ? "Inactiva" : "Activa"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Chips activos" value={activeChips} />
              <MiniStat label="Chips disponibles" value={availableChips} />
              <MiniStat label="Pendientes de activar" value={pendingChips} />
              <MiniStat label="Capacidad de cuenta" value={capacityTotal} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Mis dispositivos</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Chips y estados</h2>
          <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
            Activos, disponibles y pendientes de activar con datos reales de tu cuenta.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniStat label="Activos" value={activeChips} />
            <MiniStat label="Disponibles" value={availableChips} />
            <MiniStat label="Pendientes" value={pendingChips} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/chips" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white">
              Ver dispositivos
            </Link>
            <Link href="/dashboard/chips?activate=true" className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200">
              Activar chip
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Ficha pública</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Acceso público</h2>
          <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
            {hasActiveChip
              ? "Revisa o comparte la ficha pública de los perfiles protegidos."
              : "Necesitas un chip activo para tener ficha pública."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/perfiles-medicos" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white">
              Ver ficha pública
            </Link>
            <Link href="/dashboard/perfiles-medicos" className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200">
              Copiar enlace
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Tienda</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Productos y combos</h2>
          <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
            Compra chip, sticker, accesorios y combos dentro de la tienda única.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/compras" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-900">
              Ir a tienda
            </Link>
            <Link href="/dashboard/pedidos" className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200">
              Ver pedidos
            </Link>
          </div>
        </div>
      </section>

      {/* Medical Profiles Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {state.isOrganization ? <Building2 className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
             </div>
             <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {state.isOrganization ? "Colaboradores" : "Perfiles Médicos"}
                </h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">
                  {state.isOrganization ? "Gestión Corporativa" : (state.isFamily ? "Gestión Multi-perfil" : "Tu Perfil Personal")}
                </p>
             </div>
          </div>
          
          {(state.isFamily || state.isOrganization) && (
             <Link 
              href={state.isOrganization ? "/dashboard/empresas" : "/dashboard/perfiles-medicos"} 
              className="text-primary font-black text-sm flex items-center gap-1.5 hover:bg-primary/5 px-4 py-2 rounded-xl transition-all"
             >
                {state.isOrganization ? "Ver Mi Empresa" : "Perfiles Médicos"} <ChevronRight className="h-4 w-4" />
             </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownProfile && (
               <ProfileCard 
                 profile={ownProfile} 
                 isOwn 
                 color="border-primary/20 bg-primary/5 shadow-sm" 
                 badge="text-primary bg-primary/10"
                 userEmail={userEmail}
                 isOrganization={state.isOrganization}
                 onPhotoUpdate={refreshData}
               />
            )}

           {(state.isFamily || state.isOrganization) && familyProfiles && familyProfiles.map((p) => (
             <ProfileCard key={p.id} profile={p} isOwn={false} color="border-border bg-card shadow-sm" badge="text-muted-foreground bg-muted" userEmail={userEmail} isOrganization={state.isOrganization} onPhotoUpdate={refreshData} />
           ))}
           
           {!state.isFamily && familyProfiles?.length > 0 && (
               <div className="col-span-full mt-2 p-4 rounded-2xl border border-dashed border-border bg-slate-50/50 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground italic">
                     Tienes {familyProfiles.length} personas registradas.
                  </p>
                  <Link href="/dashboard/perfiles-medicos" className="text-[10px] font-black uppercase text-primary hover:underline">Ver todos</Link>
               </div>
            )}

            {(state.isFamily || state.isOrganization) && (
               <Link
                 href={state.isOrganization ? "/dashboard/empresas" : "/dashboard/perfiles-medicos"}
                 className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-muted-foreground hover:text-primary group"
               >
                 <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                   <Plus className="h-6 w-6" />
                 </div>
                 <div className="text-center">
                   <p className="font-black text-sm uppercase tracking-widest">
                     {state.isOrganization ? "Añadir Colaborador" : "Nuevo Perfil Médico"}
                   </p>
                   <p className="text-[10px] mt-1 opacity-60">Protecciones activas: {state.activeChipsCount}/{state.maxChipsAllocated}</p>
                 </div>
               </Link>
            )}
        </div>
      </section>

      {/* Stats removed for a cleaner interface */}

      {/* Upsell Sections */}
      {!isEmployee && (
        <div className={`grid grid-cols-1 ${!state.isFamily ? 'md:grid-cols-2' : ''} gap-6 mt-12`}>
          {!state.isFamily && (
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-500/20 opacity-50" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                   <h3 className="text-2xl font-black tracking-tight mb-3">¿Proteges a más personas?</h3>
                   <p className="text-slate-300 text-sm mb-6 italic">Adquiere un paquete de chips y protege a tus seres queridos fácilmente.</p>
                </div>
                <Link href="/dashboard/upgrade" className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all w-fit">
                  Ver combos multi-perfil <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[3rem] p-10 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                 <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-emerald-500/20 text-emerald-600 rounded-2xl flex items-center justify-center">
                       <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-400">Chips Extra</h3>
                 </div>
                 <p className="text-emerald-800/70 dark:text-emerald-400/70 text-sm mb-6 font-medium">Adquiere capacidad extra por <strong>${CHIP_PRICE.toFixed(2)} {BUSINESS_RULES.CURRENCY}</strong>.</p>
              </div>
              <Link href="/dashboard/compras" className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all w-fit">
                Comprar Chips <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfileCardProps {
  profile: ProfileSummary;
  isOwn: boolean;
  color: string;
  badge: string;
  userEmail?: string | null;
  isOrganization: boolean;
  onPhotoUpdate?: () => void;
}

function ProfileCard({ profile, isOwn, color, badge, userEmail, isOrganization, onPhotoUpdate }: ProfileCardProps) {
  const firstName = profile?.firstName || "";
  const lastName = profile?.lastName || "";
  const initials = firstName && lastName 
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : (userEmail?.[0] || "?").toUpperCase();

  const [uploading, setUploading] = useState(false);

  const handlePhotoClick = (e: React.MouseEvent) => {
    if (!onPhotoUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    const input = document.getElementById(`profile-photo-input-${profile.id}`) as HTMLInputElement;
    input?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "profile");
    formData.append("bucket", "profile-photos");
    formData.append("profileId", profile.id);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onPhotoUpdate?.();
      } else {
        toast.error("Error al subir la foto");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error en la conexión");
    } finally {
      setUploading(false);
    }
  };

  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}`
    : (isOwn ? "Completa tu Perfil" : (isOrganization ? "Pendiente" : "Perfil por configurar"));

  const chipCount = profile?.assignedChips?.length || 0;
  const isComplete = !!(profile?.firstName && profile?.lastName && profile?.bloodType && profile?.bloodType !== "Pendiente");

  return (
    <Link 
      href={isOrganization ? "/dashboard/empresas" : "/dashboard/perfiles-medicos"} 
      className={`p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group active:scale-[0.98] ${color}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            onClick={handlePhotoClick}
            className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-sm relative overflow-hidden group/photo cursor-pointer ${isOwn ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          >
            {profile.photoUrl ? (
              <Image 
                src={profile.photoUrl} 
                alt="Avatar" 
                fill 
                className="object-cover" 
              />
            ) : (
              initials
            )}
            
            {isOwn && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </div>
            )}
          </div>
          <input 
            type="file" 
            id={`profile-photo-input-${profile.id}`} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          <div>
            <h4 className="font-black text-lg tracking-tight leading-none group-hover:text-primary transition-colors">{fullName}</h4>
            <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badge}`}>
              {isOwn ? "Principal" : (isOrganization ? "Colaborador" : "Perfil Adicional")}
            </span>
          </div>
        </div>
        {isComplete ? (
          <CheckCircle className="h-5 w-5 text-success" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-500" />
        )}
      </div>

      {profile.assignedChips?.[0] && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`/e/${profile.assignedChips[0].shortCode}`, '_blank');
          }}
          className="w-full mb-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver Pantallazo del Chip
        </button>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="px-3 py-1.5 rounded-xl bg-background border flex items-center gap-1.5">
           <Activity className="h-3.5 w-3.5 text-red-500" />
           <span className="text-[11px] font-bold uppercase">{profile.bloodType}</span>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-background border flex items-center gap-1.5">
           <Smartphone className="h-3.5 w-3.5 text-primary" />
           <span className="text-[11px] font-bold uppercase">{chipCount} {chipCount === 1 ? 'Chip' : 'Chips'}</span>
        </div>
      </div>

      <div className="flex items-center justify-end text-[11px] font-black uppercase text-primary tracking-tighter group-hover:translate-x-1 transition-transform">
        {isOwn ? "Gestionar Perfiles" : "Gestionar Perfil"} <ChevronRight className="h-3 w-3 ml-0.5" />
      </div>
    </Link>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function InfoCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function BadgePill({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) {
  const toneClasses = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
