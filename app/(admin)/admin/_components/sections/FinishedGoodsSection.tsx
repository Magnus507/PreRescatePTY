"use client";

import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Factory,
  PackageCheck,
  Send,
  ShoppingCart,
  Store,
  Warehouse,
} from "lucide-react";

const FLOW = [
  "Produccion",
  "QC",
  "Empaque",
  "Inventario terminado",
  "Venta",
  "Salida",
];

const STATES = [
  { label: "Stock normal listo para venta", icon: Warehouse },
  { label: "Productos empacados", icon: PackageCheck },
  { label: "Productos reservados", icon: Boxes },
  { label: "Productos vendidos", icon: ShoppingCart },
  { label: "Entrada desde produccion para stock", icon: Factory },
  { label: "Salida por venta", icon: Send },
];

const ACTIONS = [
  { label: "Ver stock", hint: "Se activara con Prisma ERP" },
  { label: "Reservar", hint: "Pendiente de backend" },
  { label: "Ajustar", hint: "Requiere movimientos" },
  { label: "Enviar a punto de venta", hint: "Pendiente de backend" },
];

export function FinishedGoodsSection() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Producto vendible
            </div>
            <h3 className="text-2xl font-black tracking-tight text-emerald-950">Productos Terminados</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-800">
              El stock normal viene de Produccion, luego Control de Calidad, luego Empaque. Solo despues entra a inventario terminado listo para venta o punto de venta.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            Flujo definido, datos reales pendientes
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-slate-500">Ruta de entrada a stock normal</h3>
        <div className="flex overflow-x-auto pb-2">
          {FLOW.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="min-w-[150px] rounded-2xl bg-slate-50 px-4 py-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
                <p className="mt-2 text-sm font-black text-slate-800">{step}</p>
              </div>
              {index < FLOW.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-300" />}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATES.map((state) => {
          const Icon = state.icon;
          return (
            <article key={state.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h4 className="font-black text-slate-950">{state.label}</h4>
              <p className="mt-2 text-sm font-medium text-slate-500">Se alimentara desde ordenes de produccion y movimientos de inventario.</p>
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Acciones del flujo</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((action) => (
            <button key={action.label} type="button" disabled className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left opacity-60">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                <Store className="h-4 w-4" />
                {action.label}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">{action.hint}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
