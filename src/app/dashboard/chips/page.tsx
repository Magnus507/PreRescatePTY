"use client";

import { useEffect, useState } from "react";
import { Cpu, ExternalLink, Pause, Play } from "lucide-react";

interface ChipData {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: string;
  activatedAt: string;
  serviceStatus: string;
  serviceEndDate: string | null;
  lastScanAt: string | null;
  _count: { scanEvents: number };
}

export default function ChipsPage() {
  const [chips, setChips] = useState<ChipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/chips")
      .then((r) => r.json())
      .then((data) => setChips(data.chips || []))
      .finally(() => setLoading(false));
  }, []);

  async function toggleChip(chipId: string, currentStatus: string) {
    const action = currentStatus === "activated" ? "suspend" : "reactivate";
    const res = await fetch("/api/dashboard/chips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chipId, action }),
    });
    if (res.ok) {
      setChips((prev) =>
        prev.map((c) =>
          c.id === chipId ? { ...c, status: action === "suspend" ? "suspended" : "activated" } : c
        )
      );
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Chips</h1>

      {chips.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Cpu className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No tienes chips activados aún.</p>
          <a href="/activar" className="text-primary font-medium hover:underline text-sm mt-2 inline-block">Activar un chip →</a>
        </div>
      ) : (
        <div className="space-y-4">
          {chips.map((chip) => (
            <div key={chip.id} className="p-5 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  chip.status === "activated" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  <Cpu className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono">{chip.serialPublic}</p>
                    {chip.serviceStatus === "limited" && (
                      <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold tracking-wide uppercase">Modo Lectura</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      chip.status === "activated" ? "bg-success/10 text-success" :
                      chip.status === "suspended" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"}`}>
                      {chip.status}
                    </span>
                    <span>{chip._count.scanEvents} escaneos</span>
                    {chip.lastScanAt && <span>Último: {new Date(chip.lastScanAt).toLocaleDateString("es-PA")}</span>}
                    {chip.serviceEndDate && chip.serviceStatus === "active" && <span>Vence: {new Date(chip.serviceEndDate).toLocaleDateString("es-PA")}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/e/${chip.shortCode}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver público
                </a>
                <button
                  onClick={() => toggleChip(chip.id, chip.status)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    chip.status === "activated"
                      ? "bg-warning/10 text-warning hover:bg-warning/20"
                      : "bg-success/10 text-success hover:bg-success/20"
                  }`}
                >
                  {chip.status === "activated" ? <><Pause className="h-3.5 w-3.5" /> Suspender</> : <><Play className="h-3.5 w-3.5" /> Reactivar</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
