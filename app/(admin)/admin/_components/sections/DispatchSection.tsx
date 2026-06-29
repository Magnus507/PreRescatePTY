"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  Package,
  PackageCheck,
  Store,
  Truck,
  User,
  Users,
  ClipboardCheck,
  FileText,
} from "lucide-react";

interface DispatchType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const DISPATCH_TYPES: DispatchType[] = [
  {
    key: "company",
    label: "Empresa",
    icon: Users,
    description: "Despacho corporativo",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "individual",
    label: "Cliente Particular",
    icon: User,
    description: "Despacho a cliente final",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "courier",
    label: "Courier",
    icon: Truck,
    description: "Envío por mensajería",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "pickup",
    label: "Retiro en oficina",
    icon: Store,
    description: "Cliente retira en sucursal",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "point_of_sale",
    label: "Punto de venta",
    icon: MapPin,
    description: "Despacho a punto de venta",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "international",
    label: "Internacional",
    icon: Globe,
    description: "Envío al extranjero",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Empaque terminado", icon: PackageCheck, description: "Caja lista para salir" },
  { label: "Caja lista", icon: Package, description: "Preparada para despacho" },
  { label: "Generar guía", icon: FileText, description: "Documento de envío" },
  { label: "Transportista", icon: Truck, description: "Asignación de courier" },
  { label: "En tránsito", icon: Truck, description: "En camino a destino" },
  { label: "Entregado", icon: CheckCircle2, description: "Confirmación de entrega" },
  { label: "Confirmado", icon: ClipboardCheck, description: "Cierre del despacho" },
];

const PLACEHOLDER_METRICS = {
  pending: 0,
  scheduled: 0,
  inTransit: 0,
  delivered: 0,
};

const BENEFITS = [
  { label: "Saber dónde está cada caja", description: "Trazabilidad en tiempo real" },
  { label: "Tener evidencia de entrega", description: "Firma y foto de recepción" },
  { label: "Consultar historial", description: "Registro completo de envíos" },
  { label: "Integrar tracking", description: "Seguimiento con el transportista" },
  { label: "Controlar incidencias", description: "Reporte de problemas" },
  { label: "Auditar entregas", description: "Verificación de conformidad" },
];

export function DispatchSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          Despacho
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Control de envíos, transportistas, guías, entregas y trazabilidad logística.
        </p>
      </div>

      {/* Card principal */}
      <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-800 dark:bg-indigo-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-indigo-100 p-3 dark:bg-indigo-900/50">
            <AlertTriangle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-100 mb-2">
              El despacho inicia únicamente cuando el empaque ha finalizado
            </h3>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Desde aquí se controlarán: cajas listas, transportistas, guías, tracking, evidencias y entregas.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Despacho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo de Despacho
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {TIMELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center min-w-[100px]">
                  <div className="rounded-xl bg-slate-100 p-2 mb-2 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    {step.label}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500 mt-1">
                    {step.description}
                  </p>
                </div>
                {!isLast && (
                  <div className="mx-2 text-slate-300 dark:text-slate-700">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas placeholder */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Pendientes
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.pending}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Programados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.scheduled}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-purple-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              En tránsito
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.inTransit}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Entregados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.delivered}</p>
        </div>
      </div>

      {/* Tipos de Despacho */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Despacho
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DISPATCH_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.key}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${type.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {type.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500 mb-2">
                  {type.description}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Próximamente
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla Placeholder */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
            Historial de Despachos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-950 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Fecha
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Guía
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Destino
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Empresa
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Transportista
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Estado
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Responsable
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Truck className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                      Todavía no existen despachos registrados
                    </p>
                    <p className="text-xs font-medium text-slate-500 max-w-md">
                      Los despachos aparecerán cuando se habilite el módulo logístico.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Card inferior */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          ¿Por qué controlar el despacho?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.label} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {benefit.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estado */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-500">
          Estado: Sin despachos registrados — Las métricas se activarán cuando se registre el primer despacho
        </p>
      </div>
    </div>
  );
}