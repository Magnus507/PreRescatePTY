"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Plus, Pencil, Trash2, Loader2, Save, X, ChevronLeft,
  UserRound, Phone, AlertCircle,
  ShieldCheck, Activity, PlusCircle, Smartphone, ExternalLink,
  Brain, Footprints, MessageCircle,
} from "lucide-react";
import { Camera } from "lucide-react";
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
  photoUrl?: string | null;
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
  // v2 special assistance
  hasCognitiveImpairment: boolean;
  hasWanderingRisk: boolean;
  isNonVerbal: boolean;
  communicationAssistance: string | null;
  safeReturnInstructions: string | null;
  showVulnerabilityStatusPublic: boolean;
  showCommunicationStatusPublic: boolean;
  showSafeReturnPublic: boolean;
  showSafeReturnLocationPublic?: boolean;
  safeReturnLocationName?: string | null;
  safeReturnAddress?: string | null;
  safeReturnLat?: number | null;
  safeReturnLng?: number | null;
  safeReturnContactName?: string | null;
  safeReturnContactPhone?: string | null;
  assignedChips: AssignedChip[];
  profileType?: string;
}

interface FamilyState {
  canAddFamilyMember: boolean;
  familyProfilesCount: number;
  maxProfilesAllocated: number;
}

interface ChipsApiResponse {
  chips?: Array<AssignedChip & { assignedProfileId?: string | null; status?: string }>;
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
  // v2 special assistance
  hasCognitiveImpairment: false,
  hasWanderingRisk: false,
  isNonVerbal: false,
  communicationAssistance: "",
  safeReturnInstructions: "",
  safeReturnLocationName: "",
  safeReturnAddress: "",
  safeReturnLat: "",
  safeReturnLng: "",
  safeReturnContactName: "",
  safeReturnContactPhone: "",
  showVulnerabilityStatusPublic: false,
  showCommunicationStatusPublic: false,
  showSafeReturnPublic: false,
  showSafeReturnLocationPublic: false,
};

const emptyContactForm = {
  fullName: "", relationship: "", phone: "", email: "",
  priorityOrder: 1, notifyEmail: true,
};

export default function FamiliaPage() {
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
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
      
      const pData = await profilesRes.json() as { ownProfile: FamilyProfile | null; familyProfiles?: FamilyProfile[]; state?: FamilyState };
      const cData = await chipsRes.json() as ChipsApiResponse;

      setOwnProfile(pData.ownProfile);
      setFamilyProfiles(pData.familyProfiles || []);
      if (pData.state) {
        setState(pData.state);
      }

      setAvailableChips((cData.chips || []).filter((c) => !c.assignedProfileId && c.status === "activated"));
      
    } catch {
      console.error("Error loading family profiles:");
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
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAssigningChip(null);
    }
  }

  function normalizeProfilePayload(form: typeof addForm) {
    return {
      ...form,
      sex: form.sex || null,
      birthDate: form.birthDate || null,
    };
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
      // v2 special assistance
      hasCognitiveImpairment: !!profile.hasCognitiveImpairment,
      hasWanderingRisk: !!profile.hasWanderingRisk,
      isNonVerbal: !!profile.isNonVerbal,
      communicationAssistance: profile.communicationAssistance || "",
      safeReturnInstructions: profile.safeReturnInstructions || "",
      safeReturnLocationName: profile.safeReturnLocationName || "",
      safeReturnAddress: profile.safeReturnAddress || "",
      safeReturnLat: profile.safeReturnLat != null ? String(profile.safeReturnLat) : "",
      safeReturnLng: profile.safeReturnLng != null ? String(profile.safeReturnLng) : "",
      safeReturnContactName: profile.safeReturnContactName || "",
      safeReturnContactPhone: profile.safeReturnContactPhone || "",
      showVulnerabilityStatusPublic: !!profile.showVulnerabilityStatusPublic,
      showCommunicationStatusPublic: !!profile.showCommunicationStatusPublic,
      showSafeReturnPublic: !!profile.showSafeReturnPublic,
      showSafeReturnLocationPublic: !!profile.showSafeReturnLocationPublic,
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
        body: JSON.stringify(normalizeProfilePayload(addForm)),
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
    } catch {
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
        body: JSON.stringify(normalizeProfilePayload(editForm)),
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
    } catch {
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
    } catch {
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
      } catch {
        console.error("Error loading contacts:");
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
    } catch {
      setContactSaving(false);
      setContactError("Error de conexión");
      return false;
    }
  }

  async function handleDeleteContact(profileId: string, contactId: string) {
    if (!confirm("¿Deseas eliminar permanentemente a este guardián?")) return;
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts?id=${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setContacts((prev) => ({
          ...prev,
          [profileId]: (prev[profileId] || []).filter((c) => c.id !== contactId),
        }));
        toast.success("Guardián eliminado permanentemente");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-500 animate-pulse font-medium tracking-tight uppercase">Sincronizando expedientes médicos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-12">
      <div className={(showAdd || editProfile) ? "hidden" : "block"}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-primary">Protección médica</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">Perfiles médicos</h1>
            <p className="max-w-2xl text-sm md:text-base text-slate-600 font-medium leading-relaxed">
              Gestiona la información de emergencia de tu cuenta y de tus protegidos con una vista clara y cómoda.
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setAddError(""); setAddForm({ ...emptyForm }); }}
            className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-[1.1rem] bg-primary px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_-18px_rgba(218,26,33,0.32)] transition-all hover:-translate-y-px hover:bg-[#B9141B] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
          >
            <Plus className="h-4 w-4" /> Añadir perfil
          </button>
        </div>

        {state && (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.18)] md:p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.28)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 mb-1">Perfiles registrados</p>
                <p className="font-black text-base md:text-lg tracking-tight text-slate-950">
                  {state.familyProfilesCount + 1} {state.familyProfilesCount + 1 === 1 ? "persona" : "personas"} registradas
                </p>
                <p className="mt-1 text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                  La protección se activa al vincular un chip o sticker.
                </p>
              </div>
            </div>
          </div>
        )}

        {(!ownProfile && familyProfiles.length === 0) ? (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-20 text-center shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)] sm:px-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white text-slate-300 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)]">
              <UserRound className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">Sin configuración médica</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
              Aún no se ha detectado un perfil base o adicionales para este registro.
            </p>
            <button
              onClick={() => { setShowAdd(true); setAddError(""); setAddForm({ ...emptyForm }); }}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-[1.05rem] bg-primary px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_34px_-18px_rgba(218,26,33,0.32)] transition-all hover:-translate-y-px hover:bg-[#B9141B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4" />
              Crear primer perfil
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:gap-6">
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
                availableChips={availableChips}
                onAssignChip={(chipId) => handleAssignChip(ownProfile.id, chipId)}
                isAssigning={assigningChip === ownProfile.id}
                isOwn
                onPhotoUpdate={() => loadProfiles()}
                onStartAddContact={() => { setAddingContactToProfile(ownProfile.id); setContactError(""); setContactForm({ ...emptyContactForm }); }}
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
                availableChips={availableChips}
                onAssignChip={(chipId) => handleAssignChip(profile.id, chipId)}
                isAssigning={assigningChip === profile.id}
                onPhotoUpdate={() => loadProfiles()}
                onStartAddContact={() => { setAddingContactToProfile(profile.id); setContactError(""); setContactForm({ ...emptyContactForm }); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── ADD PROFILE: Mobile inline / Desktop modal ── */}
      {showAdd && (
        <>
          {/* Mobile: inline form (no modal, no overlay) */}
          <div className="block md:hidden animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setShowAdd(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-all shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Añadir Perfil Médico</h2>
                <p className="text-xs text-muted-foreground font-medium">Completa los datos que podrían ayudar en una emergencia.</p>
              </div>
            </div>
            <form onSubmit={handleAdd} className="space-y-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
              {addError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{addError}</p>}
              <MedicalProfileForm
                form={addForm}
                onChange={(field, val) => setAddForm(prev => ({ ...prev, [field]: val }))}
              />
              <div className="mt-2 rounded-[1.35rem] border border-border/70 bg-background/95 p-3 shadow-[0_16px_38px_-22px_rgba(15,23,42,0.34)] backdrop-blur-md">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 rounded-[1.05rem] border border-border bg-background px-4 py-3.5 text-sm font-black text-slate-700 transition-all duration-200 ease-out hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addSaving}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-[1.05rem] bg-primary px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(218,26,33,0.9)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_20px_38px_-20px_rgba(218,26,33,1)] active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFF4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1118] motion-reduce:transition-none"
                  >
                    {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="hidden md:block animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Añadir Perfil Médico</h2>
                  <p className="text-sm text-muted-foreground">Completa los datos que podrían ayudar en una emergencia.</p>
                </div>
                <button type="button" onClick={() => setShowAdd(false)} className="h-12 px-5 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">
                  Cerrar
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-6">
                {addError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{addError}</p>}
                <MedicalProfileForm
                  form={addForm}
                  onChange={(field, val) => setAddForm(prev => ({ ...prev, [field]: val }))}
                />
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/50">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-6 py-4 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">Cancelar</button>
                  <button type="submit" disabled={addSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
                    {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Guardar Perfil Médico
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── EDIT PROFILE: Mobile inline / Desktop modal ── */}
      {editProfile && (
        <>
          {/* Mobile: inline form */}
          <div className="block md:hidden animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setEditProfile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-all shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Editar Perfil Médico: {editProfile.firstName}</h2>
                <p className="text-xs text-muted-foreground font-medium">Actualiza los datos de {editProfile.firstName}.</p>
              </div>
            </div>
            <form onSubmit={handleEdit} className="space-y-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
              {editError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{editError}</p>}
              <MedicalProfileForm
                form={editForm}
                onChange={(field, val) => setEditForm(prev => ({ ...prev, [field]: val }))}
              />
              <div className="mt-2 rounded-[1.35rem] border border-border/70 bg-background/95 p-3 shadow-[0_16px_38px_-22px_rgba(15,23,42,0.34)] backdrop-blur-md">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditProfile(null)}
                    className="flex-1 rounded-[1.05rem] border border-border bg-background px-4 py-3.5 text-sm font-black text-slate-700 transition-all duration-200 ease-out hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-[1.05rem] bg-primary px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(218,26,33,0.9)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_20px_38px_-20px_rgba(218,26,33,1)] active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFF4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1118] motion-reduce:transition-none"
                  >
                    {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="hidden md:block animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Editar Perfil Médico: {editProfile.firstName}</h2>
                  <p className="text-sm text-muted-foreground">Actualiza los datos de {editProfile.firstName}.</p>
                </div>
                <button type="button" onClick={() => setEditProfile(null)} className="h-12 px-5 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">
                  Cerrar
                </button>
              </div>
              <form onSubmit={handleEdit} className="space-y-6">
                {editError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{editError}</p>}
                <MedicalProfileForm
                  form={editForm}
                  onChange={(field, val) => setEditForm(prev => ({ ...prev, [field]: val }))}
                />
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/50">
                  <button type="button" onClick={() => setEditProfile(null)} className="flex-1 px-6 py-4 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">Cancelar</button>
                  <button type="submit" disabled={editSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
                    {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Actualizar Perfil
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
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
  availableChips: AssignedChip[];
  onAssignChip: (chipId: string) => void;
  isAssigning: boolean;
  isOwn?: boolean;
  onPhotoUpdate?: () => void;
  onStartAddContact: () => void;
}

function ProfileCard({
   profile, onEdit, onDelete, isDeleting,
   contactsExpanded, onToggleContacts,
   contacts, onDeleteContact,
   availableChips, onAssignChip, isAssigning,
   isOwn,
   onStartAddContact,
   onPhotoUpdate
}: ProfileCardProps) {
  const initials = profile.firstName && profile.lastName 
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : (isOwn ? "TÚ" : "??");

  const [uploading, setUploading] = useState(false);

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const input = document.getElementById(`profile-photo-input-${profile.id}`) as HTMLInputElement | null;
    input?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "profile");
    formData.append("bucket", "profile-photos");
    formData.append("profileId", profile.id);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Foto subida");
        onPhotoUpdate?.();
      } else {
        toast.error("Error al subir la foto");
      }
    } catch {
      console.error("Error uploading profile photo");
      toast.error("Error en la conexión");
    } finally {
      setUploading(false);
    }
  };

  return (
      <div className={`group overflow-hidden rounded-[2rem] border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.22)] focus-within:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.22)] ${contactsExpanded ? 'ring-2 ring-primary/15' : 'border-slate-200'} ${isOwn ? 'shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)]' : 'shadow-[0_16px_34px_-28px_rgba(15,23,42,0.16)]'}`}>
      <div className="p-4 md:p-7 flex flex-col gap-5 md:gap-7">
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
           <div className="flex flex-row items-center gap-3 md:gap-4 shrink-0">
            <div
              onClick={handlePhotoClick}
              className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.5rem] font-black text-xl shadow-inner cursor-pointer md:h-20 md:w-20 md:rounded-[1.75rem] ${isOwn ? 'bg-primary text-white' : 'bg-slate-100 text-slate-900'}`}
            >
               {profile.photoUrl ? (
                 <Image src={profile.photoUrl} alt="Avatar" fill className="object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">{initials}</div>
               )}
               {isOwn && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                   {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                 </div>
               )}
            </div>
            <input type="file" id={`profile-photo-input-${profile.id}`} className="hidden" accept="image/*" onChange={handleFileChange} />
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOwn ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
               {isOwn ? 'Tú — Principal' : 'Perfil Adicional'}
            </span>
           </div>
         </div>

         <div className="flex-1 space-y-5 w-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
               <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-slate-950">
                      {profile.firstName || "Sin nombre"} {profile.lastName || ""}
                    </h3>
                    {profile.displayNamePublic && (
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                        Alias: {profile.displayNamePublic}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-black text-slate-700 uppercase flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-primary" /> {profile.bloodType}
                    </div>
                    {profile.assignedChips.length > 0 ? (
                      profile.assignedChips.map((c) => (
                        <div key={c.id} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-700 uppercase flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5" /> {c.serialPublic}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-700 uppercase flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" /> Sin chip
                      </div>
                    )}
                    {profile.hasCognitiveImpairment && (
                      <div className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-700 uppercase flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5" /> Alzheimer
                      </div>
                    )}
                    {profile.hasWanderingRisk && (
                      <div className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-black text-orange-700 uppercase flex items-center gap-2">
                        <Footprints className="h-3.5 w-3.5" /> Desorientación
                      </div>
                    )}
                    {profile.isNonVerbal && (
                      <div className="px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-[11px] font-black text-violet-700 uppercase flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5" /> No verbal
                      </div>
                    )}
                    {profile.safeReturnInstructions && (
                      <div className="px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-black text-teal-700 uppercase flex items-center gap-2">
                        <Footprints className="h-3.5 w-3.5" /> Retorno seguro
                      </div>
                    )}
                  </div>
               </div>

               <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                  {profile.assignedChips.length === 0 && availableChips.length > 0 && (
                    <div className="relative w-full sm:w-auto">
                      <select
                        onChange={(e) => onAssignChip(e.target.value)}
                        disabled={isAssigning}
                        className="w-full appearance-none rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 pr-9 text-xs font-black uppercase tracking-[0.22em] text-amber-800 cursor-pointer transition-all hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                         <option value="">+ Vincular Chip</option>
                         {availableChips.map(c => (
                           <option key={c.id} value={c.id}>{c.serialPublic}</option>
                         ))}
                      </select>
                      <Plus className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-amber-700" />
                    </div>
                  )}
                  {profile.assignedChips?.[0] && (
                    <Link 
                      href={`/e/${profile.assignedChips[0].shortCode}`} 
                      target="_blank"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-950 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      title="Ver Perfil Público"
                    >
                       <ExternalLink className="h-4 w-4" />
                       <span>Ficha pública</span>
                    </Link>
                  )}
                  <button onClick={onEdit} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-primary shadow-[0_12px_26px_-22px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white" title="Editar Perfil">
                     <Pencil className="h-4 w-4" />
                     <span>Editar</span>
                  </button>
                  <button onClick={onToggleContacts} className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[1rem] border px-4 py-3 text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${contactsExpanded ? 'border-primary bg-primary text-white shadow-[0_14px_28px_-18px_rgba(218,26,33,0.3)]' : 'border-slate-200 bg-white text-emerald-700 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.16)] hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-50'}`}>
                     <Phone className="h-4 w-4" />
                     <span>Contactos</span>
                  </button>
                  <button onClick={onDelete} disabled={isDeleting} className="col-span-2 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-px hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                     {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                     <span>Eliminar</span>
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
               <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Teléfono</p>
                  <p className="text-sm font-medium text-slate-800">{profile.phone || "No indicado"}</p>
               </div>
               <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Alergias</p>
                  <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-800">{profile.allergies || "No indicado"}</p>
               </div>
               <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Condiciones</p>
                  <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-800">{profile.chronicConditions || "No indicado"}</p>
               </div>
            </div>
         </div>
      </div>

       {contactsExpanded && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-6 md:p-8 animate-in slide-in-from-top-4 duration-500">
           <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                 <h4 className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-950">
                    <ShieldCheck className="h-6 w-6 text-primary" /> Contactos de emergencia
                 </h4>
                 <p className="mt-1 text-xs font-semibold text-slate-500">Configura los contactos de emergencia exclusivos para este perfil.</p>
              </div>
              <p className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)]">
                 Prioridad automática de alerta
              </p>
           </div>
 
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-12 space-y-4">
                 <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
                    {[0, 1, 2].map((idx) => {
                       const c = contacts[idx];
                       if (!c) {
                          return (
                             <button 
                                key={idx} 
                                onClick={onStartAddContact}
                                className="h-24 rounded-[1.4rem] border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 transition-all group hover:-translate-y-px hover:border-primary/30 hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                             >
                                <PlusCircle className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.22em]">Añadir Guardián {idx + 1}</span>
                             </button>
                          );
                       }
                        return (
                           <div key={c.id} className="group relative flex flex-col gap-3 rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)] md:p-6">
                             <button 
                                onClick={() => onDeleteContact(c.id)} 
                                className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-destructive shadow-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                title="Eliminar Guardián"
                             >
                                <Trash2 className="h-4 w-4" />
                             </button>
                             <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white shadow-[0_14px_28px_-20px_rgba(15,23,42,0.32)]">
                                   {c.fullName[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                   <p className="truncate text-base font-black leading-tight text-slate-950">{c.fullName}</p>
                                   <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{c.phone}</p>
                                </div>
                             </div>
                             
                             <div className="pt-4 border-t border-border/50">
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Vínculo configurado</label>
                                <div className="flex items-center justify-between rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                                   <span className="text-xs font-black uppercase tracking-[0.18em] text-primary">{c.relationship}</span>
                                   <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
                                </div>
                             </div>
                             
                             <div className="space-y-3">
                                <button 
                                  onClick={() => onDeleteContact(c.id)}
                                  className="mt-2 text-[9px] font-black uppercase tracking-[0.22em] text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
