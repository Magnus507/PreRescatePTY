"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, KeyRound, Copy, AlertTriangle } from "lucide-react";

type Status = {
  enabled: boolean;
  configured: boolean;
  inconsistent: boolean;
  recoveryCodesRemaining: number;
  admin: boolean;
  adminRole: string | null;
};

type Setup = {
  secret: string;
  challenge: string;
  provisioningUri: string;
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Operación no disponible");
  return data;
}

export default function AdminMfaPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/security/mfa/status", { cache: "no-store" })
      .then(readJson)
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo consultar MFA"));
  }, []);

  async function startSetup() {
    setBusy(true);
    setError("");
    try {
      const result = await readJson(await fetch("/api/users/security/mfa/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: password }),
      }));
      setSetup(result);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar MFA");
    } finally {
      setBusy(false);
    }
  }

  async function enableMfa() {
    if (!setup) return;
    setBusy(true);
    setError("");
    try {
      const result = await readJson(await fetch("/api/users/security/mfa/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: password, challenge: setup.challenge, code }),
      }));
      setRecoveryCodes(result.recoveryCodes || []);
      setStatus((current) => current ? { ...current, enabled: true, configured: true } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar MFA");
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa() {
    setBusy(true);
    setError("");
    try {
      await readJson(await fetch("/api/users/security/mfa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: password, code }),
      }));
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar MFA");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecoveryCodes() {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
  }

  if (!status && !error) {
    return <main className="mx-auto max-w-3xl p-6 text-slate-600 dark:text-slate-300">Cargando seguridad…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600"><ShieldCheck className="h-7 w-7" /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">Seguridad MFA</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              El segundo factor protege las cuentas administrativas. Primero se enrola y verifica; el enforcement puede activarse después de una prueba real para evitar bloquear al único administrador.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        {status?.inconsistent && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            La configuración MFA está inconsistente. No continúes con operaciones administrativas hasta reconciliarla.
          </div>
        )}

        {!status?.enabled && !recoveryCodes.length && (
          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Contraseña actual</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700" />
            </label>

            {!setup ? (
              <button disabled={busy || !password} onClick={startSetup} className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                {busy ? "Preparando…" : "Configurar autenticador"}
              </button>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-center rounded-3xl bg-white p-6">
                  <QRCodeSVG value={setup.provisioningUri} size={220} level="M" />
                </div>
                <div className="rounded-2xl bg-slate-100 p-4 text-center dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Clave manual</p>
                  <code className="mt-2 block break-all text-sm font-bold text-slate-900 dark:text-white">{setup.secret}</code>
                </div>
                <label className="block">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Código de 6 dígitos</span>
                  <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-emerald-500 dark:border-slate-700" />
                </label>
                <button disabled={busy || code.length !== 6} onClick={enableMfa} className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">
                  {busy ? "Verificando…" : "Verificar y activar MFA"}
                </button>
              </div>
            )}
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <h2 className="font-black">Guarda estos códigos ahora</h2>
              <p className="mt-1 text-sm">Cada código funciona una sola vez. No volverán a mostrarse.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-100 p-4 font-mono text-sm dark:bg-slate-900 sm:grid-cols-2">
              {recoveryCodes.map((entry) => <div key={entry} className="rounded-xl bg-white p-3 text-center dark:bg-slate-950">{entry}</div>)}
            </div>
            <button onClick={copyRecoveryCodes} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-bold dark:border-slate-700"><Copy className="h-4 w-4" /> Copiar códigos</button>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">Ya los guardé · volver a iniciar sesión</button>
          </div>
        )}

        {status?.enabled && recoveryCodes.length === 0 && (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-black">MFA activo</p>
              <p className="mt-1 text-sm">Códigos de recuperación disponibles: {status.recoveryCodesRemaining}</p>
            </div>
            <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="mb-4 flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5" /> Desactivar MFA</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="password" placeholder="Contraseña actual" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="rounded-2xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" />
                <input placeholder="TOTP o código recuperación" value={code} onChange={(e) => setCode(e.target.value)} className="rounded-2xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" />
              </div>
              <button disabled={busy || !password || !code} onClick={disableMfa} className="mt-4 w-full rounded-2xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50">Desactivar MFA y cerrar sesiones</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
