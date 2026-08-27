"use client";

import { useEffect, useState } from "react";
import { Boxes, Factory, History, RotateCcw, ShoppingCart, Truck } from "lucide-react";
import ProductionQueueSection from "./ProductionQueueSection";
import { PhysicalInventorySection } from "./PhysicalInventorySection";
import { DispatchSection } from "./DispatchSection";
import { HistorySection } from "./HistorySection";
import { PedidosSection } from "./PedidosSection";
import { WarrantySection } from "./WarrantySection";
import { ReplacementSection } from "./ReplacementSection";
import { ReturnSection } from "./ReturnSection";

type OperationsTab = "commercial" | "production" | "inventory" | "dispatch" | "postsales" | "history";
type PostsalesTab = "warranties" | "replacements" | "returns";

interface OperationsCenterSectionProps {
  role?: string;
  initialTab?: OperationsTab;
}

const TABS: Array<{ id: OperationsTab; label: string; icon: React.ElementType }> = [
  { id: "commercial", label: "Pedidos", icon: ShoppingCart },
  { id: "production", label: "Producción", icon: Factory },
  { id: "inventory", label: "Inventario", icon: Boxes },
  { id: "dispatch", label: "Despachos", icon: Truck },
  { id: "postsales", label: "Garantías y devoluciones", icon: RotateCcw },
  { id: "history", label: "Historial", icon: History },
];

const POSTSALES_TABS: Array<{ id: PostsalesTab; label: string }> = [
  { id: "warranties", label: "Garantías" },
  { id: "replacements", label: "Reemplazos" },
  { id: "returns", label: "Devoluciones" },
];

export function OperationsCenterSection({ role, initialTab = "commercial" }: OperationsCenterSectionProps) {
  const [activeTab, setActiveTab] = useState<OperationsTab>(initialTab);
  const [postsalesTab, setPostsalesTab] = useState<PostsalesTab>("warranties");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const renderContent = () => {
    if (activeTab === "commercial") return <PedidosSection />;
    if (activeTab === "production") return <ProductionQueueSection />;
    if (activeTab === "inventory") return <PhysicalInventorySection />;
    if (activeTab === "dispatch") return <DispatchSection />;
    if (activeTab === "history") return <HistorySection />;

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Garantías y devoluciones">
            {POSTSALES_TABS.map((tab) => {
              const active = postsalesTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPostsalesTab(tab.id)}
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? "bg-white text-primary shadow-sm dark:bg-slate-800"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {postsalesTab === "warranties" && <WarrantySection />}
        {postsalesTab === "replacements" && <ReplacementSection />}
        {postsalesTab === "returns" && <ReturnSection />}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Secciones del Centro de Operaciones">
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

      <div role="tabpanel">{renderContent()}</div>

      {role === "imprenta" && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">
          Vista de imprenta limitada al Centro de Operaciones.
        </div>
      )}
    </div>
  );
}
