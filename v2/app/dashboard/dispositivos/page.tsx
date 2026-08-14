"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeviceClaimPanel } from "../../../components/device-claim-panel";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Device = {
  id: string;
  device_number: number;
  status: string;
  public_token: string | null;
  activated_at: string | null;
};

type ProfileOption = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
};

type Assignment = {
  device_id: string;
  profile_id: string;
  assigned_at: string;
  ended_at: string | null;
};

function profileName(profile: ProfileOption) {
  return (profile.preferred_name || `${profile.first_name} ${profile.last_name}`).trim();
}

export default function DispositivosPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const supabase = createSupabaseBrowserClient();
    const [devicesResult, profilesResult, assignmentsResult] = await Promise.all([
      supabase.from("v2_devices").select("id,device_number,status,public_token,activated_at").order("device_number"),
      supabase.from("v2_profiles").select("id,first_name,last_name,preferred_name").order("first_name"),
      supabase
        .from("v2_device_assignments")
        .select("device_id,profile_id,assigned_at,ended_at")
        .is("ended_at", null)
        .order("assigned_at", { ascending: false }),
    ]);

    if (devicesResult.error || profilesResult.error || assignmentsResult.error) {
      setError(
        devicesResult.error?.message ||
          profilesResult.error?.message ||
          assignmentsResult.error?.message ||
          "No se pudieron cargar los datos.",
      );
    }

    setDevices((devicesResult.data ?? []) as Device[]);
    setProfiles((profilesResult.data ?? []) as ProfileOption[]);
    setAssignments((assignmentsResult.data ?? []) as Assignment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function assignmentFor(deviceId: string) {
    return assignments.find((assignment) => assignment.device_id === deviceId);
  }

  function profileFor(profileId: string) {
    return profiles.find((profile) => profile.id === profileId);
  }

  return (
    <main className="main">
      <div className="eyebrow">Mi proteccion</div>
      <div className="topbar">
        <div>
          <h1 className="title">Dispositivos</h1>
          <p className="muted">NFC y QR vinculados a tus perfiles.</p>
        </div>
        <span className="badge">{loading ? "Cargando" : `${devices.length} registrados`}</span>
      </div>

      {error ? (
        <section className="card dangerCard" style={{ marginBottom: 18 }}>
          <strong>No se pudieron cargar tus dispositivos</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="card">
        <h2>Estado de tus unidades</h2>
        <p className="muted">Aqui ves tus dispositivos activos, su perfil enlazado y el enlace publico de prueba.</p>
        <div className="list" style={{ marginTop: 16 }}>
          {loading ? (
            <div className="row">
              <strong>Cargando dispositivos</strong>
              <span>Un momento</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="row">
              <strong>Sin dispositivos activos</strong>
              <span>Reclama el primero abajo</span>
            </div>
          ) : (
            devices.map((device) => {
              const assignment = assignmentFor(device.id);
              const profile = assignment ? profileFor(assignment.profile_id) : null;
              const publicPath = device.public_token ? `/e/${device.public_token}` : "";

              return (
                <div className="row stackRow" key={device.id}>
                  <div>
                    <strong>PRS-{String(device.device_number).padStart(6, "0")}</strong>
                    <div className="muted">
                      {device.status} {device.activated_at ? `- activo desde ${new Date(device.activated_at).toLocaleDateString("es-PA")}` : ""}
                    </div>
                    <div className="muted">
                      Perfil: {profile ? profileName(profile) : assignment ? "Perfil no visible" : "Sin asignacion"}
                    </div>
                  </div>
                  <div className="linkChips">
                    {publicPath ? (
                      <Link className="chip chipLink" href={publicPath} target="_blank">
                        Abrir emergencia
                      </Link>
                    ) : (
                      <span className="chip mutedChip">Sin token</span>
                    )}
                    {device.public_token ? <span className="chip mutedChip">Token listo</span> : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <DeviceClaimPanel profiles={profiles} onClaimed={load} />
    </main>
  );
}
