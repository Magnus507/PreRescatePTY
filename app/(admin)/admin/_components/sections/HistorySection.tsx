"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  FileText,
  History,
  Package,
  PackageCheck,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  Activity,
} from "lucide-react";

interface EventType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const EVENT_TYPES: EventType[] = [
  {
    key: "ingreso",
    label: "Ingreso",
    icon: Package,
    description: "Entrada de materiales",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "reserva",
    label: "Reserva",
    icon: FileText,
    description: "Asignación a producción",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "produccion",
    label: "Producción",
    icon: Factory,
    description: "Proceso productivo",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "movimiento",
    label: "Movimiento",
    icon: Route,
    description: "Transferencia entre ubicaciones",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "calidad",
    label: "Calidad",
    icon: ClipboardCheck,
    description: "Control de calidad",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    key: "empaque",
    label: "Empaque",
    icon: PackageCheck,
    description: "Armado de paquetes",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "despacho",
    label: "Despacho",
    icon: Truck,
    description: "Envío a destino",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    key: "entrega",
    label: "Entrega",
    icon: CheckCircle2,
    description: "Confirmación final",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "incidencia",
    label: "Incidencia",
    icon: AlertTriangle,
    description: "Reporte de problema",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    key: "ajuste",
    label: "Ajuste",
    icon: RefreshCw,
    description: "Corrección manual",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Proveedor", icon: Package, description: "Origen de materiales" },
  { label: "Ingreso Inventario", icon: Package, description: "Registro en sistema" },
  { label: "Reserva", icon: FileText, description: "Asignación a producción" },
  { label: "Producción", icon: Factory, description: "Proceso productivo" },
  { label: "Control Calidad", icon: ClipboardCheck, description: "Verificación final" },
  { label: "Empaque", icon: PackageCheck, description: "Armado de paquetes" },
  { label: "Despacho", icon: Truck, description: "Envío a destino" },
  { label: "Entrega", icon: CheckCircle2, description: "Confirmación final" },
  { label: "Confirmación", icon: ShieldCheck, description: "Cierre operativo" },
];

const EXAMPLE_TIMELINE = [
  { time: "08:15", event: "Proveedor entrega materiales", icon: Package },
  { time: "08:40", event: "Ingreso a inventario", icon: Package },
  { time: "09:05", event: "Reserva para Orden #204", icon: FileText },
  { time: "09:20", event: "Producción iniciada", icon: Factory },
  { time: "10:30", event: "Producción finalizada", icon: Factory },
  { time: "10:45", event: "Control de Calidad aprobado", icon: ClipboardCheck },
  { time: "11:10", event: "Empaque completado", icon: PackageCheck },
  { time: "11:40", event: "Despacho generado", icon: Truck },
  { time: "14:30", event: "Entrega confirmada", icon: CheckCircle2 },
];

const FUTURE_ACTIONS = [
  { label: "Consultar evento", icon: "🔍", description: "Ver detalle del evento" },
  { label: "Filtrar historial", icon: "📋", description: "Filtrar por tipo o fecha" },
  { label: "Exportar", icon: "📥", description: "Exportar historial" },
  { label: "Ver auditoría", icon: "📊", description: "Vista de auditoría" },
  { label: "Comparar eventos", icon: "🔄", description: "Comparar operaciones" },
  { label: "Generar reporte", icon: "📄", description: "Reporte operativo" },
];

const BENEFITS = [
  { label: "Auditoría completa", description: "Registro inmutable de cada operación" },
  { label: "Trazabilidad", description: "Seguimiento de principio a fin" },
  { label: "Cumplimiento", description: "Evidencia para certificaciones" },
  { label: "Investigación", description: "Análisis de incidencias" },
  { label: "Métricas", description: "Datos para mejora continua" },
  { label: "Productividad", description: "Medición de tiempos operativos" },
  { label: "Mejora continua", description: "Identificación de cuellos de botella" },
  { label: "Evidencia operativa", description: "Respaldo documental" },
];

const PLACEHOLDER_METRICS = {
  events: 0,
  orders: 0,
  incidents: 0,
  audits: 0,
};

export function HistorySection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          Historial Operativo
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Trazabilidad completa de todas las operaciones del Centro de Operaciones.
        </p>
      </div>

      {/* Card principal */}
      <div className="rounded-3xl border-2 border-slate-300 bg-slate-100 p-6 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-200 p-3 dark:bg-slate-800">
            <Activity className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">
              Ninguna operación debe perder su trazabilidad
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Cada evento quedará registrado desde el ingreso de materiales hasta la entrega final.
              El historial permitirá: auditoría, seguimiento, investigación de incidencias, métricas y mejora continua.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline principal */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo Operativo Completo
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {TIMELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center min-w-[90px]">
                  <div className="rounded-xl bg-slate-100 p-2 mb-2 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    {step.label}
                  </p>
                  <p className="text-[8px] font-medium text-slate-500 mt-1">
                    {step.description}
                  </p>
                </div>
                {!isLast && (
                  <div className="mx-1 text-slate-300 dark:text-slate-700">
                    <ArrowRight className="h-3 w-3" />
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
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Eventos registrados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.events}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Órdenes trazadas
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.orders}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Incidencias
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.incidents}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Auditorías
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.audits}</p>
        </div>
      </div>

      {/* Tipos de eventos */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Eventos
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {EVENT_TYPES.map((type) => {
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
                <p className="text-[10px] font-medium text-slate-500">
                  {type.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline ejemplo */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Ejemplo de Trazabilidad
        </h3>
        <p className="text-[10px] font-medium text-slate-500 mb-6">
          Este timeline es ilustrativo. Los eventos reales aparecerán cuando los módulos operativos estén activos.
        </p>
        <div className="space-y-0">
          {EXAMPLE_TIMELINE.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === EXAMPLE_TIMELINE.length - 1;
            return (
              <div key={idx} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-slate-100 p-1.5 dark:bg-slate-800">
                    <Icon className="h-3 w-3 text-slate-500" />
                  </div>
                  {!isLast && <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-[10px] font-black text-slate-400">{item.time}</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {item.event}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla Placeholder */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
            Registro de Eventos
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
                  Evento
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Orden
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Producto
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Responsable
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Estado
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <History className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                      Todavía no existen eventos registrados
                    </p>
                    <p className="text-xs font-medium text-slate-500 max-w-md">
                      El historial comenzará a construirse automáticamente cuando los módulos operativos entren en funcionamiento.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Acciones futuras */}
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Acciones Disponibles (Próximamente)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FUTURE_ACTIONS.map((action) => (
            <div
              key={action.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 opacity-50 cursor-not-allowed"
              title="Disponible cuando se implemente el módulo de historial"
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <p className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                {action.label}
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                {action.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Card final */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          ¿Por qué existe el Historial?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          El historial comenzará a construirse automáticamente cuando los módulos operativos entren en funcionamiento
        </p>
      </div>
    </div>
  );
}