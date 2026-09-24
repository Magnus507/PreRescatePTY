"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Copy,
  Edit3,
  Gift,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LockKeyhole,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Ticket,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

type BonusCredit = {
  id: string;
  code: string;
  campaign: string;
  claimedByUserId: string | null;
  claimedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type AdminDrop = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  prizeLabel: string;
  imageUrl: string | null;
  targetPasses: number;
  status: "draft" | "active" | "goal_reached" | "closed" | "drawn" | "finalized";
  assignedPurchasePasses: number;
  bonusEntries: number;
  bonusCreditCount: number;
  bonusCredits: BonusCredit[];
  opensAt: string | null;
  goalReachedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  draw: {
    entryCount: number;
    purchaseEntryCount: number;
    bonusEntryCount: number;
    winnerEntryCode: string;
    winnerUserId: string;
    manifestHash: string;
    randomHex: string;
    winnerIndex: number;
    drawnAt: string;
  } | null;
};

type DropDraft = {
  title: string;
  prizeLabel: string;
  targetPasses: string;
  description: string;
  imageUrl: string;
};

const EMPTY_DRAFT: DropDraft = {
  title: "",
  prizeLabel: "",
  targetPasses: "100",
  description: "",
  imageUrl: "",
};

function statusLabel(status: AdminDrop["status"]) {
  const labels: Record<AdminDrop["status"], string> = {
    draft: "Borrador",
    active: "Activo",
    goal_reached: "Meta alcanzada",
    closed: "Cerrado",
    drawn: "Sorteado",
    finalized: "Finalizado",
  };
  return labels[status];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dropToDraft(drop: AdminDrop): DropDraft {
  return {
    title: drop.title,
    prizeLabel: drop.prizeLabel,
    targetPasses: String(drop.targetPasses),
    description: drop.description ?? "",
    imageUrl: drop.imageUrl ?? "",
  };
}

export function DropsSection({ searchQuery = "" }: { searchQuery?: string }) {
  const [drops, setDrops] = useState<AdminDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DropDraft>(EMPTY_DRAFT);

  const [editDropId, setEditDropId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DropDraft>(EMPTY_DRAFT);

  const [bonusDropId, setBonusDropId] = useState<string | null>(null);
  const [bonusEmail, setBonusEmail] = useState("");
  const [bonusReason, setBonusReason] = useState("");
  const [bonusCount, setBonusCount] = useState("1");

  const [creditDropId, setCreditDropId] = useState<string | null>(null);
  const [creditCampaign, setCreditCampaign] = useState("");
  const [creditCount, setCreditCount] = useState("1");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/drops?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudieron cargar los Drops.");
      }
      setDrops(body.drops || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudieron cargar los Drops."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDrop(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch("/api/admin/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          targetPasses: Number(draft.targetPasses),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo crear el Drop.");
      toast.success("Drop creado como borrador.");
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el Drop."
      );
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(
    drop: AdminDrop,
    action: "activate" | "deactivate" | "close" | "finalize"
  ) {
    if (
      action === "deactivate" &&
      !confirm(
        `¿Desactivar “${drop.title}”? Volverá a borrador y dejará de aparecer a los clientes. Los Bonus Credits sin reclamar serán revocados.`
      )
    ) {
      return;
    }

    setActionId(drop.id);
    try {
      const response = await fetch(`/api/admin/drops/${drop.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo actualizar el Drop.");
      }
      toast.success(
        action === "deactivate"
          ? "Drop desactivado y devuelto a borrador."
          : "Estado actualizado."
      );
      setCreditDropId(null);
      setBonusDropId(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el Drop."
      );
    } finally {
      setActionId(null);
    }
  }

  function beginEdit(drop: AdminDrop) {
    setEditDropId(drop.id);
    setEditDraft(dropToDraft(drop));
  }

  async function saveEdit(event: FormEvent, drop: AdminDrop) {
    event.preventDefault();
    setActionId(drop.id);
    try {
      const response = await fetch(`/api/admin/drops/${drop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editDraft,
          targetPasses: Number(editDraft.targetPasses),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo editar el Drop.");
      toast.success("Drop actualizado.");
      setEditDropId(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo editar el Drop."
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteDrop(drop: AdminDrop) {
    const confirmed = confirm(
      `¿Eliminar “${drop.title}” permanentemente? Solo se permitirá si sigue en borrador y no tiene participación real.`
    );
    if (!confirmed) return;

    setActionId(drop.id);
    try {
      const response = await fetch(`/api/admin/drops/${drop.id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar el Drop.");
      toast.success("Drop eliminado.");
      setEditDropId(null);
      setCreditDropId(null);
      setBonusDropId(null);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el Drop."
      );
    } finally {
      setActionId(null);
    }
  }

  async function draw(drop: AdminDrop) {
    if (
      !confirm(
        `¿Ejecutar el sorteo de “${drop.title}”? El resultado será permanente e inmutable.`
      )
    ) {
      return;
    }

    setActionId(drop.id);
    try {
      const response = await fetch(`/api/admin/drops/${drop.id}/draw`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo ejecutar el sorteo.");
      }
      toast.success(
        `Sorteo ejecutado. Entrada ganadora: ${body.draw.winnerEntryCode}`
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo ejecutar el sorteo."
      );
    } finally {
      setActionId(null);
    }
  }

  async function grantBonus(event: FormEvent, drop: AdminDrop) {
    event.preventDefault();
    setActionId(drop.id);
    try {
      const response = await fetch(`/api/admin/drops/${drop.id}/bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: bonusEmail,
          reason: bonusReason,
          count: Number(bonusCount),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo otorgar el bonus.");
      toast.success(
        `${body.count} Bonus Entr${body.count === 1 ? "y" : "ies"} creado${body.count === 1 ? "" : "s"}.`
      );
      setBonusDropId(null);
      setBonusEmail("");
      setBonusReason("");
      setBonusCount("1");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo otorgar el bonus."
      );
    } finally {
      setActionId(null);
    }
  }

  async function generateCredits(event: FormEvent, drop: AdminDrop) {
    event.preventDefault();
    setActionId(drop.id);
    try {
      const response = await fetch(
        `/api/admin/drops/${drop.id}/bonus-credits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaign: creditCampaign,
            count: Number(creditCount),
          }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudieron generar los Bonus Credits.");
      }
      const codes = (body.credits || []).map((credit: { code: string }) => credit.code);
      setGeneratedCodes(codes);
      toast.success(
        `${codes.length} Bonus Credit${codes.length === 1 ? "" : "s"} generado${codes.length === 1 ? "" : "s"}.`
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron generar los Bonus Credits."
      );
    } finally {
      setActionId(null);
    }
  }

  async function copyCodes(codes: string[]) {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Códigos copiados.");
    } catch {
      toast.error("No se pudieron copiar los códigos.");
    }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleDrops = normalizedSearch
    ? drops.filter((drop) =>
        [drop.title, drop.prizeLabel, drop.slug, drop.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : drops;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,.12),transparent_34%),white] p-6 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,.14),transparent_34%),#0b1421] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              <Gift className="h-3.5 w-3.5" />
              Pre-Rescate Drops
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Promociones con trazabilidad y sorteo inmutable
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Los pases pagados completan la meta. Bonus Entries y Bonus Credits
              nunca incrementan el progreso comercial.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </section>

      <form
        onSubmit={createDrop}
        className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black text-slate-950 dark:text-white">
            Crear Drop
          </h3>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Nombre
            </span>
            <input
              required
              value={draft.title}
              onChange={(e) =>
                setDraft((value) => ({ ...value, title: e.target.value }))
              }
              placeholder="DROP #001"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-primary/40 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Premio
            </span>
            <input
              required
              value={draft.prizeLabel}
              onChange={(e) =>
                setDraft((value) => ({ ...value, prizeLabel: e.target.value }))
              }
              placeholder="$400"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-primary/40 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Meta de pases
            </span>
            <input
              required
              min={1}
              max={100000}
              type="number"
              value={draft.targetPasses}
              onChange={(e) =>
                setDraft((value) => ({ ...value, targetPasses: e.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-primary/40 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Imagen URL
            </span>
            <div className="relative">
              <ImageIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={draft.imageUrl}
                onChange={(e) =>
                  setDraft((value) => ({ ...value, imageUrl: e.target.value }))
                }
                placeholder="Opcional"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none focus:border-primary/40 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Descripción
          </span>
          <textarea
            value={draft.description}
            onChange={(e) =>
              setDraft((value) => ({ ...value, description: e.target.value }))
            }
            placeholder="Descripción visible para los clientes"
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary/40 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <div className="mt-5 flex justify-end">
          <button
            disabled={creating}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear borrador
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : visibleDrops.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <Gift className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-slate-600 dark:text-slate-300">
            No hay Drops para mostrar.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {visibleDrops.map((drop) => {
            const progress = Math.min(
              100,
              Math.round((drop.assignedPurchasePasses / drop.targetPasses) * 100)
            );
            const busy = actionId === drop.id;
            const editable = !["drawn", "finalized"].includes(drop.status);
            const canGenerateCredits = ["draft", "active"].includes(drop.status);

            return (
              <article
                key={drop.id}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                {drop.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={drop.imageUrl}
                    alt=""
                    className="h-44 w-full border-b border-slate-200 object-cover dark:border-slate-800"
                  />
                )}

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900">
                          {statusLabel(drop.status)}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {drop.slug}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
                        {drop.title}
                      </h3>
                      <p className="mt-1 text-sm font-black text-primary">
                        {drop.prizeLabel}
                      </p>
                    </div>
                    <Trophy className="h-7 w-7 text-amber-500" />
                  </div>

                  {drop.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {drop.description}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        Pagados
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {drop.assignedPurchasePasses}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        Meta
                      </p>
                      <p className="mt-1 text-xl font-black">{drop.targetPasses}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/5">
                      <p className="text-[8px] font-black uppercase text-amber-600">
                        Bonus
                      </p>
                      <p className="mt-1 text-xl font-black">{drop.bonusEntries}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-500/5">
                      <p className="text-[8px] font-black uppercase text-blue-600">
                        Credits
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {drop.bonusCreditCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span>{progress}%</span>
                    <span>
                      {drop.assignedPurchasePasses}/{drop.targetPasses}
                    </span>
                  </div>

                  {drop.draw && (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-emerald-600" />
                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                          Resultado inmutable
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <p>
                          <strong>Entrada:</strong>{" "}
                          <span className="font-mono">
                            {drop.draw.winnerEntryCode}
                          </span>
                        </p>
                        <p>
                          <strong>Usuario:</strong>{" "}
                          <span className="font-mono">
                            {drop.draw.winnerUserId}
                          </span>
                        </p>
                        <p>
                          <strong>Entradas:</strong> {drop.draw.entryCount} (
                          {drop.draw.purchaseEntryCount} pagadas +{" "}
                          {drop.draw.bonusEntryCount} bonus)
                        </p>
                        <p className="break-all">
                          <strong>Manifest hash:</strong>{" "}
                          <span className="font-mono">
                            {drop.draw.manifestHash}
                          </span>
                        </p>
                        <p>
                          <strong>Fecha:</strong> {formatDate(drop.draw.drawnAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {editable && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          editDropId === drop.id
                            ? setEditDropId(null)
                            : beginEdit(drop)
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>
                    )}

                    {drop.status === "draft" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void changeStatus(drop, "activate")}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                        >
                          <Play className="h-4 w-4" />
                          Activar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteDrop(drop)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </>
                    )}

                    {drop.status === "active" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void changeStatus(drop, "deactivate")}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <PauseCircle className="h-4 w-4" />
                          Desactivar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setBonusDropId(
                              bonusDropId === drop.id ? null : drop.id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300"
                        >
                          <Sparkles className="h-4 w-4" />
                          Bonus directo
                        </button>
                      </>
                    )}

                    {canGenerateCredits && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setCreditDropId(
                            creditDropId === drop.id ? null : drop.id
                          );
                          setGeneratedCodes([]);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-300"
                      >
                        <KeyRound className="h-4 w-4" />
                        Bonus Credits
                      </button>
                    )}

                    {drop.status === "goal_reached" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void changeStatus(drop, "close")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                      >
                        <LockKeyhole className="h-4 w-4" />
                        Cerrar y preparar sorteo
                      </button>
                    )}

                    {drop.status === "closed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void draw(drop)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trophy className="h-4 w-4" />
                        )}
                        Ejecutar sorteo
                      </button>
                    )}

                    {drop.status === "drawn" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void changeStatus(drop, "finalize")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Marcar finalizado
                      </button>
                    )}
                  </div>

                  {editDropId === drop.id && editable && (
                    <form
                      onSubmit={(event) => void saveEdit(event, drop)}
                      className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Editar Drop
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditDropId(null)}
                          className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input
                          required
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft((value) => ({
                              ...value,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Nombre"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          required
                          value={editDraft.prizeLabel}
                          onChange={(e) =>
                            setEditDraft((value) => ({
                              ...value,
                              prizeLabel: e.target.value,
                            }))
                          }
                          placeholder="Premio"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          required
                          min={1}
                          max={100000}
                          type="number"
                          value={editDraft.targetPasses}
                          onChange={(e) =>
                            setEditDraft((value) => ({
                              ...value,
                              targetPasses: e.target.value,
                            }))
                          }
                          placeholder="Meta"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          value={editDraft.imageUrl}
                          onChange={(e) =>
                            setEditDraft((value) => ({
                              ...value,
                              imageUrl: e.target.value,
                            }))
                          }
                          placeholder="URL de imagen o /ruta-interna"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
                        />
                      </div>

                      <textarea
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((value) => ({
                            ...value,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Descripción"
                        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-950"
                      />

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          disabled={busy}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                        >
                          <Save className="h-4 w-4" />
                          Guardar cambios
                        </button>
                        <p className="text-[10px] leading-4 text-slate-400">
                          Premio y meta se bloquean cuando ya existe participación.
                        </p>
                      </div>
                    </form>
                  )}

                  {bonusDropId === drop.id && drop.status === "active" && (
                    <form
                      onSubmit={(event) => void grantBonus(event, drop)}
                      className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-500/15 dark:bg-amber-500/[0.04]"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                        Bonus Entry directo
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Para casos manuales. El cliente recibe la entrada directamente.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_1.5fr_.5fr]">
                        <input
                          required
                          type="email"
                          value={bonusEmail}
                          onChange={(e) => setBonusEmail(e.target.value)}
                          placeholder="correo@cliente.com"
                          className="h-11 rounded-xl border border-amber-200 bg-white px-3 text-xs font-bold outline-none dark:border-amber-500/20 dark:bg-slate-950"
                        />
                        <input
                          required
                          value={bonusReason}
                          onChange={(e) => setBonusReason(e.target.value)}
                          placeholder="Motivo: evento, Instagram…"
                          className="h-11 rounded-xl border border-amber-200 bg-white px-3 text-xs font-bold outline-none dark:border-amber-500/20 dark:bg-slate-950"
                        />
                        <input
                          required
                          type="number"
                          min={1}
                          max={20}
                          value={bonusCount}
                          onChange={(e) => setBonusCount(e.target.value)}
                          className="h-11 rounded-xl border border-amber-200 bg-white px-3 text-xs font-bold outline-none dark:border-amber-500/20 dark:bg-slate-950"
                        />
                      </div>
                      <button
                        disabled={busy}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 disabled:opacity-50"
                      >
                        <Ticket className="h-4 w-4" />
                        Otorgar bonus
                      </button>
                    </form>
                  )}

                  {creditDropId === drop.id && canGenerateCredits && (
                    <div className="mt-5 rounded-2xl border border-blue-200/70 bg-blue-50/40 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.04]">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-blue-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                          Generar Bonus Credits
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        Cada código se reclama una sola vez y crea exactamente 1
                        Bonus Entry. No suma a la meta pagada.
                      </p>

                      <form
                        onSubmit={(event) => void generateCredits(event, drop)}
                        className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto]"
                      >
                        <input
                          required
                          value={creditCampaign}
                          onChange={(e) => setCreditCampaign(e.target.value)}
                          placeholder="Campaña: Evento Motorizados, Instagram…"
                          className="h-11 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold outline-none dark:border-blue-500/20 dark:bg-slate-950"
                        />
                        <input
                          required
                          type="number"
                          min={1}
                          max={100}
                          value={creditCount}
                          onChange={(e) => setCreditCount(e.target.value)}
                          className="h-11 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold outline-none dark:border-blue-500/20 dark:bg-slate-950"
                        />
                        <button
                          disabled={busy}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Generar
                        </button>
                      </form>

                      {generatedCodes.length > 0 && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3 dark:border-blue-500/20 dark:bg-slate-950">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">
                              Códigos recién generados
                            </p>
                            <button
                              type="button"
                              onClick={() => void copyCodes(generatedCodes)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-black text-blue-700 dark:border-blue-500/20 dark:text-blue-300"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copiar todos
                            </button>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {generatedCodes.map((code) => (
                              <code
                                key={code}
                                className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-black text-white"
                              >
                                {code}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {drop.bonusCredits.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Últimos Bonus Credits
                          </p>
                          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                            {drop.bonusCredits.map((credit) => {
                              const state = credit.revokedAt
                                ? "Revocado"
                                : credit.claimedAt
                                  ? "Reclamado"
                                  : "Disponible";
                              return (
                                <div
                                  key={credit.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                                >
                                  <div>
                                    <p className="font-mono text-[11px] font-black text-slate-800 dark:text-slate-100">
                                      {credit.code}
                                    </p>
                                    <p className="mt-0.5 text-[9px] text-slate-400">
                                      {credit.campaign} · {formatDate(credit.createdAt)}
                                    </p>
                                  </div>
                                  <span
                                    className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${
                                      state === "Disponible"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : state === "Reclamado"
                                          ? "bg-blue-500/10 text-blue-600"
                                          : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                    }`}
                                  >
                                    {state}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
