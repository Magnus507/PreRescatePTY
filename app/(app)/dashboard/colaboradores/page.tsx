"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Users, Loader2, Search, XCircle, CheckCircle2, Ban, Info } from "lucide-react";
import CollaboratorDrawer from "@/components/enterprise/collaborators/CollaboratorDrawer";
import type { DetailTab } from "@/components/enterprise/collaborators/types";

type TabFilter = "todos" | "pending_company_review" | "paid_active" | "approved_unpaid" | "suspended" | "archived" | "rejected_by_company" | "empleados";

type ChipInfo = {
  id: string;
  shortCode: string;
  serialPublic: string;
  status: string;
  activatedAt: string | null;
};

type OrderInfo = {
  id: string;
  orderNumber: string;
  amount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
};

type ProductInfo = {
  id: string;
  name: string;
  productType: string;
  image: string | null;
};

type CorporateOrderItem = {
  id: string;
  fulfillmentStatus: string;
  activatedAt: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  product: ProductInfo;
  chip: ChipInfo | null;
  order: OrderInfo;
};

type RequestItem = {
  quantity: number;
  product: { id: string; name: string; productType: string };
};

type ProductRequest = {
  id: string;
  status: string;
  createdAt: string;
  items: RequestItem[];
};

type CorporateProfile = {
  id: string;
  firstName: string;
  lastName: string;
  bloodType: string;
  phone: string | null;
  profileType: string;
};

type Member = {
  id: string;
  corporateStatus: string;
  employeeNationalId: string | null;
  employeeAge: number | null;
  employeePhone: string | null;
  employeePosition: string | null;
  employeeDepartment: string | null;
  employeeInternalId: string | null;
  profile: {
    firstName: string;
    lastName: string;
    user: { email: string } | null;
  } | null;
};

type CorporateKitData = {
  memberId: string;
  corporateProfile: CorporateProfile | null;
  corporateOrderItems: CorporateOrderItem[];
  productRequests: ProductRequest[];
};

  const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  paid_active: { label: "Activo", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  approved_unpaid: { label: "Aprobado", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  pending_company_review: { label: "Pendiente", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  rejected_by_company: { label: "Rechazado", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  suspended: { label: "Suspendido", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  archived: { label: "Eliminado / Archivado", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

const TABS: { key: TabFilter; label: string; description: string }[] = [
  { key: "pending_company_review", label: "Solicitantes", description: "Personas que ingresaron el código empresarial y esperan aprobación" },
  { key: "empleados", label: "Empleados", description: "Personas aprobadas o activas dentro del programa empresarial" },
  { key: "suspended", label: "Suspendidos", description: "Colaboradores con acceso temporal suspendido" },
  { key: "archived", label: "Archivados", description: "Colaboradores eliminados del sistema" },
  { key: "rejected_by_company", label: "Rechazados", description: "Solicitudes rechazadas por la empresa" },
];

const KpiCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`rounded-xl border p-3 text-center ${color}`}>
    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

export default function ColaboradoresPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>("pending_company_review");
  const [search, setSearch] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [kitData, setKitData] = useState<CorporateKitData | null>(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);
  const [kitCache, setKitCache] = useState<Record<string, CorporateKitData>>({});
  const kitCacheRef = useRef(kitCache);
  useEffect(() => {
    kitCacheRef.current = kitCache;
  }, [kitCache]);

  // KPIs calculados desde los miembros cargados
  const kpis = useMemo(() => {
    const total = members.length;
    const pendientes = members.filter(m => m.corporateStatus === "pending_company_review").length;
    const aprobados = members.filter(m => m.corporateStatus === "approved_unpaid").length;
    const activos = members.filter(m => m.corporateStatus === "paid_active").length;
    const suspendidos = members.filter(m => m.corporateStatus === "suspended").length;
    const rechazados = members.filter(m => m.corporateStatus === "rejected_by_company").length;
    const archivados = members.filter(m => m.corporateStatus === "archived").length;

    // Fórmula de salud: % de empleados activos vs total de no-archivados
    const noArchivados = total - archivados;
    const salud = noArchivados > 0 ? Math.round((activos / noArchivados) * 100) : 0;

    return { total, pendientes, aprobados, activos, suspendidos, rechazados, archivados, salud };
  }, [members]);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers(statusFilter?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "empleados") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/organizations/members?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleTabChange = async (tab: TabFilter) => {
    setActiveTab(tab);
    if (tab === "empleados") {
      // Empleados = approved_unpaid + paid_active
      await loadMembers("empleados");
    } else if (tab === "todos") {
      await loadMembers();
    } else {
      await loadMembers(tab);
    }
  };

  const openDetail = (member: Member) => {
    setSelectedMember(member);
    setShowDetail(true);
    setDetailTab("info");
    setKitData(null);
    setKitError(null);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedMember(null);
    setKitData(null);
    setKitError(null);
  };

  const loadKitData = useCallback(async (memberId: string) => {
    if (kitCacheRef.current[memberId]) {
      setKitData(kitCacheRef.current[memberId]);
      return;
    }

    setKitLoading(true);
    setKitError(null);
    try {
      const res = await fetch(`/api/organizations/members/${memberId}/kit`);
      if (res.ok) {
        const data = await res.json();
        setKitData(data);
        setKitCache(prev => ({ ...prev, [memberId]: data }));
      } else {
        const json = await res.json();
        setKitError(json.error || "Error al cargar el kit");
      }
    } catch (err) {
      console.error(err);
      setKitError("Error de conexión");
    } finally {
      setKitLoading(false);
    }
  }, [setKitData, setKitLoading, setKitError, setKitCache]);

  useEffect(() => {
    if (showDetail && (detailTab === "kit" || detailTab === "requests") && selectedMember) {
      loadKitData(selectedMember.id);
    }
  }, [showDetail, detailTab, selectedMember, loadKitData]);

  const handleAction = async (memberId: string, action: "suspend" | "unsuspend" | "archive" | "restore" | "reject" | "delete_forever" | "approve") => {
    const confirmMessages: Record<string, string> = {
      approve: "¿Aprobar a este solicitante? Pasará a 'Aprobado pendiente' para que pueda completar su compra corporativa.",
      suspend: "¿Seguro que deseas suspender a este colaborador? Su vínculo corporativo quedará suspendido, pero su cuenta personal no se verá afectada.",
      unsuspend: "¿Reactivar este colaborador? Volverá al estado activo con beneficios.",
      archive: "¿Seguro que deseas eliminar/despedir a este colaborador de la empresa? Se desactivarán sus beneficios corporativos, perfil empresarial y chip corporativo de esta empresa. Su cuenta personal y otros beneficios no serán afectados.",
      restore: "¿Restaurar este colaborador? Volverá al estado activo. Su cuenta personal no se verá afectada.",
      reject: "¿Seguro que deseas rechazar este colaborador? Esto solo afecta el vínculo corporativo. La cuenta personal del usuario no será afectada.",
      delete_forever: "¿Eliminar definitivamente este colaborador? Se eliminará el vínculo empresarial y los datos corporativos de esta empresa. No se eliminará la cuenta personal del usuario. Esta acción no se puede deshacer.",
    };

    if (!confirm(confirmMessages[action])) return;

    setActingOn(memberId);
    try {
      const res = await fetch(`/api/organizations/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo realizar la acción");
      toast.success(json.message || "Acción completada");
      // Reload current tab
      await handleTabChange(activeTab);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de conexión";
      toast.error(message);
    } finally {
      setActingOn(null);
    }
  };

  // Filter by search (name, email, cédula, teléfono, cargo, departamento)
  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.profile?.firstName?.toLowerCase().includes(q) ||
      m.profile?.lastName?.toLowerCase().includes(q) ||
      m.profile?.user?.email?.toLowerCase().includes(q) ||
      m.employeeNationalId?.toLowerCase().includes(q) ||
      m.employeePhone?.toLowerCase().includes(q) ||
      m.employeePosition?.toLowerCase().includes(q) ||
      m.employeeDepartment?.toLowerCase().includes(q)
    );
  });

  if (loading && members.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">Gestiona el vínculo corporativo de tus empleados</p>
        </div>
      </div>

      {/* Dashboard Ejecutivo — KPIs */}
      <div className="rounded-[2rem] border-2 border-slate-200 bg-white p-5 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Panel Ejecutivo</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Resumen del programa empresarial</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            kpis.salud >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            kpis.salud >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-red-50 text-red-700 border-red-200"
          }`}>
            Salud: {kpis.salud}%
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <KpiCard label="Total" value={kpis.total} color="bg-slate-100 text-slate-700 border-slate-200" />
          <KpiCard label="Solicitantes" value={kpis.pendientes} color="bg-amber-50 text-amber-700 border-amber-200" />
          <KpiCard label="Aprobados" value={kpis.aprobados} color="bg-blue-50 text-blue-700 border-blue-200" />
          <KpiCard label="Activos" value={kpis.activos} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
          <KpiCard label="Suspendidos" value={kpis.suspendidos} color="bg-red-50 text-red-700 border-red-200" />
          <KpiCard label="Rechazados" value={kpis.rechazados} color="bg-rose-50 text-rose-700 border-rose-200" />
          <KpiCard label="Archivados" value={kpis.archivados} color="bg-slate-50 text-slate-600 border-slate-200" />
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          Salud del programa = % de empleados activos sobre el total de colaboradores no archivados.
        </p>
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleTabChange("pending_company_review")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "pending_company_review"
              ? "bg-amber-500 text-white shadow-md"
              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          }`}
        >
          Ver solicitantes
        </button>
        <button
          onClick={() => handleTabChange("empleados")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "empleados"
              ? "bg-emerald-500 text-white shadow-md"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          Ver empleados
        </button>
        <button
          onClick={() => handleTabChange("suspended")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "suspended"
              ? "bg-red-500 text-white shadow-md"
              : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          }`}
        >
          Ver suspendidos
        </button>
        <button
          onClick={() => handleTabChange("rejected_by_company")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "rejected_by_company"
              ? "bg-rose-500 text-white shadow-md"
              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
          }`}
        >
          Ver rechazados
        </button>
      </div>

      {/* Tabs */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted hover:bg-slate-200 text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(() => {
          const currentTab = TABS.find(t => t.key === activeTab);
          return currentTab?.description ? (
            <p className="text-xs text-muted-foreground px-1">{currentTab.description}</p>
          ) : null;
        })()}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, email, cédula, cargo o departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground bg-slate-50/50">
            <p className="font-semibold">No hay colaboradores en esta pestaña</p>
            <p className="text-xs mt-1">Cambia de pestaña o ajusta el filtro de búsqueda.</p>
          </div>
        ) : (
          filtered.map((m) => {
            const status = STATUS_INFO[m.corporateStatus] || STATUS_INFO.pending_company_review;
            return (
              <div key={m.id} className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 cursor-pointer" onClick={() => openDetail(m)}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{m.profile?.firstName} {m.profile?.lastName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.profile?.user?.email}</p>
                    <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      {m.employeeNationalId && <span>Cédula: {m.employeeNationalId}</span>}
                      {m.employeePhone && <span>Tel: {m.employeePhone}</span>}
                      {m.employeePosition && <span>Cargo: {m.employeePosition}</span>}
                      {m.employeeDepartment && <span>Depto: {m.employeeDepartment}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Solicitado: {new Date((m as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openDetail(m)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                      title="Ver ficha 360"
                    >
                      <Info className="h-3.5 w-3.5" /> Ver
                    </button>
                    {actingOn === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <>
                        {m.corporateStatus === "pending_company_review" && (
                          <>
                            <button
                              onClick={() => handleAction(m.id, "approve")}
                              className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                            </button>
                            <button
                              onClick={() => handleAction(m.id, "reject")}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Rechazar
                            </button>
                          </>
                        )}
                        {(m.corporateStatus === "paid_active" || m.corporateStatus === "approved_unpaid") && (
                          <>
                            {m.corporateStatus === "approved_unpaid" && (
                              <button
                                onClick={() => handleAction(m.id, "reject")}
                                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Rechazar
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(m.id, "suspend")}
                              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                            >
                              <Ban className="h-3.5 w-3.5" /> Suspender
                            </button>
                          </>
                        )}
                        {m.corporateStatus === "suspended" && (
                          <button
                            onClick={() => handleAction(m.id, "unsuspend")}
                            className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Reactivar
                          </button>
                        )}
                        {m.corporateStatus === "rejected_by_company" && (
                          <button
                            onClick={() => handleAction(m.id, "restore")}
                            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Restaurar
                          </button>
                        )}
                        {m.corporateStatus === "archived" && (
                          <>
                            <button
                              onClick={() => handleAction(m.id, "restore")}
                              className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Restaurar
                            </button>
                            <button
                              onClick={() => handleAction(m.id, "delete_forever")}
                              className="px-3 py-1.5 rounded-lg border border-red-700 bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors inline-flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Eliminar definitivo
                            </button>
                          </>
                        )}
                        {m.corporateStatus !== "archived" && m.corporateStatus !== "rejected_by_company" && (
                          <button
                            onClick={() => handleAction(m.id, "archive")}
                            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors inline-flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* Drawer Colaborador 360 */}
      {showDetail && selectedMember && (
        <CollaboratorDrawer
          member={selectedMember}
          isOpen={showDetail}
          onClose={closeDetail}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          kitData={kitData}
          kitLoading={kitLoading}
          kitError={kitError}
          onRetryKit={() => selectedMember && loadKitData(selectedMember.id)}
          statusInfo={STATUS_INFO}
          actingOn={actingOn}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
