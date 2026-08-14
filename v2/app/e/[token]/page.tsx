import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicContact = {
  name: string;
  relationship: string | null;
  phone: string | null;
  status: string | null;
};

type PublicProfile = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  medical_notes: string | null;
  preferred_hospital: string | null;
  visibility: Record<string, boolean> | null;
  status: string | null;
};

function visibleValue(value: string | null, allowed: boolean | undefined) {
  if (!allowed) return "Restringido por privacidad";
  return value?.trim() ? value : "No reportado";
}

export default async function EmergencyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseServerClient();

  const { data: device } = await supabase
    .from("v2_devices")
    .select("id,device_number,status,public_token,device_type_id")
    .eq("public_token", token)
    .maybeSingle();

  if (!device || device.status !== "active") {
    notFound();
  }

  const { data: assignment } = await supabase
    .from("v2_device_assignments")
    .select("account_id,profile_id")
    .eq("device_id", device.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!assignment) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("v2_profiles")
    .select(
      "id,first_name,last_name,preferred_name,blood_type,allergies,medical_conditions,medications,medical_notes,preferred_hospital,visibility,status",
    )
    .eq("id", assignment.profile_id)
    .eq("account_id", assignment.account_id)
    .eq("status", "active")
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: contacts } = await supabase
    .from("v2_emergency_contacts")
    .select("name,relationship,phone,status")
    .eq("account_id", assignment.account_id)
    .eq("status", "active");

  await supabase.from("v2_scan_events").insert({
    device_id: device.id,
    account_id: assignment.account_id,
    profile_id: profile.id,
    emergency_action_taken: false,
  });

  const publicProfile = profile as PublicProfile;
  const visibility = publicProfile.visibility ?? {};
  const publicContacts = (contacts ?? []) as PublicContact[];

  return (
    <main className="hero" style={{ maxWidth: 980 }}>
      <div className="eyebrow">PreRescatePTY V2 - Perfil de emergencia</div>
      <h1>
        {visibility.name === false
          ? publicProfile.preferred_name || "Persona protegida"
          : publicProfile.preferred_name || `${publicProfile.first_name} ${publicProfile.last_name}`}
      </h1>
      <p>
        Dispositivo activo PRS-{String(device.device_number).padStart(6, "0")} - informacion mostrada con
        filtros de visibilidad.
      </p>

      <section className="section grid">
        <article className="card">
          <div className="eyebrow">Tipo de sangre</div>
          <h2>{visibleValue(publicProfile.blood_type, visibility.bloodType !== false)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Alergias</div>
          <h2>{visibleValue(publicProfile.allergies, visibility.allergies !== false)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Condiciones</div>
          <h2>{visibleValue(publicProfile.medical_conditions, visibility.conditions !== false)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Medicamentos</div>
          <h2>{visibleValue(publicProfile.medications, visibility.medications !== false)}</h2>
        </article>
      </section>

      <section className="section card">
        <div className="eyebrow">Contactos de emergencia</div>
        <div className="list" style={{ marginTop: 12 }}>
          {publicContacts.length === 0 ? (
            <div className="row">
              <strong>Sin contactos visibles</strong>
              <span>No hay contactos activos publicados</span>
            </div>
          ) : (
            publicContacts.map((contact) => (
              <div className="row" key={`${contact.name}-${contact.phone}`}>
                <div>
                  <strong>{contact.name}</strong>
                  <div className="muted">{contact.relationship || "Contacto"}</div>
                </div>
                <span>{contact.phone || "Sin telefono"}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
