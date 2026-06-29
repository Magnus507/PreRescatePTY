"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Package,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Smartphone,
  FileText,
  Layers,
  Sticker,
  Truck,
} from "lucide-react";

interface UnitType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const UNIT_TYPES: UnitType[] = [
  {
    key: "individual",
    label: "Paquete Individual",
    icon: Package,
    description: "Paquete con un chip y accesorios",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "box",
    label: "Caja Corporativa",
    icon: PackageCheck,
    description: "Caja con múltiples paquetes",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "kit",
    label: "Kit",
    icon: Layers,
    description: "Kit combinado personalizado",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "envelope",
    label: "Sobre",
    icon: FileText,
    description: "Sobre de activación",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "packing_list",
    label: "Packing List",
    icon: ClipboardCheck,
    description: "Lista de empaque",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Producción terminada", icon: CheckCircle2, description: "Orden completada" },
  { label: "Paquete individual", icon: Package, description: "Armado de paquete" },
  { label: "Control de contenido", icon: ClipboardCheck, description: "Verificación checklist" },
  { label: "Caja", icon: PackageCheck, description: "Empaque en caja" },
  { label: "Packing list", icon: FileText, description: "Generación de lista" },
  { label: "Listo para despacho", icon: Truck, description: "Enviar a despacho" },
];

const CHECKLIST_ITEMS = [
  { label: "Chip incluido", icon: Smartphone },
  { label: "QR verificado", icon: QrCode },
  { label: "Pulsera incluida", icon: Layers },
  { label: "Credencial incluida", icon: FileText },
  { label: "Sobre de activación incluido", icon: FileText },
  { label: "Etiqueta interna colocada", icon: Sticker },
  { label: "Paquete sellado", icon: ShieldCheck },
];

const FUTURE_ACTIONS = [
  { label: "Crear paquete", icon: "📦", description: "Armar paquete individual" },
  { label: "Escanear QR", icon: "📱", description: "Verificar contenido" },
  { label: "Generar packing list", icon: "📋", description: "Generar documento" },
  { label: "Cerrar caja", icon: "🔒", description: "Cerrar caja corporativa" },
  { label: "Imprimir etiquetas", icon: "🖨️", description: "Imprimir etiquetas" },
  { label: "Listo para despacho", icon: "✅", description: "Enviar a cola de despacho" },
];

const PLACEHOLDER_METRICS = {
  pending: 0,
  assembled: 0,
  verified: 0,
  ready: 0,
};

export function PackingSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <PackageCheck className="h-8 w-8 text-primary" />
          Empaque
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Armado físico de paquetes y cajas antes del despacho.
        </p>
      </div>

      {/* Mensaje diferenciador */}
      <div className="rounded-3xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-3 dark:bg-blue-900/50">
            <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 mb-2">
              Este módulo controlará el armado físico de paquetes y cajas antes del despacho
            </h3>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              El empaque prepara los productos terminados para su envío.
              Una vez empaquetado, el paquete pasa a Despacho para su envío final.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Empaque */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo de Empaque
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
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Armados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.assembled}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Verificados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.verified}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Listos
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.ready}</p>
        </div>
      </div>

      {/* Tipos de Unidad */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Unidad
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {UNIT_TYPES.map((unit) => {
            const Icon = unit.icon;
            return (
              <div
                key={unit.key}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${unit.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {unit.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {unit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist por Paquete */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Checklist por Paquete (Próximamente)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 opacity-60"
              >
                <div className="rounded-lg bg-slate-200 p-1.5">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
              </div>
            );
          })}
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
              title="Disponible cuando se implemente el módulo de empaque"
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

      {/* Estado */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-500">
          Estado: Sin paquetes registrados — Las métricas se activarán cuando se registre el primer paquete
        </p>
      </div>
    </div>
  );
}