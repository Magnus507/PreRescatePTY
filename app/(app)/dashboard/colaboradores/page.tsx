"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Users, Loader2, Search, XCircle, CheckCircle2, Ban, Info, ClipboardList, History, Package, FileText, Smartphone, Truck, Shield, Lock } from "lucide-react";

type TabFilter = "todos" | "pending_company_review" | "paid_active" | "approved_unpaid" | "suspended" | "archived" | "rejected_by_company" | "empleados";

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
  const [detailTab, setDetailTab] = useState<"info" | "program" | "history" | "kit">("info");

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
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedMember(null);
  };

  const handleAction = async (memberId: string, action: "suspend" | "unsuspend" | "archive" | "restore" | "reject" | "delete_forever" | "approve") => {
    const confirmMessages: Record<string, string> = {
      approve: "¿Aprobar a este solicitante? Pasará a 'Aprobado sin pagar' para que pueda completar su compra corporativa.",
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
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]" onClick={closeDetail} />
        <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[90] overflow-y-auto">
          <div className="p-6 md:p-8 space-y-6">
            {/* Header del drawer */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">{selectedMember.profile?.firstName} {selectedMember.profile?.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedMember.profile?.user?.email}</p>
                </div>
              </div>
              <button onClick={closeDetail} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* ════════════════════════════════════════════ */}
            {/* CENTRO DE ACCIONES DEL COLABORADOR          */}
            {/* ════════════════════════════════════════════ */}
            <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Centro de Acciones</h3>
                  <p className="text-[10px] text-muted-foreground">Operaciones sobre el colaborador</p>
                </div>
              </div>

              {/* Botones según estado */}
              <div className="flex flex-wrap gap-2 mb-4">
                {actingOn === selectedMember.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <>
                    {/* PENDIENTE */}
                    {selectedMember.corporateStatus === "pending_company_review" && (
                      <>
                        <button
                          onClick={() => handleAction(selectedMember.id, "approve")}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleAction(selectedMember.id, "reject")}
                          className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm inline-flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </button>
                      </>
                    )}

                    {/* APROBADO O ACTIVO */}
                    {(selectedMember.corporateStatus === "approved_unpaid" || selectedMember.corporateStatus === "paid_active") && (
                      <button
                        onClick={() => handleAction(selectedMember.id, "suspend")}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm inline-flex items-center gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Suspender
                      </button>
                    )}

                    {/* SUSPENDIDO */}
                    {selectedMember.corporateStatus === "suspended" && (
                      <button
                        onClick={() => handleAction(selectedMember.id, "unsuspend")}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Reactivar
                      </button>
                    )}

                    {/* ARCHIVADO */}
                    {selectedMember.corporateStatus === "archived" && (
                      <button
                        onClick={() => handleAction(selectedMember.id, "restore")}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Restaurar
                      </button>
                    )}

                    {/* RECHAZADO */}
                    {selectedMember.corporateStatus === "rejected_by_company" && (
                      <button
                        onClick={() => handleAction(selectedMember.id, "restore")}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Restaurar
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Información operativa */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Estado</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_INFO[selectedMember.corporateStatus]?.bg || ""} ${STATUS_INFO[selectedMember.corporateStatus]?.color || ""}`}>
                    {STATUS_INFO[selectedMember.corporateStatus]?.label || selectedMember.corporateStatus}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Solicitud</p>
                  <p className="text-xs font-semibold mt-1">
                    {new Date((selectedMember as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Actualización</p>
                  <p className="text-xs font-semibold mt-1">
                    {new Date((selectedMember as unknown as { updatedAt: string }).updatedAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════ */}
            {/* PRÓXIMAMENTE — ACCIONES FUTURAS             */}
            {/* ════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4 text-slate-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Próximamente</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Ver Kit
                  <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
                </button>
                <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Solicitudes
                  <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
                </button>
                <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Registrar Entrega
                  <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
                </button>
                <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  Reasignar Chip
                  <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
                </button>
                <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5 col-span-2">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Descargar Expediente
                  <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
                </button>
              </div>
            </div>

            {/* Tabs del drawer */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setDetailTab("info")}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  detailTab === "info"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-slate-700"
                }`}
              >
                <Info className="h-4 w-4 inline mr-2" />
                Información
              </button>
              <button
                onClick={() => setDetailTab("program")}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  detailTab === "program"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-slate-700"
                }`}
              >
                <ClipboardList className="h-4 w-4 inline mr-2" />
                Programa
              </button>
              <button
                onClick={() => setDetailTab("history")}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  detailTab === "history"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-slate-700"
                }`}
              >
                <History className="h-4 w-4 inline mr-2" />
                Historial
              </button>
              <button
                onClick={() => setDetailTab("kit")}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  detailTab === "kit"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-slate-700"
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Kit Empresarial
              </button>
            </div>

            {/* Contenido de las tabs */}
            <div className="space-y-4">
              {detailTab === "info" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Datos personales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">NOMBRE COMPLETO</p>
                      <p className="text-sm font-semibold">{selectedMember.profile?.firstName} {selectedMember.profile?.lastName}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CORREO ELECTRÓNICO</p>
                      <p className="text-sm font-semibold">{selectedMember.profile?.user?.email || "—"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TELÉFONO</p>
                      <p className="text-sm font-semibold">{selectedMember.employeePhone || "—"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CÉDULA</p>
                      <p className="text-sm font-semibold">{selectedMember.employeeNationalId || "—"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CARGO</p>
                      <p className="text-sm font-semibold">{selectedMember.employeePosition || "—"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">DEPARTAMENTO</p>
                      <p className="text-sm font-semibold">{selectedMember.employeeDepartment || "—"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">FECHA DE SOLICITUD</p>
                      <p className="text-sm font-semibold">
                        {new Date((selectedMember as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ESTADO ACTUAL</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${STATUS_INFO[selectedMember.corporateStatus]?.bg || ""} ${STATUS_INFO[selectedMember.corporateStatus]?.color || ""}`}>
                        {STATUS_INFO[selectedMember.corporateStatus]?.label || selectedMember.corporateStatus}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "program" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Estado en el programa</h3>
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedMember.corporateStatus === "paid_active" ? "bg-emerald-100 text-emerald-600" :
                        selectedMember.corporateStatus === "pending_company_review" ? "bg-blue-100 text-blue-600" :
                        selectedMember.corporateStatus === "suspended" ? "bg-red-100 text-red-600" :
                        selectedMember.corporateStatus === "rejected_by_company" ? "bg-rose-100 text-rose-600" :
                        "bg-slate-200 text-slate-600"
                      }`}>
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-lg mb-2">{STATUS_INFO[selectedMember.corporateStatus]?.label || selectedMember.corporateStatus}</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedMember.corporateStatus === "pending_company_review" && "Esperando aprobación de la empresa. Una vez aprobado, podrá completar su compra corporativa."}
                          {selectedMember.corporateStatus === "approved_unpaid" && "Aprobado por la empresa. Puede completar su compra corporativa para activar sus beneficios."}
                          {selectedMember.corporateStatus === "paid_active" && "Puede utilizar todos los beneficios del programa PreRescue."}
                          {selectedMember.corporateStatus === "suspended" && "Acceso pausado temporalmente. Contacta al administrador para más información."}
                          {selectedMember.corporateStatus === "rejected_by_company" && "Solicitud no aprobada por la empresa. Contacta al administrador si tienes preguntas."}
                          {selectedMember.corporateStatus === "archived" && "Colaborador eliminado del sistema. Sus beneficios corporativos han sido desactivados."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "history" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Historial de eventos</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold">Solicitud enviada</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date((selectedMember as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <History className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold">Última actualización</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date((selectedMember as unknown as { updatedAt: string }).updatedAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <p className="text-xs text-amber-800 font-semibold">
                        El historial avanzado estará disponible próximamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "kit" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Kit Empresarial</h3>

                  {/* Estado del kit */}
                  <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-lg mb-1">Estado del Kit</h4>
                        <p className="text-sm text-muted-foreground">
                          Esta funcionalidad estará disponible en las próximas fases del Kit Empresarial.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Package className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Productos</h4>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">No disponibles todavía</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Los productos asignados aparecerán aquí cuando el módulo esté completo.
                      </p>
                    </div>
                  </div>

                  {/* Chip */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Chip</h4>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">No disponible todavía</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        El chip empresarial y su información de activación se mostrarán aquí.
                      </p>
                    </div>
                  </div>

                  {/* Pedido asociado */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Pedido asociado</h4>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">No disponible todavía</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        El número de orden y detalles de la compra corporativa se integrarán próximamente.
                      </p>
                    </div>
                  </div>

                  {/* Solicitudes */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                        <FileText className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Solicitudes</h4>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">No disponibles todavía</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Las solicitudes de productos realizadas por el empleado se listarán aquí.
                      </p>
                    </div>
                  </div>

                  {/* Activaciones */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                        <Truck className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Activaciones</h4>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">No disponibles todavía</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        El historial de activaciones y fechas se integrará en futuras fases.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )}
    </div>
  );
}
