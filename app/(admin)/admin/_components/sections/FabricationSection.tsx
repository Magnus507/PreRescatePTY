"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Copy,
  ExternalLink as ExternalLinkIcon,
  Smartphone,
  QrCode,
  Package,
  FileText,
  Sticker,
  Layers,
} from "lucide-react";
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

interface MaterialSummary {
  chipsNfc: number;
  pulseras: number;
  credenciales: number;
  stickers: number;
  sobresActivacion: number;
  cajasCorporativas: number;
  lanyards: number;
}

interface FabData {
  orderNumber: string;
  companyName: string;
  totalItems: number;
  summaryByProductType: Record<string, number>;
  materialSummary: MaterialSummary;
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

  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label ? `${label} copiado` : "Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  if (fabLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!fabData) return null;

  const { materialSummary } = fabData;
  const itemsByType = groupBy(fabData.items, "productType") as Record<string, FabItem[]>;
  const uniqueCollaborators = new Set(fabData.items.map((i) => i.collaboratorName)).size;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
          <div className="h-1.5 w-6 bg-primary rounded-full" />
          Centro de Producción
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pedido</p>
            <p className="font-mono font-bold text-sm mt-1">#{fabData.orderNumber}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Empresa</p>
            <p className="font-bold text-sm mt-1 truncate">{fabData.companyName}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Productos</p>
            <p className="font-bold text-2xl mt-1">{fabData.totalItems}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Colaboradores</p>
            <p className="font-bold text-2xl mt-1">{uniqueCollaborators}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Package className="h-3.5 w-3.5" />
          Materiales a preparar
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {materialSummary.chipsNfc > 0 && <Metric value={materialSummary.chipsNfc} label="Chips NFC" className="border-indigo-200 bg-indigo-50/50 text-indigo-800" />}
          {materialSummary.pulseras > 0 && <Metric value={materialSummary.pulseras} label="Pulseras" className="border-emerald-200 bg-emerald-50/50 text-emerald-800" />}
          {materialSummary.credenciales > 0 && <Metric value={materialSummary.credenciales} label="Credenciales" className="border-amber-200 bg-amber-50/50 text-amber-800" />}
          {materialSummary.stickers > 0 && <Metric value={materialSummary.stickers} label="Stickers" className="border-rose-200 bg-rose-50/50 text-rose-800" />}
          {materialSummary.sobresActivacion > 0 && <Metric value={materialSummary.sobresActivacion} label="Sobres activación" className="border-purple-200 bg-purple-50/50 text-purple-800" />}
          {materialSummary.lanyards > 0 && <Metric value={materialSummary.lanyards} label="Lanyards" className="border-sky-200 bg-sky-50/50 text-sky-800" />}
          {materialSummary.cajasCorporativas > 0 && <Metric value={materialSummary.cajasCorporativas} label="Cajas corporativas" className="border-slate-200 bg-slate-50/50 text-slate-800" />}
        </div>
      </section>

      {Object.entries(itemsByType).map(([type, typeItems]) => {
        const icon = TYPE_ICONS[type] || <Package className="h-4 w-4" />;
        const label = TYPE_LABELS[type] || type;
        const count = typeItems.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <section key={type} className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">{icon}{label} ({count})</h4>
            <div className="space-y-2">
              {typeItems.map((item) => (
                <div key={item.itemId} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-900 truncate">{item.collaboratorName}</p>
                      {item.employeePosition && <span className="text-[9px] text-muted-foreground italic">{item.employeePosition}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-bold uppercase text-muted-foreground">{item.productName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLORS[item.fulfillmentStatus] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{STATUS_LABELS[item.fulfillmentStatus] || item.fulfillmentStatus}</span>
                    </div>
                  </div>
                  {item.chipShortCode && <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">{item.chipShortCode}</span>}
                  <div className="flex gap-1.5 shrink-0">
                    {item.chipShortCode && <button onClick={() => copyToClipboard(item.chipShortCode!, "ShortCode")} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"><Copy className="h-2.5 w-2.5" /> Código</button>}
                    {item.publicLink && <><button onClick={() => copyToClipboard(`${window.location.origin}${item.publicLink}`, "Link")} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"><Copy className="h-2.5 w-2.5" /> Link</button><a href={item.publicLink} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"><ExternalLinkIcon className="h-2.5 w-2.5" /> Abrir</a></>}
                    {item.chipQrUrl && <button onClick={() => copyToClipboard(item.chipQrUrl!, "QR URL")} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"><QrCode className="h-2.5 w-2.5" /> QR URL</button>}
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

function Metric({ value, label, className }: { value: number; label: string; className: string }) {
  return <div className={`rounded-lg border px-3 py-2.5 ${className}`}><p className="text-lg font-black">{value}</p><p className="text-[9px] font-bold uppercase tracking-wider">{label}</p></div>;
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const group = String(item[key]);
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
