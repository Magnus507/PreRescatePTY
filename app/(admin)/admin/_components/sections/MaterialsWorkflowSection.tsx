"use client";

import {
  AlertTriangle,
  Archive,
  ClipboardList,
  Factory,
  MapPin,
  PackagePlus,
  ReceiptText,
  RotateCcw,
  Scale,
  Truck,
  Wrench,
} from "lucide-react";

const MATERIAL_TASKS = [
  { label: "Recibir materiales", detail: "Registrar entrada fisica desde proveedor.", icon: PackagePlus },
  { label: "Asignar ubicacion", detail: "Bodega, estante, caja o mesa de trabajo.", icon: MapPin },
  { label: "Registrar proveedor", detail: "Proveedor, contacto y condicion de compra.", icon: Truck },
  { label: "Registrar cantidad", detail: "Unidades, paquetes o rollos recibidos.", icon: Scale },
  { label: "Registrar lote/factura", detail: "Factura, lote proveedor y evidencia.", icon: ReceiptText },
  { label: "Ver stock bajo", detail: "Alertas para reposicion de materiales.", icon: AlertTriangle },
];

const DISABLED_ACTIONS = [
  { label: "Recibir", hint: "Pendiente de backend" },
  { label: "Ajustar", hint: "Se activara con Prisma ERP" },
  { label: "Marcar danado", hint: "Se activara con movimientos" },
  { label: "Devolver proveedor", hint: "Se activara con movimientos" },
];

const MATERIALS = [
  "Stickers NFC en blanco",
  "Pulseras",
  "Credenciales PVC",
  "Tarjetas",
  "Llaveros",
  "Sobres de activacion",
  "Cajas",
  "Lanyards",
];

export function MaterialsWorkflowSection() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <Archive className="h-4 w-4" />
              Inventario fisico de insumos
            </div>
            <h3 className="text-2xl font-black tracking-tight text-amber-950">Materiales</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-800">
              Materiales son insumos antes de fabricar: stickers en blanco, pulseras, PVC, cajas y accesorios. No son productos terminados y no son chips digitales.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-amber-700">
            Datos reales pendientes
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {MATERIAL_TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <article key={task.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h4 className="font-black text-slate-950">{task.label}</h4>
              <p className="mt-2 text-sm font-medium text-slate-500">{task.detail}</p>
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Materiales controlados</h3>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MATERIALS.map((item) => (
            <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Acciones del flujo</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DISABLED_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left opacity-60"
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                {action.label === "Ajustar" ? <Wrench className="h-4 w-4" /> : action.label === "Devolver proveedor" ? <RotateCcw className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
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
