"use client";

import { useEffect, useState } from "react";
import { DeviceClaimPanel } from "../../../components/device-claim-panel";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Device = {
  id: string;
  device_number: number;
  status: string;
  public_token: string | null;
};

type ProfileOption = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
};

export default function DispositivosPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const [devicesResult, profilesResult] = await Promise.all([
        supabase.from("v2_devices").select("id,device_number,status,public_token").order("device_number"),
        supabase.from("v2_profiles").select("id,first_name,last_name,preferred_name").order("first_name"),
      ]);

      if (!active) return;

      if (devicesResult.error || profilesResult.error) {
        setError(devicesResult.error?.message || profilesResult.error?.message || "No se pudieron cargar los datos.");
      }

      setDevices(devicesResult.data ?? []);
      setProfiles((profilesResult.data ?? []) as ProfileOption[]);
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
          <h1 className="title">Dispositivos</h1>
          <p className="muted">NFC y QR vinculados a tus perfiles.</p>
        </div>
        <span className="badge">{loading ? "Cargando" : `${devices.length} registrados`}</span>
      </div>

      {error ? (
        <section className="card" style={{ marginBottom: 18 }}>
          <strong>No se pudieron cargar tus dispositivos</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="card">
        <h2>Estado de tus unidades</h2>
        <p className="muted">Aqui veras tus dispositivos, su token publico y el perfil enlazado.</p>
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
            devices.map((device) => (
              <div className="row" key={device.id}>
                <div>
                  <strong>PRS-{String(device.device_number).padStart(6, "0")}</strong>
                  <div className="muted">
                    {device.status}
                    {device.status === "active" ? " - activo" : " - pendiente"}
                  </div>
                </div>
                <span>{device.public_token ? "Token listo" : "Sin token"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <DeviceClaimPanel profiles={profiles} />
    </main>
  );
}
