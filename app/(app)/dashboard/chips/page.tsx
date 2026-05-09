"use client";

import { useEffect, useState } from "react";
import { 
  Cpu, ExternalLink, Pause, Play, UserRound, 
  ChevronRight, Activity, ShieldCheck, Zap,
  Smartphone, Loader2, Shield, X, PlusCircle, List
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface ProfileOption {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

interface ChipData {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: string;
  activatedAt: string;
  serviceStatus: string;
  serviceEndDate: string | null;
  lastScanAt: string | null;
  assignedProfileId: string | null;
  assignedProfile: { id: string; firstName: string; lastName: string; userId: string | null } | null;
  _count: { scanEvents: number };
}

export default function ChipsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "activate">("list");
  const [chips, setChips] = useState<ChipData[]>([]);
  const [chipsLoadedAt, setChipsLoadedAt] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  
  // Activation State
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationSuccess, setActivationSuccess] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chipRes, familyRes] = await Promise.all([
        fetch("/api/chips/dashboard"),
        fetch("/api/users/perfiles-medicos")
      ]);

      const chipData = await chipRes.json();
      const familyData = await familyRes.json();

      setChips(chipData.chips || []);
      setChipsLoadedAt(Date.now());
      
      const own = familyData.ownProfile ? [{ ...familyData.ownProfile, _own: true }] : [];
      const fam = familyData.familyProfiles || [];
      setProfiles([...own, ...fam]);
    } catch (e) {
      console.error("Error loading chips page:", e);
    } finally {
      setLoading(false);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    loadData();
    if (searchParams.get("activate") === "true") {
      setActiveTab("activate");
    }
  }, [searchParams]);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setActivationError("");
    setActivating(true);

    try {
      const res = await fetch("/api/chips/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActivationError(data.error || "Código inválido o ya activado");
        return;
      }

      setActivationSuccess(true);
      setActivationCode("");
      await loadData();
    } catch (err) {
      setActivationError("Error de conexión");
    } finally {
      setActivating(false);
    }
  }

  async function toggleChip(chipId: string, currentStatus: string) {
    const action = currentStatus === "activated" ? "suspend" : "reactivate";
    const res = await fetch("/api/chips/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chipId, action }),
    });
    if (res.ok) {
      setChips((prev) =>
        prev.map((c) =>
          c.id === chipId
            ? { ...c, status: action === "suspend" ? "suspended" : "activated" }
            : c
        )
      );
    }
  }

  async function assignProfile(chipId: string, profileId: string | null) {
    setAssigning(chipId);
    try {
      const res = await fetch("/api/chips/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chipId, action: "assign", profileId }),
      });
      if (res.ok) {
        const selected = profiles.find((p) => p.id === profileId) ?? null;
        setChips((prev) =>
          prev.map((c) =>
            c.id === chipId
              ? { ...c, assignedProfileId: profileId, assignedProfile: selected }
              : c
          )
        );
      }
    } finally {
      setAssigning(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-tight">Sincronizando tus dispositivos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-1 uppercase">Mis Dispositivos</h1>
          <p className="text-muted-foreground font-medium">Control total de tus stickers NFC y códigos de emergencia</p>
        </div>
      </div>

      {/* Modern Tab Selector */}
      <div className="flex p-1.5 bg-slate-100 rounded-[2rem] w-fit">
        <button
          onClick={() => { setActiveTab("list"); setActivationSuccess(false); }}
          className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === "list" ? "bg-white text-primary shadow-xl shadow-black/5 scale-105" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <List className="h-4 w-4" /> Mis Stickers
        </button>
        <button
          onClick={() => { setActiveTab("activate"); setActivationSuccess(false); }}
          className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === "activate" ? "bg-white text-primary shadow-xl shadow-black/5 scale-105" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Zap className="h-4 w-4" /> Activar Nuevo
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="space-y-6">
          {chips.length === 0 ? (
            <div className="text-center py-24 rounded-[3.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 group hover:border-primary/30 transition-all">
              <div className="h-24 w-24 rounded-[2.5rem] bg-white mx-auto mb-6 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:text-primary transition-all shadow-sm">
                 <Cpu className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-2">No tienes dispositivos</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-medium italic underline decoration-slate-200 underline-offset-4">Todavía no has vinculado ningún sticker a tu cuenta.</p>
              <button 
                onClick={() => setActiveTab("activate")}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all flex items-center gap-2 mx-auto"
              >
                Activar Sticker Ahora <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  className="group relative overflow-hidden rounded-[3rem] border border-border bg-white p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 transition-all hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.99]"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl -mr-24 -mt-24 group-hover:bg-primary/10 transition-all" />

                  <div className="relative z-10 flex flex-col items-center">
                     <div className={`h-24 w-24 rounded-[2.5rem] flex items-center justify-center shadow-lg mb-4 ${chip.status === "activated" ? 'bg-primary text-white shadow-primary/20 rotate-3 group-hover:rotate-6' : 'bg-slate-200 text-slate-400'} transition-transform`}>
                        <Cpu className="h-12 w-12" />
                     </div>
                     <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${chip.status === "activated" ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        {chip.status === "activated" ? "Activo" : "Suspendido"}
                     </span>
                  </div>

                  <div className="flex-1 space-y-6 w-full text-center md:text-left">
                    <div>
                       <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                          <h4 className="text-3xl font-black font-mono tracking-tighter text-slate-950 uppercase">{chip.serialPublic}</h4>
                          {chip.serviceStatus === "limited" && (
                             <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest border border-amber-200">Solo Lectura</span>
                          )}
                       </div>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center justify-center md:justify-start gap-3">
                         Código ID: <span className="text-slate-900">{chip.shortCode}</span>
                         <span className="h-1 w-1 rounded-full bg-slate-300" />
                         Escaneos: <span className="text-primary">{chip._count.scanEvents}</span>
                       </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          <Smartphone className="h-4 w-4 text-primary" /> NFC Activo
                       </div>
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          <ShieldCheck className="h-4 w-4 text-primary" /> Seguro Ley 81
                       </div>
                       {chip.serviceEndDate && (
                          <div className="flex items-center gap-2 text-xs font-black text-primary px-3 py-2 rounded-xl bg-primary/5">
                            <Zap className="h-4 w-4" /> Expira: {new Date(chip.serviceEndDate).toLocaleDateString("es-PA")}
                          </div>
                       )}
                    </div>

                    {/* Assignment Selector */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-6">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shadow-primary/10">
                             <UserRound className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Vincular con:</p>
                            <p className="text-[11px] font-bold text-slate-900 leading-none">Perfil Médico</p>
                          </div>
                       </div>
                       
                       <div className="relative flex-1 w-full max-w-sm">
                        <select
                          value={chip.assignedProfileId ?? ""}
                          disabled={assigning === chip.id || chip.status === "inventory"}
                          onChange={(e) => assignProfile(chip.id, e.target.value || null)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer transition-all hover:bg-white disabled:opacity-50 text-slate-700 shadow-sm"
                        >
                          <option value="">— Seleccionar Perfil —</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName} {p.userId ? "(Tú)" : "(Familiar)"}
                            </option>
                          ))}
                        </select>
                        {assigning === chip.id ? (
                           <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none rotate-90" />
                        )}
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-64">
                     <a
                        href={`/e/${chip.shortCode}`}
                        target="_blank"
                        className="flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:-translate-y-1"
                      >
                        <ExternalLink className="h-4 w-4" /> Ver Perfil
                      </a>
                      <button
                        onClick={() => toggleChip(chip.id, chip.status)}
                        className={`flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                          chip.status === "activated"
                            ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 shadow-sm"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 shadow-sm"
                        }`}
                      >
                        {chip.status === "activated" ? (
                          <><Pause className="h-4 w-4" /> Suspender</>
                        ) : (
                          <><Play className="h-4 w-4" /> Reactivar</>
                        )}
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-xl animate-in zoom-in-95 duration-500">
           <div className="bg-white rounded-[4rem] border border-slate-200 p-12 md:p-16 shadow-2xl shadow-primary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                 <Shield className="h-64 w-64 text-primary" />
              </div>

              {activationSuccess ? (
                <div className="text-center py-8 animate-in slide-in-from-bottom-8 duration-700 relative z-10">
                   <div className="h-32 w-32 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
                      <ShieldCheck className="h-16 w-16" />
                   </div>
                   <h4 className="text-4xl font-black tracking-tighter mb-4 text-slate-950 uppercase leading-none">¡Activación Exitosa!</h4>
                   <p className="text-slate-500 text-lg font-medium mb-12 px-8">Tu nuevo dispositivo ha sido vinculado correctamente y ya protege tu vida.</p>
                   <button 
                    onClick={() => setActiveTab("list")}
                    className="w-full py-6 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     Ver Mis Dispositivos
                   </button>
                </div>
              ) : (
                <form onSubmit={handleActivate} className="space-y-10 relative z-10">
                  <div className="space-y-3">
                     <h3 className="text-4xl font-black tracking-tighter text-slate-950 uppercase leading-none">Vincular Sticker</h3>
                     <p className="text-slate-500 font-medium">Ingresa el código que se encuentra en el empaque de tu producto.</p>
                  </div>

                  {activationError && (
                    <div className="p-6 rounded-3xl bg-red-50 border border-red-100 text-red-600 text-xs font-black text-center uppercase tracking-widest flex items-center justify-center gap-3">
                      <Activity className="h-5 w-5" /> {activationError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-6 block">Código de Activación (12 dígitos)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="XXXX-XXXX-XXXX"
                      value={activationCode}
                      maxLength={14}
                      onChange={e => setActivationCode(e.target.value.toUpperCase())}
                      className="w-full px-10 py-8 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 focus:border-primary/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 font-black text-3xl text-center tracking-[0.3em] font-mono transition-all placeholder:text-slate-200"
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-400 mt-4">
                       <Zap className="h-4 w-4" />
                       <p className="text-[11px] font-bold uppercase tracking-widest">Activación Instantánea NFC</p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={activating || !activationCode}
                    className="w-full py-8 bg-primary text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                  >
                    {activating ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                    {activating ? "Validando..." : "Confirmar Protección"}
                  </button>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
