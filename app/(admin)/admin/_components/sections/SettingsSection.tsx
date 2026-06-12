"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Save, 
  Loader2, 
  QrCode, 
  Banknote, 
  Mail, 
  Globe, 
  Upload, 
} from "lucide-react";
import { toast } from "sonner";

export function SettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  
  const [configs, setConfigs] = useState({
    yappy_handle: "",
    yappy_qr_url: "",
    bank_name: "",
    bank_account_type: "",
    bank_account_number: "",
    bank_account_name: "",
    sender_email: "",
    demo_profile_shortcode: ""
  });

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (data.configs) {
        setConfigs(prev => ({
          ...prev,
          ...data.configs
        }));
      }
    } catch {
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });

      if (res.ok) {
        toast.success("Ajustes guardados correctamente");
      } else {
        toast.error("Error al guardar ajustes");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQR(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "payment"); // Use payment optimization
    formData.append("bucket", "general");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir imagen");
      const { url } = await res.json();
      
      setConfigs(prev => ({ ...prev, yappy_qr_url: url }));
      toast.success("QR actualizado");
    } catch {
      toast.error("Error al subir el QR");
    } finally {
      setUploadingQR(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Accediendo a la Configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 bg-indigo-500 rounded-full" />
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Cimientos del Ecosistema</h2>
         </div>
         <button 
           onClick={handleSave}
           disabled={saving}
           className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
         >
           {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
           {saving ? 'Guardando...' : 'Guardar Cambios'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* Yappy Config */}
         <div className="bg-card border border-border rounded-[3rem] p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
               <QrCode className="h-48 w-48 text-indigo-600" />
            </div>
            
            <div className="flex items-center gap-4">
               <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <QrCode className="h-7 w-7" />
               </div>
               <div>
                  <h3 className="text-xl font-black tracking-tight">Yappy Merchant</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cobro rápido e instantáneo</p>
               </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Handle / Usuario Yappy</label>
                  <input 
                    type="text" 
                    placeholder="Ej: @PreRescue.ID"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.yappy_handle}
                    onChange={(e) => setConfigs({ ...configs, yappy_handle: e.target.value })}
                  />
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Código QR de Yappy</label>
                  <div className="flex items-center gap-6">
                     <div className="h-32 w-32 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-border flex items-center justify-center overflow-hidden relative group/qr">
                        {configs.yappy_qr_url ? (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img src={configs.yappy_qr_url} alt="QR Yappy" className="w-full h-full object-contain p-2" />
                        ) : (
                           <QrCode className="h-8 w-8 opacity-10" />
                        )}
                        {uploadingQR && (
                           <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                           </div>
                        )}
                     </div>
                     <div className="flex-1 space-y-3">
                        <label className="inline-flex cursor-pointer bg-white dark:bg-slate-900 border border-border px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest gap-2 hover:bg-slate-50 transition-all">
                           <Upload className="h-4 w-4" />
                           {configs.yappy_qr_url ? 'Cambiar QR' : 'Subir QR'}
                           <input type="file" className="hidden" accept="image/*" onChange={handleQRUpload} disabled={uploadingQR} />
                        </label>
                        <p className="text-[9px] font-medium text-muted-foreground leading-relaxed">
                           Sube el QR generado desde tu app de Banco General para que el cliente pueda escanearlo directamente desde el Dashboard.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Bank Details */}
         <div className="bg-card border border-border rounded-[3rem] p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
               <Banknote className="h-48 w-48 text-emerald-600" />
            </div>

            <div className="flex items-center gap-4">
               <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Banknote className="h-7 w-7" />
               </div>
               <div>
                  <h3 className="text-xl font-black tracking-tight">Transferencia ACH</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cuentas Locales de Panamá</p>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Nombre del Banco</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Banco General"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.bank_name}
                    onChange={(e) => setConfigs({ ...configs, bank_name: e.target.value })}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tipo de Cuenta</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Cta Corriente"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.bank_account_type}
                    onChange={(e) => setConfigs({ ...configs, bank_account_type: e.target.value })}
                  />
               </div>
               <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Número de Cuenta</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 03-72-01-..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.bank_account_number}
                    onChange={(e) => setConfigs({ ...configs, bank_account_number: e.target.value })}
                  />
               </div>
               <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Nombre del Beneficiario</label>
                  <input 
                    type="text" 
                    placeholder="Ej: PreRescate ID PTY S.A."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.bank_account_name}
                    onChange={(e) => setConfigs({ ...configs, bank_account_name: e.target.value })}
                  />
               </div>
            </div>
         </div>

         {/* General Config */}
         <div className="bg-card border border-border rounded-[3rem] p-10 space-y-8 relative overflow-hidden group lg:col-span-2">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
               <Mail className="h-48 w-48 text-primary" />
            </div>

            <div className="flex items-center gap-4">
               <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Mail className="h-7 w-7" />
               </div>
               <div>
                  <h3 className="text-xl font-black tracking-tight">Comunicaciones del Sistema</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Correos y Remitentes</p>
               </div>
            </div>

            <div className="max-w-2xl space-y-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Remitente Predeterminado (FROM)</label>
                  <input 
                    type="email" 
                    placeholder="soporte@prerescatepty.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.sender_email}
                    onChange={(e) => setConfigs({ ...configs, sender_email: e.target.value })}
                  />
                  <p className="text-[10px] font-bold text-muted-foreground italic mt-2 ml-1">
                     Este correo se usará para enviar las confirmaciones de pago y códigos de activación. Asegúrate de tenerlo configurado en Resend.
                  </p>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Perfil de Demostración (ShortCode)</label>
                  <input 
                    type="text" 
                    placeholder="44R6DBNQ"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    value={configs.demo_profile_shortcode}
                    onChange={(e) => setConfigs({ ...configs, demo_profile_shortcode: e.target.value })}
                  />
                  <p className="text-[10px] font-bold text-muted-foreground italic mt-2 ml-1">
                    Este es el ShortCode que se utiliza para el código QR de demostración en la landing page y el Admin Showcase.
                  </p>
               </div>
            </div>
         </div>

      </div>

      {/* Preview Section */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-12 opacity-5">
            <Globe className="h-64 w-64" />
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-4">
               <h3 className="text-3xl font-black tracking-tighter">Vista Previa del Cliente</h3>
               <p className="text-slate-400 font-bold leading-relaxed max-w-lg">
                  Así es como tus clientes verán la información de pago una vez que realicen una orden. Mantén tus datos actualizados para evitar demoras en las validaciones.
               </p>
            </div>
            <div className="w-full md:w-80 bg-white dark:bg-slate-800 rounded-[2rem] p-6 text-slate-900 dark:text-white shadow-2xl">
               <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 text-center">Checkout Manual</p>
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Yappy</p>
                     <p className="text-sm font-black text-indigo-600">{configs.yappy_handle || '@...'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{configs.bank_name || 'Banco'}</p>
                     <p className="text-[10px] font-bold leading-tight truncate">{configs.bank_account_number || 'Cuenta...'}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
}
