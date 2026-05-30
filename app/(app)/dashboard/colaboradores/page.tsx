"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Loader2, Search, XCircle, CheckCircle2, Ban, Archive, ShieldCheck } from "lucide-react";

type TabFilter = "todos" | "paid_active" | "approved_unpaid" | "suspended" | "archived" | "rejected_by_company";

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
  approved_unpaid: { label: "Aprobado sin pagar", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  pending_company_review: { label: "Pendiente", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  rejected_by_company: { label: "Rechazado", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  suspended: { label: "Suspendido", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  archived: { label: "Eliminado / Archivado", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

const TABS: { key: TabFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "paid_active", label: "Activos" },
  { key: "approved_unpaid", label: "Aprobados sin pagar" },
  { key: "suspended", label: "Suspendidos" },
  { key: "archived", label: "Archivados" },
  { key: "rejected_by_company", label: "Rechazados" },
];

export default function ColaboradoresPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>("todos");
  const [search, setSearch] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers(statusFilter?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
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
    if (tab === "todos") {
      await loadMembers();
    } else {
      await loadMembers(tab);
    }
  };

  const handleAction = async (memberId: string, action: "suspend" | "unsuspend" | "archive" | "restore" | "reject") => {
    const confirmMessages: Record<string, string> = {
      suspend: "¿Seguro que deseas suspender a este colaborador? Su vínculo corporativo quedará suspendido, pero su cuenta personal no se verá afectada.",
      unsuspend: "¿Reactivar este colaborador? Volverá al estado activo con beneficios.",
      archive: "¿Seguro que deseas eliminar/despedir a este colaborador de la empresa? Se desactivarán sus beneficios corporativos, perfil empresarial y chip corporativo de esta empresa. Su cuenta personal y otros beneficios no serán afectados.",
      restore: "¿Restaurar este colaborador? Volverá al estado activo. Su cuenta personal no se verá afectada.",
      reject: "¿Seguro que deseas rechazar este colaborador? Esto solo afecta el vínculo corporativo. La cuenta personal del usuario no será afectada.",
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
    } catch (err: any) {
      toast.error(err?.message || "Error de conexión");
    } finally {
      setActingOn(null);
    }
  };

  // Filter by search
  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.profile?.firstName?.toLowerCase().includes(q) ||
      m.profile?.lastName?.toLowerCase().includes(q) ||
      m.profile?.user?.email?.toLowerCase().includes(q) ||
      m.employeeNationalId?.toLowerCase().includes(q)
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

      {/* Tabs */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o cédula..."
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
                  <div className="space-y-1">
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
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {actingOn === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <>
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
                          <button
                            onClick={() => handleAction(m.id, "restore")}
                            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Restaurar
                          </button>
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
    </div>
  );
}