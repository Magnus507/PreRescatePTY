"use client";

import { useEffect, useState } from "react";
import { History, MapPin, Smartphone, Monitor } from "lucide-react";

interface Scan {
  id: string;
  scannedAt: string;
  sourceType: string;
  ipAddress: string;
  country: string | null;
  city: string | null;
  geoLat: number | null;
  geoLng: number | null;
  notificationStatus: string;
  chip: { shortCode: string; serialPublic: string };
}

export default function HistorialPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/scans")
      .then((r) => r.json())
      .then((data) => setScans(data.scans || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Historial de Escaneos</h1>

      {scans.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay escaneos registrados aún.</p>
          <p className="text-sm mt-1">Aquí aparecerán cada vez que alguien escanee uno de tus chips.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <div key={scan.id} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    scan.sourceType === "nfc" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      Escaneo {scan.sourceType.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(scan.scannedAt).toLocaleString("es-PA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Panama",
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-mono">{scan.chip.serialPublic}</span>
                      {scan.city && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {scan.city}{scan.country ? `, ${scan.country}` : ""}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        scan.notificationStatus === "sent" ? "bg-success/10 text-success" :
                        scan.notificationStatus === "failed" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"}`}>
                        {scan.notificationStatus === "sent" ? "✓ Notificado" :
                         scan.notificationStatus === "failed" ? "✗ Falló" :
                         scan.notificationStatus === "skipped" ? "— Sin contactos" : "⏳ Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{scan.ipAddress?.substring(0, 15)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
