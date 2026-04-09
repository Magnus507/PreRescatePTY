"use client";

import { useEffect, useState } from "react";
import { Cpu, ExternalLink, Pause, Play, Tag, User, Check, X } from "lucide-react";

interface ProfileOption {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

interface ChipData {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: string;
  activatedAt: string;
  serviceStatus: string;
  serviceEndDate: string | null;
  lastScanAt: string | null;
  chipAlias: string | null;
  assignedProfile: { id: string; firstName: string; lastName: string } | null;
  _count: { scanEvents: number };
}

export default function ChipsPage() {
  const [chips, setChips] = useState<ChipData[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [aliasInput, setAliasInput] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/chips").then((r) => r.json()),
      fetch("/api/dashboard/profiles").then((r) => r.json()),
    ])
      .then(([chipsData, profilesData]) => {
        setChips(chipsData.chips || []);
        setProfiles(profilesData.profiles || []);
      })
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

  async function assignProfile(chipId: string, profileId: string | null) {
    const res = await fetch("/api/dashboard/chips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chipId, action: "assign-profile", profileId }),
    });
    if (res.ok) {
      const profile = profiles.find((p) => p.id === profileId) ?? null;
      setChips((prev) =>
        prev.map((c) =>
          c.id === chipId
            ? {
                ...c,
                assignedProfile: profile
                  ? { id: profile.id, firstName: profile.firstName, lastName: profile.lastName }
                  : null,
              }
            : c
        )
      );
    }
  }

  async function saveAlias(chipId: string) {
    const res = await fetch("/api/dashboard/chips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chipId, action: "update-alias", alias: aliasInput.trim() }),
    });
    if (res.ok) {
      setChips((prev) =>
        prev.map((c) => (c.id === chipId ? { ...c, chipAlias: aliasInput.trim() || null } : c))
      );
    }
    setEditingAlias(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Chips</h1>

      {chips.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Cpu className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No tienes chips activados aún.</p>
          <a
            href="/activar"
            className="text-primary font-medium hover:underline text-sm mt-2 inline-block"
          >
            Activar un chip →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {chips.map((chip) => (
            <div
              key={chip.id}
              className="p-5 rounded-xl border border-border bg-card flex flex-col gap-4"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      chip.status === "activated"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Cpu className="h-6 w-6" />
                  </div>
                  <div>
                    {/* Alias row */}
                    <div className="flex items-center gap-2 mb-0.5">
                      {editingAlias === chip.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={aliasInput}
                            onChange={(e) => setAliasInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveAlias(chip.id);
                              if (e.key === "Escape") setEditingAlias(null);
                            }}
                            placeholder="Ej: Chip Moto, Sticker Hermano..."
                            className="text-sm border border-input rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary w-52"
                          />
                          <button
                            onClick={() => saveAlias(chip.id)}
                            className="p-1 rounded hover:bg-success/10 text-success"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingAlias(null)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingAlias(chip.id);
                            setAliasInput(chip.chipAlias || "");
                          }}
                          className="flex items-center gap-1.5 group/alias"
                          title="Editar alias del chip"
                        >
                          <Tag className="h-3.5 w-3.5 text-muted-foreground group-hover/alias:text-primary transition-colors" />
                          <span className="text-sm font-semibold group-hover/alias:text-primary transition-colors">
                            {chip.chipAlias || (
                              <span className="font-normal text-muted-foreground italic">
                                Sin alias — click para nombrar
                              </span>
                            )}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-muted-foreground">{chip.serialPublic}</p>
                      {chip.serviceStatus === "limited" && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold tracking-wide uppercase">
                          Modo Lectura
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          chip.status === "activated"
                            ? "bg-success/10 text-success"
                            : chip.status === "suspended"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {chip.status}
                      </span>
                      <span>{chip._count.scanEvents} escaneos</span>
                      {chip.lastScanAt && (
                        <span>
                          Último: {new Date(chip.lastScanAt).toLocaleDateString("es-PA")}
                        </span>
                      )}
                      {chip.serviceEndDate && chip.serviceStatus === "active" && (
                        <span>
                          Vence: {new Date(chip.serviceEndDate).toLocaleDateString("es-PA")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
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
                    {chip.status === "activated" ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> Suspender
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Reactivar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Profile assignment row */}
              {profiles.length > 0 && (
                <div className="flex items-center gap-3 pt-3 border-t border-border/60">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-medium">Asignado a:</span>
                  <select
                    value={chip.assignedProfile?.id || ""}
                    onChange={(e) => assignProfile(chip.id, e.target.value || null)}
                    className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Sin asignar —</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {!p.userId ? " (familiar)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
