"use client";

import { useEffect, useState } from "react";
import { 
  Cpu, ExternalLink, Pause, Play, UserRound, 
  ChevronRight, Activity, ShieldCheck, Zap,
  Smartphone, Loader2, Shield, List
} from "lucide-react";
import { useSearchParams } from "next/navigation";

interface ProfileOption {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

interface ChipAccessory {
  id: string;
  productType: string;
  quantity: number;
  totalPrice: number;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  };
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
  orderItems: ChipAccessory[];
}

export default function ChipsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "activate">("list");
  const [chips, setChips] = useState<ChipData[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  
  // Activation State
  const [activationCode, setActivationCode] = useState("");
  const [activationProfileId, setActivationProfileId] = useState<string>("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationSuccess, setActivationSuccess] = useState(false);
  const activeChips = chips.filter((chip) => chip.status === "activated");
  const suspendedChips = chips.filter((chip) => chip.status === "suspended");
  const unassignedChips = chips.filter((chip) => !chip.assignedProfileId);

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
      
      const own = familyData.ownProfile ? [{ ...familyData.ownProfile, _own: true }] : [];
      const fam = familyData.familyProfiles || [];
      const allProfiles = [...own, ...fam];
      setProfiles(allProfiles);

      // Auto-select profile
      if (allProfiles.length === 1) {
        setActivationProfileId(allProfiles[0].id);
      } else if (allProfiles.length > 0) {
        // Pre-select own profile if present
        const ownProfile = own[0];
        setActivationProfileId(ownProfile ? ownProfile.id : allProfiles[0].id);
      }
    } catch {
      console.error("Error loading chips page:");
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
        body: JSON.stringify({ activationCode, profileId: activationProfileId || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActivationError(data.error || "Código inválido o ya activado");
        return;
      }

      setActivationSuccess(true);
      setActivationCode("");
      setActivationProfileId("");
      await loadData();
    } catch {
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
      <section className="relative overflow-hidden rounded-[2.25rem] border border-[#1D2836] bg-[#05070D] p-5 shadow-[0_28px_80px_-38px_rgba(0,0,0,0.85)] md:p-7">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(218,26,33,0.16)_0%,rgba(218,26,33,0.06)_24%,transparent_46%),linear-gradient(135deg,rgba(5,7,13,0)_0%,rgba(15,20,25,0.82)_54%,rgba(5,7,13,1)_100%)]" />
          <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(239,244,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(239,244,255,0.14)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_center,rgba(239,244,255,0.72)_0.9px,transparent_0.9px)] [background-size:18px_18px]" />
          <div className="absolute -right-10 top-8 h-44 w-44 rounded-full border border-[#DA1A21]/25 shadow-[0_0_60px_-18px_rgba(218,26,33,0.72)]" />
          <div className="absolute right-8 top-24 h-20 w-20 rounded-full border border-[#EFF4FF]/12" />
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-[#DA1A21] to-transparent opacity-70" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#EFF4FF]/30 to-transparent" />
        </div>

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[#EFF4FF] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#DA1A21] shadow-[0_0_14px_rgba(218,26,33,0.7)]" />
                PreRescue ID
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-[#EFF4FF] md:text-4xl">Mis dispositivos</h1>
                <p className="max-w-2xl text-sm font-medium leading-relaxed text-[#EFF4FF]/78 md:text-base">
                  Revisa tus chips activos, vincula un perfil y activa uno nuevo sin perder claridad.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:w-auto">
              <SummaryPill label="Activos" value={activeChips.length} />
              <SummaryPill label="Sin perfil" value={unassignedChips.length} />
              <SummaryPill label="Suspendidos" value={suspendedChips.length} />
              <SummaryPill label="Perfiles" value={profiles.length} />
            </div>
          </div>
        </div>
      </section>

      {/* Modern Tab Selector */}
      <div className="flex w-full flex-col gap-3 rounded-[1.65rem] border border-slate-200/70 bg-slate-100/90 p-1.5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.3)] sm:flex-row sm:w-fit">
        <button
          onClick={() => { setActiveTab("list"); setActivationSuccess(false); }}
          className={`flex w-full items-center justify-center gap-2 rounded-[1.35rem] px-5 py-3.5 font-black text-[11px] uppercase tracking-[0.28em] transition-all duration-200 ease-out sm:w-auto ${
            activeTab === "list" ? "bg-white text-primary shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <List className="h-4 w-4" /> Mis dispositivos
        </button>
        <button
          onClick={() => { setActiveTab("activate"); setActivationSuccess(false); }}
          className={`flex w-full items-center justify-center gap-2 rounded-[1.35rem] px-5 py-3.5 font-black text-[11px] uppercase tracking-[0.28em] transition-all duration-200 ease-out sm:w-auto ${
            activeTab === "activate" ? "bg-white text-primary shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Zap className="h-4 w-4" /> Activar chip
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="space-y-5">
          {chips.length === 0 ? (
            <div className="text-center rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(248,250,252,1)_100%)] px-5 py-16 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.3)] md:px-10 md:py-20">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-950 text-slate-300 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.55)]">
                 <Cpu className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-950">Aún no tienes chips activos</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-600">
                Usa el código incluido en tu producto para activar uno y vincularlo a tu cuenta.
              </p>
              <button 
                onClick={() => setActiveTab("activate")}
                className="mx-auto mt-8 inline-flex items-center gap-2 rounded-[1.15rem] bg-gradient-to-r from-[#DA1A21] to-[#B9141B] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_35px_-18px_rgba(218,26,33,0.9)] transition-all hover:-translate-y-px hover:shadow-[0_20px_40px_-20px_rgba(218,26,33,1)] active:scale-[0.99]"
              >
                Activar chip ahora <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:gap-5">
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  className={`group relative overflow-hidden rounded-[2.25rem] border p-5 md:p-6 transition-all duration-200 ease-out active:scale-[0.995] ${
                    chip.status === "activated"
                      ? "border-[#273241] bg-[#05070D] text-[#EFF4FF] shadow-[0_22px_55px_-30px_rgba(0,0,0,0.75)]"
                      : "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,1)_100%)] text-slate-950 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-100">
                    {chip.status === "activated" ? (
                      <>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_9%_22%,rgba(218,26,33,0.16)_0%,transparent_29%),linear-gradient(118deg,rgba(239,244,255,0.08)_0%,transparent_22%,rgba(218,26,33,0.08)_76%,transparent_100%)]" />
                        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(239,244,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(239,244,255,0.13)_1px,transparent_1px)] [background-size:36px_36px]" />
                        <div className="absolute -left-12 top-8 h-32 w-32 rounded-full border border-[#DA1A21]/22 shadow-[0_0_52px_-20px_rgba(218,26,33,0.7)]" />
                        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#DA1A21]/70 via-[#EFF4FF]/12 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(15,23,42,0.08)_0%,transparent_34%),linear-gradient(135deg,rgba(255,255,255,0)_0%,rgba(226,232,240,0.58)_100%)]" />
                    )}
                  </div>

                  <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
                     <div className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.65rem] shadow-lg ${chip.status === "activated" ? 'bg-gradient-to-br from-[#DA1A21] to-[#B9141B] text-white shadow-[0_16px_30px_-18px_rgba(218,26,33,0.85)]' : 'bg-slate-900 text-slate-200 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.32)]'} transition-transform`}>
                        <Cpu className="h-9 w-9" />
                     </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${chip.status === "activated" ? "bg-emerald-500/18 text-emerald-200 ring-1 ring-emerald-300/20" : "bg-amber-500/18 text-amber-700 ring-1 ring-amber-300/30"}`}>
                            {chip.status === "activated" ? "Activo" : "Suspendido"}
                          </span>
                          {chip.serviceStatus === "limited" && (
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${chip.status === "activated" ? "bg-white/10 text-[#EFF4FF]/80 ring-1 ring-white/10" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                              Solo lectura
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className={`text-2xl font-black tracking-tight md:text-3xl ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-slate-950"}`}>
                            {chip.serialPublic}
                          </h4>
                          <p className={`mt-1 text-xs font-medium ${chip.status === "activated" ? "text-[#EFF4FF]/72" : "text-slate-500"}`}>
                            Código público: <span className={`font-black ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-slate-900"}`}>{chip.shortCode}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:w-[34rem] lg:gap-3">
                      <div className={`flex items-center gap-2 rounded-[1.05rem] px-3 py-2 text-xs font-bold ${chip.status === "activated" ? "bg-white/8 text-[#EFF4FF]/78" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                        <Smartphone className={`h-4 w-4 ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-primary"}`} /> NFC activo
                      </div>
                      <div className={`flex items-center gap-2 rounded-[1.05rem] px-3 py-2 text-xs font-bold ${chip.status === "activated" ? "bg-white/8 text-[#EFF4FF]/78" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                        <ShieldCheck className={`h-4 w-4 ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-primary"}`} /> Seguro Ley 81
                      </div>
                      {chip.serviceEndDate && (
                        <div className={`flex items-center gap-2 rounded-[1.05rem] px-3 py-2 text-xs font-bold sm:col-span-2 ${chip.status === "activated" ? "bg-[#DA1A21]/14 text-[#EFF4FF]" : "bg-primary/5 text-primary"}`}>
                          <Zap className="h-4 w-4" /> Expira: {new Date(chip.serviceEndDate).toLocaleDateString("es-PA")}
                        </div>
                      )}
                    </div>

                    <div className={`grid gap-4 rounded-[1.5rem] p-4 lg:w-[28rem] ${chip.status === "activated" ? "border border-white/10 bg-[#0B111A]/78 shadow-[inset_0_1px_0_rgba(239,244,255,0.08)]" : "border border-slate-200 bg-white/78 shadow-sm"}`}>
                      <div className={`flex items-center gap-3 ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-slate-900"}`}>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-[1rem] ${chip.status === "activated" ? "bg-white/10" : "bg-primary/10"} shadow-sm`}>
                           <UserRound className={`h-5 w-5 ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-primary"}`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${chip.status === "activated" ? "text-[#EFF4FF]/64" : "text-slate-500"}`}>Vincular perfil</p>
                          <p className={`text-sm font-black leading-none ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-slate-900"}`}>Perfil médico</p>
                        </div>
                      </div>

                      <div className="relative w-full">
                        <select
                          value={chip.assignedProfileId ?? ""}
                          disabled={assigning === chip.id || chip.status === "inventory"}
                          onChange={(e) => assignProfile(chip.id, e.target.value || null)}
                          className={`w-full appearance-none rounded-[1.15rem] border px-4 py-3 text-sm font-black transition-all focus:outline-none focus:ring-4 cursor-pointer disabled:opacity-50 ${
                            chip.status === "activated"
                              ? "border-white/10 bg-white/8 text-[#EFF4FF] focus:ring-[#EFF4FF]/10"
                              : "border-slate-200 bg-slate-50 text-slate-700 focus:ring-primary/10 hover:bg-white"
                          }`}
                        >
                          <option value="">— Seleccionar perfil —</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName} {p.userId ? "(Tú)" : "(Familiar)"}
                            </option>
                          ))}
                        </select>
                        {assigning === chip.id ? (
                           <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-primary"}`} />
                        ) : (
                          <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none rotate-90 ${chip.status === "activated" ? "text-[#EFF4FF]/40" : "text-slate-300"}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accessories linked to this chip */}
                  {chip.orderItems && chip.orderItems.length > 0 && (
                    <div className={`w-full border-t pt-5 ${chip.status === "activated" ? "border-white/10" : "border-slate-100"}`}>
                      <p className={`mb-3 text-[10px] font-black uppercase tracking-widest ${chip.status === "activated" ? "text-[#EFF4FF]/60" : "text-slate-500"} text-center md:text-left`}>Accesorios vinculados</p>
                      <div className="space-y-2">
                        {chip.orderItems.map((acc) => {
                          const orderStatusLabel = acc.order.orderStatus === "completed" ? "Pedido entregado" :
                            acc.order.orderStatus === "shipped" ? "Pedido enviado" :
                            acc.order.orderStatus === "processing" ? "Preparando pedido" :
                            acc.order.orderStatus === "pending" ? "Pago pendiente" :
                            acc.order.orderStatus;
                          return (
                            <div key={acc.id} className={`flex items-center justify-between gap-3 rounded-[1rem] p-3 ${chip.status === "activated" ? "bg-white/8 border border-white/10" : "bg-slate-50 border border-slate-100"}`}>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-xs font-bold ${chip.status === "activated" ? "text-[#EFF4FF]" : "text-slate-900"}`}>{acc.productType}</p>
                                <p className={`text-[10px] ${chip.status === "activated" ? "text-[#EFF4FF]/65" : "text-muted-foreground"}`}>
                                  x{acc.quantity} · ${acc.totalPrice.toFixed(2)}
                                  {acc.order.orderNumber && <span className="ml-1">· #{acc.order.orderNumber}</span>}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                                acc.order.orderStatus === "completed" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                acc.order.orderStatus === "shipped" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                acc.order.orderStatus === "processing" ? "bg-cyan-100 text-cyan-700 border-cyan-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {orderStatusLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {chip.orderItems && chip.orderItems.length === 0 && (
                    <div className={`w-full border-t pt-5 ${chip.status === "activated" ? "border-white/10" : "border-slate-100"}`}>
                      <p className={`text-center text-[10px] italic ${chip.status === "activated" ? "text-[#EFF4FF]/55" : "text-slate-400"} md:text-left`}>Aún no tienes accesorios vinculados a este chip.</p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
                     <a
                        href={`/e/${chip.shortCode}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-3 rounded-[1.15rem] bg-slate-950 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-px hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none"
                      >
                        <ExternalLink className="h-4 w-4" /> Ver Perfil
                      </a>
                      <button
                        onClick={() => toggleChip(chip.id, chip.status)}
                        className={`inline-flex items-center justify-center gap-3 rounded-[1.15rem] px-5 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none ${
                          chip.status === "activated"
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
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

                  {/* Profile selector for activation */}
                  {profiles.length > 1 && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-6 block">Selecciona a quién protegerá este chip</label>
                      <select
                        value={activationProfileId}
                        onChange={(e) => setActivationProfileId(e.target.value)}
                        className="w-full px-6 py-4 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 focus:border-primary/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 font-black text-sm transition-all appearance-none cursor-pointer"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.firstName} {p.lastName} {p.userId ? "(Tú)" : "(Familiar)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {profiles.length === 1 && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                      <p className="text-[11px] font-bold text-primary">
                        Protegiendo a: {profiles[0].firstName} {profiles[0].lastName}
                      </p>
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
                    disabled={activating || !activationCode || !activationProfileId}
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

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.1rem] border border-[#273241] bg-[#0B111A]/82 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(239,244,255,0.08)] backdrop-blur">
      <p className="text-lg font-black tracking-tight text-[#EFF4FF]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#EFF4FF]/72">{label}</p>
    </div>
  );
}
