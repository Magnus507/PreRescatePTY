"use client";

import { useState, useMemo } from "react";
import { Building2, Loader2, Plus, Trash2, Briefcase, Copy, Check, Search, AlertTriangle, ShieldCheck, BarChart3 } from "lucide-react";
import { AdminTab } from "../../_hooks/useAdminManager";

interface OrganizationAdmin {
  id: string;
  legalName: string;
  companyCode?: string | null;
  contactEmail: string | null;
  organizationType: string;
  status?: string;
  createdAt: string;
  _count: { members: number };
  accountId: string;
  account?: {
    packageId: string | null;
    maxChipsAllocated: number;
    package?: { name: string } | null;
    chips?: { id: string; status?: string; shortCode?: string }[];
    users?: { id: string; status?: string }[];
  };
}

interface OrganizationsSectionProps {
  organizations: OrganizationAdmin[];
  loading: boolean;
  setShowOrgModal: (val: boolean) => void;
  loadOrgDetail: (id: string) => void;
  setAccountFilter: (val: string | null) => void;
  setTab: (val: AdminTab) => void;
  handleDeleteOrg: (id: string, name: string) => void;
}

type HealthStatus = "saludable" | "atencion" | "critico" | "sin_datos";

function getHealthStatus(org: OrganizationAdmin): HealthStatus {
  if (!org.status || org.status === "suspended" || org.status === "inactive") return "critico";

  const chips = org.account?.chips || [];
  const activatedChips = chips.filter((c) => c.status === "activated").length;
  const totalMembers = org._count?.members || 0;

  if (totalMembers === 0 && chips.length === 0) return "sin_datos";

  // Crítico: sin miembros activos o sin chips
  if (totalMembers === 0) return "critico";

  // Atención: tiene pendientes (miembros sin chips activados)
  if (chips.length > 0 && activatedChips === 0) return "atencion";

  // Atención: adopción baja (< 30%)
  if (chips.length > 0 && totalMembers > 0) {
    const adoptionRate = activatedChips / totalMembers;
    if (adoptionRate < 0.3) return "atencion";
  }

  return "saludable";
}

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  saludable: {
    label: "Saludable",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  atencion: {
    label: "Atención",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  critico: {
    label: "Crítico",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  sin_datos: {
    label: "Sin datos",
    color: "text-slate-400",
    bg: "bg-slate-50 border-slate-200",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
  },
};

export function OrganizationsSection({
  organizations,
  loading,
  setShowOrgModal,
  loadOrgDetail,
  setAccountFilter,
  setTab,
  handleDeleteOrg
}: OrganizationsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ─── KPI Calculations ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter((o) => o.status === "active" || !o.status).length;
    const totalMembers = organizations.reduce((sum, o) => sum + (o._count?.members || 0), 0);

    // Chips from account data
    const allChips = organizations.flatMap((o) => o.account?.chips || []);
    const assignedChips = allChips.length;
    const activatedChips = allChips.filter((c) => c.status === "activated").length;

    // Active members: not directly available from list payload, show 0
    // Pending requests: not available from list payload, show 0

    // Adoption rate: activated chips / total members (safe formula)
    const adoptionRate = totalMembers > 0 ? (activatedChips / totalMembers) * 100 : 0;

    return {
      totalOrgs,
      activeOrgs,
      totalMembers,
      assignedChips,
      activatedChips,
      adoptionRate: totalMembers > 0 ? adoptionRate : null,
    };
  }, [organizations]);

  // ─── Search Filter ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter((org) => {
      const name = (org.legalName || "").toLowerCase();
      const code = (org.companyCode || "").toLowerCase();
      const email = (org.contactEmail || "").toLowerCase();
      const status = (org.status || "").toLowerCase();
      return name.includes(q) || code.includes(q) || email.includes(q) || status.includes(q);
    });
  }, [organizations, searchQuery]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-border shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-primary" />
            Cuentas Corporativas
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Centro de adopción, empleados, chips y solicitudes
          </p>
        </div>

        <button
          onClick={() => setShowOrgModal(true)}
          className="flex items-center gap-3 px-6 py-3.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-slate-200/50"
        >
          <Plus className="h-4 w-4" /> Nueva Empresa
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empresas activas</p>
          <p className="text-2xl font-black">{kpis.activeOrgs}<span className="text-xs font-bold text-muted-foreground ml-1">/ {kpis.totalOrgs}</span></p>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Miembros registrados</p>
          <p className="text-2xl font-black">{kpis.totalMembers}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Miembros activos</p>
          <p className="text-2xl font-black text-muted-foreground/50">—</p>
          <p className="text-[8px] text-muted-foreground/40">No disponible en listado</p>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chips asignados</p>
          <p className="text-2xl font-black">{kpis.assignedChips}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chips activados</p>
          <p className="text-2xl font-black">{kpis.activatedChips}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Solicitudes pendientes</p>
          <p className="text-2xl font-black text-muted-foreground/50">—</p>
          <p className="text-[8px] text-muted-foreground/40">No disponible en listado</p>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Adopción global</p>
          <p className="text-2xl font-black text-primary">
            {kpis.adoptionRate !== null ? `${kpis.adoptionRate.toFixed(1)}%` : "—"}
          </p>
          <p className="text-[8px] text-muted-foreground/40">
            {kpis.adoptionRate !== null ? "Activados / Miembros" : "Sin datos suficientes"}
          </p>
        </div>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, código, email o estado..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest opacity-40">Orquestando datos corporativos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
          <div className="p-8 rounded-full bg-slate-50 dark:bg-slate-800">
            <Building2 className="h-12 w-12 opacity-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
            {searchQuery ? "Sin resultados para tu búsqueda." : "No hay empresas registradas."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2.5rem] border border-border shadow-sm bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empresa</th>
                <th className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código</th>
                <th className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Miembros</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activos</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pendientes</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chips</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activados</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Solicitudes</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adopción</th>
                <th className="text-center px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salud</th>
                <th className="text-right px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((org) => {
                const chips = org.account?.chips || [];
                const assignedChips = chips.length;
                const activatedChips = chips.filter((c) => c.status === "activated").length;
                const totalMembers = org._count?.members || 0;
                const adoption = totalMembers > 0 ? (activatedChips / totalMembers) * 100 : 0;
                const health = getHealthStatus(org);
                const healthCfg = HEALTH_CONFIG[health];
                const isActive = org.status === "active" || !org.status;

                return (
                  <tr
                    key={org.id}
                    onClick={() => loadOrgDetail(org.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    {/* Empresa */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{org.legalName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{org.contactEmail || "Sin email"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Código */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold tracking-wider text-primary">
                          {org.companyCode || "—"}
                        </span>
                        {org.companyCode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyCode(org.companyCode!); }}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                            title="Copiar código"
                          >
                            {copiedCode === org.companyCode ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : org.status === "suspended"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isActive ? "bg-emerald-500" : org.status === "suspended" ? "bg-rose-500" : "bg-amber-500"
                        }`} />
                        {isActive ? "Activa" : org.status || "active"}
                      </span>
                    </td>

                    {/* Miembros */}
                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-lg">{totalMembers}</span>
                    </td>

                    {/* Activos */}
                    <td className="px-5 py-4 text-center">
                      <span className="text-muted-foreground/50 text-lg font-bold">—</span>
                    </td>

                    {/* Pendientes */}
                    <td className="px-5 py-4 text-center">
                      <span className="text-muted-foreground/50 text-lg font-bold">—</span>
                    </td>

                    {/* Chips */}
                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-lg">{assignedChips}</span>
                    </td>

                    {/* Activados */}
                    <td className="px-5 py-4 text-center">
                      <span className={`font-bold text-lg ${activatedChips > 0 ? "text-emerald-600" : "text-muted-foreground/50"}`}>
                        {activatedChips}
                      </span>
                    </td>

                    {/* Solicitudes */}
                    <td className="px-5 py-4 text-center">
                      <span className="text-muted-foreground/50 text-lg font-bold">—</span>
                    </td>

                    {/* Adopción */}
                    <td className="px-5 py-4 text-center">
                      {totalMembers > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-bold text-sm ${
                            adoption >= 50 ? "text-emerald-600" : adoption >= 20 ? "text-amber-600" : "text-rose-500"
                          }`}>
                            {adoption.toFixed(0)}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                adoption >= 50 ? "bg-emerald-500" : adoption >= 20 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(adoption, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm font-bold">—</span>
                      )}
                    </td>

                    {/* Salud */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${healthCfg.bg} ${healthCfg.color}`}>
                        {healthCfg.icon}
                        {healthCfg.label}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); loadOrgDetail(org.id); }}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAccountFilter(org.accountId);
                            setTab("chips");
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                        >
                          Chips
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id, org.legalName); }}
                          className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          title="Dar de baja"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}