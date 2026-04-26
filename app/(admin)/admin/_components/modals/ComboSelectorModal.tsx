import React, { useState } from 'react';
import { X, Zap, Plus, CreditCard, Shield, ChevronRight, Loader2 } from 'lucide-react';

interface Combo {
  id: string;
  name: string;
  chips: number;
  price: number;
  description: string;
  color: string;
}

const COMBOS: Combo[] = [
  { id: 'estandar', name: 'Combo Estándar', chips: 1, price: 25, description: 'Añade 1 chip de protección individual', color: 'bg-slate-500' },
  { id: 'duo', name: 'Combo Duo', chips: 2, price: 45, description: 'Añade 2 chips de protección', color: 'bg-blue-500' },
  { id: 'familiar', name: 'Combo Familiar', chips: 3, price: 65, description: 'Añade 3 chips (Multi-Perfil)', color: 'bg-indigo-500' },
  { id: 'hogar-full', name: 'Hogar Full', chips: 5, price: 95, description: 'Añade 5 chips de protección total', color: 'bg-rose-500' },
  { id: 'empresa', name: 'Empresa', chips: 20, price: 250, description: 'Añade 20 chips para grupos o pymes', color: 'bg-slate-900' },
  { id: 'corporativo', name: 'Corporativo', chips: 50, price: 450, description: 'Añade 50 chips corporativos/colegiales', color: 'bg-slate-900' },
];

interface ComboSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { packageId?: string; maxChips?: number }) => void;
  currentCapacity: number;
  loading: boolean;
}

export const ComboSelectorModal: React.FC<ComboSelectorModalProps> = ({ 
  isOpen, onClose, onSubmit, currentCapacity, loading 
}) => {
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [customChips, setCustomChips] = useState<string>('');

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
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COMBOS.map((combo) => (
                 <button
                   key={combo.id}
                   onClick={() => {
                      setSelectedCombo(combo);
                      setCustomChips('');
                   }}
                   className={`
                    p-6 rounded-3xl border-2 transition-all text-left relative group
                    ${selectedCombo?.id === combo.id 
                        ? 'border-primary bg-primary/5 shadow-xl shadow-primary/5' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'}
                   `}
                 >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`h-8 w-8 ${combo.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                            <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white">${combo.price}</span>
                    </div>
                    <p className="font-black text-slate-900 dark:text-white mb-1">{combo.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{combo.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-black text-primary">+{combo.chips} Chips</span>
                        <ChevronRight className={`h-4 w-4 text-primary transition-transform ${selectedCombo?.id === combo.id ? 'translate-x-1' : 'opacity-0'}`} />
                    </div>
                 </button>
              ))}
           </div>

           <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Ajuste Manual Personalizado</p>
              <div className="flex items-center gap-3">
                 <input 
                   type="number" 
                   value={customChips}
                   onChange={(e) => {
                      setCustomChips(e.target.value);
                      setSelectedCombo(null);
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
                 {selectedCombo ? currentCapacity + selectedCombo.chips : customChips ? parseInt(customChips) : currentCapacity} Chips
              </p>
           </div>
           <button 
             onClick={() => {
                if (selectedCombo) {
                   onSubmit({ maxChips: currentCapacity + selectedCombo.chips });
                } else if (customChips) {
                   onSubmit({ maxChips: parseInt(customChips) });
                }
             }}
             disabled={loading || (!selectedCombo && !customChips)}
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
