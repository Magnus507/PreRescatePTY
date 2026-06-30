"use client";

import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Factory,
  PackageCheck,
  Paintbrush,
  Printer,
  QrCode,
  Tag,
  Wrench,
} from "lucide-react";

const STOCK_FLOW = [
  "Crear orden interna",
  "Asignar chips",
  "Descargar QR / arte",
  "Enviar a imprenta",
  "Recibir de imprenta",
  "Ensamblar chip + sticker",
  "Asignar etiqueta interna",
  "Completar produccion",
  "QC",
  "Empaque",
  "Inventario terminado",
];

const COMPANY_FLOW = [
  "Pedido empresa pagado",
  "Produccion personalizada",
  "Logo / nombres / QR",
  "Imprenta",
  "Ensamblaje",
  "QC",
  "Empaque corporativo",
  "Despacho",
];

const STATUS_CARDS = [
  { label: "draft", icon: Factory, copy: "Orden base creada" },
  { label: "planned", icon: ClipboardCheck, copy: "Lista para ejecutar" },
  { label: "started", icon: Wrench, copy: "Trabajo iniciado" },
  { label: "paused", icon: Printer, copy: "Pausa operativa" },
  { label: "completed", icon: BadgeCheck, copy: "Lista para QC" },
  { label: "cancelled", icon: ClipboardCheck, copy: "Cancelada con trazabilidad" },
];

const ACTIONS = [
  "Enviar a imprenta",
  "Recibir de imprenta",
  "Iniciar ensamblaje",
  "Registrar ensamblaje",
  "Asignar etiqueta interna",
  "Completar ensamblaje",
];

function FlowRail({ title, tone, steps }: { title: string; tone: string; steps: string[] }) {
  return (
    <section className={`rounded-3xl border p-6 ${tone}`}>
      <h3 className="mb-5 text-lg font-black tracking-tight">{title}</h3>
      <div className="flex overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className="min-w-[150px] rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
              <p className="mt-2 text-xs font-black text-slate-800">{step}</p>
            </div>
            {index < steps.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-400" />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductionWorkflowSection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <FlowRail title="Produccion para Inventario PT" tone="border-emerald-200 bg-emerald-50" steps={STOCK_FLOW} />
        <FlowRail title="Produccion Bajo Pedido Empresa" tone="border-blue-200 bg-blue-50" steps={COMPANY_FLOW} />
      </div>

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

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Acciones visibles del operador</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((action) => (
            <button key={action} type="button" disabled className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left opacity-60">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                {action.includes("QR") ? <QrCode className="h-4 w-4" /> : action.includes("etiqueta") ? <Tag className="h-4 w-4" /> : action.includes("imprenta") ? <Printer className="h-4 w-4" /> : <Factory className="h-4 w-4" />}
                {action}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">Se activara con el modulo ERP</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ["QR / arte", QrCode],
          ["Arte / diseno", Paintbrush],
          ["Imprenta", Printer],
          ["QC", ClipboardCheck],
          ["Empaque / inventario", PackageCheck],
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
