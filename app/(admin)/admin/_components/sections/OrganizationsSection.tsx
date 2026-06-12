"use client";

import { Building2, Loader2, Plus, Trash2, Briefcase } from "lucide-react";
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

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

export function OrganizationsSection({
  organizations,
  loading,
  setShowOrgModal,
  loadOrgDetail,
  setAccountFilter,
  setTab,
  handleDeleteOrg
}: OrganizationsSectionProps) {
  const filtered = organizations;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-border shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Briefcase className="h-7 w-7 text-primary" />
              Entidades Corporativas
           </h2>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de cuentas multicuenta y membresías</p>
        </div>
        
        <button 
          onClick={() => setShowOrgModal(true)} 
          className="flex items-center gap-3 px-6 py-3.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-slate-200/50"
        >
          <Plus className="h-4 w-4" /> Nueva Empresa
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="text-xs font-black uppercase tracking-widest opacity-40">Orquestando datos corporativos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((org: OrganizationAdmin) => (
            <div 
              key={org.id} 
              onClick={() => loadOrgDetail(org.id)}
              className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border shadow-lg hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6 bg-primary/10 text-primary shadow-primary/10`}>
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-black text-lg text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{org.legalName}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registrada el {formatDate(org.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                   <div className="px-4 text-[10px] font-black uppercase tracking-widest text-primary break-all">
                      Código: {org.companyCode || "(pendiente)"}
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500">Miembros</span>
                      <span className="text-lg font-black">{org._count?.members || 0}</span>
                   </div>
                   <div className="px-4 text-[11px] font-medium text-slate-500 truncate">
                      Estado: {org.status || "active"}
                   </div>
                   <div className="px-4 text-[11px] font-medium text-slate-500 truncate">
                      {org.contactEmail || "Sin email de contacto"}
                   </div>
                </div>

                <div className="mt-auto flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountFilter(org.accountId as string);
                      setTab("chips");
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    Ver Chips
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrg(org.id, org.legalName);
                    }}
                    className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="lg:col-span-3 py-20 text-center flex flex-col items-center gap-4">
              <div className="p-8 rounded-full bg-slate-50 dark:bg-slate-800">
                 <Building2 className="h-12 w-12 opacity-5" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">No hay empresas registradas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
