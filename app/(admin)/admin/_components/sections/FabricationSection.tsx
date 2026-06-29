"use client";

import { useEffect, useState } from "react";
import { Loader2, Copy, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

interface FabItem {
  itemId: string;
  productName: string;
  productType: string;
  quantity: number;
  fulfillmentStatus: string;
  collaboratorName: string;
  employeePosition: string;
  employeeNationalId: string;
  chipShortCode: string | null;
  chipQrUrl: string | null;
  chipStatus: string | null;
  publicLink: string | null;
}

interface FabData {
  orderNumber: string;
  companyName: string;
  totalItems: number;
  summaryByProductType: Record<string, number>;
  items: FabItem[];
}

export default function FabricationSection({ orderId }: { orderId: string }) {
  const [fabData, setFabData] = useState<FabData | null>(null);
  const [fabLoading, setFabLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setFabLoading(true);
    fetch(`/api/admin/orders/${orderId}/fabrication`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFabData(data))
      .catch(() => setFabData(null))
      .finally(() => setFabLoading(false));
  }, [orderId]);

  if (fabLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!fabData) return null;

  const LABEL_MAP: Record<string, string> = {
    initial_chip: "Chips iniciales",
    bracelet: "Pulseras",
    credential: "Credenciales",
    sticker_nfc_qr: "Stickers NFC",
  };

  const STATUS_COLORS: Record<string, string> = {
    pending_assignment: "bg-amber-50 text-amber-700 border-amber-200",
    assigned_reserved: "bg-blue-50 text-blue-700 border-blue-200",
    in_production: "bg-purple-50 text-purple-700 border-purple-200",
    ready_for_assignment: "bg-sky-50 text-sky-700 border-sky-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activated: "bg-emerald-50 text-emerald-800 border-emerald-300",
  };

  const STATUS_LABELS: Record<string, string> = {
    pending_assignment: "Pendiente",
    assigned_reserved: "Asignado",
    in_production: "En fabricación",
    ready_for_assignment: "Listo",
    delivered: "Entregado",
    activated: "Activado",
  };

  const COLORS_PALETTE = [
    "bg-indigo-50 border-indigo-200 text-indigo-800",
    "bg-emerald-50 border-emerald-200 text-emerald-800",
    "bg-amber-50 border-amber-200 text-amber-800",
    "bg-rose-50 border-rose-200 text-rose-800",
    "bg-purple-50 border-purple-200 text-purple-800",
    "bg-sky-50 border-sky-200 text-sky-800",
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
          <div className="h-1.5 w-6 bg-primary rounded-full" />
          Centro de Fabricación
        </h3>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(fabData.summaryByProductType).map(([type, count], idx) => {
            const colorClass =
              COLORS_PALETTE[idx % COLORS_PALETTE.length] ?? "bg-slate-50 border-slate-200 text-slate-800";
            return (
              <div key={type} className={`rounded-xl border-2 p-4 ${colorClass}`}>
                <p className="text-2xl font-black">{count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest mt-1">
                  {LABEL_MAP[type] || type}
                </p>
              </div>
            );
          })}
        </div>

        {/* Collaborator table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2.5 font-black uppercase tracking-widest text-[9px] text-slate-500">
                    Colaborador
                  </th>
                  <th className="text-left px-3 py-2.5 font-black uppercase tracking-widest text-[9px] text-slate-500">
                    Producto
                  </th>
                  <th className="text-left px-3 py-2.5 font-black uppercase tracking-widest text-[9px] text-slate-500">
                    Estado
                  </th>
                  <th className="text-left px-3 py-2.5 font-black uppercase tracking-widest text-[9px] text-slate-500">
                    Chip
                  </th>
                  <th className="text-left px-3 py-2.5 font-black uppercase tracking-widest text-[9px] text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fabData.items.map((item) => (
                  <tr key={item.itemId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{item.collaboratorName}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{item.employeePosition}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{item.productName}</p>
                      <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded font-bold uppercase text-muted-foreground">
                        {item.productType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          STATUS_COLORS[item.fulfillmentStatus] || "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {STATUS_LABELS[item.fulfillmentStatus] || item.fulfillmentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {item.chipShortCode ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{item.chipShortCode}</span>
                          {item.chipStatus === "ACTIVATED" && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[7px] font-black uppercase tracking-widest">
                              Activo
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {item.publicLink && (
                          <>
                            <button
                              onClick={async () => {
                                const url = `${window.location.origin}${item.publicLink}`;
                                try {
                                  await navigator.clipboard.writeText(url);
                                  toast.success("Link copiado");
                                } catch {
                                  toast.error("No se pudo copiar");
                                }
                              }}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"
                              title="Copiar link público"
                            >
                              <Copy className="h-2.5 w-2.5" /> Link
                            </button>
                            <a
                              href={item.publicLink}
                              target="_blank"
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"
                              title="Abrir perfil público"
                            >
                              <ExternalLinkIcon className="h-2.5 w-2.5" /> Abrir
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}