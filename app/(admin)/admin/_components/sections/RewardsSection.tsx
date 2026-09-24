"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Award,
  BadgeCheck,
  Gift,
  Globe2,
  Loader2,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type Mission = {
  id: string;
  title: string;
  description: string | null;
  kind: "profile_complete" | "first_device_activated" | "first_paid_order";
  rewardCredits: number;
  status: "draft" | "active" | "paused" | "archived";
  completionCount: number;
};

type Founder = {
  id: string;
  email: string;
  founderNumber: number;
  visible: boolean;
  note: string | null;
  grantedAt: string;
};

type DropOption = {
  id: string;
  title: string;
  status: "draft" | "active";
  prizeLabel: string;
};

type Community = {
  id: string;
  title: string;
  description: string | null;
  metricType: "activated_units" | "activated_members";
  target: number;
  current: number;
  progressPercent: number;
  unlockType:
    | "community_drop"
    | "limited_product"
    | "special_mission"
    | "event"
    | "platform_benefit";
  rewardTitle: string;
  rewardDescription: string | null;
  status: "draft" | "active" | "unlocked" | "archived";
  linkedDrop: {
    id: string;
    title: string;
    status: string;
    prizeLabel: string;
  } | null;
};

type Snapshot = {
  missions: Mission[];
  founders: Founder[];
  community: Community[];
  drops: DropOption[];
};

const EMPTY: Snapshot = {
  missions: [],
  founders: [],
  community: [],
  drops: [],
};

function founderNumber(value: number) {
  return `#${String(value).padStart(4, "0")}`;
}

function missionKindLabel(kind: Mission["kind"]) {
  if (kind === "profile_complete") return "Perfil completo + contacto";
  if (kind === "first_device_activated") return "Primer dispositivo activado";
  return "Primera compra pagada";
}

function metricLabel(metric: Community["metricType"]) {
  return metric === "activated_units" ? "unidades activadas" : "miembros con activación";
}

export function RewardsSection() {
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [missionTitle, setMissionTitle] = useState("");
  const [missionDescription, setMissionDescription] = useState("");
  const [missionKind, setMissionKind] = useState<Mission["kind"]>("profile_complete");
  const [missionCredits, setMissionCredits] = useState("1");

  const [founderEmail, setFounderEmail] = useState("");
  const [founderNote, setFounderNote] = useState("");

  const [communityTitle, setCommunityTitle] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityMetric, setCommunityMetric] =
    useState<Community["metricType"]>("activated_units");
  const [communityTarget, setCommunityTarget] = useState("250");
  const [communityType, setCommunityType] =
    useState<Community["unlockType"]>("community_drop");
  const [communityReward, setCommunityReward] = useState("");
  const [communityRewardDescription, setCommunityRewardDescription] = useState("");
  const [communityDropId, setCommunityDropId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/rewards?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar Rewards.");
      setData(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar Rewards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createMission(event: FormEvent) {
    event.preventDefault();
    setBusy("mission-create");
    try {
      const response = await fetch("/api/admin/rewards/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: missionTitle,
          description: missionDescription,
          kind: missionKind,
          rewardCredits: Number(missionCredits),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo crear la misión.");
      setMissionTitle("");
      setMissionDescription("");
      setMissionCredits("1");
      toast.success("Misión creada como borrador.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la misión.");
    } finally {
      setBusy(null);
    }
  }

  async function missionAction(id: string, action: "activate" | "pause" | "archive" | "draft") {
    setBusy(`mission-${id}`);
    try {
      const response = await fetch(`/api/admin/rewards/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo actualizar la misión.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la misión.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteMission(id: string) {
    if (!confirm("¿Eliminar esta misión? Solo se permite si no tiene completaciones y no está activa.")) return;
    setBusy(`mission-${id}`);
    try {
      const response = await fetch(`/api/admin/rewards/missions/${id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar la misión.");
      toast.success("Misión eliminada.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la misión.");
    } finally {
      setBusy(null);
    }
  }

  async function grantFounder(event: FormEvent) {
    event.preventDefault();
    setBusy("founder-create");
    try {
      const response = await fetch("/api/admin/rewards/founders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: founderEmail, note: founderNote }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo asignar Founding Member.");
      setFounderEmail("");
      setFounderNote("");
      toast.success(`Founding Member ${founderNumber(body.founder.founderNumber)} asignado.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asignar Founding Member.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFounder(founder: Founder) {
    setBusy(`founder-${founder.id}`);
    try {
      const response = await fetch(`/api/admin/rewards/founders/${founder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !founder.visible }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo actualizar Founding Member.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar Founding Member.");
    } finally {
      setBusy(null);
    }
  }

  async function createCommunity(event: FormEvent) {
    event.preventDefault();
    setBusy("community-create");
    try {
      const response = await fetch("/api/admin/rewards/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: communityTitle,
          description: communityDescription,
          metricType: communityMetric,
          target: Number(communityTarget),
          unlockType: communityType,
          rewardTitle: communityReward,
          rewardDescription: communityRewardDescription,
          linkedDropId: communityType === "community_drop" ? communityDropId : null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo crear Community Unlock.");
      setCommunityTitle("");
      setCommunityDescription("");
      setCommunityReward("");
      setCommunityRewardDescription("");
      setCommunityDropId("");
      toast.success("Community Unlock creado como borrador.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear Community Unlock.");
    } finally {
      setBusy(null);
    }
  }

  async function communityAction(id: string, action: "activate" | "deactivate" | "archive") {
    setBusy(`community-${id}`);
    try {
      const response = await fetch(`/api/admin/rewards/community/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo actualizar Community Unlock.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar Community Unlock.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteCommunity(id: string) {
    if (!confirm("¿Eliminar este Community Unlock en borrador?")) return;
    setBusy(`community-${id}`);
    try {
      const response = await fetch(`/api/admin/rewards/community/${id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar Community Unlock.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar Community Unlock.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-violet-200/70 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.12),transparent_36%),white] p-6 shadow-sm dark:border-violet-500/20 dark:bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.13),transparent_36%),#0b1421] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-violet-600">
              <Award className="h-3.5 w-3.5" />
              Pre-Rescate Rewards
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Misiones, Founding Members y Community Unlocks
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Las misiones entregan Bonus Credits genéricos. El cliente decide en qué Drop convertirlos en Bonus Entry. Nunca suman a la meta pagada.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={createMission} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-violet-600" />
            <h3 className="font-black">Crear misión</h3>
          </div>
          <div className="mt-4 space-y-3">
            <input required value={missionTitle} onChange={(e) => setMissionTitle(e.target.value)} placeholder="Nombre de la misión" className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold dark:border-slate-700" />
            <textarea value={missionDescription} onChange={(e) => setMissionDescription(e.target.value)} placeholder="Descripción para el cliente" className="min-h-20 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
            <select value={missionKind} onChange={(e) => setMissionKind(e.target.value as Mission["kind"])} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold dark:border-slate-700">
              <option value="profile_complete">Perfil completo + contacto</option>
              <option value="first_device_activated">Primer dispositivo activado</option>
              <option value="first_paid_order">Primera compra pagada</option>
            </select>
            <input required min={1} max={50} type="number" value={missionCredits} onChange={(e) => setMissionCredits(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold dark:border-slate-700" />
            <button disabled={busy === "mission-create"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white disabled:opacity-50">
              {busy === "mission-create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear misión
            </button>
          </div>
        </form>

        <form onSubmit={grantFounder} className="rounded-[1.75rem] border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-500/20 dark:bg-amber-500/[0.04]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            <h3 className="font-black">Founding Member</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            El número se asigna por secuencia y queda inmutable. Solo puede ocultarse del cliente.
          </p>
          <div className="mt-4 space-y-3">
            <input required type="email" value={founderEmail} onChange={(e) => setFounderEmail(e.target.value)} placeholder="correo@cliente.com" className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold dark:border-amber-500/20 dark:bg-slate-950" />
            <input value={founderNote} onChange={(e) => setFounderNote(e.target.value)} placeholder="Nota interna opcional" className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm dark:border-amber-500/20 dark:bg-slate-950" />
            <button disabled={busy === "founder-create"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-black text-slate-950 disabled:opacity-50">
              {busy === "founder-create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              Asignar fundador
            </button>
          </div>
        </form>

        <form onSubmit={createCommunity} className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/[0.04]">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-black">Community Unlock</h3>
          </div>
          <div className="mt-4 space-y-3">
            <input required value={communityTitle} onChange={(e) => setCommunityTitle(e.target.value)} placeholder="Meta comunitaria" className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold dark:border-emerald-500/20 dark:bg-slate-950" />
            <textarea value={communityDescription} onChange={(e) => setCommunityDescription(e.target.value)} placeholder="Descripción" className="min-h-16 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-500/20 dark:bg-slate-950" />
            <div className="grid grid-cols-2 gap-2">
              <select value={communityMetric} onChange={(e) => setCommunityMetric(e.target.value as Community["metricType"])} className="h-11 rounded-xl border border-emerald-200 bg-white px-2 text-xs font-bold dark:border-emerald-500/20 dark:bg-slate-950">
                <option value="activated_units">Unidades activadas</option>
                <option value="activated_members">Miembros activados</option>
              </select>
              <input min={1} type="number" value={communityTarget} onChange={(e) => setCommunityTarget(e.target.value)} className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold dark:border-emerald-500/20 dark:bg-slate-950" />
            </div>
            <select value={communityType} onChange={(e) => setCommunityType(e.target.value as Community["unlockType"])} className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold dark:border-emerald-500/20 dark:bg-slate-950">
              <option value="community_drop">Desbloquear Community Drop</option>
              <option value="limited_product">Producto edición limitada</option>
              <option value="special_mission">Misión especial</option>
              <option value="event">Evento comunitario</option>
              <option value="platform_benefit">Beneficio de plataforma</option>
            </select>
            {communityType === "community_drop" && (
              <select required value={communityDropId} onChange={(e) => setCommunityDropId(e.target.value)} className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold dark:border-emerald-500/20 dark:bg-slate-950">
                <option value="">Selecciona Drop en borrador</option>
                {data.drops.filter((drop) => drop.status === "draft").map((drop) => (
                  <option key={drop.id} value={drop.id}>{drop.title} · {drop.prizeLabel}</option>
                ))}
              </select>
            )}
            <input required value={communityReward} onChange={(e) => setCommunityReward(e.target.value)} placeholder="Qué se desbloquea" className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold dark:border-emerald-500/20 dark:bg-slate-950" />
            <textarea value={communityRewardDescription} onChange={(e) => setCommunityRewardDescription(e.target.value)} placeholder="Detalle del beneficio" className="min-h-16 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-500/20 dark:bg-slate-950" />
            <button disabled={busy === "community-create"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-50">
              {busy === "community-create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear Community Unlock
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-violet-600" />
            <h3 className="font-black">Misiones</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.missions.length === 0 && <p className="text-sm text-slate-500">No hay misiones creadas.</p>}
            {data.missions.map((mission) => (
              <div key={mission.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{mission.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{missionKindLabel(mission.kind)} · +{mission.rewardCredits} créditos · {mission.completionCount} completadas</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase text-slate-500 dark:bg-slate-900">{mission.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mission.status !== "active" && mission.status !== "archived" && (
                    <button onClick={() => void missionAction(mission.id, "activate")} disabled={busy === `mission-${mission.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white"><Play className="h-3.5 w-3.5" />Activar</button>
                  )}
                  {mission.status === "active" && (
                    <button onClick={() => void missionAction(mission.id, "pause")} disabled={busy === `mission-${mission.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-black text-slate-950"><PauseCircle className="h-3.5 w-3.5" />Pausar</button>
                  )}
                  {mission.status !== "archived" && (
                    <button onClick={() => void missionAction(mission.id, "archive")} disabled={busy === `mission-${mission.id}`} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-black dark:border-slate-700">Archivar</button>
                  )}
                  {mission.status !== "active" && mission.completionCount === 0 && (
                    <button onClick={() => void deleteMission(mission.id)} disabled={busy === `mission-${mission.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-600 dark:border-rose-500/30"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            <h3 className="font-black">Founding Members</h3>
          </div>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
            {data.founders.length === 0 && <p className="text-sm text-slate-500">Todavía no hay fundadores asignados.</p>}
            {data.founders.map((founder) => (
              <div key={founder.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="font-black text-amber-600">{founderNumber(founder.founderNumber)}</p>
                  <p className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">{founder.email}</p>
                </div>
                <button onClick={() => void toggleFounder(founder)} disabled={busy === `founder-${founder.id}`} className={`h-9 rounded-xl px-3 text-xs font-black ${founder.visible ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"}`}>
                  {founder.visible ? "Visible" : "Oculto"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-emerald-600" />
          <h3 className="font-black">Community Unlocks</h3>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {data.community.length === 0 && <p className="text-sm text-slate-500">No hay metas comunitarias creadas.</p>}
          {data.community.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.current} / {item.target} {metricLabel(item.metricType)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase text-slate-500 dark:bg-slate-900">{item.status}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.progressPercent}%` }} />
              </div>
              <p className="mt-3 text-sm font-black text-emerald-700 dark:text-emerald-300"><Gift className="mr-1 inline h-4 w-4" />{item.rewardTitle}</p>
              {item.linkedDrop && <p className="mt-1 text-xs text-slate-500">Drop vinculado: {item.linkedDrop.title}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.status === "draft" && <button onClick={() => void communityAction(item.id, "activate")} disabled={busy === `community-${item.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white"><Play className="h-3.5 w-3.5" />Activar</button>}
                {item.status === "active" && <button onClick={() => void communityAction(item.id, "deactivate")} disabled={busy === `community-${item.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-black text-slate-950"><PauseCircle className="h-3.5 w-3.5" />Desactivar</button>}
                {!["unlocked", "archived"].includes(item.status) && <button onClick={() => void communityAction(item.id, "archive")} disabled={busy === `community-${item.id}`} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-black dark:border-slate-700">Archivar</button>}
                {item.status === "draft" && <button onClick={() => void deleteCommunity(item.id)} disabled={busy === `community-${item.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-600 dark:border-rose-500/30"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
