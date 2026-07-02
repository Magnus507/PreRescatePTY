"use client";

import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Factory,
  PackageCheck,
  Printer,
  QrCode,
  Wrench,
} from "lucide-react";

const REAL_FLOW = [
  "Imprenta recibida",
  "Seleccionar orden de producción",
  "Ensamblar unidades",
  "Enviar a QA",
  "QA aprueba inventario",
];

const STATUS_CARDS = [
  { label: "draft", icon: Factory, copy: "Borrador" },
  { label: "planned", icon: ClipboardCheck, copy: "Planificada" },
  { label: "started", icon: Wrench, copy: "En proceso" },
  { label: "paused", icon: Printer, copy: "Pausada" },
  { label: "completed", icon: BadgeCheck, copy: "Lista para QA" },
  { label: "cancelled", icon: ClipboardCheck, copy: "Cancelada" },
];

export function ProductionWorkflowSection() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">Producción y ensamblaje</p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">Convierte QR/link impresos en unidades físicas trazables.</h3>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
          La unidad ensamblada queda pendiente de QA antes de entrar a inventario disponible.
        </p>
        <div className="mt-5 flex overflow-x-auto pb-2">
          {REAL_FLOW.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="min-w-[160px] rounded-2xl bg-slate-50 px-4 py-4 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
                <p className="mt-2 text-xs font-black text-slate-800">{step}</p>
              </div>
              {index < REAL_FLOW.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-400" />}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          Producción ensambla unidades físicas trazables. La activación del usuario final ocurre después, fuera de Producción.
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Estados operativos</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_CARDS.map((status) => {
            const Icon = status.icon;
            return (
              <article key={status.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Icon className="mb-3 h-5 w-5 text-primary" />
                <p className="font-mono text-xs font-black text-slate-800">{status.label}</p>
                <p className="mt-2 text-[11px] font-semibold text-slate-500">{status.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ["QR / link impreso", QrCode],
          ["Orden de producción", Factory],
          ["Imprenta recibida", Printer],
          ["QA obligatorio", ClipboardCheck],
          ["Salida a inventario", PackageCheck],
        ].map(([label, Icon]) => {
          const IconComponent = Icon as React.ElementType;
          return (
            <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <IconComponent className="mx-auto mb-3 h-5 w-5 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{label as string}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
