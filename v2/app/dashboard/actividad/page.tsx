"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Scan = {
  id: number;
  scanned_at: string;
  city: string | null;
  country: string | null;
  emergency_action_taken: boolean;
};

function location(scan: Scan) {
  return [scan.city, scan.country].filter(Boolean).join(", ") || "Sin ubicacion";
}

export default function ActividadPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from("v2_scan_events")
        .select("id,scanned_at,city,country,emergency_action_taken")
        .order("scanned_at", { ascending: false })
        .limit(50);

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        setScans((data ?? []) as Scan[]);
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
      <div className="eyebrow">Actividad</div>
      <div className="topbar">
        <div>
          <h1 className="title">Escaneos y actividad</h1>
          <p className="muted">Historial reciente de tus dispositivos.</p>
        </div>
        <span className="badge">{loading ? "Cargando" : `${scans.length} eventos`}</span>
      </div>

      {error ? (
        <section className="card dangerCard" style={{ marginBottom: 18 }}>
          <strong>No se pudo cargar la actividad</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="card">
        {loading ? (
          <p className="muted">Cargando actividad...</p>
        ) : scans.length === 0 ? (
          <p className="muted">Sin actividad todavia. Abre un enlace publico de emergencia para generar el primer evento.</p>
        ) : (
          <div className="list">
            {scans.map((scan) => (
              <div className="row" key={scan.id}>
                <div>
                  <strong>Escaneo #{scan.id}</strong>
                  <div className="muted">{new Date(scan.scanned_at).toLocaleString("es-PA")}</div>
                </div>
                <span>{scan.emergency_action_taken ? "Accion marcada" : location(scan)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
