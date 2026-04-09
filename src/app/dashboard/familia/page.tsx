"use client";

import { useEffect, useState } from "react";
import { BLOOD_TYPES } from "@/lib/constants";
import { Plus, Pencil, Trash2, Cpu, Loader2, Save, X, UserRound } from "lucide-react";

interface AssignedChip {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: string;
  serviceStatus: string;
}

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
  assignedChips: AssignedChip[];
}

const emptyForm = {
  firstName: "", lastName: "", displayNamePublic: "", birthDate: "",
  sex: "", bloodType: "O+", allergies: "", chronicConditions: "",
  medications: "", additionalNotes: "",
};

export default function FamiliaPage() {
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [editProfile, setEditProfile] = useState<FamilyProfile | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const res = await fetch("/api/dashboard/familia");
    const data = await res.json();
    setFamilyProfiles(data.familyProfiles || []);
    setLoading(false);
  }

  function openEdit(profile: FamilyProfile) {
    setEditProfile(profile);
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayNamePublic: profile.displayNamePublic || "",
      birthDate: profile.birthDate || "",
      sex: profile.sex || "",
      bloodType: profile.bloodType,
      allergies: profile.allergies,
      chronicConditions: profile.chronicConditions,
      medications: profile.medications,
      additionalNotes: profile.additionalNotes,
    });
    setEditError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSaving(true);
    const res = await fetch("/api/dashboard/familia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAddSaving(false);
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ ...emptyForm });
      loadProfiles();
    } else {
      const data = await res.json();
      setAddError(data.error || "Error al crear perfil");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProfile) return;
    setEditError("");
    setEditSaving(true);
    const res = await fetch(`/api/dashboard/familia/${editProfile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditProfile(null);
      loadProfiles();
    } else {
      const data = await res.json();
      setEditError(data.error || "Error al guardar");
    }
  }

  async function handleDelete(profileId: string, name: string) {
    if (!confirm(`¿Eliminar el perfil de ${name}? Esta acción no se puede deshacer.`)) return;
    setDeleting(profileId);
    const res = await fetch(`/api/dashboard/familia/${profileId}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      loadProfiles();
    } else {
      const data = await res.json();
      alert(data.error || "Error al eliminar");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Perfiles Familiares</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra los perfiles médicos de tu familia bajo esta cuenta.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); setAddForm({ ...emptyForm }); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Añadir Familiar
        </button>
      </div>

      {familyProfiles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <UserRound className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No tienes perfiles familiares aún.</p>
          <p className="text-sm mt-1">Añade un familiar para gestionar su información médica.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Añadir Familiar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={() => openEdit(profile)}
              onDelete={() => handleDelete(profile.id, `${profile.firstName} ${profile.lastName}`)}
              isDeleting={deleting === profile.id}
            />
          ))}
          <button
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[180px]"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Añadir Familiar</span>
          </button>
        </div>
      )}

      {/* ── Add Modal ──────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Añadir Perfil Familiar" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{addError}</p>}
            <ProfileForm form={addForm} onChange={(f) => setAddForm(f)} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent">Cancelar</button>
              <button type="submit" disabled={addSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {addSaving ? "Guardando..." : "Añadir Familiar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      {editProfile && (
        <Modal
          title={`Editar Perfil: ${editProfile.firstName} ${editProfile.lastName}`}
          onClose={() => setEditProfile(null)}
        >
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{editError}</p>}
            <ProfileForm form={editForm} onChange={(f) => setEditForm(f)} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditProfile(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent">Cancelar</button>
              <button type="submit" disabled={editSaving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Nota: Para asignar un chip a un perfil, ve a{" "}
        <a href="/dashboard/chips" className="text-primary hover:underline">Mis Chips</a>{" "}
        y usa el selector "Asignado a" en cada chip.
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileCard({
  profile, onEdit, onDelete, isDeleting,
}: {
  profile: FamilyProfile;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="p-5 rounded-xl border border-border bg-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{profile.firstName} {profile.lastName}</p>
          <p className="text-xs text-muted-foreground">Familiar</p>
          <p className="text-xs font-medium mt-0.5">{profile.bloodType}</p>
        </div>
      </div>

      {profile.assignedChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.assignedChips.map((chip) => (
            <span key={chip.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-medium">
              <Cpu className="h-3 w-3" /> {chip.serialPublic}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar Perfil Médico
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting || profile.assignedChips.length > 0}
          title={profile.assignedChips.length > 0 ? "Desasigna los chips primero" : "Eliminar perfil"}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ProfileForm({
  form, onChange,
}: {
  form: typeof emptyForm;
  onChange: (f: typeof emptyForm) => void;
}) {
  function set(field: string, value: string) {
    onChange({ ...form, [field]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre *</label>
          <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Juan" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Apellido *</label>
          <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Pérez" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Alias público</label>
          <input value={form.displayNamePublic} onChange={(e) => set("displayNamePublic", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Opcional" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Sexo</label>
          <select value={form.sex} onChange={(e) => set("sex", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Seleccionar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Fecha de Nacimiento</label>
          <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Tipo de Sangre *</label>
          <select required value={form.bloodType} onChange={(e) => set("bloodType", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Alergias</label>
        <textarea value={form.allergies} onChange={(e) => set("allergies", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Ej: Penicilina, Mariscos..." />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Condiciones Crónicas</label>
        <textarea value={form.chronicConditions} onChange={(e) => set("chronicConditions", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Ej: Diabetes Tipo 2..." />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Medicamentos</label>
        <textarea value={form.medications} onChange={(e) => set("medications", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Ej: Metformina 500mg..." />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Notas Adicionales</label>
        <textarea value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Información adicional para emergencias..." />
      </div>
    </div>
  );
}
