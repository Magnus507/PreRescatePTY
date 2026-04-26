"use client";

import { Cpu, Eye, Loader2, Search, Trash2 } from "lucide-react";

interface ChipAdmin {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: string;
  serviceStatus: string;
  serviceEndDate: string | null;
  serviceStartDate: string | null;
  activatedAt: string | null;
  lastScanAt: string | null;
  ownerUserId: string | null;
  nfcUrl: string;
  qrUrl: string;
  batchId: string | null;
  productType: string;
  nicheType: string;
  createdAt: string;
  owner?: { email: string } | null; // Cambiado a opcional
  assignedProfile?: { firstName: string; lastName: string; phone?: string | null } | null;
  account?: {
    organizations: {
      legalName: string;
    }[];
  } | null;
  claimTokens?: { activationCode: string; usedAt: string | null }[];
  isPhysical: boolean;
  _count: { scanEvents: number };
}

interface ChipsSectionProps {
  chips: ChipAdmin[];
  total: number;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  serviceFilter: string;
  setServiceFilter: (val: string) => void;
  accountFilter: string | null;
  setAccountFilter: (val: string | null) => void;
  loadChips: () => void;
  loadChipDetail: (id: string) => void;
  handleDeleteChip: (id: string, serial: string) => void;
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(s: string) {
  switch (s) {
    case "activated": return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
    case "inventory": return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
    case "sold": return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
    case "suspended": return "bg-red-500/10 text-red-600 border border-red-500/20";
    default: return "bg-slate-100 text-slate-400 border border-slate-200";
  }
}

function serviceColor(s: string) {
  switch (s) {
    case "active": return "bg-emerald-500/10 text-emerald-600";
    case "limited": return "bg-orange-500/10 text-orange-600";
    case "suspended": return "bg-red-500/10 text-red-600";
    default: return "bg-slate-100 text-slate-400";
  }
}

export function ChipsSection({
  chips,
  total,
  loading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  serviceFilter,
  setServiceFilter,
  accountFilter,
  setAccountFilter,
  loadChips,
  loadChipDetail,
  handleDeleteChip
}: ChipsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-border shadow-sm">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar por serial, código o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadChips()}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="flex-1 lg:flex-none rounded-xl border-border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-primary/20"
          >
            <option value="">Estado: En Circulación</option>
            <option value="activated">Activado</option>
            <option value="sold">Vendido</option>
            <option value="suspended">Suspendido</option>
            <option value="inventory">Solo Inventario (Stock)</option>
          </select>
          
          <select 
            value={serviceFilter} 
            onChange={(e) => setServiceFilter(e.target.value)} 
            className="flex-1 lg:flex-none rounded-xl border-border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-primary/20"
          >
            <option value="">Vigencia: Todos</option>
            <option value="active">Activo</option>
            <option value="limited">Modo Emergencia</option>
            <option value="suspended">Vencido</option>
          </select>

          {accountFilter && (
            <button
              onClick={() => setAccountFilter(null)}
              className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
            >
              <span>Filtro Empresa ACTIVO</span>
              <span className="opacity-60 bg-white/20 px-1.5 rounded">X</span>
            </button>
          )}

          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 hidden lg:block mx-1" />
          
          <div className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
            Total: {total}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="text-xs font-black uppercase tracking-widest opacity-40">Consultando registros...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Identificadores</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estado / Servicio</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vínculo / Dueño</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Scans</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chips.map((chip: ChipAdmin) => (
                  <tr
                    key={chip.id}
                    onClick={() => loadChipDetail(chip.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[11px] text-slate-400">#{chip.serialPublic}</span>
                        <div className="flex items-center gap-2">
                           <span className="font-black text-slate-900 dark:text-white text-base tracking-tight group-hover:text-primary transition-colors">{chip.shortCode}</span>
                           <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-black tracking-widest opacity-60">
                             {chip.productType === 'sticker_nfc_qr' ? 'NFC+QR' : chip.productType}
                           </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit ${statusColor(chip.status)}`}>
                          {chip.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase w-fit ${serviceColor(chip.serviceStatus)}`}>
                          {chip.serviceStatus || "inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex flex-col gap-1.5">
                          {chip.account?.organizations?.[0] ? (
                            <span className="px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit border border-indigo-500/20">
                              {chip.account.organizations[0].legalName}
                            </span>
                          ) : (
                            chip.owner?.email ? (
                               <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{chip.owner.email}</span>
                            ) : (
                               <span className="text-[10px] font-black text-slate-300 uppercase italic">Sin asignar</span>
                            )
                          )}
                          {chip.assignedProfile && (
                             <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-black text-slate-900 dark:text-slate-200 tracking-tight">{chip.assignedProfile.firstName} {chip.assignedProfile.lastName}</span>
                             </div>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <div className="inline-flex flex-col items-center justify-center h-10 w-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                          <span className="text-sm font-black">{chip._count?.scanEvents || 0}</span>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{chip.serviceEndDate ? formatDate(chip.serviceEndDate) : "—"}</span>
                          {chip.serviceEndDate && (
                             <span className="text-[10px] text-slate-400 font-medium">{new Date(chip.serviceEndDate) < new Date() ? 'Servicio Vencido' : 'Protección Vigente'}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-100 dark:border-indigo-500/20 hover:scale-110 active:scale-95 transition-all shadow-sm">
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChip(chip.id, chip.serialPublic);
                          }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20 hover:scale-110 active:scale-95 transition-all shadow-sm"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {chips.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                 <div className="p-6 rounded-full bg-slate-50 dark:bg-slate-800">
                    <Cpu className="h-10 w-10 opacity-10" />
                 </div>
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">No se encontraron chips con estos filtros.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
