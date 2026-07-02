"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Boxes, PackageCheck } from "lucide-react";
import { FinishedGoodsSection } from "./FinishedGoodsSection";
import { MaterialsWorkflowSection } from "./MaterialsWorkflowSection";

type PhysicalInventoryTab = "materials" | "finished";

const TABS: Array<{ id: PhysicalInventoryTab; label: string; icon: React.ElementType }> = [
  { id: "materials", label: "Materiales", icon: Archive },
  { id: "finished", label: "Productos terminados", icon: PackageCheck },
];

export function PhysicalInventorySection() {
  const [activeTab, setActiveTab] = useState<PhysicalInventoryTab>("materials");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight">
          <Boxes className="h-8 w-8 text-primary" />
          Inventario agregado / referencia
        </h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Balance agregado y lectura secundaria para materiales de fabricacion y producto terminado.
        </p>
      </div>

      <section className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-900/50">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-amber-900 dark:text-amber-100">
              Separacion operativa obligatoria
            </h3>
            <p className="text-sm font-semibold leading-relaxed text-amber-700 dark:text-amber-300">
              Materiales no son productos terminados. Chips, shortCodes, QR y codigos de activacion no son inventario fisico.
              Este balance es de referencia: las reservas y el despacho usan unidades trazables.
            </p>
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Inventario fisico">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  active
                    ? "bg-white text-primary shadow-sm dark:bg-slate-800"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">
        {activeTab === "materials" ? <MaterialsWorkflowSection /> : <FinishedGoodsSection />}
      </div>
    </div>
  );
}
