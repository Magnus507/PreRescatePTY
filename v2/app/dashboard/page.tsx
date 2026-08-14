"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type Metrics = {
  profiles: string;
  devices: string;
  contacts: string;
  lastScan: string;
};

const emptyMetrics: Metrics = {
  profiles: "-",
  devices: "-",
  contacts: "-",
  lastScan: "-",
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const [profiles, devices, contacts, scan] = await Promise.all([
        supabase.from("v2_profiles").select("id", { count: "exact", head: true }),
        supabase.from("v2_devices").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("v2_emergency_contacts").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("v2_scan_events")
          .select("scanned_at")
          .order("scanned_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!active) return;

      const firstError = profiles.error || devices.error || contacts.error || scan.error;
      if (firstError) {
        setError(firstError.message);
      }

      setMetrics({
        profiles: String(profiles.count ?? 0),
        devices: String(devices.count ?? 0),
        contacts: String(contacts.count ?? 0),
        lastScan: scan.data?.scanned_at ? new Date(scan.data.scanned_at).toLocaleString("es-PA") : "Sin actividad",
      });
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    ["Perfiles", metrics.profiles, "Personas protegidas"],
    ["Dispositivos activos", metrics.devices, "NFC y QR vinculados"],
    ["Contactos activos", metrics.contacts, "Personas de auxilio"],
    ["Ultimo escaneo", metrics.lastScan, "Actividad mas reciente"],
  ];

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <div className="eyebrow">Panel del cliente - V2</div>
          <h1 className="title">Mi proteccion</h1>
          <p className="muted">Tu ruta corta: perfil, contactos, dispositivo y prueba publica.</p>
        </div>
        <span className="badge">{loading ? "Conectando" : "Backend conectado"}</span>
      </div>

      {error ? (
        <section className="card dangerCard">
          <strong>Hay datos que no pudieron cargar</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="grid">
        {cards.map(([label, value, detail]) => (
          <article className="card" key={label}>
            <div className="muted">{label}</div>
            <div className="metric">{value}</div>
            <div className="muted">{detail}</div>
          </article>
        ))}
      </section>

      <section className="section card">
        <div className="eyebrow">Primeros pasos</div>
        <h2>Completa tu proteccion</h2>
        <p className="muted">Si estos cuatro pasos estan completos, el flujo Alpha ya se puede probar de punta a punta.</p>
        <div className="list" style={{ marginTop: 16 }}>
          <Link className="row rowLink" href="/dashboard/perfiles/nuevo">
            <strong>Crear o completar perfil medico</strong>
            <span>01</span>
          </Link>
          <Link className="row rowLink" href="/dashboard/contactos">
            <strong>Agregar contactos visibles en emergencia</strong>
            <span>02</span>
          </Link>
          <Link className="row rowLink" href="/dashboard/dispositivos">
            <strong>Reclamar dispositivo con codigo real</strong>
            <span>03</span>
          </Link>
          <Link className="row rowLink" href="/dashboard/actividad">
            <strong>Revisar escaneos registrados</strong>
            <span>04</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
