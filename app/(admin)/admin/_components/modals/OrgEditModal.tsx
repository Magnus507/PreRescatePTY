"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export interface OrgEditPayload {
  legalName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxId: string;
  status: "active" | "suspended" | "archived";
}

interface OrgEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrgEditPayload) => Promise<boolean>;
  loading: boolean;
  org: {
    id: string;
    legalName: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    taxId?: string | null;
    status?: string;
  };
}

export function OrgEditModal({ isOpen, onClose, onSubmit, loading, org }: OrgEditModalProps) {
  const [formData, setFormData] = useState<OrgEditPayload>({
    legalName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    taxId: "",
    status: "active",
  });

  useEffect(() => {
    if (isOpen && org) {
      setFormData({
        legalName: org.legalName || "",
        contactEmail: org.contactEmail || "",
        contactPhone: org.contactPhone || "",
        address: org.address || "",
        taxId: org.taxId || "",
        status:
          org.status === "active" || org.status === "suspended" || org.status === "archived"
            ? org.status
            : "active",
      });
    }
  }, [isOpen, org]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(formData);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-border max-h-[95vh] overflow-y-auto">
        <h3 className="text-2xl font-black mb-6">Editar Organización</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nombre Legal</label>
               <input 
                 placeholder="Nombre de la empresa" 
                 className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                 value={formData.legalName} 
                 onChange={e => setFormData({...formData, legalName: e.target.value})} 
                 required
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Estado</label>
               <select 
                 className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                 value={formData.status}
                 onChange={e => setFormData({...formData, status: e.target.value as OrgEditPayload['status']})}
               >
                 <option value="active">Activa</option>
                 <option value="suspended">Suspendida</option>
                 <option value="archived">Archivada</option>
               </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email de Contacto</label>
               <input 
                 type="email"
                 placeholder="contacto@empresa.com" 
                 className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                 value={formData.contactEmail} 
                 onChange={e => setFormData({...formData, contactEmail: e.target.value})} 
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Teléfono de Contacto</label>
               <input 
                 placeholder="+507 000-0000" 
                 className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                 value={formData.contactPhone} 
                 onChange={e => setFormData({...formData, contactPhone: e.target.value})} 
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Dirección</label>
               <input 
                 placeholder="Dirección de la empresa" 
                 className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                 value={formData.address} 
                 onChange={e => setFormData({...formData, address: e.target.value})} 
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">RUC / Identificación Fiscal</label>
               <input 
                 placeholder="RUC o identificación" 
                 className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                 value={formData.taxId} 
                 onChange={e => setFormData({...formData, taxId: e.target.value})} 
               />
            </div>
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
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}