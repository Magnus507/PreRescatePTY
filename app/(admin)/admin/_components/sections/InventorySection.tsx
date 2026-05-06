import React, { useState, useRef, useEffect } from 'react';
import { Package, Search, CheckCircle2, Circle, Loader2, Printer, Cpu, Plus, QrCode, Trash2, Copy, Link as LinkIcon, X, Download } from 'lucide-react';
import { ChipAdmin } from '../../_types/admin';
import { chipsService } from '../../_services/domains/chips.service';
import { toast } from 'sonner';
import { CreateBatchSection } from './CreateBatchSection';
import { QRCodeCanvas } from 'qrcode.react';

interface InventorySectionProps {
  chips: ChipAdmin[];
  loading: boolean;
  loadChips: () => void;
  loadChipDetail: (id: string) => void;
  // Create Batch Props
  createCount: number;
  setCreateCount: (val: number) => void;
  createBatch: (labelBase?: string, labelStart?: number) => void;
  creating: boolean;
  createdBatch: ChipAdmin[] | null;
  exportCSV: () => void;
  role?: string;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ 
  chips, 
  loading, 
  loadChips, 
  loadChipDetail,
  createCount,
  setCreateCount,
  createBatch,
  creating,
  createdBatch,
  exportCSV,
  role
}) => {
  const isPrintRole = role === 'imprenta';
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');
  const [inventoryCategory, setInventoryCategory] = useState<'physical' | 'digital'>(isPrintRole ? 'digital' : 'physical');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedQR, setSelectedQR] = useState<ChipAdmin | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const loadChipsRef = useRef(loadChips);

  useEffect(() => {
    loadChipsRef.current = loadChips;
  }, [loadChips]);

  useEffect(() => {
    const handleWindowFocus = () => {
      loadChipsRef.current();
      setSelectedIds([]);
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  const inventoryChips = chips.filter(c => {
    const matchesFilter = (
      c.shortCode.toLowerCase().includes(filter.toLowerCase()) || 
      c.serialPublic.toLowerCase().includes(filter.toLowerCase()) ||
      (c.internalLabel?.toLowerCase().includes(filter.toLowerCase()))
    );
    const matchesCategory = inventoryCategory === 'physical' ? c.isPhysical : !c.isPhysical;
    return c.status === 'inventory' && matchesFilter && matchesCategory;
  });

  const handleTogglePhysical = async (id: string, currentState: boolean) => {
    setUpdatingId(id);
    try {
      await chipsService.updatePhysicalStatus(id, !currentState);
      toast.success(currentState ? "Movido a Entrega Digital" : "Movido a Stock Físico");
      setSelectedIds([]);
      loadChips();
    } catch (e: any) {
      toast.error("Error al actualizar estado físico");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteMany = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar permanentemente ${selectedIds.length} identificador(es)? Esta acción no se puede deshacer.`)) return;
    
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => chipsService.deleteChip(id)));
      toast.success(`${selectedIds.length} chips eliminados`);
      setSelectedIds([]);
      loadChips();
    } catch (e) {
      toast.error("Error al completar la eliminación en lote");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOne = async (id: string, serial: string) => {
    if (!confirm(`¿Eliminar permanentemente el chip ${serial}?`)) return;
    try {
       await chipsService.deleteChip(id);
       toast.success("Chip eliminado");
       loadChips();
    } catch(e) {
       toast.error("Error al eliminar chip");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const downloadQR = () => {
    if (!qrRef.current || !selectedQR) return;
    const canvas = qrRef.current;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR_${selectedQR.shortCode}_${selectedQR.internalLabel?.replace(/\s+/g, '_') || 'chip'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Imagen QR descargada");
  };

  const stats = {
    total: chips.length,
    inventory: chips.filter(c => c.status === 'inventory').length,
    active: chips.filter(c => c.status === 'activated').length,
    physical: chips.filter(c => c.status === 'inventory' && c.isPhysical).length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" /> Almacén Central
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">Gestión de stock físico y generación de nuevos lotes industriales.</p>
        </div>

        {!isPrintRole && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
             <button 
              onClick={() => setActiveSubTab('list')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'list' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Package className="h-3.5 w-3.5" /> Inventario
             </button>
             <button 
              onClick={() => setActiveSubTab('create')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'create' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Plus className="h-3.5 w-3.5" /> Crear Lote
             </button>
          </div>
        )}
      </div>

      {activeSubTab === 'create' ? (
        <CreateBatchSection 
          createCount={createCount}
          setCreateCount={setCreateCount}
          createBatch={createBatch}
          creating={creating}
          createdBatch={createdBatch}
          exportCSV={exportCSV}
          loadChipDetail={loadChipDetail}
        />
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-4">
             <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {!isPrintRole && (
                  <button 
                    onClick={() => { setInventoryCategory('physical'); setSelectedIds([]); }}
                    className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${inventoryCategory === 'physical' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                     Stock Físico
                  </button>
                )}
                <button 
                  onClick={() => { setInventoryCategory('digital'); setSelectedIds([]); }}
                  className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${inventoryCategory === 'digital' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   Entrega Digital {isPrintRole && "(Solo)"}
                </button>
             </div>

             <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                   <button 
                    onClick={handleDeleteMany}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                   >
                     {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                     Eliminar ({selectedIds.length})
                   </button>
                )}
                {inventoryCategory === 'digital' && (
                  <button 
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white dark:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                  >
                    <Printer className="h-3.5 w-3.5" /> Exportar Códigos
                  </button>
                )}
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                <div className="px-5 py-3 bg-slate-900 text-white rounded-2xl flex flex-col min-w-[120px]">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Producción</span>
                    <span className="text-xl font-black leading-none mt-1">{stats.total}</span>
                </div>
                <div className="px-5 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-2xl flex flex-col min-w-[120px]">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Stock Total</span>
                    <span className="text-xl font-black leading-none mt-1">{stats.inventory}</span>
                </div>
                <div className="px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex flex-col min-w-[120px]">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Físicos</span>
                    <span className="text-xl font-black leading-none mt-1">{stats.physical}</span>
                </div>
                <div className="px-5 py-3 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded-2xl flex flex-col min-w-[120px]">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Digitales</span>
                    <span className="text-xl font-black leading-none mt-1">{stats.inventory - stats.physical}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <div className="relative flex-1 md:w-64">
                    <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                        placeholder="Buscar identificador..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-sm transition-all" 
                    />
                </div>
                <button onClick={loadChips} className="p-3 border border-border dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:bg-muted dark:hover:bg-slate-800 transition-all shadow-sm">
                    <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-slate-400'}`} />
                </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      <th className="px-6 py-6 text-left">
                         <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-primary focus:ring-primary/20"
                            checked={selectedIds.length === inventoryChips.length && inventoryChips.length > 0}
                            onChange={(e) => {
                               if (e.target.checked) setSelectedIds(inventoryChips.map(c => c.id));
                               else setSelectedIds([]);
                            }}
                         />
                      </th>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Etiqueta Interna</th>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Identificadores</th>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Código de Activación</th>
                      {inventoryCategory === 'physical' ? (
                         <th className="px-6 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Preparación Física</th>
                      ) : (
                         <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Acceso Digital</th>
                      )}
                      <th className="px-6 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inventoryChips.map((c) => (
                      <tr key={c.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group ${selectedIds.includes(c.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-6">
                         <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-primary focus:ring-primary/20"
                            checked={selectedIds.includes(c.id)}
                            onChange={(e) => {
                               if (e.target.checked) setSelectedIds([...selectedIds, c.id]);
                               else setSelectedIds(selectedIds.filter(id => id !== c.id));
                            }}
                         />
                      </td>
                      <td className="px-6 py-6">
                         <input 
                           type="text" 
                           defaultValue={c.internalLabel || ""} 
                           placeholder="Ej: CAJA-01"
                           onBlur={async (e) => {
                              const newVal = e.target.value;
                              if (newVal === c.internalLabel) return;
                              try {
                                 await fetch("/api/admin/chips/inventory", {
                                    method: "PATCH",
                                    cache: "no-store",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: c.id, internalLabel: newVal })
                                 });
                                 toast.success("Etiqueta guardada");
                                 loadChips();
                              } catch(e) {
                                 toast.error("Error al guardar etiqueta");
                              }
                           }}
                           className="bg-muted border-none rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest w-32 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                         />
                      </td>
                      <td className="px-6 py-6 min-w-[180px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-slate-300 uppercase">Serial:</span>
                            <span className="font-mono text-[10px] text-slate-400">#{c.serialPublic}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-slate-300 uppercase">ID:</span>
                            <span className="font-black text-slate-900 dark:text-white text-base tracking-tighter">{c.shortCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 min-w-[200px]">
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black tracking-[0.15em] text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 shadow-sm block w-full text-center">
                              {c.claimTokens?.[0]?.activationCode || 'SIN CÓDIGO'}
                            </span>
                         </div>
                      </td>
                        
                         {inventoryCategory === 'physical' ? (
                            <td className="px-6 py-6">
                             <div className="flex justify-center">
                               <button 
                                 onClick={() => handleTogglePhysical(c.id, c.isPhysical)}
                                 disabled={updatingId === c.id}
                                 className={`
                                   flex items-center gap-3 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all
                                   ${c.isPhysical 
                                       ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                       : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}
                                 `}
                               >
                                 {updatingId === c.id ? (
                                   <Loader2 className="h-4 w-4 animate-spin" />
                                 ) : c.isPhysical ? (
                                   <><CheckCircle2 className="h-4 w-4" /> En Físico</>
                                 ) : (
                                   <><Circle className="h-4 w-4" /> Solo Digital</>
                                 )
                                 }
                               </button>
                             </div>
                            </td>
                         ) : (
                            <td className="px-6 py-6">
                               <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => copyToClipboard(c.nfcUrl, "Enlace NFC")}
                                    className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                  >
                                     <LinkIcon className="h-3 w-3" /> NFC
                                  </button>
                                  <button 
                                     onClick={() => setSelectedQR(c)}
                                     className="p-2.5 bg-slate-900 text-white dark:bg-slate-800 rounded-xl hover:scale-105 transition-all shadow-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                   >
                                      <QrCode className="h-3 w-3" /> Ver QR
                                   </button>
                                   {!isPrintRole && (
                                     <button 
                                       onClick={() => handleTogglePhysical(c.id, c.isPhysical)}
                                       className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                       title="Mover a Stock Físico"
                                     >
                                        <Package className="h-3 w-3" /> Físico
                                     </button>
                                   )}
                               </div>
                            </td>
                         )}

                        <td className="px-6 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                    onClick={() => loadChipDetail(c.id)}
                                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                                    title="Ver detalles"
                                >
                                    <Cpu className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteOne(c.id, c.serialPublic)}
                                    className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-all border border-red-100 dark:border-red-500/20 shadow-sm"
                                    title="Eliminar"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {inventoryChips.length === 0 && !loading && (
                  <div className="py-24 text-center flex flex-col items-center gap-4">
                     <div className="p-8 rounded-full bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-inner">
                        <Package className="h-12 w-12 opacity-10" />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Inventario Vacío</p>
                  </div>
                )}
              </div>
          </div>
        </>
      )}
      {/* QR PREVIEW MODAL */}
      {selectedQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-8 duration-500">
              <button 
                onClick={() => setSelectedQR(null)}
                className="absolute top-6 right-6 p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all z-10"
              >
                 <X className="h-5 w-5" />
              </button>

              <div className="p-10 flex flex-col items-center">
                 <div className="bg-primary/5 px-6 py-2 rounded-full mb-8 border border-primary/10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Identificador de Rescate</span>
                 </div>
                 
                 <div className="p-8 bg-white rounded-[3rem] shadow-2xl shadow-primary/10 border border-slate-50 mb-8 group relative">
                    <QRCodeCanvas 
                      id="qr-canvas"
                      ref={qrRef}
                      value={selectedQR.qrUrl.includes('/api/public/qr?data=') ? decodeURIComponent(selectedQR.qrUrl.split('data=')[1]) : selectedQR.qrUrl} 
                      size={256}
                      level="H"
                      includeMargin={false}
                    />
                 </div>

                 <div className="text-center space-y-2 mb-10">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Etiqueta Interna</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{selectedQR.internalLabel || "Sin Etiqueta"}</p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                       <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-lg">ID: {selectedQR.shortCode}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">#{selectedQR.serialPublic}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-3 w-full">
                    <button 
                      onClick={downloadQR}
                      className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-950 transition-all shadow-xl shadow-primary/20"
                    >
                      <Download className="h-4 w-4" /> Descargar para Impresión
                    </button>
                    <button 
                      onClick={() => { copyToClipboard(selectedQR.qrUrl, "Enlace"); setSelectedQR(null); }}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-100 transition-all"
                    >
                      <Copy className="h-4 w-4" /> Copiar Link Directo
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

