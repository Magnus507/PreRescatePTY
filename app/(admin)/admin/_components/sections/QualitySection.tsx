"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
  Monitor,
  Package,
  PackageCheck,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
  Sticker,
  Scan,
} from "lucide-react";

interface ValidationType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const VALIDATION_TYPES: ValidationType[] = [
  {
    key: "nfc",
    label: "NFC",
    icon: Smartphone,
    description: "Lectura, escritura y UID",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "qr",
    label: "QR",
    icon: QrCode,
    description: "Escáneo, URL y resolución",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "personalization",
    label: "Personalización",
    icon: Printer,
    description: "Nombre, empresa y datos",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "material",
    label: "Material",
    icon: Layers,
    description: "Color, impresión y acabado",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "packaging",
    label: "Empaque",
    icon: Package,
    description: "Contenido completo y accesorios",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "documentation",
    label: "Documentación",
    icon: FileText,
    description: "Packing list y etiquetas",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Producción terminada", icon: CheckCircle2, description: "Orden completada" },
  { label: "Inspección visual", icon: Monitor, description: "Revisión física" },
  { label: "Prueba NFC / QR", icon: Scan, description: "Validación técnica" },
  { label: "Checklist", icon: ClipboardCheck, description: "Verificación final" },
  { label: "Aprobado o Reproceso", icon: RefreshCw, description: "Decisión final" },
  { label: "Empaque", icon: PackageCheck, description: "Siguiente paso" },
];

const CHECKLIST_ITEMS = [
  { label: "NFC responde correctamente", icon: Smartphone },
  { label: "QR abre correctamente", icon: QrCode },
  { label: "Datos impresos correctos", icon: Printer },
  { label: "Personalización correcta", icon: FileText },
  { label: "Material sin defectos", icon: Layers },
  { label: "Accesorios completos", icon: Package },
  { label: "Etiqueta correcta", icon: Sticker },
  { label: "Listo para empaque", icon: PackageCheck },
];

const RESULTS = [
  { label: "Aprobado", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Requiere reproceso", icon: RefreshCw, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Rechazado", icon: XCircle, color: "bg-red-50 text-red-700 border-red-200" },
  { label: "Scrap", icon: AlertTriangle, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { label: "Aprobado con excepción", icon: ShieldCheck, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

const FUTURE_ACTIONS = [
  { label: "Inspeccionar", icon: "🔍", description: "Iniciar inspección" },
  { label: "Registrar resultado", icon: "📝", description: "Guardar resultado" },
  { label: "Enviar a reproceso", icon: "🔄", description: "Rechazar y reprocesar" },
  { label: "Aprobar", icon: "✅", description: "Aprobar calidad" },
  { label: "Generar evidencia", icon: "📸", description: "Capturar evidencia" },
  { label: "Reportar incidencia", icon: "⚠️", description: "Reportar problema" },
];

const BENEFITS = [
  { label: "Evitar errores", description: "Detección temprana de fallos" },
  { label: "Reducir devoluciones", description: "Productos verificados antes de salir" },
  { label: "Asegurar trazabilidad", description: "Registro de cada inspección" },
  { label: "Proteger la marca", description: "Calidad consistente" },
  { label: "Validar personalización", description: "Cada producto es único" },
  { label: "Garantizar funcionamiento NFC", description: "Prueba técnica obligatoria" },
  { label: "Garantizar lectura QR", description: "Escáneo de verificación" },
  { label: "Auditoría completa", description: "Historial de calidad" },
];

const PLACEHOLDER_METRICS = {
  pending: 0,
  approved: 0,
  rejected: 0,
  rework: 0,
};

export function QualitySection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Control de Calidad
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Verificación final antes del empaque y despacho.
        </p>
      </div>

      {/* Card principal */}
      <div className="rounded-3xl border-2 border-teal-200 bg-teal-50 p-6 dark:border-teal-800 dark:bg-teal-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-teal-100 p-3 dark:bg-teal-900/50">
            <ShieldCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-teal-900 dark:text-teal-100 mb-2">
              Ningún producto debe salir a empaque o despacho sin haber pasado por Control de Calidad
            </h3>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
              Aquí se validará: funcionamiento NFC, QR, impresión, personalización, materiales y estado físico.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo de Calidad
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Aprobados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.approved}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Rechazados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.rejected}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Reproceso
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.rework}</p>
        </div>
      </div>

      {/* Tipos de validación */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Validación
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VALIDATION_TYPES.map((type) => {
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

      {/* Checklist futuro */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Checklist de Calidad (Próximamente)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Resultados posibles */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Resultados Posibles
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {RESULTS.map((result) => {
            const Icon = result.icon;
            return (
              <div
                key={result.label}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${result.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {result.label}
                </p>
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
              title="Disponible cuando se implemente el módulo de calidad"
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
          ¿Por qué existe Control de Calidad?
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
          Sin inspecciones registradas — Las validaciones se activarán cuando exista el módulo operativo de Control de Calidad
        </p>
      </div>
    </div>
  );
}