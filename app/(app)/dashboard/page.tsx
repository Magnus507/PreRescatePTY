"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  History, AlertCircle, CheckCircle, 
  ChevronRight, Building2, Shield, LayoutDashboard, User, Cpu, Users, UsersRound,
  School, Settings, CreditCard,
  LogOut, ShieldCheck, Plus, Zap, Heart, 
  Activity, ArrowUpRight, Smartphone, Bell, Loader2, ExternalLink, ShieldAlert, Truck,
  Camera, Upload
} from "lucide-react";

import { AccountState } from "@/domains/accounts/account.types";
import { BUSINESS_RULES, ACCOUNT_TYPES } from "@/domains/shared/constants";

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
  const [dataLoadedAt, setDataLoadedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddChipsModal, setShowAddChipsModal] = useState(false);
  const [addChipsQty, setAddChipsQty] = useState(1);
  const [buying, setBuying] = useState(false);

  // Check if data is stale (default 5 minutes = 300000ms)
  const isDataStale = (maxAgeMs = 300000) => !dataLoadedAt || Date.now() - dataLoadedAt > maxAgeMs;

  const refreshData = async () => {
    try {
      const [familiaRes, notifyRes] = await Promise.all([
        fetch("/api/users/familia"),
        fetch("/api/users/notifications")
      ]);

      const familiaJson = await familiaRes.json();
      const notifyJson = await notifyRes.json();

      setData({
        ...familiaJson,
        notifications: notifyJson.notifications || []
      });
      setDataLoadedAt(Date.now());
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-tight">Sincronizando con PreRescue ID Control...</p>
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
  const { setupChecklist } = state;
  const userEmail = session?.user?.email;

  const CHIP_PRICE = BUSINESS_RULES.EXTRA_CHIP_PRICE;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-1 uppercase text-slate-950">PreRescue ID</h1>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Notification Bell (Visual only for now, triggers refresh) */}
           <button 
             onClick={refreshData}
             className="relative h-12 w-12 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center text-slate-400 hover:text-primary transition-all"
           >
              <Bell className="h-5 w-5" />
              {data?.notifications?.some(n => !n.read) && (
                <span className="absolute top-3 right-3 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-bounce" />
              )}
           </button>

           <div className="bg-card border border-border p-1.5 rounded-2xl shadow-sm flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Cuenta</span>
              <div className="bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-[0.8rem] text-xs font-black uppercase flex items-center gap-2">
                <Shield className="h-3 w-3" />
                {state.isCorporate ? "CORPORATIVA" : (state.isFamily ? "MULTIUSUARIO" : "PROTECCIÓN")}
              </div>
           </div>
        </div>
      </div>

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

      {/* LOGISTICS: Hardware in Transit */}
      {state.physicalChipsInTransitCount > 0 && (
        <div className="p-6 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-between gap-6 group animate-in zoom-in-95 duration-500 mb-6">
           <div className="flex items-center gap-5">
              <div className="h-14 w-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                 <Truck className="h-7 w-7" />
              </div>
              <div>
                 <h4 className="font-black text-lg text-indigo-900 tracking-tight">Hardware en Camino</h4>
                 <p className="text-sm text-indigo-800/60 font-medium">Tienes {state.physicalChipsInTransitCount} dispositivo(s) físicos vinculados a tu cuenta siendo procesados para envío.</p>
              </div>
           </div>
           <div className="hidden md:block">
              <span className="px-5 py-2.5 bg-indigo-200/50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-2xl">Logística Activa</span>
           </div>
        </div>
      )}

      {/* Combo & Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 relative group overflow-hidden rounded-[2.5rem] border ${state.isInactive ? "border-red-500/30 bg-red-50/10" : "border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5"} p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:shadow-2xl`}>
           <div className={`absolute top-0 right-0 w-64 h-64 ${state.isInactive ? "bg-red-500/5" : "bg-primary/10"} blur-[80px] -mr-32 -mt-32 transition-transform group-hover:scale-125`} />
           
           <div className="relative z-10 flex items-center gap-5">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-6 ${state.isInactive ? "bg-red-600 text-white shadow-red-500/20" : state.isExpired ? "bg-destructive text-white" : "bg-primary text-white shadow-primary/30"}`}>
                <Zap className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">NIVEL DE PROTECCIÓN</p>
                <div className="flex items-center gap-3">
                  <h2 className={`text-3xl font-black tracking-tight ${state.isInactive ? "text-red-600" : state.isExpired ? "text-destructive" : "text-primary dark:text-white"}`}>
                    {state.isInactive ? "Inactiva" : state.packageName}
                  </h2>
                  {!state.isInactive && state.packagePrice > 0 && (
                    <p className="text-sm font-bold text-muted-foreground/70 mt-1">
                      ${state.packagePrice.toFixed(2)} {BUSINESS_RULES.CURRENCY} · pago único
                    </p>
                  )}

                  {state.isInactive ? (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Esperando Combo</span>
                  ) : state.isExpired && (
                    <span className="bg-destructive text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase animate-pulse">Expirado</span>
                  )}
                </div>
              </div>
           </div>

           <div className="relative z-10 flex items-center gap-8 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 dark:border-slate-800">
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tighter text-foreground">{state.activeChipsCount}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Chips activos</p>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tighter text-foreground">{state.maxChipsAllocated}</p>
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">
                     Límite Total
                  </p>
                </div>
              </div>

           </div>
        </div>

        {/* Quick Activation Card */}
        <Link 
          href="/dashboard/chips?activate=true" 
          className="flex flex-col justify-center gap-2 p-8 rounded-[2.5rem] border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
          <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
          </div>
          <p className="font-black text-xl tracking-tight mt-2">Activar nuevo chip</p>
          <p className="text-sm text-muted-foreground leading-snug">Vincula un nuevo sticker a cualquier perfil de tu cuenta.</p>
        </Link>
      </div>

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
              href={state.isOrganization ? "/dashboard/empresas" : "/dashboard/familia"} 
              className="text-primary font-black text-sm flex items-center gap-1.5 hover:bg-primary/5 px-4 py-2 rounded-xl transition-all"
             >
                {state.isOrganization ? "Ver Mi Empresa" : "Gestionar Familia"} <ChevronRight className="h-4 w-4" />
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
             <ProfileCard key={p.id} profile={p} isOwn={false} color="border-border bg-card shadow-sm" badge="text-muted-foreground bg-muted" userEmail={userEmail} isOrganization={state.isOrganization} />
           ))}
           
           {!state.isFamily && familyProfiles?.length > 0 && (
              <div className="col-span-full mt-2 p-4 rounded-2xl border border-dashed border-border bg-slate-50/50 flex items-center justify-between">
                 <p className="text-xs font-medium text-muted-foreground italic">
                    Tienes {familyProfiles.length} perfiles adicionales.
                 </p>
                 <Link href="/dashboard/familia" className="text-[10px] font-black uppercase text-primary hover:underline">Ver todos</Link>
              </div>
           )}

           {(state.isFamily || state.isOrganization) && state.familyProfilesCount < (state.maxProfilesAllocated - 1) && (
              <Link
                href={state.isOrganization ? "/dashboard/empresas" : "/dashboard/familia"}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-muted-foreground hover:text-primary group"
              >
                <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-black text-sm uppercase tracking-widest">
                    {state.isOrganization ? "Añadir Colaborador" : "Añadir Familiar"}
                  </p>
                  <p className="text-[10px] mt-1 opacity-60">Cupo: {state.familyProfilesCount + 1}/{state.maxProfilesAllocated}</p>
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
                   <h3 className="text-2xl font-black tracking-tight mb-3">¿Proteges a toda tu familia?</h3>
                   <p className="text-slate-300 text-sm mb-6 italic">Adquiere un paquete de chips y protege a tus seres queridos fácilmente.</p>
                </div>
                <Link href="/dashboard/upgrade" className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all w-fit">
                  Ver combos familiares <ArrowUpRight className="h-4 w-4" />
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
    if (!isOwn) return;
    e.preventDefault();
    e.stopPropagation();
    const input = document.getElementById('profile-photo-input') as HTMLInputElement;
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

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onPhotoUpdate?.();
      } else {
        alert("Error al subir la foto");
      }
    } catch (err) {
      console.error(err);
      alert("Error en la conexión");
    } finally {
      setUploading(false);
    }
  };

  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}`
    : (isOwn ? "Completa tu Perfil" : (isOrganization ? "Pendiente" : "Familiar por configurar"));

  const chipCount = profile?.assignedChips?.length || 0;
  const isComplete = !!(profile?.firstName && profile?.lastName && profile?.bloodType && profile?.bloodType !== "Pendiente");

  return (
    <Link 
      href={isOrganization ? "/dashboard/empresas" : "/dashboard/familia"} 
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
            id="profile-photo-input" 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          <div>
            <h4 className="font-black text-lg tracking-tight leading-none group-hover:text-primary transition-colors">{fullName}</h4>
            <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badge}`}>
              {isOwn ? "Principal" : (isOrganization ? "Colaborador" : "Familiar")}
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

function MiniStat({ icon: Icon, label, value, color, href }: { icon: any; label: string; value: string; color: string; href?: string }) {
  const Card = (
    <div className="p-5 rounded-[1.8rem] border border-border bg-card transition-all hover:bg-accent/30 group cursor-pointer">
       <div className="flex items-center gap-3 mb-2">
          <div className={`h-8 w-8 rounded-xl bg-muted group-hover:scale-110 transition-all flex items-center justify-center ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
       </div>
       <p className="text-3xl font-black tracking-tighter">{value}</p>
    </div>
  );

  if (href) return <Link href={href}>{Card}</Link>;
  return Card;
}

function SetupItem({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 group">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${done ? "bg-success text-white" : "bg-amber-500 text-white"}`}>
        {done ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      </div>
      <span className={`text-sm font-semibold group-hover:underline ${done ? "text-success/70" : "text-amber-900 dark:text-amber-500"}`}>{label}</span>
    </Link>
  );
}
