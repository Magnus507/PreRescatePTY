"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BadgeCheck,
  Coins,
  Gift,
  Globe2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type Mission = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  rewardCredits: number;
  completedAt: string | null;
  eligible: boolean;
};

type Community = {
  id: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  progressPercent: number;
  rewardTitle: string;
  rewardDescription: string | null;
  status: "active" | "unlocked";
  unlockedAt: string | null;
};

type Snapshot = {
  balance: number;
  founder: {
    founderNumber: number;
    grantedAt: string;
  } | null;
  missions: Mission[];
  ledger: Array<{
    id: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  community: Community[];
  activeDrops: Array<{
    id: string;
    title: string;
    prizeLabel: string;
  }>;
};

function founderNumber(value: number) {
  return `#${String(value).padStart(4, "0")}`;
}

export function RewardsPanel({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedDropId, setSelectedDropId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/rewards?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar Rewards.");
      setData(body);
      setSelectedDropId((current) =>
        current && body.activeDrops?.some((drop: { id: string }) => drop.id === current)
          ? current
          : body.activeDrops?.[0]?.id ?? ""
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar Rewards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function claimMission(id: string) {
    setBusy(`mission-${id}`);
    try {
      const response = await fetch(`/api/rewards/missions/${id}/claim`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo reclamar la misión.");
      toast.success(`+${body.mission.rewardCredits} Bonus Credits por ${body.mission.title}.`);
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reclamar la misión.");
    } finally {
      setBusy(null);
    }
  }

  async function spendCredit() {
    if (!selectedDropId) {
      toast.error("Selecciona un Drop activo.");
      return;
    }
    setBusy("spend");
    try {
      const response = await fetch("/api/rewards/credits/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId: selectedDropId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo usar el Bonus Credit.");
      toast.success(`Bonus Entry ${body.entry.code} creado para ${body.drop.title}.`);
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo usar el Bonus Credit.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-40 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1421]">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4 rounded-[2rem] border border-violet-200/70 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.10),transparent_34%),white] p-5 dark:border-violet-500/20 dark:bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.12),transparent_34%),#0b1421] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-violet-600">
            <Sparkles className="h-3.5 w-3.5" />
            Pre-Rescate Rewards
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Tu progreso dentro de la comunidad
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Completa misiones verificadas por el sistema, acumula Bonus Credits y conviértelos en Bonus Entries para el Drop activo que tú elijas.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-black text-violet-700 dark:border-violet-500/20 dark:bg-white/[0.04] dark:text-violet-300">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.05]">
          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
            <Coins className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Bonus Credits</p>
          </div>
          <p className="mt-2 text-4xl font-black tracking-tight">{data.balance}</p>
          <p className="mt-1 text-xs text-slate-500">1 crédito = 1 Bonus Entry.</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.05]">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Award className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Founding Member</p>
          </div>
          {data.founder ? (
            <>
              <p className="mt-2 text-3xl font-black tracking-tight text-amber-700 dark:text-amber-300">{founderNumber(data.founder.founderNumber)}</p>
              <p className="mt-1 text-xs text-slate-500">Número permanente de fundador.</p>
            </>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-500">Sin emblema asignado.</p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.05]">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Globe2 className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Community</p>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight">{data.community.length}</p>
          <p className="mt-1 text-xs text-slate-500">metas visibles actualmente.</p>
        </div>
      </div>

      {data.balance > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-500/20 dark:bg-white/[0.035]">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-violet-600" />
            <p className="font-black text-slate-950 dark:text-white">Usar 1 Bonus Credit</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">El crédito genera una entrada extra, pero no completa la meta comercial del Drop.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select value={selectedDropId} onChange={(e) => setSelectedDropId(e.target.value)} className="h-11 flex-1 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold dark:border-violet-500/20 dark:bg-[#0b1421]">
              {data.activeDrops.length === 0 && <option value="">No hay Drops activos</option>}
              {data.activeDrops.map((drop) => <option key={drop.id} value={drop.id}>{drop.title} · {drop.prizeLabel}</option>)}
            </select>
            <button type="button" disabled={busy === "spend" || !selectedDropId} onClick={() => void spendCredit()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-45">
              {busy === "spend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              Convertir en Bonus Entry
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-violet-600" />
            <h3 className="font-black text-slate-950 dark:text-white">Misiones</h3>
          </div>
          <div className="mt-3 space-y-2">
            {data.missions.length === 0 && <p className="text-sm text-slate-500">No hay misiones activas ahora mismo.</p>}
            {data.missions.map((mission) => (
              <div key={mission.id} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{mission.title}</p>
                    {mission.description && <p className="mt-1 text-xs leading-5 text-slate-500">{mission.description}</p>}
                  </div>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">+{mission.rewardCredits}</span>
                </div>
                <button type="button" disabled={Boolean(mission.completedAt) || !mission.eligible || busy === `mission-${mission.id}`} onClick={() => void claimMission(mission.id)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white disabled:opacity-40 dark:bg-white dark:text-slate-950">
                  {busy === `mission-${mission.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  {mission.completedAt ? "Completada" : mission.eligible ? "Reclamar recompensa" : "Requisito pendiente"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-black text-slate-950 dark:text-white">Community Unlock</h3>
          </div>
          <div className="mt-3 space-y-3">
            {data.community.length === 0 && <p className="text-sm text-slate-500">No hay una meta comunitaria activa.</p>}
            {data.community.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.current} / {item.target}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.status === "unlocked" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/5"}`}>
                    {item.status === "unlocked" ? "Desbloqueado" : `${item.progressPercent}%`}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${item.progressPercent}%` }} />
                </div>
                <p className="mt-3 text-xs font-black text-emerald-700 dark:text-emerald-300"><Gift className="mr-1 inline h-3.5 w-3.5" />{item.rewardTitle}</p>
                {item.rewardDescription && <p className="mt-1 text-xs leading-5 text-slate-500">{item.rewardDescription}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.ledger.length > 0 && (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Movimientos recientes</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {data.ledger.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.03]">
                <p className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">{row.description}</p>
                <span className={`shrink-0 text-xs font-black ${row.amount > 0 ? "text-emerald-600" : "text-violet-600"}`}>{row.amount > 0 ? "+" : ""}{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
