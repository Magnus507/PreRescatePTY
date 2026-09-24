"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Coins,
  Gift,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { RewardsPanel } from "./_components/RewardsPanel";

type DropStatus =
  | "active"
  | "goal_reached"
  | "closed"
  | "drawn"
  | "finalized";

type DropItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  prizeLabel: string;
  imageUrl: string | null;
  targetPasses: number;
  status: DropStatus;
  assignedPurchasePasses: number;
  bonusEntries: number;
  progressPercent: number;
  draw: {
    winnerEntryCode: string;
    drawnAt: string;
  } | null;
};

type DropPass = {
  id: string;
  code: string;
  status: "available" | "assigned";
  earnedAt: string;
  assignedAt: string | null;
  drop: {
    id: string;
    title: string;
    prizeLabel: string;
  } | null;
};

type BonusEntry = {
  id: string;
  code: string;
  reason: string;
  createdAt: string;
  drop: {
    id: string;
    title: string;
    prizeLabel: string;
  };
};

type Snapshot = {
  availablePassCount: number;
  bonusCreditBalance: number;
  drops: DropItem[];
  passes: DropPass[];
  bonusEntries: BonusEntry[];
};

const EMPTY: Snapshot = {
  availablePassCount: 0,
  bonusCreditBalance: 0,
  drops: [],
  passes: [],
  bonusEntries: [],
};

function statusLabel(status: DropStatus) {
  if (status === "active") return "Abierto";
  if (status === "goal_reached") return "Meta alcanzada";
  if (status === "closed") return "Cerrado";
  if (status === "drawn") return "Sorteado";
  return "Finalizado";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DropsPage() {
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [assigningDropId, setAssigningDropId] = useState<string | null>(null);
  const [assigningCreditDropId, setAssigningCreditDropId] = useState<string | null>(null);
  const [bonusCreditCode, setBonusCreditCode] = useState("");
  const [redeemingCredit, setRedeemingCredit] = useState(false);
  const [passGrantCode, setPassGrantCode] = useState("");
  const [redeemingPass, setRedeemingPass] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/drops?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudieron cargar los Drops.");
      }
      setData(body);
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

  const availablePass = useMemo(
    () => data.passes.find((pass) => pass.status === "available") ?? null,
    [data.passes]
  );

  const userEntryCodes = useMemo(
    () =>
      new Set([
        ...data.passes.map((pass) => pass.code),
        ...data.bonusEntries.map((entry) => entry.code),
      ]),
    [data.bonusEntries, data.passes]
  );

  async function redeemCredit() {
    const code = bonusCreditCode.trim();
    if (!code) {
      toast.error("Ingresa tu Bonus Credit.");
      return;
    }

    setRedeemingCredit(true);
    try {
      const response = await fetch("/api/drops/bonus-credits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo reclamar el Bonus Credit.");
      }

      toast.success(
        `Bonus Credit reclamado. Recibiste la entrada ${body.entry.code} para ${body.drop.title}.`
      );
      setBonusCreditCode("");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo reclamar el Bonus Credit."
      );
    } finally {
      setRedeemingCredit(false);
    }
  }

  async function redeemPassCode() {
    const code = passGrantCode.trim();
    if (!code) {
      toast.error("Ingresa tu código especial de Drop Pass.");
      return;
    }

    setRedeemingPass(true);
    try {
      const response = await fetch("/api/drops/pass-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo reclamar el Drop Pass.");
      }

      toast.success(`Drop Pass ${body.pass.code} agregado a tu saldo.`);
      setPassGrantCode("");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo reclamar el Drop Pass."
      );
    } finally {
      setRedeemingPass(false);
    }
  }

  async function assignCredit(dropId: string) {
    if (data.bonusCreditBalance < 1) {
      toast.error("No tienes Bonus Credits disponibles.");
      return;
    }

    setAssigningCreditDropId(dropId);
    try {
      const response = await fetch("/api/rewards/credits/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo asignar el Bonus Credit.");
      }

      toast.success(
        `Bonus Credit asignado. Entrada ${body.entry.code} creada para ${body.drop.title}.`
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo asignar el Bonus Credit."
      );
    } finally {
      setAssigningCreditDropId(null);
    }
  }

  async function assignPass(dropId: string) {
    if (!availablePass) {
      toast.error("No tienes Drop Pass disponibles.");
      return;
    }

    setAssigningDropId(dropId);
    try {
      const response = await fetch(
        `/api/drops/passes/${availablePass.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dropId }),
        }
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "No se pudo asignar el pase.");
      }

      toast.success(
        body.goalReached
          ? "Pase asignado. Este Drop alcanzó su meta."
          : "Drop Pass asignado."
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo asignar el pase."
      );
    } finally {
      setAssigningDropId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#101826]">
          <Loader2 className="h-7 w-7 animate-spin text-[#DA1A21]" />
        </div>
        <p className="text-sm font-black text-slate-500">
          Preparando tus Drop Passes…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,.14),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,.3)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,.16),transparent_34%),linear-gradient(135deg,#0c1422_0%,#07111d_100%)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DA1A21]/15 bg-[#DA1A21]/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-[#DA1A21]">
              <Sparkles className="h-3.5 w-3.5" />
              Pre-Rescate Drops
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
              Tus compras ahora pueden abrir nuevas oportunidades.
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Cada $25 de compras elegibles genera 1 Drop Pass. Tú decides a
              cuál Drop asignarlo. Una vez asignado, el pase queda fijo.
            </p>
          </div>

          <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                Drop Pass disponibles
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-5xl font-black tracking-[-0.06em] text-slate-950 dark:text-white">
                  {data.availablePassCount}
                </span>
                <Ticket className="mb-1 h-7 w-7 text-[#DA1A21]" />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-violet-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-violet-500/20 dark:bg-white/[0.04]">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-500">
                Bonus Credits disponibles
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-5xl font-black tracking-[-0.06em] text-slate-950 dark:text-white">
                  {data.bonusCreditBalance}
                </span>
                <Coins className="mb-1 h-7 w-7 text-violet-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <RewardsPanel onChanged={load} balanceOverride={data.bonusCreditBalance} />

      <section className="rounded-[1.75rem] border border-blue-200/70 bg-blue-50/50 p-5 dark:border-blue-500/20 dark:bg-blue-500/[0.04] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <h2 className="font-black text-slate-950 dark:text-white">
                ¿Tienes un Bonus Credit?
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              Ingresa el código que recibiste. Cada Bonus Credit válido se puede
              reclamar una sola vez y genera exactamente 1 Bonus Entry para el
              Drop asociado. No suma a la meta pagada.
            </p>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <input
              value={bonusCreditCode}
              onChange={(event) =>
                setBonusCreditCode(event.target.value.toUpperCase())
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void redeemCredit();
                }
              }}
              placeholder="BC-XXXX-XXXX-XXXX"
              autoComplete="off"
              className="h-12 flex-1 rounded-2xl border border-blue-200 bg-white px-4 font-mono text-sm font-black uppercase tracking-wide text-slate-800 outline-none focus:border-blue-500 dark:border-blue-500/20 dark:bg-[#0b1421] dark:text-white"
            />
            <button
              type="button"
              disabled={redeemingCredit || !bonusCreditCode.trim()}
              onClick={() => void redeemCredit()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-45"
            >
              {redeemingCredit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Reclamar Bonus
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-rose-200/70 bg-rose-50/40 p-5 dark:border-rose-500/20 dark:bg-rose-500/[0.04] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-[#DA1A21]" />
              <h2 className="font-black text-slate-950 dark:text-white">
                ¿Tienes un código especial de Drop Pass?
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              Los códigos DPG son para soporte o correcciones. Cada código válido se usa una sola vez y agrega 1 Drop Pass disponible a tu cuenta.
            </p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <input
              value={passGrantCode}
              onChange={(event) => setPassGrantCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void redeemPassCode();
                }
              }}
              placeholder="DPG-XXXX-XXXX-XXXX"
              autoComplete="off"
              className="h-12 flex-1 rounded-2xl border border-rose-200 bg-white px-4 font-mono text-sm font-black uppercase tracking-wide text-slate-800 outline-none focus:border-[#DA1A21] dark:border-rose-500/20 dark:bg-[#0b1421] dark:text-white"
            />
            <button
              type="button"
              disabled={redeemingPass || !passGrantCode.trim()}
              onClick={() => void redeemPassCode()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-5 text-sm font-black text-white disabled:opacity-45"
            >
              {redeemingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Reclamar Pass
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#DA1A21]">
              Drops
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Elige dónde participar
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-[#DA1A21]/25 hover:text-[#DA1A21] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {data.drops.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
            <Gift className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 font-black text-slate-700 dark:text-slate-200">
              Todavía no hay Drops publicados.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tus pases disponibles permanecerán guardados.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.drops.map((drop) => {
              const isOpen = drop.status === "active";
              const isWinner = Boolean(
                drop.draw?.winnerEntryCode &&
                  userEntryCodes.has(drop.draw.winnerEntryCode)
              );

              return (
                <article
                  key={drop.id}
                  className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1421]"
                >
                  {drop.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={drop.imageUrl}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(218,26,33,.15),transparent_55%),linear-gradient(135deg,#0d1725,#07111d)]">
                      <Gift className="h-12 w-12 text-white/80" />
                    </div>
                  )}

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-white/5 dark:text-slate-300">
                          {statusLabel(drop.status)}
                        </span>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                          {drop.title}
                        </h3>
                        <p className="mt-1 text-sm font-black text-[#DA1A21]">
                          {drop.prizeLabel}
                        </p>
                      </div>
                      <Trophy className="h-7 w-7 text-amber-500" />
                    </div>

                    {drop.description && (
                      <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {drop.description}
                      </p>
                    )}

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em]">
                        <span className="text-slate-400">Meta pagada</span>
                        <span className="text-slate-700 dark:text-slate-200">
                          {drop.assignedPurchasePasses} / {drop.targetPasses}
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#DA1A21,#ff5960)] transition-[width] duration-500"
                          style={{ width: `${drop.progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-400">
                        <span>{drop.progressPercent}% completado</span>
                        <span>{drop.bonusEntries} bonus · no suman a la meta</span>
                      </div>
                    </div>

                    {drop.draw && (
                      <div
                        className={`mt-5 rounded-2xl border p-4 ${
                          isWinner
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                            : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isWinner ? (
                            <Award className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-slate-400" />
                          )}
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {isWinner
                              ? "¡Una de tus entradas resultó ganadora!"
                              : "Resultado publicado"}
                          </p>
                        </div>
                        <p className="mt-2 font-mono text-xs font-bold text-slate-500">
                          Entrada ganadora: {drop.draw.winnerEntryCode}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={
                          !isOpen ||
                          !availablePass ||
                          assigningDropId !== null ||
                          assigningCreditDropId !== null
                        }
                        onClick={() => void assignPass(drop.id)}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ef222b,#bd1119)] px-4 text-sm font-black text-white shadow-[0_16px_28px_-18px_rgba(218,26,33,.8)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {assigningDropId === drop.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isOpen ? (
                          <Ticket className="h-4 w-4" />
                        ) : (
                          <LockKeyhole className="h-4 w-4" />
                        )}
                        {isOpen
                          ? availablePass
                            ? "Asignar 1 Drop Pass"
                            : "Sin Pass disponibles"
                          : "Asignación cerrada"}
                      </button>
                      <button
                        type="button"
                        disabled={
                          !isOpen ||
                          data.bonusCreditBalance < 1 ||
                          assigningCreditDropId !== null ||
                          assigningDropId !== null
                        }
                        onClick={() => void assignCredit(drop.id)}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {assigningCreditDropId === drop.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isOpen ? (
                          <Coins className="h-4 w-4" />
                        ) : (
                          <LockKeyhole className="h-4 w-4" />
                        )}
                        {isOpen
                          ? data.bonusCreditBalance > 0
                            ? "Asignar 1 Bonus Credit"
                            : "Sin Bonus Credits"
                          : "Asignación cerrada"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1421] sm:p-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#DA1A21]" />
            <h2 className="font-black text-slate-950 dark:text-white">
              Historial de Drop Passes
            </h2>
          </div>
          <div className="mt-4 space-y-2">
            {data.passes.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.03]">
                Aún no tienes pases. Se generan automáticamente desde compras
                elegibles pagadas.
              </p>
            ) : (
              data.passes.map((pass) => (
                <div
                  key={pass.id}
                  className="rounded-2xl border border-slate-100 p-4 dark:border-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                      {pass.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        pass.status === "available"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                      }`}
                    >
                      {pass.status === "available" ? "Disponible" : "Asignado"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {pass.drop
                      ? `${pass.drop.title} · ${pass.drop.prizeLabel}`
                      : `Generado ${formatDate(pass.earnedAt)}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1421] sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-black text-slate-950 dark:text-white">
              Bonus Entries
            </h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Son entradas promocionales adicionales. Aumentan tus oportunidades,
            pero nunca cuentan para completar la meta pagada del Drop.
          </p>
          <div className="mt-4 space-y-2">
            {data.bonusEntries.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.03]">
                No tienes Bonus Entries activos.
              </p>
            ) : (
              data.bonusEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-500/15 dark:bg-amber-500/[0.04]"
                >
                  <p className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                    {entry.code}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {entry.drop.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{entry.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
