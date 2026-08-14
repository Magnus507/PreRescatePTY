"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/browser";

function textValue(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

export default function NuevoPerfilPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Debes iniciar sesion para crear un perfil.");
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("v2_account_members")
      .select("account_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      setSaving(false);
      setError(membershipError?.message || "No encontramos una cuenta activa para este usuario.");
      return;
    }

    const { data: profile, error: insertError } = await supabase
      .from("v2_profiles")
      .insert({
        account_id: membership.account_id,
        created_by_user_id: user.id,
        first_name: String(form.get("first_name") || "").trim(),
        last_name: String(form.get("last_name") || "").trim(),
        preferred_name: textValue(form.get("preferred_name")),
        birth_date: textValue(form.get("birth_date")),
        sex: textValue(form.get("sex")),
        blood_type: textValue(form.get("blood_type")),
        allergies: textValue(form.get("allergies")),
        medical_conditions: textValue(form.get("medical_conditions")),
        medications: textValue(form.get("medications")),
        preferred_hospital: textValue(form.get("preferred_hospital")),
        visibility: {
          name: true,
          bloodType: true,
          allergies: true,
          conditions: true,
          medications: true,
          medicalNotes: false,
          hospital: true,
          contacts: true,
        },
      })
      .select("id")
      .single();

    setSaving(false);

    if (insertError || !profile) {
      setError(insertError?.message || "No se pudo crear el perfil.");
      return;
    }

    router.push(`/dashboard/perfiles/${profile.id}`);
    router.refresh();
  }

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <div className="eyebrow">Perfiles</div>
          <h1 className="title">Crear perfil protegido</h1>
          <p className="muted">Registra la informacion esencial para conectar contactos y dispositivos.</p>
        </div>
        <Link className="button secondary" href="/dashboard/perfiles">
          Volver
        </Link>
      </div>

      <form onSubmit={submit} className="section card" style={{ maxWidth: 860 }}>
        <div className="formgrid">
          <label>
            Nombre
            <input name="first_name" required />
          </label>
          <label>
            Apellido
            <input name="last_name" required />
          </label>
          <label>
            Nombre visible o apodo
            <input name="preferred_name" />
          </label>
          <label>
            Fecha de nacimiento
            <input name="birth_date" type="date" />
          </label>
          <label>
            Sexo
            <select name="sex" defaultValue="">
              <option value="">No especificado</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label>
            Tipo de sangre
            <select name="blood_type" defaultValue="">
              <option value="">No especificado</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Alergias
          <textarea name="allergies" rows={3} />
        </label>
        <label>
          Condiciones medicas
          <textarea name="medical_conditions" rows={3} />
        </label>
        <label>
          Medicamentos
          <textarea name="medications" rows={3} />
        </label>
        <label>
          Hospital preferido
          <input name="preferred_hospital" />
        </label>

        {error ? <p className="errorText">{error}</p> : null}
        <div className="actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Crear perfil"}
          </button>
          <Link className="button secondary" href="/dashboard/perfiles">
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
