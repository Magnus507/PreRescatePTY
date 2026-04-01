"use client";

import { useEffect, useState } from "react";
import { BLOOD_TYPES } from "@/lib/constants";
import { Loader2, Save, CheckCircle } from "lucide-react";

interface ProfileData {
  firstName: string;
  lastName: string;
  displayNamePublic: string;
  birthDate: string;
  sex: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  additionalNotes: string;
}

export default function PerfilPage() {
  const [form, setForm] = useState<ProfileData>({
    firstName: "", lastName: "", displayNamePublic: "", birthDate: "",
    sex: "", bloodType: "O+", allergies: "", chronicConditions: "",
    medications: "", additionalNotes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isServiceActive, setIsServiceActive] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.isServiceActive !== undefined) {
          setIsServiceActive(data.isServiceActive);
        }
        if (data.profile) {
          setForm({
            firstName: data.profile.firstName || "",
            lastName: data.profile.lastName || "",
            displayNamePublic: data.profile.displayNamePublic || "",
            birthDate: data.profile.birthDate || "",
            sex: data.profile.sex || "",
            bloodType: data.profile.bloodType || "O+",
            allergies: data.profile.allergies || "",
            chronicConditions: data.profile.chronicConditions || "",
            medications: data.profile.medications || "",
            additionalNotes: data.profile.additionalNotes || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/dashboard/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al guardar");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mi Perfil Médico</h1>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success font-medium">
            <CheckCircle className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
        )}

        {!isServiceActive && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm flex items-start gap-4">
            <svg className="w-5 h-5 mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <div>
              <p className="font-semibold mb-1">Servicio de Edición Expirado (Modo Lectura)</p>
              <p>Tu chip sigue funcionando en caso de emergencia, pero has perdido el acceso para actualizar tus datos. <a href="#" className="underline font-medium hover:text-orange-500">Renueva tu servicio</a> para desbloquear todas las funciones.</p>
            </div>
          </div>
        )}

        {/* Personal Info */}
        <div className={`p-6 rounded-xl border border-border bg-card transition-opacity ${!isServiceActive ? "opacity-50 pointer-events-none" : ""}`}>
          <h2 className="font-semibold mb-4">Información Personal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *" id="pf-fn" value={form.firstName} onChange={(v) => update("firstName", v)} required placeholder="Juan" />
            <Field label="Apellido *" id="pf-ln" value={form.lastName} onChange={(v) => update("lastName", v)} required placeholder="Pérez" />
            <Field label="Alias público (opcional)" id="pf-dn" value={form.displayNamePublic} onChange={(v) => update("displayNamePublic", v)} placeholder="Ej: Juan P." />
            <div>
              <label htmlFor="pf-sex" className="block text-sm font-medium mb-1.5">Sexo</label>
              <select id="pf-sex" value={form.sex} onChange={(e) => update("sex", e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <Field label="Fecha de Nacimiento" id="pf-bd" type="date" value={form.birthDate} onChange={(v) => update("birthDate", v)} />
          </div>
        </div>

        {/* Medical Info */}
        <div className={`p-6 rounded-xl border border-border bg-card transition-opacity ${!isServiceActive ? "opacity-50 pointer-events-none" : ""}`}>
          <h2 className="font-semibold mb-4">Información Médica</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pf-bt" className="block text-sm font-medium mb-1.5">Tipo de Sangre *</label>
              <select id="pf-bt" value={form.bloodType} onChange={(e) => update("bloodType", e.target.value)} required className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pf-al" className="block text-sm font-medium mb-1.5">Alergias</label>
              <textarea id="pf-al" value={form.allergies} onChange={(e) => update("allergies", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Ej: Penicilina, Mariscos, Látex..." />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pf-cc" className="block text-sm font-medium mb-1.5">Condiciones Crónicas</label>
              <textarea id="pf-cc" value={form.chronicConditions} onChange={(e) => update("chronicConditions", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Ej: Diabetes Tipo 2, Hipertensión..." />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pf-med" className="block text-sm font-medium mb-1.5">Medicamentos</label>
              <textarea id="pf-med" value={form.medications} onChange={(e) => update("medications", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Ej: Metformina 500mg, Losartán 50mg..." />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pf-notes" className="block text-sm font-medium mb-1.5">Notas Adicionales</label>
              <textarea id="pf-notes" value={form.additionalNotes} onChange={(e) => update("additionalNotes", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Información adicional para emergencias..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving || !isServiceActive} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar Perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, value, onChange, required, placeholder, type = "text" }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">{label}</label>
      <input id={id} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
