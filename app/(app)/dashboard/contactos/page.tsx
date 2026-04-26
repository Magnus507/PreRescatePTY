"use client";

import { useEffect, useState } from "react";
import { RELATIONSHIPS } from "@/lib/constants";
import { 
  Plus, Trash2, Users, Loader2, Save, X, 
  PhoneCall, Mail, UserPlus, ShieldPlus, ArrowRight,
  ShieldAlert, CheckCircle2, Pencil, ExternalLink, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string | null;
  priorityOrder: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  active: boolean;
  profileId: string | null;
}

const emptyContact = {
  fullName: "", relationship: "Cónyuge", phone: "", email: "",
  notifyEmail: true, notifySms: false, notifyWhatsapp: false,
  global: false
};

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isServiceActive, setIsServiceActive] = useState(true);
  const [isFamilyAccount, setIsFamilyAccount] = useState(false);
  const [formType, setFormType] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState(emptyContact);

  useEffect(() => {
    fetch("/api/account/state")
      .then(r => r.json())
      .then(data => {
        setIsServiceActive(!data.isExpired && data.serviceStatus === "active");
        setIsFamilyAccount(data.isFamily || data.isCorporate);
      });

    fetch("/api/contacts/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts || []);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleOpenAdd() {
    setFormType("add");
    setEditId(null);
    setFormData(emptyContact);
    setShowForm(true);
  }

  function handleOpenEdit(contact: Contact) {
    setFormType("edit");
    setEditId(contact.id);
    setFormData({
      fullName: contact.fullName,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || "",
      notifyEmail: contact.notifyEmail,
      notifySms: contact.notifySms,
      notifyWhatsapp: contact.notifyWhatsapp,
      global: !contact.profileId // If no profileId in dashboard context, it's global conceptually
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const method = formType === "add" ? "POST" : "PATCH";
      const payload = formType === "add" 
        ? { ...formData, priorityOrder: contacts.length + 1 }
        : { ...formData, id: editId };

      const res = await fetch("/api/contacts/dashboard", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (formType === "add") {
          setContacts((prev) => [...prev, data.contact]);
          toast.success("Guardián añadido con éxito");
        } else {
          setContacts((prev) => prev.map(c => c.id === editId ? data.contact : c));
          toast.success("Guardián actualizado correctamente");
        }
        setShowForm(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al procesar solicitud");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("¿Eliminar este contacto? En caso de emergencia, esta persona ya no será notificada.")) return;
    const res = await fetch(`/api/contacts/dashboard?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contacto eliminado");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="relative">
          <Loader2 className="h-14 w-14 animate-spin text-primary opacity-20" />
          <Loader2 className="h-14 w-14 animate-spin text-primary absolute top-0 left-0" style={{ animationDuration: '3s' }} />
        </div>
        <p className="text-muted-foreground animate-pulse font-black text-xs uppercase tracking-[0.2em]">Sincronizando Guardianes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="h-2 w-10 bg-primary rounded-full" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Red de Protección</p>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-2 italic uppercase">Contactos de Auxilio</h1>
          <p className="text-muted-foreground font-medium text-lg italic">Tus ángeles guardianes en el mundo real.</p>
        </div>
        {contacts.length < 3 && (
          <button 
            onClick={handleOpenAdd} 
            className="group bg-primary text-white pl-8 pr-6 py-5 rounded-[2rem] font-black text-sm shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-4"
          >
            <span>Agregar Guardia</span>
            <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
               <Plus className="h-5 w-5" />
            </div>
          </button>
        )}
      </div>

      {!isServiceActive && (
        <div className="relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-2xl shadow-amber-500/5">
          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            <div className="h-24 w-24 rounded-[2.5rem] bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/40 animate-pulse">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="font-black text-3xl tracking-tighter mb-2 uppercase italic text-amber-700">Canales Desactivados</h2>
              <p className="text-amber-800/70 font-bold mb-4">Tu suscripción ha expirado. Las notificaciones automáticas SMS y WhatsApp están suspendidas hasta la renovación.</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                 <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                    <X className="h-3 w-3" /> SMS Inactivo
                 </div>
                 <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                    <X className="h-3 w-3" /> WhatsApp Inactivo
                 </div>
              </div>
            </div>
            <a href="/dashboard/upgrade" className="bg-amber-500 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm hover:bg-amber-600 hover:scale-[1.05] active:scale-[0.95] transition-all shadow-2xl shadow-amber-500/30 uppercase tracking-widest">Renovar Ahora</a>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-12">
          {contacts.length === 0 ? (
            <div className="text-center py-32 rounded-[4rem] border-2 border-dashed border-border group hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col items-center">
              <div className="h-32 w-32 rounded-[3.5rem] bg-muted mx-auto mb-8 flex items-center justify-center text-muted-foreground/30 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary/50 transition-all shadow-inner">
                 <ShieldPlus className="h-16 w-16" />
              </div>
              <h3 className="text-4xl font-black tracking-tighter mb-4 uppercase italic">Tu red está vacía</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-10 font-bold text-lg leading-relaxed italic opacity-60">En una emergencia, cada segundo cuenta. Protege tu vida añadiendo a quien más confías.</p>
              <button 
                onClick={handleOpenAdd}
                className="bg-primary text-white px-12 py-6 rounded-[2rem] font-black text-sm hover:scale-[1.05] active:scale-[0.95] transition-all uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-primary/30"
              >
                Activar Guardia <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {contacts.map((contact, i) => (
                <div key={contact.id} className="group relative p-10 rounded-[3.5rem] border-2 border-border bg-card shadow-lg hover:shadow-2xl hover:border-primary/20 hover:-translate-y-2 transition-all flex flex-col overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 flex items-center gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <button 
                      onClick={() => handleOpenEdit(contact)} 
                      className="h-12 w-12 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="Editar"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => deleteContact(contact.id)} 
                      className="h-12 w-12 rounded-xl bg-destructive/5 text-destructive border border-destructive/10 flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm"
                      title="Eliminar"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-primary/20">
                      {i + 1}
                    </div>
                    <div>
                       {!contact.profileId ? (
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[9px] font-black tracking-widest uppercase mb-1.5">
                            <ShieldCheck className="h-3 w-3" /> Protección Global
                         </div>
                       ) : (
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black tracking-widest uppercase mb-1.5">
                            Ficha Específica
                         </div>
                       )}
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-10">
                    <div>
                       <h3 className="text-3xl font-black tracking-tighter leading-tight uppercase italic">{contact.fullName}</h3>
                       <p className="text-sm font-black uppercase tracking-[0.2em] text-primary/60 mt-1">{contact.relationship}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-4 group/item">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                           <PhoneCall className="h-5 w-5 opacity-40 group-hover/item:opacity-100" />
                        </div>
                        <span className="text-lg font-black tracking-tight">{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-4 group/item">
                           <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                              <Mail className="h-5 w-5 opacity-40 group-hover/item:opacity-100" />
                           </div>
                           <span className="text-sm font-bold text-muted-foreground truncate italic">{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-8 border-t border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-auto mb-4">Canales de Alerta:</p>
                    <div className="flex flex-wrap gap-2">
                       <ChannelBadge active={contact.notifyEmail} label="Email" dot="bg-blue-500" />
                       <ChannelBadge active={contact.notifySms} label="SMS" dot="bg-emerald-500" />
                       <ChannelBadge active={contact.notifyWhatsapp} label="WA" dot="bg-green-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-2xl rounded-[4rem] shadow-2xl border-4 border-white/10 flex flex-col max-h-[95vh] overflow-hidden scale-in duration-500">
             <div className="px-14 py-12 border-b border-border flex items-center justify-between shrink-0 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
                <div className="relative z-10">
                   <h2 className="font-black text-4xl tracking-tighter italic uppercase">{formType === "add" ? "Nuevo Guardián" : "Editar Guardián"}</h2>
                   <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em] mt-2">Configuración Blindada de Auxilio</p>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="h-16 w-16 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-border flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-xl group"
                >
                   <X className="h-8 w-8 group-hover:rotate-90 transition-transform" />
                </button>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
             </div>
             
             <div className="p-14 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="md:col-span-2 group">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2 mb-3 block group-focus-within:text-primary transition-colors">Nombre Completo *</label>
                        <input 
                          required 
                          value={formData.fullName} 
                          onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))} 
                          className="w-full rounded-[1.5rem] border-2 border-input bg-background/50 px-8 py-5 text-lg font-black focus:border-primary focus:ring-0 backdrop-blur-sm shadow-inner transition-all" 
                          placeholder="Ej: Milena Cusatti" 
                        />
                      </div>
                      
                      <div className="group">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2 mb-3 block group-focus-within:text-primary transition-colors">Parentesco</label>
                        <select 
                          value={formData.relationship} 
                          onChange={(e) => setFormData((f) => ({ ...f, relationship: e.target.value }))} 
                          className="w-full rounded-[1.5rem] border-2 border-input bg-background/50 px-8 py-5 text-base font-black focus:border-primary focus:ring-0 appearance-none shadow-inner cursor-pointer"
                        >
                           {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      <div className="group">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2 mb-3 block group-focus-within:text-primary transition-colors">Teléfono Móvil *</label>
                        <input 
                          required 
                          type="tel" 
                          value={formData.phone} 
                          onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} 
                          className="w-full rounded-[1.5rem] border-2 border-input bg-background/50 px-8 py-5 text-lg font-black focus:border-primary focus:ring-0 shadow-inner" 
                          placeholder="+507 6000-0000" 
                        />
                      </div>

                      <div className="md:col-span-2 group">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2 mb-3 block group-focus-within:text-primary transition-colors">Email (Opcional)</label>
                        <input 
                          type="email" 
                          value={formData.email} 
                          onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} 
                          className="w-full rounded-[1.5rem] border-2 border-input bg-background/50 px-8 py-5 text-base font-bold focus:border-primary focus:ring-0 shadow-inner italic" 
                          placeholder="guardia@reddeproteccion.com" 
                        />
                      </div>
                   </div>

                   {isFamilyAccount && formType === "add" && (
                     <div className="p-10 rounded-[2.5rem] bg-indigo-50 border-2 border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <div className="flex items-start gap-6">
                           <div className="pt-1">
                              <input 
                                type="checkbox" 
                                id="global-toggle"
                                checked={formData.global}
                                onChange={(e) => setFormData(f => ({...f, global: e.target.checked}))}
                                className="h-8 w-8 rounded-xl border-4 border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                           </div>
                           <label htmlFor="global-toggle" className="cursor-pointer group">
                              <p className="text-lg font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tighter italic">Vincular a toda la cuenta</p>
                              <p className="text-sm text-indigo-900/60 dark:text-indigo-400/60 font-medium leading-relaxed mt-2 opacity-80 italic">
                                Este guardián protegerá automáticamente a todos los perfiles médicos registrados en esta suscripción.
                              </p>
                           </label>
                        </div>
                     </div>
                   )}

                   <div className="space-y-6">
                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2 mb-4">Canales de Alerta Automática</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ToggleButton active={formData.notifyEmail} label="Email" onClick={() => setFormData(f => ({...f, notifyEmail: !f.notifyEmail}))} />
                        <ToggleButton active={formData.notifySms} label="SMS" onClick={() => setFormData(f => ({...f, notifySms: !f.notifySms}))} />
                        <ToggleButton active={formData.notifyWhatsapp} label="WhatsApp" onClick={() => setFormData(f => ({...f, notifyWhatsapp: !f.notifyWhatsapp}))} />
                      </div>
                   </div>

                   <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t border-border/50">
                      <button 
                        type="button" 
                        onClick={() => setShowForm(false)} 
                        className="flex-1 px-10 py-6 rounded-[1.5rem] border-2 border-border font-black text-xs uppercase tracking-[0.2em] hover:bg-muted transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={saving} 
                        className="flex-[2] inline-flex items-center justify-center gap-4 px-10 py-6 bg-primary text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all italic"
                      >
                        {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                        {saving ? "Procesando..." : (formType === "add" ? "Confirmar Altera" : "Guardar Cambios")}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelBadge({ label, active, dot }: { label: string, active: boolean, dot: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black tracking-widest uppercase transition-all ${active ? 'bg-card border-border shadow-sm opacity-100' : 'bg-muted/50 border-transparent opacity-30 grayscale saturate-0'}`}>
       <div className={`h-2 w-2 rounded-full ${active ? dot : 'bg-slate-300'}`} />
       {label}
    </div>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-5 rounded-[2rem] border-2 flex items-center justify-between gap-2 transition-all group ${
        active 
          ? "border-primary bg-primary/5 text-primary shadow-xl shadow-primary/5" 
          : "border-border bg-muted/20 text-muted-foreground opacity-60 grayscale hover:opacity-80"
      }`}
    >
      <span className="text-xs font-black uppercase tracking-[0.2em]">{label}</span>
      <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${active ? 'bg-primary border-primary text-white scale-110' : 'border-border bg-white scale-100'}`}>
         <CheckCircle2 className={`h-4 w-4 ${active ? "opacity-100" : "opacity-0"}`} />
      </div>
    </button>
  );
}
