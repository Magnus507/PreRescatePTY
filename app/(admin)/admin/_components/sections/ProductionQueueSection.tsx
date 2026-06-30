"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Factory,
  Clock,
  CheckCircle2,
  Package,
  Building2,
  Users,
  ExternalLink,
  Smartphone,
  Layers,
  FileText,
  Sticker,
} from "lucide-react";
import { toast } from "sonner";
import FabricationSection from "./FabricationSection";
import { ProductionWorkflowSection } from "./ProductionWorkflowSection";

interface QueueItem {
  orderId: string;
  orderNumber: string;
  companyName: string;
  totalItems: number;
  totalCollaborators: number;
  summaryByProductType: Record<string, number>;
  chipsNfc: number;
  productionStatus: "pending" | "in_production" | "packing" | "done";
  createdAt: string;
}

interface Counts {
  pending: number;
  inProduction: number;
  packing: number;
  done: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pendiente",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <Clock className="h-4 w-4" />,
  },
  in_production: {
    label: "En producción",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    icon: <Factory className="h-4 w-4" />,
  },
  packing: {
    label: "Empaque",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Package className="h-4 w-4" />,
  },
  done: {
    label: "Completado",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  initial_chip: <Smartphone className="h-3 w-3" />,
  bracelet: <Layers className="h-3 w-3" />,
  credential: <FileText className="h-3 w-3" />,
  sticker_nfc_qr: <Sticker className="h-3 w-3" />,
};

export default function ProductionQueueSection() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, inProduction: 0, packing: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fabrication/queue");
      if (!res.ok) throw new Error("Error al cargar cola");
      const data = await res.json();
      setQueue(data.queue || []);
      setCounts(data.counts || { pending: 0, inProduction: 0, packing: 0, done: 0 });
    } catch {
      toast.error("Error al cargar cola de producción");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filtered = statusFilter ? queue.filter((o) => o.productionStatus === statusFilter) : queue;

  // If we're viewing a specific order's fabrication detail
  if (openOrderId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpenOrderId(null)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            ← Volver a cola
          </button>
        </div>
        <FabricationSection orderId={openOrderId} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" /> Producción
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Produccion para stock y produccion empresarial bajo pedido.
        </p>
      </div>

      <ProductionWorkflowSection />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              statusFilter === key
                ? "ring-2 ring-primary ring-offset-2 " + cfg.color
                : cfg.color + " opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {cfg.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{cfg.label}</span>
            </div>
            <p className="text-2xl font-black">{counts[key as keyof Counts]}</p>
          </button>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <Factory className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            {statusFilter
              ? "No hay pedidos en este estado"
              : "No hay pedidos corporativos en cola de producción"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Los pedidos corporativos aprobados y pagados aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const cfg = STATUS_CONFIG[item.productionStatus] || STATUS_CONFIG.pending;
            return (
              <div
                key={item.orderId}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all"
              >
                {/* Info principal */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono font-bold text-sm">#{item.orderNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center gap-1 ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {item.companyName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-3 w-3" /> {item.totalItems} producto(s)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {item.totalCollaborators} colaborador(es)
                    </span>
                    {item.chipsNfc > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="h-3 w-3" /> {item.chipsNfc} chip(s)
                      </span>
                    )}
                  </div>

                  {/* Product types */}
                  {Object.keys(item.summaryByProductType).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.summaryByProductType).map(([type, count]) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-[8px] font-bold uppercase text-slate-600"
                        >
                          {TYPE_ICONS[type] || <Package className="h-2.5 w-2.5" />}
                          {count} {type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón abrir fabricación */}
                <button
                  onClick={() => setOpenOrderId(item.orderId)}
                  className="w-full sm:w-auto px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir fabricación
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
