"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Coins,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

type DropRow = {
  id: string;
  title: string;
  prizeLabel: string;
  status: string;
  displayOrder: number;
};

type WalletSnapshot = {
  user: {
    id: string;
    email: string;
    availablePassCount: number;
    bonusCreditBalance: number;
  } | null;
  drops: Array<{
    id: string;
    title: string;
    prizeLabel: string;
    status: string;
  }>;
  allocations?: Array<{
    id: string;
    title: string;
    prizeLabel: string;
    status: string;
    assignedPasses: number;
    assignedBonusEntries: number;
  }>;
};

export function DropAdminTools({
  onChanged,
}: {
  onChanged?: () => void | Promise<void>;
}) {
  const [drops, setDrops] = useState<DropRow[]>([]);
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [grantCount, setGrantCount] = useState("1");
  const [reason, setReason] = useState("Corrección administrativa");
  const [selectedDropId, setSelectedDropId] = useState("");

  const [campaign, setCampaign] = useState("Soporte / corrección");
  const [codeCount, setCodeCount] = useState("1");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const [generalCreditCampaign, setGeneralCreditCampaign] = useState("Promoción general");
  const [generalCreditCodeCount, setGeneralCreditCodeCount] = useState("1");
  const [generalCreditAmount, setGeneralCreditAmount] = useState("1");
  const [generatedGeneralCreditCodes, setGeneratedGeneralCreditCodes] = useState<
    Array<{ code: string; creditAmount: number }>
  >([]);

  const loadDrops = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/drops?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar los Drops.");
      setDrops(body.drops || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los Drops.");
    } finally {
      setLoadingDrops(false);
    }
  }, []);

  useEffect(() => {
    void loadDrops();
  }, [loadDrops]);

  async function reorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= drops.length) return;

    const next = [...drops];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy("reorder");
    try {
      const response = await fetch("/api/admin/drops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((drop) => drop.id) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el orden.");
      setDrops(next);
      toast.success("Orden de Drops guardado.");
      await onChanged?.();
    } catch (error) {
      await loadDrops();
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el orden.");
    } finally {
      setBusy(null);
    }
  }

  const loadWallet = useCallback(
    async (rawEmail?: string) => {
      const targetEmail = (rawEmail ?? email).trim().toLowerCase();
      if (!targetEmail) {
        setWallet(null);
        return;
      }
      setBusy("wallet-load");
      try {
        const response = await fetch(
          `/api/admin/drops/wallet?email=${encodeURIComponent(targetEmail)}&_t=${Date.now()}`,
          { cache: "no-store" }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No se pudo cargar la cuenta.");
        setWallet(body);
        setSelectedDropId((current) =>
          current && body.drops?.some((drop: { id: string }) => drop.id === current)
            ? current
            : body.drops?.find((drop: { status: string }) => drop.status === "active")?.id ?? ""
        );
      } catch (error) {
        setWallet(null);
        toast.error(error instanceof Error ? error.message : "No se pudo cargar la cuenta.");
      } finally {
        setBusy(null);
      }
    },
    [email]
  );

  async function walletAction(
    action: "grant_pass" | "grant_credit" | "assign_pass" | "assign_credit"
  ) {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Busca primero la cuenta del cliente.");
      return;
    }

    if ((action === "assign_pass" || action === "assign_credit") && !selectedDropId) {
      toast.error("Selecciona un Drop activo.");
      return;
    }

    setBusy(action);
    try {
      const response = await fetch("/api/admin/drops/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          email: targetEmail,
          count: Number(grantCount),
          reason,
          dropId: selectedDropId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo completar la operación.");

      const labels = {
        grant_pass: "Drop Pass otorgado y guardado.",
        grant_credit: "Bonus Credit otorgado y guardado.",
        assign_pass: "Drop Pass asignado al Drop.",
        assign_credit: "Bonus Credit consumido y asignado al Drop.",
      } as const;
      toast.success(labels[action]);
      await loadWallet(targetEmail);
      await loadDrops();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setBusy(null);
    }
  }

  async function generatePassCodes(event: FormEvent) {
    event.preventDefault();
    setBusy("pass-codes");
    try {
      const response = await fetch("/api/admin/drops/pass-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign,
          count: Number(codeCount),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudieron generar los códigos.");
      const codes = (body.codes || []).map((row: { code: string }) => row.code);
      setGeneratedCodes(codes);
      toast.success(`${codes.length} código${codes.length === 1 ? "" : "s"} especial${codes.length === 1 ? "" : "es"} generado${codes.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron generar los códigos.");
    } finally {
      setBusy(null);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(generatedCodes.join("\n"));
      toast.success("Códigos copiados.");
    } catch {
      toast.error("No se pudieron copiar los códigos.");
    }
  }

  async function generateGeneralCreditCodes(event: FormEvent) {
    event.preventDefault();
    setBusy("general-credit-codes");
    try {
      const response = await fetch("/api/admin/drops/bonus-credit-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: generalCreditCampaign,
          count: Number(generalCreditCodeCount),
          creditAmount: Number(generalCreditAmount),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudieron generar los Bonus Credits generales.");
      }
      const credits = (body.credits || []).map(
        (row: { code: string; creditAmount: number }) => ({
          code: row.code,
          creditAmount: row.creditAmount,
        })
      );
      setGeneratedGeneralCreditCodes(credits);
      toast.success(
        `${credits.length} código${credits.length === 1 ? "" : "s"} de Bonus Credit general generado${credits.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron generar los Bonus Credits generales."
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyGeneralCreditCodes() {
    try {
      await navigator.clipboard.writeText(
        generatedGeneralCreditCodes
          .map((item) => `${item.code} · +${item.creditAmount} Credit${item.creditAmount === 1 ? "" : "s"}`)
          .join("\n")
      );
      toast.success("Bonus Credits generales copiados.");
    } catch {
      toast.error("No se pudieron copiar los códigos.");
    }
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">
            Control de Drops y saldos
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Orden, Drop Passes y Bonus Credits se guardan en base de datos. Las asignaciones consumen el saldo disponible.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDrops()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black dark:border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Orden visible
          </p>
          <div className="mt-3 space-y-2">
            {loadingDrops ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              drops.map((drop, index) => (
                <div
                  key={drop.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{drop.title}</p>
                    <p className="truncate text-[11px] text-slate-500">{drop.prizeLabel}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Subir Drop"
                    disabled={index === 0 || busy === "reorder"}
                    onClick={() => void reorder(index, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30 dark:border-slate-700"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar Drop"
                    disabled={index === drops.length - 1 || busy === "reorder"}
                    onClick={() => void reorder(index, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30 dark:border-slate-700"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/30 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.03]">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-violet-600" />
            <p className="text-sm font-black">Cuenta del cliente</p>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void loadWallet();
                }
              }}
              placeholder="correo@cliente.com"
              className="h-11 flex-1 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold outline-none dark:border-violet-500/20 dark:bg-slate-950"
            />
            <button
              type="button"
              disabled={busy === "wallet-load"}
              onClick={() => void loadWallet()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
            >
              {busy === "wallet-load" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>

          {wallet?.user && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-rose-200 bg-white p-4 dark:border-rose-500/20 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-[#DA1A21]">
                    <Ticket className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase">Drop Pass</span>
                  </div>
                  <p className="mt-2 text-3xl font-black">{wallet.user.availablePassCount}</p>
                  <p className="text-[11px] text-slate-500">disponibles</p>
                </div>
                <div className="rounded-xl border border-violet-200 bg-white p-4 dark:border-violet-500/20 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-violet-600">
                    <Coins className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase">Bonus Credits</span>
                  </div>
                  <p className="mt-2 text-3xl font-black">{wallet.user.bonusCreditBalance}</p>
                  <p className="text-[11px] text-slate-500">disponibles</p>
                </div>
              </div>

              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Motivo de la corrección"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <div className="grid gap-2 sm:grid-cols-[100px_1fr_1fr]">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={grantCount}
                  onChange={(event) => setGrantCount(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void walletAction("grant_pass")}
                  className="h-10 rounded-xl bg-[#DA1A21] px-3 text-xs font-black text-white disabled:opacity-50"
                >
                  Otorgar Drop Pass
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void walletAction("grant_credit")}
                  className="h-10 rounded-xl bg-violet-600 px-3 text-xs font-black text-white disabled:opacity-50"
                >
                  Otorgar Bonus Credit
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                <select
                  value={selectedDropId}
                  onChange={(event) => setSelectedDropId(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Selecciona Drop activo</option>
                  {wallet.drops
                    .filter((drop) => drop.status === "active")
                    .map((drop) => (
                      <option key={drop.id} value={drop.id}>
                        {drop.title} · {drop.prizeLabel}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={busy !== null || wallet.user.availablePassCount < 1}
                  onClick={() => void walletAction("assign_pass")}
                  className="h-10 rounded-xl border border-[#DA1A21]/30 px-3 text-xs font-black text-[#DA1A21] disabled:opacity-40"
                >
                  Asignar 1 Pass
                </button>
                <button
                  type="button"
                  disabled={busy !== null || wallet.user.bonusCreditBalance < 1}
                  onClick={() => void walletAction("assign_credit")}
                  className="h-10 rounded-xl border border-violet-500/30 px-3 text-xs font-black text-violet-600 disabled:opacity-40"
                >
                  Asignar 1 Bonus Credit
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {(wallet.allocations || []).map((drop) => (
                  <div key={drop.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                    <p className="font-black">{drop.title}</p>
                    <p className="mt-1 text-slate-500">
                      {drop.assignedPasses} Pass · {drop.assignedBonusEntries} Bonus Entries
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={generatePassCodes}
        className="rounded-2xl border border-blue-200/70 bg-blue-50/30 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.03]"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-black">Códigos especiales de Drop Pass</p>
            <p className="text-[11px] text-slate-500">
              Solo para soporte o correcciones. Cada DPG se usa una vez y entrega 1 Drop Pass disponible.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_auto]">
          <input
            required
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="Motivo / campaña"
            className="h-10 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold dark:border-blue-500/20 dark:bg-slate-950"
          />
          <input
            required
            type="number"
            min={1}
            max={100}
            value={codeCount}
            onChange={(event) => setCodeCount(event.target.value)}
            className="h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold dark:border-blue-500/20 dark:bg-slate-950"
          />
          <button
            disabled={busy === "pass-codes"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:opacity-50"
          >
            {busy === "pass-codes" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Generar
          </button>
        </div>
        {generatedCodes.length > 0 && (
          <div className="mt-3 rounded-xl bg-white p-3 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Códigos recién generados
              </p>
              <button
                type="button"
                onClick={() => void copyCodes()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[10px] font-black dark:border-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </button>
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {generatedCodes.map((code) => (
                <code key={code} className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-black dark:bg-white/[0.04]">
                  {code}
                </code>
              ))}
            </div>
          </div>
        )}
      </form>

      <form
        onSubmit={generateGeneralCreditCodes}
        className="rounded-2xl border border-violet-200/70 bg-violet-50/30 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.03]"
      >
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-violet-600" />
          <div>
            <p className="text-sm font-black">Códigos generales de Bonus Credit</p>
            <p className="text-[11px] text-slate-500">
              No pertenecen a un Drop específico. Al reclamarlos, el saldo queda en la wallet del cliente y luego puede asignarse al Drop activo que elija.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_120px_auto]">
          <input
            required
            value={generalCreditCampaign}
            onChange={(event) => setGeneralCreditCampaign(event.target.value)}
            placeholder="Motivo / campaña"
            className="h-10 rounded-xl border border-violet-200 bg-white px-3 text-xs font-bold dark:border-violet-500/20 dark:bg-slate-950"
          />
          <input
            required
            type="number"
            min={1}
            max={100}
            value={generalCreditCodeCount}
            onChange={(event) => setGeneralCreditCodeCount(event.target.value)}
            aria-label="Cantidad de códigos"
            className="h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold dark:border-violet-500/20 dark:bg-slate-950"
          />
          <input
            required
            type="number"
            min={1}
            max={100}
            value={generalCreditAmount}
            onChange={(event) => setGeneralCreditAmount(event.target.value)}
            aria-label="Credits por código"
            className="h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold dark:border-violet-500/20 dark:bg-slate-950"
          />
          <button
            disabled={busy === "general-credit-codes"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
          >
            {busy === "general-credit-codes" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Coins className="h-4 w-4" />
            )}
            Generar
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500">
          <span>2.º campo: cantidad de códigos.</span>
          <span>3.º campo: Bonus Credits que entrega cada código.</span>
        </div>

        {generatedGeneralCreditCodes.length > 0 && (
          <div className="mt-3 rounded-xl bg-white p-3 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Bonus Credits generales recién generados
              </p>
              <button
                type="button"
                onClick={() => void copyGeneralCreditCodes()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[10px] font-black dark:border-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </button>
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {generatedGeneralCreditCodes.map((item) => (
                <code
                  key={item.code}
                  className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-black dark:bg-white/[0.04]"
                >
                  {item.code} · +{item.creditAmount}
                </code>
              ))}
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
