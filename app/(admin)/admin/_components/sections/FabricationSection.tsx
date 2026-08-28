"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink as ExternalLinkIcon, FileText, Layers, Loader2, Package, QrCode, Smartphone, Sticker } from "lucide-react";
import { toast } from "sonner";

interface FabItem {
  itemId: string;
  productName: string;
  productType: string;
  quantity: number;
  fulfillmentStatus: string;
  collaboratorName: string;
  employeePosition: string;
  chipShortCode: string | null;
  chipQrUrl: string | null;
  chipStatus: string | null;
  publicLink: string | null;
}

interface FabData {
  orderNumber: string;
  companyName: string;
  totalItems: number;
  items: FabItem[];
}

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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  initial_chip: <Smartphone className="h-4 w-4" />,
  bracelet: <Layers className="h-4 w-4" />,
  credential: <FileText className="h-4 w-4" />,
  sticker_nfc_qr: <Sticker className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  initial_chip: "Chip inicial",
  bracelet: "Pulsera",
  credential: "Credencial",
  sticker_nfc_qr: "Sticker NFC",
};

export default function FabricationSection({ orderId }: { orderId: string }) {
  const [fabData, setFabData] = useState<FabData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/admin/orders/${orderId}/fabrication`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setFabData(data))
      .catch(() => setFabData(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!fabData) return null;

  const itemsByType = groupBy(fabData.items, "productType") as Record<string, FabItem[]>;
  const uniqueCollaborators = new Set(fabData.items.map((item) => item.collaboratorName)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Pedido" value={`#${fabData.orderNumber}`} mono />
        <Metric label="Empresa" value={fabData.companyName} />
        <Metric label="Productos" value={String(fabData.totalItems)} />
        <Metric label="Colaboradores" value={String(uniqueCollaborators)} />
      </div>

      {Object.entries(itemsByType).map(([type, items]) => {
        const icon = TYPE_ICONS[type] || <Package className="h-4 w-4" />;
        const label = TYPE_LABELS[type] || type;
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <section key={type} className="space-y-2">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{icon}{label} ({count})</h4>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.itemId} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-slate-900">{item.collaboratorName}</p>{item.employeePosition && <span className="text-[9px] text-slate-400">{item.employeePosition}</span>}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">{item.productName}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${STATUS_COLORS[item.fulfillmentStatus] || "border-slate-200 bg-slate-50 text-slate-600"}`}>{STATUS_LABELS[item.fulfillmentStatus] || item.fulfillmentStatus}</span></div>
                  </div>
                  {item.chipShortCode && <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-black text-slate-800">{item.chipShortCode}</span>}
                  <div className="flex flex-wrap gap-1.5">
                    {item.chipShortCode && <button type="button" onClick={() => copyToClipboard(item.chipShortCode!, "Código")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider"><Copy className="h-2.5 w-2.5" /> Código</button>}
                    {item.publicLink && <><button type="button" onClick={() => copyToClipboard(`${window.location.origin}${item.publicLink}`, "Link")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider"><Copy className="h-2.5 w-2.5" /> Link</button><a href={item.publicLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider"><ExternalLinkIcon className="h-2.5 w-2.5" /> Abrir</a></>}
                    {item.chipQrUrl && <button type="button" onClick={() => copyToClipboard(item.chipQrUrl!, "QR")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider"><QrCode className="h-2.5 w-2.5" /> QR</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className={`mt-1 truncate font-black text-slate-900 ${mono ? "font-mono text-sm" : "text-base"}`}>{value}</p></div>;
}

function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
