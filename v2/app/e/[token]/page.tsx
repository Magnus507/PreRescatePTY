import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicContact = {
  name: string;
  relationship: string | null;
  phone: string | null;
};

type PublicProfile = {
  display_name: string;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  medical_notes: string | null;
  preferred_hospital: string | null;
};

type EmergencyPayload = {
  device: {
    device_number: number;
    status: string;
  };
  profile: PublicProfile;
  contacts: PublicContact[];
};

function visibleValue(value: string | null) {
  return value?.trim() ? value : "No reportado";
}

export default async function EmergencyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("v2_get_public_emergency_profile", {
    p_public_token: token,
  });

  if (error || !data) {
    notFound();
  }

  const payload = data as EmergencyPayload;
  const publicProfile = payload.profile;
  const publicContacts = payload.contacts ?? [];

  return (
    <main className="hero" style={{ maxWidth: 980 }}>
      <div className="eyebrow">PreRescatePTY V2 - Perfil de emergencia</div>
      <h1>{publicProfile.display_name}</h1>
      <p>
        Dispositivo activo PRS-{String(payload.device.device_number).padStart(6, "0")} - informacion mostrada con
        filtros de visibilidad.
      </p>

      <section className="section grid">
        <article className="card">
          <div className="eyebrow">Tipo de sangre</div>
          <h2>{visibleValue(publicProfile.blood_type)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Alergias</div>
          <h2>{visibleValue(publicProfile.allergies)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Condiciones</div>
          <h2>{visibleValue(publicProfile.medical_conditions)}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Medicamentos</div>
          <h2>{visibleValue(publicProfile.medications)}</h2>
        </article>
      </section>

      <section className="section card">
        <div className="eyebrow">Hospital preferido</div>
        <h2>{visibleValue(publicProfile.preferred_hospital)}</h2>
      </section>

      <section className="section card">
        <div className="eyebrow">Notas medicas</div>
        <h2>{visibleValue(publicProfile.medical_notes)}</h2>
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
