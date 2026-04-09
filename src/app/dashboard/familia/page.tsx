"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Trash2, User, Cpu, Loader2, X, Check } from "lucide-react";

interface FamilyProfile {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
  bloodType: string;
  photoUrl: string | null;
  assignedChips: { id: string; shortCode: string; chipAlias: string | null }[];
}

export default function FamiliaPage() {
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    bloodType: "O+",
    relationship: "",
  });

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Pendiente"];

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const res = await fetch("/api/dashboard/profiles");
    const data = await res.json();
    setProfiles(data.profiles || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/dashboard/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Error al crear perfil");
    } else {
      setShowAdd(false);
      setForm({ firstName: "", lastName: "", bloodType: "O+", relationship: "" });
      loadProfiles();
    }
  }

  async function handleDelete(profileId: string, name: string) {
    if (!confirm(`¿Eliminar el perfil de ${name}? Los chips asignados quedarán sin asignar.`)) return;
    const res = await fetch("/api/dashboard/profiles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    if (res.ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } else {
      const data = await res.json();
      alert(data.error || "No se pudo eliminar");
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
            Administra los miembros de tu familia bajo esta cuenta.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Añadir Familiar
        </button>
      </div>

      {/* Profile Cards — Netflix style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {profiles.map((profile) => {
          const isOwner = !!profile.userId;
          const initials =
            (profile.firstName[0] || "") + (profile.lastName[0] || "");
          return (
            <div
              key={profile.id}
              className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
            >
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
                {initials.toUpperCase()}
              </div>

              <div className="text-center">
                <p className="font-bold text-sm">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isOwner ? "Titular" : "Familiar"}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                  {profile.bloodType}
                </span>
              </div>

              {/* Assigned chips */}
              {profile.assignedChips.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-center">
                  {profile.assignedChips.map((c) => (
                    <span
                      key={c.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success/10 text-success text-[10px] font-bold border border-success/20"
                    >
                      <Cpu className="h-3 w-3" />
                      {c.chipAlias || c.shortCode}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Sin chip asignado</p>
              )}

              {/* Delete button — only for family (non-login) profiles */}
              {!isOwner && (
                <button
                  onClick={() => handleDelete(profile.id, `${profile.firstName} ${profile.lastName}`)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                  title="Eliminar perfil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add new card placeholder */}
        <button
          onClick={() => { setShowAdd(true); setError(""); }}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent/30 transition-all min-h-[160px] text-muted-foreground hover:text-primary"
        >
          <Plus className="h-8 w-8" />
          <span className="text-xs font-medium">Añadir Familiar</span>
        </button>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground">
        <strong>Nota:</strong> Para asignar un chip a un perfil, ve a{" "}
        <a href="/dashboard/chips" className="text-primary hover:underline">
          Mis Chips
        </a>{" "}
        y usa el selector "Asignado a" en cada chip.
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Nuevo Perfil Familiar
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                    Nombre *
                  </label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Juan"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                    Apellido *
                  </label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Pérez"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                  Relación
                </label>
                <input
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                  placeholder="Ej: Esposa, Hijo, Madre..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                  Tipo de Sangre
                </label>
                <select
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {bloodTypes.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Creando..." : "Crear Perfil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
