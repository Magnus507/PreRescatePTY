"use client";

import { useState } from "react";
import { Cpu, Download, Eye, Loader2, Plus, QrCode, ShieldCheck, Zap } from "lucide-react";
import { ChipAdmin } from "../../_types/admin";

interface CreateBatchSectionProps {
  createCount: number;
  setCreateCount: (val: number) => void;
  createBatch: (labelBase?: string, labelStart?: number) => void;
  creating: boolean;
  createdBatch: ChipAdmin[] | null;
  exportCSV: () => void;
  loadChipDetail: (id: string) => void;
}

export function CreateBatchSection({
  createCount,
  setCreateCount,
  createBatch,
  creating,
  createdBatch,
  exportCSV,
  loadChipDetail
}: CreateBatchSectionProps) {
  const [labelBase, setLabelBase] = useState("Caja");
  const [labelStart, setLabelStart] = useState(1);

  const firstPreview = `${labelBase} ${String(labelStart).padStart(5, '0')}`;
  const lastPreview = `${labelBase} ${String(labelStart + Math.max(0, createCount - 1)).padStart(5, '0')}`;
  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Configuration Panel */}
        <div className="md:col-span-2 space-y-8">
          <div className="p-10 rounded-[3rem] border border-border bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/40 dark:shadow-none">
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-8">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            
            <h2 className="text-2xl font-black tracking-tight mb-4 leading-none">Generación de Lote</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
              Crea nuevos activos digitales con identificadores únicos para la fabricación física.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Chips a Producir</label>
                <div className="relative">
                   <input 
                    type="number" 
                    min={1} 
                    max={100} 
                    value={createCount} 
                    onChange={(e) => setCreateCount(Number(e.target.value))} 
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 text-xl font-black focus:ring-2 focus:ring-primary/20 transition-all" 
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase tracking-widest">Unidades</div>
                </div>
                <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/10">
                   <Zap className="h-3 w-3 text-amber-500" />
                   <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tight">Capacidad Máxima: 100 chips por lote</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Prefijo de Etiqueta</label>
                  <input 
                    type="text" 
                    value={labelBase} 
                    onChange={(e) => setLabelBase(e.target.value)} 
                    placeholder="Ej: Caja"
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4 py-3 text-sm font-black focus:ring-2 focus:ring-primary/20 transition-all uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Inicio de Secuencia</label>
                  <input 
                    type="number" 
                    value={labelStart} 
                    onChange={(e) => setLabelStart(Number(e.target.value))} 
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4 py-3 text-sm font-black focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Previsualización de Lote:</p>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-primary">{firstPreview}</span>
                    <span className="text-[8px] text-slate-300">...</span>
                    <span className="text-[10px] font-mono font-bold text-primary">{lastPreview}</span>
                 </div>
              </div>
              
              <button 
                onClick={() => createBatch(labelBase, labelStart)} 
                disabled={creating} 
                className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-950 dark:hover:bg-white dark:hover:text-slate-950 transition-all duration-300 disabled:opacity-50 shadow-xl shadow-primary/20 active:scale-[0.98]"
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
                {creating ? "Procesando..." : "Ejecutar Fábrica"}
              </button>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none overflow-hidden relative">
             <ShieldCheck className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10 rotate-12" />
             <h4 className="font-black text-sm uppercase tracking-widest mb-3 relative z-10">Garantía de Unicidad</h4>
             <p className="text-xs font-medium text-indigo-100/80 leading-relaxed relative z-10">La plataforma asegura que cada ShortCode y Serial generado no tenga colisiones en el sistema global.</p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="md:col-span-3">
          {createdBatch ? (
            <div className="p-10 rounded-[3rem] border border-emerald-100 bg-emerald-50/10 dark:bg-slate-900 dark:border-border shadow-2xl shadow-emerald-100/30 dark:shadow-none h-full flex flex-col">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Plus className="h-6 w-6" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-500">Lote Finalizado</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{createdBatch.length} Activos Creados</p>
                   </div>
                </div>
                
                <button 
                  onClick={exportCSV} 
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  <Download className="h-4 w-4" /> CSV Industrial
                </button>
              </div>

              <div className="flex-1 overflow-hidden rounded-[2rem] border border-emerald-100/50 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-emerald-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50/50 dark:bg-slate-900 border-b border-emerald-100/50 dark:border-slate-800">
                        <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Identificadores</th>
                        <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Cod. Activación</th>
                        <th className="px-6 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50/30 dark:divide-slate-800">
                      {createdBatch.map((c) => (
                        <tr key={c.shortCode} className="hover:bg-emerald-50/20 dark:hover:bg-slate-900 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <span className="font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{c.shortCode}</span>
                               <span className="text-[10px] font-mono text-slate-400">#{c.serialPublic}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/5 px-2.5 py-1 rounded w-fit text-xs border border-emerald-100 dark:border-emerald-500/10">
                               {c.activationCode || c.claimTokens?.[0]?.activationCode || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => loadChipDetail(c.id)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center p-12 text-center">
               <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 opacity-40">
                  <Cpu className="h-10 w-10 text-slate-300" />
               </div>
               <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest mb-2">Sala de Espera de Producción</h3>
               <p className="text-xs font-bold text-slate-400 max-w-xs leading-relaxed">Configura la cantidad y presiona ejecutar para ver los resultados aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
