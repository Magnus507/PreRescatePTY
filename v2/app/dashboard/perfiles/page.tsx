"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  blood_type: string | null;
  birth_date: string | null;
  sex: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  preferred_hospital: string | null;
  status: string;
};

function profileName(profile: Profile) {
  return (profile.preferred_name || `${profile.first_name} ${profile.last_name}`).trim();
}

export default function PerfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from("v2_profiles")
        .select(
          "id,first_name,last_name,preferred_name,blood_type,birth_date,sex,allergies,medical_conditions,medications,preferred_hospital,status",
        )
        .order("created_at", { ascending: false });

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        setProfiles((data ?? []) as Profile[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="main">
      <div className="eyebrow">Mi proteccion</div>
      <div className="topbar">
        <div>
          <h1 className="title">Perfiles</h1>
          <p className="muted">Personas protegidas dentro de tu cuenta. Completa aqui lo que se mostrara al escanear.</p>
        </div>
        <Link className="button" href="/dashboard/perfiles/nuevo">
          Crear perfil
        </Link>
      </div>

      {error ? (
        <section className="card" style={{ marginBottom: 18 }}>
          <strong>No se pudieron cargar tus perfiles</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="card">
        <h2>Tus perfiles protegidos</h2>
        <div className="list" style={{ marginTop: 16 }}>
          {loading ? (
            <div className="row">
              <strong>Cargando perfiles</strong>
              <span>Un momento</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="row">
              <strong>Sin perfiles</strong>
              <span>Crea el primero para reclamar dispositivos</span>
            </div>
          ) : (
            profiles.map((profile) => (
              <Link className="row rowLink" href={`/dashboard/perfiles/${profile.id}`} key={profile.id}>
                <div>
                  <strong>{profileName(profile)}</strong>
                  <div className="muted">
                    {profile.blood_type || "Tipo de sangre no indicado"} - {profile.sex || "sexo no indicado"} -{" "}
                    {profile.status}
                  </div>
                </div>
                <span>
                  {profile.allergies || profile.medical_conditions || profile.medications || profile.preferred_hospital
                    ? "Datos medicos"
                    : "Completar datos"}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
