"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface OrgCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  loading: boolean;
}

export function OrgCreateModal({ isOpen, onClose, onSubmit, loading }: OrgCreateModalProps) {
  const [formData, setFormData] = useState({ 
    legalName: "", displayName: "", contactEmail: "", 
    maxChips: 30, ownerEmail: "", ownerPassword: "", 
    organizationType: "company" as const
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(formData);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-border">
        <h3 className="text-2xl font-black mb-6">Nueva Organización</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nombre Legal</label>
             <input 
               placeholder="ej. PreRescate S.A." 
               className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
               value={formData.legalName} 
               onChange={e => setFormData({...formData, legalName: e.target.value})} 
               required
             />
          </div>
          
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email del Administrador</label>
             <input 
               placeholder="admin@empresa.com" 
               className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
               value={formData.ownerEmail} 
               onChange={e => setFormData({...formData, ownerEmail: e.target.value})} 
               required
               type="email"
             />
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Contraseña Temporal</label>
             <input 
               type="password" 
               placeholder="••••••••" 
               className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
               value={formData.ownerPassword} 
               onChange={e => setFormData({...formData, ownerPassword: e.target.value})} 
               required
             />
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 font-bold text-muted-foreground hover:bg-muted/50 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 py-4 bg-slate-900 dark:bg-white dark:text-slate-950 text-white rounded-2xl font-black shadow-xl shadow-slate-900/10 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Crear Entidad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
