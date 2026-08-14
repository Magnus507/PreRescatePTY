"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/browser";

type Visibility = {
  name?: boolean;
  bloodType?: boolean;
  allergies?: boolean;
  conditions?: boolean;
  medications?: boolean;
  medicalNotes?: boolean;
  hospital?: boolean;
  contacts?: boolean;
};

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  birth_date: string | null;
  sex: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  medical_notes: string | null;
  insurance_provider: string | null;
  insurance_policy: string | null;
  preferred_hospital: string | null;
  visibility: Visibility | null;
  status: string;
};

const defaultVisibility: Required<Visibility> = {
  name: true,
  bloodType: true,
  allergies: true,
  conditions: true,
  medications: true,
  medicalNotes: false,
  hospital: true,
  contacts: true,
};

function textValue(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function checked(form: FormData, name: keyof Visibility) {
  return form.get(String(name)) === "on";
}

export default function EditarPerfilPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from("v2_profiles")
        .select(
          "id,first_name,last_name,preferred_name,birth_date,sex,blood_type,allergies,medical_conditions,medications,medical_notes,insurance_provider,insurance_policy,preferred_hospital,visibility,status",
        )
        .eq("id", params.id)
        .maybeSingle();

      if (!active) return;

      if (loadError || !data) {
        setError(loadError?.message || "No encontramos este perfil.");
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");

    const form = new FormData(event.currentTarget);
    const visibility: Required<Visibility> = {
      name: checked(form, "name"),
      bloodType: checked(form, "bloodType"),
      allergies: checked(form, "allergies"),
      conditions: checked(form, "conditions"),
      medications: checked(form, "medications"),
      medicalNotes: checked(form, "medicalNotes"),
      hospital: checked(form, "hospital"),
      contacts: checked(form, "contacts"),
    };

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("v2_profiles")
      .update({
        first_name: textValue(form.get("first_name")),
        last_name: textValue(form.get("last_name")),
        preferred_name: textValue(form.get("preferred_name")),
        birth_date: textValue(form.get("birth_date")),
        sex: textValue(form.get("sex")),
        blood_type: textValue(form.get("blood_type")),
        allergies: textValue(form.get("allergies")),
        medical_conditions: textValue(form.get("medical_conditions")),
        medications: textValue(form.get("medications")),
        medical_notes: textValue(form.get("medical_notes")),
        insurance_provider: textValue(form.get("insurance_provider")),
        insurance_policy: textValue(form.get("insurance_policy")),
        preferred_hospital: textValue(form.get("preferred_hospital")),
        visibility,
      })
      .eq("id", params.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved("Perfil actualizado.");
    router.refresh();
  }

  const visibility = { ...defaultVisibility, ...(profile?.visibility ?? {}) };

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <div className="eyebrow">Perfil protegido</div>
          <h1 className="title">Editar informacion medica</h1>
          <p className="muted">Estos datos alimentan el perfil publico de emergencia segun la visibilidad elegida.</p>
        </div>
        <Link className="button secondary" href="/dashboard/perfiles">
          Volver
        </Link>
      </div>

      {loading ? (
        <section className="card">
          <strong>Cargando perfil</strong>
          <p className="muted">Un momento.</p>
        </section>
      ) : profile ? (
        <form className="section card" onSubmit={submit}>
          <div className="formgrid">
            <label>
              Nombre
              <input name="first_name" required defaultValue={profile.first_name} />
            </label>
            <label>
              Apellido
              <input name="last_name" required defaultValue={profile.last_name} />
            </label>
            <label>
              Nombre visible o apodo
              <input name="preferred_name" defaultValue={profile.preferred_name || ""} />
            </label>
            <label>
              Fecha de nacimiento
              <input name="birth_date" type="date" defaultValue={profile.birth_date || ""} />
            </label>
            <label>
              Sexo
              <select name="sex" defaultValue={profile.sex || ""}>
                <option value="">No especificado</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label>
              Tipo de sangre
              <select name="blood_type" defaultValue={profile.blood_type || ""}>
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
            <textarea name="allergies" rows={3} defaultValue={profile.allergies || ""} />
          </label>
          <label>
            Condiciones medicas
            <textarea name="medical_conditions" rows={3} defaultValue={profile.medical_conditions || ""} />
          </label>
          <label>
            Medicamentos
            <textarea name="medications" rows={3} defaultValue={profile.medications || ""} />
          </label>
          <label>
            Notas medicas internas o sensibles
            <textarea name="medical_notes" rows={3} defaultValue={profile.medical_notes || ""} />
          </label>

          <div className="formgrid">
            <label>
              Aseguradora
              <input name="insurance_provider" defaultValue={profile.insurance_provider || ""} />
            </label>
            <label>
              Poliza
              <input name="insurance_policy" defaultValue={profile.insurance_policy || ""} />
            </label>
            <label>
              Hospital preferido
              <input name="preferred_hospital" defaultValue={profile.preferred_hospital || ""} />
            </label>
          </div>

          <section className="card softCard" style={{ marginTop: 18 }}>
            <div className="eyebrow">Visibilidad publica</div>
            <h2>Que se muestra al escanear</h2>
            <div className="switchGrid">
              {[
                ["name", "Nombre"],
                ["bloodType", "Tipo de sangre"],
                ["allergies", "Alergias"],
                ["conditions", "Condiciones"],
                ["medications", "Medicamentos"],
                ["medicalNotes", "Notas medicas"],
                ["hospital", "Hospital"],
                ["contacts", "Contactos"],
              ].map(([key, label]) => (
                <label className="inlineCheck" key={key}>
                  <input name={key} type="checkbox" defaultChecked={visibility[key as keyof Visibility] ?? false} />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {error ? <p className="errorText">{error}</p> : null}
          {saved ? <p className="successText">{saved}</p> : null}

          <div className="actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>
            <Link className="button secondary" href="/dashboard/contactos">
              Gestionar contactos
            </Link>
          </div>
        </form>
      ) : (
        <section className="card">
          <strong>No se pudo abrir el perfil</strong>
          <p className="errorText">{error}</p>
        </section>
      )}
    </main>
  );
}
