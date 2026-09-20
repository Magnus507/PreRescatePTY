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
        <p className="text-slate-500 animate-pulse font-medium tracking-tight uppercase">Sincronizando tus dispositivos</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.24)] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,0.06),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.05),transparent_32%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
              <span className="h-2 w-2 rounded-full bg-[#DA1A21]" />
              PreRescue ID
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Mis dispositivos</h1>
              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 md:text-base">
                Revisa tus chips activos, vincula un perfil y activa uno nuevo con una experiencia más clara y humana.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryPill label="Activos" value={activeChips.length} tone="green" />
              <SummaryPill label="Sin perfil" value={unassignedChips.length} tone="amber" />
              <SummaryPill label="Suspendidos" value={suspendedChips.length} tone="slate" />
              <SummaryPill label="Perfiles" value={profiles.length} tone="blue" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.18)] md:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Estado general</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Dispositivos</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{chips.length}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Inventario visible en tu cuenta.</p>
              </div>
              <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Acción principal</p>
                <p className="mt-2 text-sm font-black text-slate-950">Activar o revisar</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Elige el flujo que necesitas ahora.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-1.5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)] sm:flex-row sm:w-fit">
        <button
          onClick={() => { setActiveTab("list"); setActivationSuccess(false); }}
          className={`flex w-full items-center justify-center gap-2 rounded-[1.2rem] px-5 py-3.5 font-black text-[11px] uppercase tracking-[0.24em] transition-all duration-200 ease-out sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            activeTab === "list" ? "bg-white text-primary shadow-[0_12px_30px_-20px_rgba(15,23,42,0.2)]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <List className="h-4 w-4" /> Mis dispositivos
        </button>
        <button
          onClick={() => { setActiveTab("activate"); setActivationSuccess(false); }}
          className={`flex w-full items-center justify-center gap-2 rounded-[1.2rem] px-5 py-3.5 font-black text-[11px] uppercase tracking-[0.24em] transition-all duration-200 ease-out sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            activeTab === "activate" ? "bg-white text-primary shadow-[0_12px_30px_-20px_rgba(15,23,42,0.2)]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Zap className="h-4 w-4" /> Activar chip
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="space-y-5">
          {chips.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center shadow-[0_18px_40px_-30px_rgba(15,23,42,0.14)] md:px-10 md:py-20">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white text-slate-300 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.18)]">
                 <Cpu className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-950">Aún no tienes chips activos</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-600">
                Usa el código incluido en tu producto para activar uno y vincularlo a tu cuenta.
              </p>
              <button 
                onClick={() => setActiveTab("activate")}
                className="mx-auto mt-8 inline-flex items-center gap-2 rounded-[1.05rem] bg-[#DA1A21] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_35px_-18px_rgba(218,26,33,0.32)] transition-all hover:-translate-y-px hover:bg-[#B9141B] hover:shadow-[0_20px_40px_-20px_rgba(218,26,33,0.45)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Activar chip ahora <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:gap-5">
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  className={`group relative overflow-hidden rounded-[2rem] border p-5 md:p-6 transition-all duration-200 ease-out active:scale-[0.995] focus-within:shadow-[0_22px_50px_-30px_rgba(15,23,42,0.22)] ${
                    chip.status === "activated"
                      ? "border-slate-200 bg-white text-slate-950 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.16)]"
                      : "border-slate-200 bg-white text-slate-950 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.12)]"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-100">
                    {chip.status === "activated" ? (
                      <>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,0.05),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.04),transparent_36%)]" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(15,23,42,0.05)_0%,transparent_34%),linear-gradient(135deg,rgba(255,255,255,0)_0%,rgba(226,232,240,0.36)_100%)]" />
                    )}
                  </div>

                  <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start">
                    <div className="space-y-4">
                      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                        <div className={`flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1.5rem] shadow-lg ${chip.status === "activated" ? 'border border-[#DA1A21]/15 bg-[#DA1A21] text-white shadow-[0_16px_30px_-18px_rgba(218,26,33,0.32)]' : 'bg-slate-100 text-slate-700 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.12)]'} transition-transform`}>
                          <Cpu className="h-9 w-9" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${chip.status === "activated" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                              {chip.status === "activated" ? "Activo" : "Suspendido"}
                            </span>
                            {chip.serviceStatus === "limited" && (
                              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${chip.status === "activated" ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                                Solo lectura
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                              {chip.serialPublic}
                            </h4>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Código público: <span className="font-black text-slate-950">{chip.shortCode}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                          <Smartphone className="h-4 w-4 text-primary" /> NFC activo
                        </div>
                        <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                          <ShieldCheck className="h-4 w-4 text-primary" /> Ley 81
                        </div>
                        <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                          <Activity className="h-4 w-4 text-primary" /> {chip._count.scanEvents} escaneos
                        </div>
                        {chip.serviceEndDate && (
                          <div className="flex items-center gap-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 sm:col-span-3">
                            <Zap className="h-4 w-4" /> Expira: {new Date(chip.serviceEndDate).toLocaleDateString("es-PA")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)]">
                      <div className="flex items-center gap-3 text-slate-950">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.22)]">
                           <UserRound className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Perfil vinculado</p>
                          <p className="truncate text-sm font-black leading-none text-slate-950">
                            {chip.assignedProfile ? `${chip.assignedProfile.firstName} ${chip.assignedProfile.lastName}` : "Seleccionar perfil"}
                          </p>
                        </div>
                      </div>

                      <div className="relative w-full">
                        <select
                          value={chip.assignedProfileId ?? ""}
                          disabled={assigning === chip.id || chip.status === "inventory"}
                          onChange={(e) => assignProfile(chip.id, e.target.value || null)}
                          className="w-full appearance-none rounded-[1.05rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#DA1A21]/10 hover:border-slate-300 disabled:opacity-50"
                        >
                          <option value="">— Seleccionar perfil —</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName} {p.userId ? "(Tú)" : "(Familiar)"}
                            </option>
                          ))}
                        </select>
                        {assigning === chip.id ? (
                           <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none rotate-90 text-slate-300" />
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <a
                          href={`/e/${chip.shortCode}`}
                          target="_blank"
                          className="inline-flex items-center justify-center gap-2 rounded-[1.05rem] bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-px hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
                        >
                          <ExternalLink className="h-4 w-4" /> Ver ficha
                        </a>
                        <button
                          onClick={() => toggleChip(chip.id, chip.status)}
                          className={`inline-flex items-center justify-center gap-2 rounded-[1.05rem] px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none ${
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
                  </div>

                  {/* Accessories linked to this chip */}
                  {chip.orderItems && chip.orderItems.length > 0 && (
                    <div className="w-full border-t border-slate-200 pt-5">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center md:text-left">Accesorios vinculados</p>
                      <div className="space-y-2">
                        {chip.orderItems.map((acc) => {
                          const orderStatusLabel = acc.order.orderStatus === "completed" ? "Pedido entregado" :
                            acc.order.orderStatus === "shipped" ? "Pedido enviado" :
                            acc.order.orderStatus === "processing" ? "Preparando pedido" :
                            acc.order.orderStatus === "pending" ? "Pago pendiente" :
                            acc.order.orderStatus;
                          return (
                            <div key={acc.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-950">{acc.productType}</p>
                                <p className="text-[10px] text-slate-500">
                                  x{acc.quantity} · ${acc.totalPrice.toFixed(2)}
                                  {acc.order.orderNumber && <span className="ml-1">· #{acc.order.orderNumber}</span>}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                                acc.order.orderStatus === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                acc.order.orderStatus === "shipped" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                acc.order.orderStatus === "processing" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
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
                    <div className="w-full border-t border-slate-200 pt-5">
                      <p className="text-center text-[10px] italic text-slate-400 md:text-left">Aún no tienes accesorios vinculados a este chip.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-2xl animate-in zoom-in-95 duration-500">
           <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.24)] md:p-10">
              <div className="absolute top-0 right-0 p-16 opacity-[0.04] pointer-events-none">
                 <Shield className="h-64 w-64 text-primary" />
              </div>

              {activationSuccess ? (
                <div className="relative z-10 py-8 text-center animate-in slide-in-from-bottom-8 duration-700">
                   <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-50 text-emerald-600 shadow-[0_16px_34px_-24px_rgba(16,185,129,0.3)]">
                      <ShieldCheck className="h-16 w-16" />
                   </div>
                   <h4 className="mb-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">¡Activación exitosa!</h4>
                   <p className="mb-10 px-2 text-base font-medium leading-7 text-slate-600 md:text-lg">Tu nuevo dispositivo ha sido vinculado correctamente y ya protege tu cuenta.</p>
                   <button 
                    onClick={() => setActiveTab("list")}
                    className="w-full rounded-[1.15rem] bg-primary py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_34px_-18px_rgba(218,26,33,0.32)] transition-all hover:-translate-y-px hover:bg-[#B9141B] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                   >
                     Ver Mis Dispositivos
                   </button>
                </div>
              ) : (
                <form onSubmit={handleActivate} className="relative z-10 space-y-8">
                  <div className="space-y-3">
                     <h3 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Vincular chip</h3>
                     <p className="max-w-xl text-sm font-medium leading-7 text-slate-600">Ingresa el código que se encuentra en el empaque de tu producto para activar la protección.</p>
                  </div>

                  {activationError && (
                    <div className="flex items-center justify-center gap-3 rounded-[1.25rem] border border-red-100 bg-red-50 p-4 text-xs font-black uppercase tracking-widest text-red-600">
                      <Activity className="h-5 w-5" /> {activationError}
                    </div>
                  )}

                  {/* Profile selector for activation */}
                  {profiles.length > 1 && (
                    <div className="space-y-3">
                      <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Selecciona a quién protegerá este chip</label>
                      <select
                        value={activationProfileId}
                        onChange={(e) => setActivationProfileId(e.target.value)}
                        className="w-full cursor-pointer appearance-none rounded-[1.2rem] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition-all focus:border-primary/20 focus:outline-none focus:ring-4 focus:ring-[#DA1A21]/10 hover:border-slate-300"
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
                    <div className="rounded-[1.2rem] border border-primary/10 bg-primary/5 p-4 text-center">
                      <p className="text-[11px] font-bold text-primary">
                        Protegiendo a: {profiles[0].firstName} {profiles[0].lastName}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Código de activación (12 dígitos)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="XXXX-XXXX-XXXX"
                      value={activationCode}
                      maxLength={14}
                      onChange={e => setActivationCode(e.target.value.toUpperCase())}
                      className="w-full rounded-[1.35rem] border border-slate-200 bg-slate-50 px-5 py-5 text-center font-mono text-2xl font-black tracking-[0.28em] text-slate-950 transition-all placeholder:text-slate-300 focus:border-primary/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DA1A21]/10 md:px-6 md:py-6 md:text-3xl"
                    />
                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                       <Zap className="h-4 w-4" />
                       <p className="text-[11px] font-bold uppercase tracking-widest">Activación instantánea NFC</p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={activating || !activationCode || !activationProfileId}
                    className="flex w-full items-center justify-center gap-4 rounded-[1.35rem] bg-primary py-5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_34px_-18px_rgba(218,26,33,0.32)] transition-all hover:-translate-y-px hover:bg-[#B9141B] active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {activating ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                    {activating ? "Validando..." : "Confirmar protección"}
                  </button>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "slate" | "blue" }) {
  const toneClasses = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  } as const;

  return (
    <div className={`rounded-[1.1rem] border px-3 py-3 text-center shadow-[0_12px_26px_-22px_rgba(15,23,42,0.16)] ${toneClasses[tone]}`}>
      <p className="text-xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em]">{label}</p>
    </div>
  );
}
