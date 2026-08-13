import { DeviceClaimPanel } from "../../../components/device-claim-panel";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type ProfileOption = {
  id: string;
  first_name: string;
  last_name: string;
  display_name?: string | null;
};

export default async function DispositivosPage() {
  const supabase = createSupabaseServerClient();
  const [devicesResult, profilesResult] = await Promise.all([
    supabase
      .from("v2_devices")
      .select("id,device_number,status,public_token,created_at,device_type_id,profile_id")
      .order("device_number"),
    supabase.from("v2_profiles").select("id,first_name,last_name,display_name").order("first_name"),
  ]);

  const devices = devicesResult.data ?? [];
  const profiles = (profilesResult.data ?? []) as ProfileOption[];

  return (
    <main className="main">
      <div className="eyebrow">Mi protección</div>
      <div className="topbar">
        <div>
          <h1 className="title">Dispositivos</h1>
          <p className="muted">NFC y QR vinculados a tus perfiles.</p>
        </div>
        <span className="badge">{devices.length} registrados</span>
      </div>

      <section className="card">
        <h2>Estado de tus unidades</h2>
        <p className="muted">Aquí verás tus dispositivos, su token público y el perfil enlazado.</p>
        <div className="list" style={{ marginTop: 16 }}>
          {devices.length === 0 ? (
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
                    {device.profile_id ? " · perfil asignado" : " · sin asignar"}
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