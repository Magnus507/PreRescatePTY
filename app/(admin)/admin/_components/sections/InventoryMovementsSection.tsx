"use client";

import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Factory,
  Package,
  PackageCheck,
  Route,
  Truck,
  CheckCircle2,
  RotateCcw,
  Settings,
  AlertCircle,
  FileSearch,
  ClipboardList,
} from "lucide-react";

type MovementType =
  | "ingreso"
  | "reserva"
  | "consumo"
  | "transferencia"
  | "devolucion"
  | "ajuste"
  | "dano"
  | "perdida"
  | "despacho";

interface MovementTypeInfo {
  key: MovementType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const MOVEMENT_TYPES: MovementTypeInfo[] = [
  {
    key: "ingreso",
    label: "Ingreso",
    icon: Package,
    description: "Registrar entrada de materiales al inventario",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "reserva",
    label: "Reserva",
    icon: ClipboardList,
    description: "Reservar materiales para producción",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "consumo",
    label: "Consumo",
    icon: Factory,
    description: "Registrar consumo en proceso productivo",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "transferencia",
    label: "Transferencia",
    icon: ArrowRight,
    description: "Transferir materiales entre ubicaciones",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "devolucion",
    label: "Devolución",
    icon: RotateCcw,
    description: "Devolver materiales a stock",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "ajuste",
    label: "Ajuste",
    icon: Settings,
    description: "Ajuste manual de cantidades",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    key: "dano",
    label: "Daño",
    icon: AlertCircle,
    description: "Reportar materiales dañados",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    key: "perdida",
    label: "Pérdida",
    icon: FileSearch,
    description: "Registrar pérdida de materiales",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    key: "despacho",
    label: "Despacho",
    icon: Truck,
    description: "Registrar despacho de materiales",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Proveedor", icon: Package, description: "Origen de materiales" },
  { label: "Ingreso", icon: Package, description: "Registro en sistema" },
  { label: "Reserva", icon: ClipboardList, description: "Asignación a producción" },
  { label: "Producción", icon: Factory, description: "Consumo en proceso" },
  { label: "Calidad", icon: ClipboardCheck, description: "Control de calidad" },
  { label: "Empaque", icon: PackageCheck, description: "Preparación final" },
  { label: "Despacho", icon: Truck, description: "Envío a destino" },
  { label: "Entrega", icon: CheckCircle2, description: "Confirmación final" },
];

export function InventoryMovementsSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Route className="h-8 w-8 text-primary" />
          Movimientos de Inventario
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Todo cambio de inventario físico quedará registrado como un movimiento completamente auditable.
        </p>
      </div>

      {/* Card principal explicativa */}
      <div className="rounded-3xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-3 dark:bg-blue-900/50">
            <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 mb-2">
              El inventario físico nunca cambia directamente
            </h3>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Cada ingreso, reserva, consumo, transferencia, devolución, ajuste, pérdida o despacho
              genera un movimiento. Esto garantiza trazabilidad completa de todos los materiales.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Operativo */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo Operativo
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {TIMELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center min-w-[80px]">
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

      {/* Tipos de Movimiento */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Movimiento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {MOVEMENT_TYPES.map((movement) => {
            const Icon = movement.icon;
            return (
              <div
                key={movement.key}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${movement.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {movement.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500 mb-2">
                  {movement.description}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Se registra por módulo
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
            Historial de Movimientos
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
                  Tipo
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Producto
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Cantidad
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Origen
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Destino
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Operador
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Motivo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Route className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                      Todavía no existe un historial consolidado
                    </p>
                    <p className="text-xs font-medium text-slate-500 max-w-md">
                      Los movimientos ya se registran dentro de cada módulo operativo. El historial consolidado se integrará en la fase de Movimientos automáticos.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Informativa */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          ¿Por qué usar movimientos?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Auditoría completa
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Registro inmutable de cada cambio
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Historial de cada cambio
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Trazabilidad punto a punto
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Trazabilidad de materiales
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Seguimiento de lote a lote
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Control de pérdidas
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Identificación rápida de desviaciones
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Integración con Producción
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Consumo automático por orden
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Integración con Calidad
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Control de calidad por lote
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Integración con Empaque
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Preparación de pedidos
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                Integración con Despacho
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                Tracking de entrega
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
