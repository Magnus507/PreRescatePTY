"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, LogIn, Smartphone } from "lucide-react";

type Props = {
  companyCode: string;
  showCustomEmployeeMessage: boolean;
  customEmployeeMessage: string | null;
};

export default function ClientCompanyCodeSection({
  companyCode,
  showCustomEmployeeMessage,
  customEmployeeMessage,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(companyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <section className="rounded-xl border-2 border-amber-200 p-5 sm:p-6 space-y-4 bg-gradient-to-br from-amber-50 to-white">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-black text-base uppercase tracking-widest text-amber-900">
          🔗 Código empresarial
        </h2>
        <p className="text-sm text-amber-800">
          Este código sirve para <strong>vincular tu cuenta</strong> con esta empresa y acceder a los beneficios corporativos (sticker, tarjeta NFC, etc.).
        </p>
      </div>

      {/* Code + Copy */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-xl border-2 border-amber-300 px-4 py-3 font-mono text-xl font-black tracking-[0.25em] text-amber-900 select-all">
          {companyCode}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="px-5 py-3 rounded-xl bg-amber-100 border border-amber-300 text-xs font-black uppercase tracking-widest text-amber-900 hover:bg-amber-200 transition-all active:scale-95 flex items-center gap-2 shrink-0"
        >
          {copied ? (
            <><Check className="h-4 w-4" /> Copiado</>
          ) : (
            <><Copy className="h-4 w-4" /> Copiar código</>
          )}
        </button>
      </div>

      {/* Steps */}
      <div className="bg-white/60 rounded-xl border border-amber-200/60 p-4 space-y-2">
        <p className="font-bold text-xs uppercase tracking-widest text-amber-800">¿Cómo usar este código?</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-amber-900">
          <li>
            <strong>Inicia sesión</strong> o crea una cuenta en PreRescue ID si aún no tienes una.
          </li>
          <li>
            Ve a <strong>Dashboard → Empresas</strong> e ingresa este código.
          </li>
          <li>
            Se creará una <strong>solicitud de vinculación</strong> pendiente de aprobación.
          </li>
          <li>
            La empresa debe <strong>aprobar tu solicitud</strong> para que quedes vinculado.
          </li>
          <li>
            Una vez aprobado, podrás <strong>solicitar productos</strong> (sticker, tarjeta NFC, etc.) si la empresa lo permite.
          </li>
        </ol>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/login"
          className="flex-1 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest text-center hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          Iniciar sesión / Crear cuenta
        </a>
        <Link
          href="/activar"
          className="flex-1 px-5 py-3 rounded-xl border-2 border-slate-300 text-slate-800 text-xs font-black uppercase tracking-widest text-center hover:bg-slate-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Smartphone className="h-4 w-4" />
          Ya tengo un chip: activar código
        </Link>
      </div>

      {/* Custom message */}
      {showCustomEmployeeMessage && customEmployeeMessage && (
        <div className="border-t border-amber-200/60 pt-3">
          <p className="text-xs italic text-amber-700">{customEmployeeMessage}</p>
        </div>
      )}
    </section>
  );
}
