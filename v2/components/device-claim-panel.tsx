"use client";

import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

type ProfileOption = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
};

type ClaimResult = {
  device_number: number;
  public_token: string;
  public_url: string;
  profile_name: string;
};

export function DeviceClaimPanel({ profiles, onClaimed }: { profiles: ProfileOption[]; onClaimed?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ClaimResult | null>(null);

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
      ),
    [profiles],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);

    const form = new FormData(event.currentTarget);
    const claimCode = String(form.get("claim_code") || "").trim();
    const profileId = String(form.get("profile_id") || "").trim();
    const selectedProfile = sortedProfiles.find((profile) => profile.id === profileId);

    if (!claimCode || !profileId) {
      setBusy(false);
      setError("Escribe el codigo y elige un perfil.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("v2_claim_and_activate_device", {
      p_claim_code: claimCode,
      p_profile_id: profileId,
    });

    setBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setError("No se pudo completar el reclamo.");
      return;
    }

    setResult({
      device_number: Number(row.device_number ?? 0),
      public_token: String(row.public_token ?? ""),
      public_url: row.public_token ? `${window.location.origin}/e/${row.public_token}` : "",
      profile_name: selectedProfile
        ? (selectedProfile.preferred_name || `${selectedProfile.first_name} ${selectedProfile.last_name}`).trim()
        : "Perfil seleccionado",
    });
    event.currentTarget.reset();
    onClaimed?.();
  }

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="eyebrow">Activacion real</div>
      <h2>Reclamar dispositivo</h2>
      <p className="muted">
        Ingresa el codigo de reclamacion, elige el perfil y activa el dispositivo en la misma operacion.
      </p>
      <form className="section" onSubmit={onSubmit}>
        <div className="formgrid">
          <label>
            Codigo de reclamo
            <input name="claim_code" placeholder="PRS-123456" autoComplete="off" />
          </label>
          <label>
            Perfil protegido
            <select name="profile_id" defaultValue="">
              <option value="" disabled>
                Selecciona un perfil
              </option>
              {sortedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {(profile.preferred_name || `${profile.first_name} ${profile.last_name}`).trim()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="errorText">{error}</p> : null}

        {result ? (
          <div className="card" style={{ marginTop: 16, background: "#f8fafc" }}>
            <div className="eyebrow">Dispositivo activo</div>
            <h3 style={{ margin: "6px 0 10px" }}>PRS-{String(result.device_number).padStart(6, "0")}</h3>
            <p className="muted">
              Perfil asignado: <strong>{result.profile_name}</strong>
            </p>
            <p className="muted" style={{ wordBreak: "break-all" }}>
              Enlace publico: {result.public_url}
            </p>
            <p className="muted" style={{ wordBreak: "break-all" }}>
              Token publico: {result.public_token}
            </p>
          </div>
        ) : null}

        <div className="actions">
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Activando..." : "Reclamar y activar"}
          </button>
        </div>
      </form>
    </section>
  );
}
