import React, { useState, useEffect } from 'react';
import { X, Zap, Plus, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { PACKAGE_THEMES } from '@/domains/shared/constants';

interface PackageOption {
  id: string;
  name: string;
  slug: string | null;
  maxChips: number;
  maxProfiles: number;
  price: number;
  description: string | null;
  isActive: boolean;
  accountType: string;
  icon: string | null;
  color: string | null;
  recommended: boolean;
  displayOrder: number;
  savings: string | null;
  allowsFamilyProfiles: boolean;
  allowsOrganizationModule: boolean;
  serviceDurationMonths: number;
}

interface ComboSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { packageId?: string; maxChips?: number }) => void;
  currentCapacity: number;
  loading: boolean;
}

export const ComboSelectorModal: React.FC<ComboSelectorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentCapacity,
  loading,
}) => {
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [customChips, setCustomChips] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPackagesLoading(true);
    setFetchError(null);

    fetch('/api/public/packages')
      .then((res) => res.json())
      .then((data) => {
        setPackages((data?.packages || []) as PackageOption[]);
      })
      .catch((err) => {
        console.error('Error loading package options:', err);
        setFetchError('No se pudieron cargar los paquetes de la tienda. Intenta de nuevo.');
      })
      .finally(() => setPackagesLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Añadir Capacidad</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Capacidad Actual: {currentCapacity} Chips</p>
              </div>
           </div>
           <button onClick={onClose} className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
              <X className="h-5 w-5" />
           </button>
        </header>

        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {packagesLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {fetchError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packages.map((pkg) => {
                const styles = PACKAGE_THEMES[pkg.color || 'standard']?.styles || PACKAGE_THEMES.standard.styles;
                const isSelected = selectedPackage?.id === pkg.id;

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setCustomChips('');
                    }}
                    className={`p-6 rounded-3xl border-2 transition-all text-left relative group ${isSelected ? 'border-primary bg-primary/5 shadow-xl shadow-primary/5' : `${styles.color} ${styles.border} hover:shadow-lg`}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-lg ${styles.bg}`}>
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-lg font-black text-slate-900 dark:text-white">${pkg.price}</span>
                    </div>
                    <p className="font-black text-slate-900 dark:text-white mb-1">{pkg.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{pkg.description || 'Avanza tu seguridad con un paquete validado'}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs font-black text-primary">+{pkg.maxChips} Chips</span>
                      <ChevronRight className={`h-4 w-4 text-primary transition-transform ${isSelected ? 'translate-x-1' : 'opacity-0'}`} />
                    </div>
                  </button>
                );
              })}
              {packages.length === 0 && (
                <div className="col-span-full rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  No hay paquetes disponibles en este momento.
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Ajuste Manual Personalizado</p>
              <div className="flex items-center gap-3">
                 <input 
                   type="number" 
                   value={customChips}
                   onChange={(e) => {
                      setCustomChips(e.target.value);
                      setSelectedPackage(null);
                   }}
                   placeholder="Cantidad de chips (ej: 30)" 
                   className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" 
                 />
                 <div className="h-10 px-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    $25.00 c/u
                 </div>
              </div>
           </div>
        </div>

        <footer className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacidad Final</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                 {selectedPackage ? currentCapacity + selectedPackage.maxChips : customChips ? parseInt(customChips) : currentCapacity} Chips
              </p>
           </div>
           <button 
             onClick={() => {
                if (selectedPackage) {
                   onSubmit({ packageId: selectedPackage.id });
                } else if (customChips) {
                   onSubmit({ maxChips: parseInt(customChips) });
                }
             }}
             disabled={loading || (!selectedPackage && !customChips)}
             className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
           >
              {loading ? (
                <>Procesando... <Loader2 className="h-4 w-4 animate-spin" /></>
              ) : (
                <>Aplicar Cambio <CreditCard className="h-4 w-4" /></>
              )}
           </button>
        </footer>
      </div>
    </div>
  );
};
