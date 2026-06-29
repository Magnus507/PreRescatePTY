"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Clock,
  Package,
  ShieldCheck,
  XCircle,
  QrCode,
  Smartphone,
  Layers,
  FileText,
  Sticker,
} from "lucide-react";

type PhysicalView = "all" | "nfc_sticker" | "bracelet" | "pvc_credential" | "card" | "keychain" | "envelope" | "lanyard" | "box" | "kit";

interface Category {
  key: PhysicalView;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const CATEGORIES: Category[] = [
  {
    key: "nfc_sticker",
    label: "NFC / Stickers",
    icon: Sticker,
    description: "Stickers con chip NFC y código QR",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "bracelet",
    label: "Pulseras",
    icon: Layers,
    description: "Pulseras de silicona con NFC",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "pvc_credential",
    label: "Credenciales PVC",
    icon: FileText,
    description: "Tarjetas plásticas con NFC",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    key: "card",
    label: "Tarjetas",
    icon: Package,
    description: "Tarjetas de cartón o plástico",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "keychain",
    label: "Llaveros",
    icon: Smartphone,
    description: "Llaveros con NFC",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "envelope",
    label: "Sobres",
    icon: QrCode,
    description: "Sobres de activación con QR",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    key: "lanyard",
    label: "Lanyards",
    icon: Activity,
    description: "Cintas para colgar",
    color: "bg-pink-50 text-pink-700 border-pink-200",
  },
  {
    key: "box",
    label: "Cajas",
    icon: Boxes,
    description: "Cajas de empaque",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    key: "kit",
    label: "Kits",
    icon: Package,
    description: "Kits combinados",
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
];

const PLACEHOLDER_METRICS = {
  available: 0,
  reserved: 0,
  inProduction: 0,
  damaged: 0,
};

const FUTURE_ACTIONS = [
  { label: "Registrar ingreso", icon: "📥", description: "Registrar entrada de materiales" },
  { label: "Reservar", icon: "📋", description: "Reservar materiales para producción" },
  { label: "Transferir", icon: "🔄", description: "Transferir entre ubicaciones" },
  { label: "Marcar dañado", icon: "⚠️", description: "Reportar materiales dañados" },
  { label: "Devolver", icon: "↩️", description: "Devolver materiales a stock" },
  { label: "Ajustar inventario", icon: "⚖️", description: "Ajuste manual de cantidades" },
];

export function PhysicalInventorySection() {
  const [activeCategory, setActiveCategory] = useState<PhysicalView | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Boxes className="h-8 w-8 text-primary" />
          Inventario Físico
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Control de materiales físicos: stickers, pulseras, credenciales, cajas y kits.
        </p>
      </div>

      {/* Mensaje diferenciador */}
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-900/50">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-amber-900 dark:text-amber-100 mb-2">
              Este módulo controla materiales físicos, no recursos digitales
            </h3>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Los chips, shortCodes, QR y códigos de activación se gestionan en la pestaña{" "}
              <span className="font-black">{'"Recursos Digitales"'}</span>.
              Este módulo es para materiales tangibles como stickers, pulseras, cajas y kits.
            </p>
          </div>
        </div>
      </div>

      {/* Métricas placeholder */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Disponibles
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.available}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Reservados
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.reserved}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-violet-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              En producción
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.inProduction}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 opacity-60">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Dañados/Devueltos
            </span>
          </div>
          <p className="text-2xl font-black">{PLACEHOLDER_METRICS.damaged}</p>
        </div>
      </div>

      {/* Categorías de materiales */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Categorías de Materiales
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.key;
            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(isActive ? null : category.key)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? "ring-2 ring-primary ring-offset-2 " + category.color
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${category.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {category.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {category.description}
                </p>
              </button>
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
              title="Disponible cuando se implemente el módulo de inventario físico"
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
          Estado: Sin datos físicos registrados — Las métricas se activarán cuando se registre el primer material
        </p>
      </div>
    </div>
  );
}