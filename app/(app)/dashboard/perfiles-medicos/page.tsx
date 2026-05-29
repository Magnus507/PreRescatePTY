"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, Pencil, Trash2, Loader2, Save, X, 
  UserRound, Phone, ChevronUp, AlertCircle,
  ShieldCheck, Activity, Users, PlusCircle, Smartphone, Zap, ExternalLink
} from "lucide-react";
import { MedicalProfileForm } from "@/components/forms/MedicalProfileForm";

interface AssignedChip {
  id: string;
  serialPublic: string;
  shortCode: string;
}

interface EmergencyContact {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string | null;
  notifySms: boolean;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
}

const RELATIONSHIPS = ["Madre", "Padre", "Cónyuge", "Hermano/a", "Hijo/a", "Abuelo/a", "Amigo/a", "Otro"];

interface FamilyProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayNamePublic: string | null;
  birthDate: string | null;
  sex: string | null;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  additionalNotes: string;
  phone: string | null;
  nationalId: string | null;
  isInsured: boolean;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  preferredHospital: string | null;
  insuranceEmergencyPhone: string | null;
  primaryDoctorName: string | null;
  primaryDoctorPhone: string | null;
  showInsuranceProviderPublic: boolean;
  showPreferredHospitalPublic: boolean;
  showPrimaryDoctorPublic: boolean;
  showPrimaryDoctorPhonePublic: boolean;
  showAdditionalNotesPublic: boolean;
  assignedChips: AssignedChip[];
}

interface FamilyState {
  canAddFamilyMember: boolean;
  familyProfilesCount: number;
  maxProfilesAllocated: number;
}

const emptyForm = {
  firstName: "", lastName: "", displayNamePublic: "", birthDate: "",
  sex: "", bloodType: "O+", allergies: "", chronicConditions: "",
  medications: "", additionalNotes: "", phone: "",
  nationalId: "",
  isInsured: false,
  insuranceProvider: "",
  insurancePolicyNumber: "",
  preferredHospital: "",
  insuranceEmergencyPhone: "",
  primaryDoctorName: "",
  primaryDoctorPhone: "",
  showInsuranceProviderPublic: false,
  showPreferredHospitalPublic: false,
  showPrimaryDoctorPublic: false,
  showPrimaryDoctorPhonePublic: false,
  showAdditionalNotesPublic: false,
};

const emptyContactForm = {
  fullName: "", relationship: "", phone: "", email: "",
  priorityOrder: 1, notifyEmail: true,
};

export default function FamiliaPage() {
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
  const [profilesLoadedAt, setProfilesLoadedAt] = useState<number | null>(null);
  const [ownProfile, setOwnProfile] = useState<FamilyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<FamilyState | null>(null);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [editProfile, setEditProfile] = useState<FamilyProfile | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleting, setDeleting] = useState<string | null>(null);

  // Contacts
  const [expandedContacts, setExpandedContacts] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, EmergencyContact[]>>({});
  const [contactsLoading, setContactsLoading] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ ...emptyContactForm });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [deletingContact, setDeletingContact] = useState<string | null>(null);
  const [availableChips, setAvailableChips] = useState<AssignedChip[]>([]);
  const [assigningChip, setAssigningChip] = useState<string | null>(null);
  const [addingContactToProfile, setAddingContactToProfile] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const [profilesRes, chipsRes] = await Promise.all([
        fetch(`/api/users/perfiles-medicos?t=${Date.now()}`),
        fetch("/api/chips/dashboard")
      ]);
      
      const pData = await profilesRes.json();
      const cData = await chipsRes.json();

      setOwnProfile(pData.ownProfile);
      setFamilyProfiles(pData.familyProfiles || []);
      setProfilesLoadedAt(Date.now());
      setState(pData.state);

      setAvailableChips((cData.chips || []).filter((c: any) => !c.assignedProfileId && c.status === "activated"));
      
    } catch (e) {
      console.error("Error loading family profiles:", e);
      toast.error("Error al cargar los perfiles médicos");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignChip(profileId: string, chipId: string) {
    if (!chipId) return;
    setAssigningChip(profileId);
    try {
      const res = await fetch("/api/chips/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chipId, action: "assign", profileId }),
      });
      if (res.ok) {
        toast.success("Chip vinculado correctamente");
        loadProfiles();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al vincular chip");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setAssigningChip(null);
    }
  }

  function openEdit(profile: FamilyProfile) {
    setEditProfile(profile);
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayNamePublic: profile.displayNamePublic || "",
      birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : "",
      sex: profile.sex || "",
      bloodType: profile.bloodType,
      allergies: profile.allergies || "",
      chronicConditions: profile.chronicConditions || "",
      medications: profile.medications || "",
      additionalNotes: profile.additionalNotes || "",
      phone: profile.phone || "",
      nationalId: profile.nationalId || "",
      isInsured: !!profile.isInsured,
      insuranceProvider: profile.insuranceProvider || "",
      insurancePolicyNumber: profile.insurancePolicyNumber || "",
      preferredHospital: profile.preferredHospital || "",
      insuranceEmergencyPhone: profile.insuranceEmergencyPhone || "",
      primaryDoctorName: profile.primaryDoctorName || "",
      primaryDoctorPhone: profile.primaryDoctorPhone || "",
      showInsuranceProviderPublic: !!profile.showInsuranceProviderPublic,
      showPreferredHospitalPublic: !!profile.showPreferredHospitalPublic,
      showPrimaryDoctorPublic: !!profile.showPrimaryDoctorPublic,
      showPrimaryDoctorPhonePublic: !!profile.showPrimaryDoctorPhonePublic,
      showAdditionalNotesPublic: !!profile.showAdditionalNotesPublic,
    });
    setEditError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSaving(true);
    try {
      const res = await fetch("/api/users/perfiles-medicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      setAddSaving(false);
      if (res.ok) {
        setShowAdd(false);
        setAddForm({ ...emptyForm });
        toast.success("Perfil médico creado con éxito");
        loadProfiles();
      } else {
        const data = await res.json();
        setAddError(data.error || "Error al crear perfil");
      }
    } catch (error) {
      setAddSaving(false);
      setAddError("Error de conexión al servidor");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProfile) return;
    setEditError("");
    setEditSaving(true);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${editProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditSaving(false);
      if (res.ok) {
        setEditProfile(null);
        toast.success("Perfil actualizado");
        loadProfiles();
      } else {
        const data = await res.json();
        setEditError(data.error || "Error al guardar");
      }
    } catch (error) {
      setEditSaving(false);
      setEditError("Error de conexión");
    }
  }

  async function handleDelete(profileId: string, name: string) {
    if (!confirm(`¿Eliminar el perfil de ${name}? Esta acción no se puede deshacer.`)) return;
    setDeleting(profileId);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}`, { method: "DELETE" });
      setDeleting(null);
      if (res.ok) {
        toast.success("Perfil eliminado");
        loadProfiles();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al eliminar");
      }
    } catch (error) {
      setDeleting(null);
      toast.error("Error de conexión");
    }
  }

  async function toggleContacts(profileId: string) {
    if (expandedContacts === profileId) {
      setExpandedContacts(null);
      return;
    }
    setExpandedContacts(profileId);
    if (!contacts[profileId]) {
      setContactsLoading(profileId);
      try {
        const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts`);
        const data = await res.json();
        const fetchedContacts = data.contacts || [];
        setContacts((prev) => ({ ...prev, [profileId]: fetchedContacts }));
      } catch (e) {
        console.error("Error loading contacts:", e);
      } finally {
        setContactsLoading(null);
      }
    }
    setContactForm({ ...emptyContactForm });
    setContactError("");
  }

  async function handleAddContact(e: React.FormEvent, profileId: string) {
    e.preventDefault();
    setContactError("");
    setContactSaving(true);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      setContactSaving(false);
      if (res.ok) {
        const data = await res.json();
        setContacts((prev) => ({
          ...prev,
          [profileId]: [...(prev[profileId] || []), data.contact],
        }));
        setContactForm({ ...emptyContactForm });
        toast.success("Contacto añadido");
        return true;
      } else {
        const data = await res.json();
        setContactError(data.error || "Error al añadir contacto");
        return false;
      }
    } catch (error) {
      setContactSaving(false);
      setContactError("Error de conexión");
      return false;
    }
  }

  async function handleDeleteContact(profileId: string, contactId: string) {
    if (!confirm("¿Deseas eliminar permanentemente a este guardián?")) return;
    setDeletingContact(contactId);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts?id=${contactId}`, {
        method: "DELETE",
      });
      setDeletingContact(null);
      if (res.ok) {
        setContacts((prev) => ({
          ...prev,
          [profileId]: (prev[profileId] || []).filter((c) => c.id !== contactId),
        }));
        toast.success("Guardián eliminado permanentemente");
      }
    } catch (error) {
      setDeletingContact(null);
      toast.error("Error de conexión");
    }
  }

  async function handleUpdateLink(profileId: string, contactId: string, data: any) {
     try {
       const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ id: contactId, ...data }),
       });
       if (res.ok) {
          const result = await res.json();
          setContacts(prev => ({
            ...prev,
            [profileId]: (prev[profileId] || []).map(c => c.id === contactId ? result.contact : c)
          }));
          toast.success("Vínculo actualizado");
       }
     } catch (e) {
       toast.error("Error al actualizar vínculo");
     }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-tight uppercase italic">Sincronizando expedientes médicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-1 uppercase italic">Perfiles Médicos</h1>
          <p className="text-muted-foreground font-medium">Gestiona tu información de emergencia y la de tus protegidos.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); setAddForm({ ...emptyForm }); }}
          disabled={state ? !state.canAddFamilyMember : false}
          className="bg-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Añadir Perfil
        </button>
      </div>

      {state && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className={`p-6 rounded-[2rem] border flex items-center gap-4 ${state.canAddFamilyMember ? 'border-primary/20 bg-primary/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${state.canAddFamilyMember ? 'bg-primary text-white' : 'bg-amber-500 text-white'}`}>
                 <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Capacidad Utilizada</p>
                  <p className="font-black text-lg tracking-tight uppercase italic">
                     {state.familyProfilesCount + 1} de {state.maxProfilesAllocated} perfiles utilizados
                  </p>
              </div>
           </div>

           {!state.canAddFamilyMember && (
             <Link href="/dashboard/upgrade" className="p-6 rounded-[2rem] border border-amber-500/30 bg-amber-500/5 flex items-center justify-between group hover:bg-amber-500/10 transition-all">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center animate-pulse">
                      <PlusCircle className="h-6 w-6" />
                   </div>
                   <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Necesitas más perfiles?</p>
                       <p className="font-black text-lg tracking-tight text-amber-900 uppercase italic leading-none">Amplía tu protección agregando perfiles adicionales.</p>
                   </div>
                </div>
                <ChevronUp className="h-5 w-5 text-amber-500 rotate-90 group-hover:translate-x-1 transition-transform" />
             </Link>
           )}
        </div>
      )}

      {(!ownProfile && familyProfiles.length === 0) ? (
        <div className="text-center py-24 rounded-[3rem] border-2 border-dashed border-border group hover:bg-accent/30 transition-all">
          <div className="h-20 w-20 rounded-[2rem] bg-muted mx-auto mb-6 flex items-center justify-center text-muted-foreground/30 group-hover:scale-110 group-hover:text-primary/30 transition-all">
             <UserRound className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black tracking-tight mb-2 uppercase italic">Sin Configuración Médica</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-medium italic">Aún no se ha detectado el perfil base o adicionales para este registro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {ownProfile && (
            <ProfileCard
              key={ownProfile.id}
              profile={ownProfile}
              onEdit={() => openEdit(ownProfile)}
              onDelete={() => toast.error("No puedes eliminar el perfil principal de la cuenta.")}
              isDeleting={false}
              contactsExpanded={expandedContacts === ownProfile.id}
              onToggleContacts={() => toggleContacts(ownProfile.id)}
              contacts={contacts[ownProfile.id] || []}
              contactsLoading={contactsLoading === ownProfile.id}
              onDeleteContact={(contactId) => handleDeleteContact(ownProfile.id, contactId)}
              deletingContact={deletingContact}
              availableChips={availableChips}
              onAssignChip={(chipId) => handleAssignChip(ownProfile.id, chipId)}
              isAssigning={assigningChip === ownProfile.id}
              onUpdateLink={(contactId, data) => handleUpdateLink(ownProfile.id, contactId, data)}
              isOwn
              profileId={ownProfile.id}
              onStartAddContact={() => { setAddingContactToProfile(ownProfile.id); setContactError(""); setContactForm({...emptyContactForm}); }}
            />
          )}

          {familyProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={() => openEdit(profile)}
              onDelete={() => handleDelete(profile.id, `${profile.firstName} ${profile.lastName}`)}
              isDeleting={deleting === profile.id}
              contactsExpanded={expandedContacts === profile.id}
              onToggleContacts={() => toggleContacts(profile.id)}
              contacts={contacts[profile.id] || []}
              contactsLoading={contactsLoading === profile.id}
              onDeleteContact={(contactId) => handleDeleteContact(profile.id, contactId)}
              deletingContact={deletingContact}
              availableChips={availableChips}
              onAssignChip={(chipId) => handleAssignChip(profile.id, chipId)}
              isAssigning={assigningChip === profile.id}
              onUpdateLink={(contactId, data) => handleUpdateLink(profile.id, contactId, data)}
              profileId={profile.id}
              onStartAddContact={() => { setAddingContactToProfile(profile.id); setContactError(""); setContactForm({...emptyContactForm}); }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <Modal title="Añadir Perfil Médico" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-6">
            {addError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{addError}</p>}
            <MedicalProfileForm 
               form={addForm} 
               onChange={(field, val) => setAddForm(prev => ({ ...prev, [field]: val }))} 
            />
            <div className="flex gap-6 pt-8 border-t border-border/50">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-6 py-4 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">Cancelar</button>
              <button type="submit" disabled={addSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
                {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Guardar Perfil Médico
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editProfile && (
        <Modal title={`Perfil Médico: ${editProfile.firstName}`} onClose={() => setEditProfile(null)}>
          <form onSubmit={handleEdit} className="space-y-6">
            {editError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{editError}</p>}
            <MedicalProfileForm 
               form={editForm} 
               onChange={(field, val) => setEditForm(prev => ({ ...prev, [field]: val }))} 
            />
            <div className="flex gap-6 pt-8 border-t border-border/50">
              <button type="button" onClick={() => setEditProfile(null)} className="flex-1 px-6 py-4 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">Cancelar</button>
              <button type="submit" disabled={editSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Actualizar Perfil
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addingContactToProfile && (
        <Modal title="Añadir Guardián de Emergencia" onClose={() => setAddingContactToProfile(null)}>
           <form onSubmit={(e) => { 
             handleAddContact(e, addingContactToProfile).then(success => {
               if(success) setAddingContactToProfile(null);
             });
           }} className="space-y-6">
              {contactError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{contactError}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Completo</label>
                  <input 
                    type="text" required
                    value={contactForm.fullName}
                    onChange={(e) => setContactForm({...contactForm, fullName: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium italic"
                    placeholder="Ej: María Rodríguez"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Parentesco / Vínculo</label>
                  <select 
                    required
                    value={contactForm.relationship}
                    onChange={(e) => setContactForm({...contactForm, relationship: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium italic"
                  >
                    <option value="">Seleccionar...</option>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Teléfono (con WhatsApp si es posible)</label>
                  <input 
                    type="tel" required
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium italic"
                    placeholder="Ej: 6677-8899"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Correo Electrónico (Opcional)</label>
                  <input 
                    type="email"
                    value={contactForm.email || ""}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium italic"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-8 border-t border-border/50">
                <button type="button" onClick={() => setAddingContactToProfile(null)} className="flex-1 px-6 py-4 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">Cancelar</button>
                <button type="submit" disabled={contactSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
                  {contactSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Guardián
                </button>
              </div>
           </form>
        </Modal>
      )}
    </div>
  );
}

interface ProfileCardProps {
  profile: FamilyProfile;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  contactsExpanded: boolean;
  onToggleContacts: () => void;
  contacts: EmergencyContact[];
  contactsLoading: boolean;
  onDeleteContact: (id: string) => void;
  deletingContact: string | null;
  availableChips: AssignedChip[];
  onAssignChip: (chipId: string) => void;
  isAssigning: boolean;
  onUpdateLink: (id: string, data: any) => void;
  isOwn?: boolean;
  profileId: string;
  onStartAddContact: () => void;
}

function ProfileCard({
   profile, onEdit, onDelete, isDeleting,
   contactsExpanded, onToggleContacts,
   contacts, onDeleteContact, deletingContact,
   availableChips, onAssignChip, isAssigning,
   onUpdateLink, isOwn, profileId,
   onStartAddContact
}: ProfileCardProps) {
  const initials = profile.firstName && profile.lastName 
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : (isOwn ? "TÚ" : "??");

  return (
    <div className={`group overflow-hidden rounded-[2.5rem] border transition-all hover:shadow-2xl hover:shadow-primary/5 ${contactsExpanded ? 'ring-2 ring-primary/20' : ''} ${isOwn ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="p-8 flex flex-col md:flex-row items-start gap-8">
         <div className="relative flex flex-col items-center shrink-0">
            <div className={`h-20 w-20 rounded-[2rem] flex items-center justify-center font-black text-2xl shadow-inner mb-3 ${isOwn ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
               {initials}
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOwn ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
               {isOwn ? 'Tú — Principal' : 'Perfil Adicional'}
            </span>
         </div>

         <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black tracking-tight leading-none">
                      {profile.firstName || "Sin nombre"} {profile.lastName || ""}
                    </h3>
                    {profile.displayNamePublic && (
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter">
                         Alias: {profile.displayNamePublic}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <div className="px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10 text-[11px] font-black text-primary uppercase flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" /> {profile.bloodType}
                     </div>
                     {profile.assignedChips.length > 0 ? (
                       profile.assignedChips.map((c) => (
                         <div key={c.id} className="px-3 py-1.5 rounded-xl bg-success/5 border border-success/10 text-[11px] font-black text-success uppercase flex items-center gap-2">
                            <Smartphone className="h-3.5 w-3.5" /> {c.serialPublic}
                         </div>
                       ))
                     ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-muted border border-border text-[11px] font-black text-muted-foreground uppercase flex items-center gap-2">
                           <AlertCircle className="h-3.5 w-3.5" /> Sin Chip
                        </div>
                     )}
                  </div>
               </div>

                <div className="flex items-center gap-2">
                  {profile.assignedChips.length === 0 && availableChips.length > 0 && (
                    <div className="relative">
                      <select
                        onChange={(e) => onAssignChip(e.target.value)}
                        disabled={isAssigning}
                        className="appearance-none bg-primary/10 text-primary border border-primary/20 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary/20 transition-all pr-8"
                      >
                         <option value="">+ Vincular Chip</option>
                         {availableChips.map(c => (
                           <option key={c.id} value={c.id}>{c.serialPublic}</option>
                         ))}
                      </select>
                      <Plus className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                  {profile.assignedChips?.[0] && (
                    <Link 
                      href={`/e/${profile.assignedChips[0].shortCode}`} 
                      target="_blank"
                      className="p-3 rounded-xl border border-border hover:bg-slate-100 transition-all text-slate-500" 
                      title="Ver Perfil Público"
                    >
                       <ExternalLink className="h-5 w-5" />
                    </Link>
                  )}
                  <button onClick={onEdit} className="p-3 rounded-xl border border-border hover:bg-accent transition-all text-primary" title="Editar Perfil">
                     <Pencil className="h-5 w-5" />
                  </button>
                  <button onClick={onToggleContacts} className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${contactsExpanded ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border hover:bg-accent text-emerald-600'}`}>
                     <Phone className="h-5 w-5" />
                     <span className="text-xs font-black uppercase tracking-tighter hidden sm:inline">Contactos</span>
                  </button>
                  <button onClick={onDelete} disabled={isDeleting} className="p-3 rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-30">
                     {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
               <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TELÉFONO</p>
                  <p className="text-sm font-medium italic">{profile.phone || "—"}</p>
               </div>
               <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ALERGIAS</p>
                  <p className="text-sm font-medium line-clamp-2 italic">{profile.allergies || "Ninguna declarada"}</p>
               </div>
               <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CONDICIONES</p>
                  <p className="text-sm font-medium line-clamp-2 italic">{profile.chronicConditions || "Ninguna declarada"}</p>
               </div>
            </div>
         </div>
      </div>

       {contactsExpanded && (
        <div className="bg-muted/30 border-t border-border p-8 animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h4 className="text-xl font-black tracking-tight flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-primary" /> Guardianes del Perfil
                 </h4>
                 <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Configura los contactos de emergencia exclusivos para este perfil</p>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase bg-white dark:bg-slate-900 border border-border px-4 py-2 rounded-full shadow-sm">
                 Prioridad Automática de Alerta
              </p>
           </div>
 
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-12 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[0, 1, 2].map((idx) => {
                       const c = contacts[idx];
                       if (!c) {
                          return (
                             <button 
                                key={idx} 
                                onClick={onStartAddContact}
                                className="h-32 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/20 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                             >
                                <PlusCircle className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Añadir Guardián {idx + 1}</span>
                             </button>
                          );
                       }
                       return (
                          <div key={c.id} className="p-6 rounded-[2rem] bg-white dark:bg-slate-950 border-2 border-primary/20 shadow-xl shadow-primary/5 flex flex-col gap-4 relative group">
                             <button 
                               onClick={() => onDeleteContact(c.id)} 
                               className="absolute -top-2 -right-2 h-8 w-8 bg-white border border-border shadow-md rounded-full flex items-center justify-center text-destructive hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                               title="Eliminar Guardián"
                             >
                                <Trash2 className="h-4 w-4" />
                             </button>
                             <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">
                                   {c.fullName[0].toUpperCase()}
                                </div>
                                <div>
                                   <p className="font-black text-lg leading-none mb-1">{c.fullName}</p>
                                   <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest">{c.phone}</p>
                                </div>
                             </div>
                             
                             <div className="pt-4 border-t border-border/50">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block opacity-50">Vínculo Configurado:</label>
                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 rounded-2xl flex items-center justify-between">
                                   <span className="text-xs font-black uppercase tracking-tight italic text-primary">{c.relationship}</span>
                                   <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
                                </div>
                             </div>
                             
                             <div className="space-y-3">
                                <button 
                                  onClick={() => onDeleteContact(c.id)}
                                  className="text-[9px] font-black text-destructive uppercase tracking-widest mt-2 hover:underline"
                                >
                                  Eliminar permanentemente
                                </button>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>
       )}
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-none sm:max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/20 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-6 border-b border-border flex items-center justify-between shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div>
            <h3 id="modal-title" className="font-black text-lg sm:text-2xl tracking-tight sm:tracking-tighter">{title}</h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">Completa los datos que podrían ayudar en una emergencia.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar modal" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
        <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto pb-28 sm:pb-10">{children}</div>
      </div>
    </div>
  );
}


