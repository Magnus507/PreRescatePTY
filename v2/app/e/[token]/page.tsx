import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicContact = {
  full_name: string;
  relationship: string | null;
  phone: string | null;
  visibility: string | null;
};

type PublicProfile = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  profile_visibility_status: string | null;
  show_allergies_public: boolean | null;
  show_medical_conditions_public: boolean | null;
  show_medications_public: boolean | null;
};

function visibleValue(value: string | null, allowed: boolean | null) {
  if (!allowed) return "Restringido por privacidad";
  return value?.trim() ? value : "No reportado";
}

export default async function EmergencyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseServerClient();

  const { data: device } = await supabase
    .from("v2_devices")
    .select("id,device_number,status,public_token,profile_id,device_type_id")
    .eq("public_token", token)
    .maybeSingle();

  if (!device || device.status !== "active" || !device.profile_id) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("v2_profiles")
    .select(
      "id,first_name,last_name,display_name,blood_type,allergies,medical_conditions,medications,profile_visibility_status,show_allergies_public,show_medical_conditions_public,show_medications_public",
    )
    .eq("id", device.profile_id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: contacts } = await supabase
    .from("v2_emergency_contacts")
    .select("full_name,relationship,phone,visibility")
    .eq("profile_id", profile.id);

  await supabase.from("v2_scan_events").insert({
    profile_id: profile.id,
    source_type: "public_token",
    emergency_action_taken: false,
  });

  const publicProfile = profile as PublicProfile;
  const publicContacts = ((contacts ?? []) as PublicContact[]).filter((contact) => {
    const visibility = (contact.visibility || "public").toLowerCase();
    return visibility !== "private";
  });

  return (
    <main className="hero" style={{ maxWidth: 980 }}>
      <div className="eyebrow">PreRescatePTY V2 · Perfil de emergencia</div>
      <h1>
        {publicProfile.display_name || `${publicProfile.first_name} ${publicProfile.last_name}`}
      </h1>
      <p>
        Dispositivo activo PRS-{String(device.device_number).padStart(6, "0")} · información mostrada con
        filtros de visibilidad.
      </p>

      <section className="section grid">
        <article className="card">
          <div className="eyebrow">Tipo de sangre</div>
          <h2>{publicProfile.blood_type || "No reportado"}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Alergias</div>
          <h2>{visibleValue(publicProfile.allergies, publicProfile.show_allergies_public)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Condiciones</div>
          <h2>{visibleValue(publicProfile.medical_conditions, publicProfile.show_medical_conditions_public)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Medicamentos</div>
          <h2>{visibleValue(publicProfile.medications, publicProfile.show_medications_public)}</h2>
        </article>
      </section>

      <section className="section card">
        <div className="eyebrow">Contactos de emergencia</div>
        <div className="list" style={{ marginTop: 12 }}>
          {publicContacts.length === 0 ? (
            <div className="row">
              <strong>Sin contactos visibles</strong>
              <span>La visibilidad privada quedó oculta</span>
            </div>
          ) : (
            publicContacts.map((contact) => (
              <div className="row" key={`${contact.full_name}-${contact.phone}`}>
                <div>
                  <strong>{contact.full_name}</strong>
                  <div className="muted">{contact.relationship || "Contacto"}</div>
                </div>
                <span>{contact.phone || "Sin teléfono"}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
