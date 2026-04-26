"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  ShieldCheck, Heart, User, Phone, Plus, Trash2, 
  Save, Loader2, Sparkles, QrCode, ExternalLink, Activity,
  Droplets, AlertTriangle, Pill, MessageCircle, Crown
} from "lucide-react";

export function ShowcaseProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [chip, setChip] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/admin/showcase");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setChip(data.chip);
        const contactsList = (data.profile.contacts || []).map((pc: any) => ({
           id: pc.contact.id,
           fullName: pc.contact.fullName,
           phone: pc.contact.phone,
           relationship: pc.contact.relationship
        }));
        setContacts(contactsList);
      } else {
        throw new Error("No hay data");
      }
    } catch (e) {
      console.warn("Usando fallback de emergencia para Showcase");
      // Fallback for demo stability
      setProfile({
        firstName: "Carlos",
        lastName: "Rodriguez",
        bloodType: "O+",
        allergies: "PENICILINA (CRÍTICO)",
        chronicConditions: "Hipertensión",
        medications: "Lisinopril",
        additionalNotes: "Porta marcapasos medtronic (v.2024).",
        photoUrl: "https://fikidmfquaxhlayxctsa.supabase.co/storage/v1/object/public/profile-photos/demo-admin.png"
      });
      setChip({ shortCode: "DEMO-ADMIN-VIP", internalLabel: "Chip Admin VIP" });
      setContacts([
        { fullName: "María de Rodriguez", phone: "6612-3456", relationship: "Cónyuge" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/showcase", {
        method: "PATCH",
        body: JSON.stringify({ ...profile, contacts }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        const contactsList = (data.profile.contacts || []).map((pc: any) => ({
          id: pc.contact.id,
          fullName: pc.contact.fullName,
          phone: pc.contact.phone,
          relationship: pc.contact.relationship
        }));
        setContacts(contactsList);
        toast.success("Perfil Showcase actualizado con éxito");
      } else {
        toast.error("Error al guardar cambios");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    if (contacts.length >= 5) return toast.warning("Máximo 5 contactos para la demo");
    setContacts([...contacts, { fullName: "", phone: "", relationship: "Familiar" }]);
  };

  const removeContact = (idx: number) => {
    setContacts(contacts.filter((_, i) => i !== idx));
  };

  const updateContact = (idx: number, field: string, value: string) => {
    const newContacts = [...contacts];
    newContacts[idx] = { ...newContacts[idx], [field]: value };
    setContacts(newContacts);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Cargando Infraestructura Showcase...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header Info */}
      <div className="bg-primary/5 rounded-[3rem] p-10 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <Sparkles className="h-32 w-32" />
         </div>
         <div className="relative z-10 text-center md:text-left">
            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
               <ShieldCheck className="h-5 w-5 text-primary" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Obra Maestra - Perfil Demo</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter mb-2">Vitrina Médica PreRescate</h2>
            <p className="text-sm font-bold text-slate-500 max-w-xl">
               Este es el perfil que verá el mundo como ejemplo. Llena cada dato con precisión para demostrar la potencia de nuestro sistema de identificación de emergencia.
            </p>
         </div>
         <div className="flex items-center gap-4 relative z-10">
            <a 
              href={`/e/${chip?.shortCode || 'demo'}`} 
              target="_blank" 
              className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
            >
              Ver Demo <ExternalLink className="h-4 w-4" />
            </a>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Perfil
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Identity & QR */}
         <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
               <div className="text-center group">
                  <div className="relative inline-block">
                     <div className="w-32 h-32 rounded-[2rem] bg-slate-100 mx-auto flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative">
                        {profile.photoUrl ? (
                           <img src={profile.photoUrl} alt="demo" className="w-full h-full object-cover" />
                        ) : (
                           <User className="h-12 w-12 text-slate-300" />
                        )}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                     </div>
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-lg">
                        <Crown className="h-12 w-12 text-yellow-500 fill-yellow-500 animate-bounce" />
                     </div>
                     <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg">
                        <User className="h-5 w-5" />
                     </div>
                  </div>
                  <h3 className="text-xl font-black tracking-tighter mt-6 uppercase leading-none">{profile.firstName} {profile.lastName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Supremo</p>
               </div>

               <div className="pt-8 border-t border-slate-50 space-y-4 text-left">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 group hover:bg-white hover:shadow-xl transition-all duration-500">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chip Físico Asignado</p>
                        <p className="text-xs font-black text-slate-900 mt-1 uppercase italic">{chip?.internalLabel || 'Sin Etiqueta'}</p>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Serial</p>
                           <p className="text-[10px] font-mono font-bold text-slate-600 mb-2">{chip?.serialPublic || '---'}</p>
                        </div>
                        <div>
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">ID (ShortCode)</p>
                           <p className="text-[10px] font-mono font-black text-primary">{chip?.shortCode || '---'}</p>
                        </div>
                     </div>

                     <div className="h-32 w-32 bg-white rounded-2xl mx-auto shadow-md p-2 flex items-center justify-center border border-slate-100 overflow-hidden">
                        {chip?.qrUrl ? (
                           <img src={chip.qrUrl} alt="QR Code" className="max-w-[90%] max-h-[90%] object-contain" />
                        ) : (
                           <QrCode className="h-10 w-10 text-slate-100" />
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                   <ShieldCheck className="h-20 w-20" />
                </div>
                <h4 className="text-lg font-black tracking-tighter flex items-center gap-2 mb-2 italic">
                   Verified Admin <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </h4>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                   Este perfil lleva automáticamente el sello de verificación suprema en la vista pública. No se puede remover por usuarios normales.
                </p>
            </div>
         </div>

         {/* Form Fields */}
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
               <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                     <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-black tracking-tighter uppercase leading-none italic">Protocolo Médico Demo</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nombre en Demo</label>
                     <input 
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold"
                        placeholder="Nombre..."
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Apellido en Demo</label>
                     <input 
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold"
                        placeholder="Apellido..."
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Tipo de Sangre</label>
                     <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-primary" />
                        <select 
                           value={profile.bloodType}
                           onChange={(e) => setProfile({...profile, bloodType: e.target.value})}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold appearance-none hover:bg-slate-100"
                        >
                           {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(t => (
                              <option key={t} value={t}>{t}</option>
                           ))}
                        </select>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Alergias Críticas</label>
                     <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <input 
                           type="text"
                           value={profile.allergies}
                           onChange={(e) => setProfile({...profile, allergies: e.target.value})}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold"
                           placeholder="Ej: Penicilina, Maní..."
                        />
                     </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Condiciones Médicas</label>
                     <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <input 
                           type="text"
                           value={profile.chronicConditions}
                           onChange={(e) => setProfile({...profile, chronicConditions: e.target.value})}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold"
                           placeholder="Ej: Asma, Diabetes Tipo 1..."
                        />
                     </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Medicamentos Actuales</label>
                     <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-emerald-500" />
                        <input 
                           type="text"
                           value={profile.medications}
                           onChange={(e) => setProfile({...profile, medications: e.target.value})}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold"
                           placeholder="Ej: Metformina 500mg..."
                        />
                     </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Información de Vida o Muerte</label>
                     <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-slate-400" />
                        <textarea 
                           value={profile.additionalNotes}
                           onChange={(e) => setProfile({...profile, additionalNotes: e.target.value})}
                           rows={3}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/20 focus:bg-white transition-all text-xs font-bold resize-none"
                           placeholder="Instrucciones cruciales para paramédicos..."
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Contacts Section */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                        <Heart className="h-5 w-5 text-emerald-600" />
                     </div>
                     <h3 className="text-xl font-black tracking-tighter uppercase leading-none italic">Red de Auxilio Demo</h3>
                  </div>
                  <button 
                     onClick={addContact}
                     className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1"
                  >
                     <Plus className="h-4 w-4" /> Agregar
                  </button>
               </div>

               <div className="space-y-4">
                  {contacts.map((c, idx) => (
                     <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-2 duration-300">
                        <input 
                           type="text"
                           value={c.fullName}
                           onChange={(e) => updateContact(idx, "fullName", e.target.value)}
                           className="bg-transparent border-0 focus:ring-0 text-xs font-black uppercase placeholder:opacity-30"
                           placeholder="Nombre Completo"
                        />
                        <input 
                           type="text"
                           value={c.phone}
                           onChange={(e) => updateContact(idx, "phone", e.target.value)}
                           className="bg-transparent border-0 focus:ring-0 text-xs font-mono font-bold"
                           placeholder="Celular"
                        />
                        <select 
                           value={c.relationship}
                           onChange={(e) => updateContact(idx, "relationship", e.target.value)}
                           className="bg-transparent border-0 focus:ring-0 text-[10px] font-black uppercase"
                        >
                           {["Madre", "Padre", "Cónyuge", "Hermano/a", "Hijo/a", "Familiar", "Amigo"].map(r => (
                              <option key={r} value={r}>{r}</option>
                           ))}
                        </select>
                        <div className="flex justify-end pr-2">
                           <button onClick={() => removeContact(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="h-4 w-4" />
                           </button>
                        </div>
                     </div>
                  ))}
                  {contacts.length === 0 && (
                     <p className="text-center py-6 text-xs font-bold text-slate-300 uppercase tracking-widest italic">Añade contactos para completar la simulación</p>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
