"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Cpu,
  Download,
  Eye,
  Loader2,
  Paintbrush,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { QrPreviewModal } from "../modals/QrPreviewModal";
import { ChipDetailsDrawer } from "../details/ChipDetailsDrawer";

type DigitalView = "all" | "available" | "reserved" | "activated" | "damaged";

interface DigitalChip {
  id: string;
  serialPublic: string;
  shortCode: string;
  internalLabel: string | null;
  status: string;
  serviceStatus: string;
  serviceEndDate: string | null;
  serviceStartDate: string | null;
  activatedAt: string | null;
  lastScanAt: string | null;
  ownerUserId: string | null;
  batchId: string | null;
  productType: string;
  nicheType: string;
  isPhysical: boolean;
  createdAt: string;
  owner?: { email: string } | null;
  assignedProfile?: { firstName: string; lastName: string } | null;
  qrUrl: string;
  nfcUrl: string;
  claimTokens?: { activationCode: string; usedAt: string | null }[];
  _count: { scanEvents: number };
}

interface Counts {
  total: number;
  available: number;
  reserved: number;
  activated: number;
  damaged: number;
}

const TABS: { key: DigitalView; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Todos", icon: Activity },
  { key: "available", label: "Disponibles", icon: ShieldCheck },
  { key: "reserved", label: "Asignados/Reservados", icon: Clock },
  { key: "activated", label: "Activados", icon: CheckCircle2 },
  { key: "damaged", label: "Vencidos/Perdidos/Dañados", icon: XCircle },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  inventory: { label: "Disponible", color: "bg-blue-50 text-blue-700 border-blue-200" },
  sold: { label: "Vendido", color: "bg-amber-50 text-amber-700 border-amber-200" },
  activated: { label: "Activado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  suspended: { label: "Suspendido", color: "bg-red-50 text-red-700 border-red-200" },
  damaged: { label: "Dañado", color: "bg-slate-100 text-slate-700 border-slate-200" },
  lost: { label: "Perdido", color: "bg-slate-100 text-slate-700 border-slate-200" },
  consigned: { label: "Consignado", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

const SERVICE_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-emerald-50 text-emerald-700" },
  limited: { label: "Limitado", color: "bg-orange-50 text-orange-700" },
  suspended: { label: "Suspendido", color: "bg-red-50 text-red-700" },
};

const DIGITAL_FLOW = [
  { label: "Crear chip", icon: Cpu },
  { label: "URL publica", icon: ShieldCheck },
  { label: "QR", icon: QrCode },
  { label: "Descargar QR", icon: Download },
  { label: "Arte / diseno", icon: Paintbrush },
  { label: "Produccion", icon: Printer },
];

export function DigitalResourcesSection() {
  const [activeTab, setActiveTab] = useState<DigitalView>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DigitalChip[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    available: 0,
    reserved: 0,
    activated: 0,
    damaged: 0,
  });
  const [loading, setLoading] = useState(false);
  const [qrChip, setQrChip] = useState<DigitalChip | null>(null);
  const [detailChip, setDetailChip] = useState<DigitalChip | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("view", activeTab);
      if (search) params.set("search", search);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/chips?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Error al cargar recursos digitales");
      const data = await res.json();

      const chips = (data.items || data.chips || []) as DigitalChip[];
      setItems(chips);
      setCounts((prev) => ({
        ...prev,
        total: data.total || chips.length,
        [activeTab === "all" ? "available" : activeTab]: data.total || chips.length,
      }));
    } catch {
      toast.error("Error al cargar recursos digitales");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = async (text: string, chipId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(chipId);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Error al copiar");
    }
  };

  const getPublicUrl = (chip: DigitalChip) => {
    return `${window.location.origin}/e/${chip.shortCode}`;
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-slate-100 text-slate-700" };
    return (
      <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const getServiceBadge = (serviceStatus: string) => {
    const cfg = SERVICE_CONFIG[serviceStatus] || { label: serviceStatus, color: "bg-slate-100 text-slate-700" };
    return (
      <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-PA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Cpu className="h-8 w-8 text-primary" />
          Recursos Digitales
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Gestion de chips, shortCodes, QR, codigos de activacion y estados de servicio.
        </p>
      </div>

      <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-black tracking-tight text-indigo-950">Flujo digital hacia produccion</h3>
            <p className="mt-1 text-sm font-semibold text-indigo-700">
              El recurso digital prepara identidad, URL y QR. No representa stock fisico ni material disponible.
            </p>
          </div>
          <span className="w-fit rounded-2xl border border-indigo-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-700">
            Flujo definido, datos reales pendientes
          </span>
        </div>
        <div className="flex overflow-x-auto pb-2">
          {DIGITAL_FLOW.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center">
                <div className="min-w-[136px] rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
                  <Icon className="mx-auto mb-3 h-5 w-5 text-primary" />
                  <p className="text-xs font-black text-slate-800">{step.label}</p>
                </div>
                {index < DIGITAL_FLOW.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-indigo-300" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TABS.filter((t) => t.key !== "all").map((tab) => {
          const Icon = tab.icon;
          const value = counts[tab.key as keyof Counts] || 0;
          return (
            <div
              key={tab.key}
              className={`rounded-xl border-2 p-4 transition-all ${
                activeTab === tab.key
                  ? "ring-2 ring-primary ring-offset-2 bg-white"
                  : "bg-white opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {tab.label}
                </span>
              </div>
              <p className="text-2xl font-black">{value}</p>
            </div>
          );
        })}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por shortCode, serial, internalLabel o activationCode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadData()}
            className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </button>
      </div>

      {/* Tabs de vista */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabla de recursos */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <Cpu className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            No hay recursos digitales en esta categoría
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Los chips creados aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Serial
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    ShortCode
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Etiqueta Interna
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Servicio
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Owner/Perfil
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((chip) => (
                  <tr key={chip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-xs">{chip.serialPublic}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-xs text-primary">{chip.shortCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-600">{chip.internalLabel || "—"}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(chip.status)}</td>
                    <td className="px-6 py-4">{getServiceBadge(chip.serviceStatus)}</td>
                    <td className="px-6 py-4">
                      {chip.owner ? (
                        <div>
                          <p className="text-xs font-semibold truncate max-w-[200px]">{chip.owner.email}</p>
                          {chip.assignedProfile && (
                            <p className="text-[10px] text-slate-500">
                              {chip.assignedProfile.firstName} {chip.assignedProfile.lastName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-[420px] flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(getPublicUrl(chip), chip.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
                          title="Copiar URL publica"
                        >
                          {copiedId === chip.id ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-slate-600" />
                          )}
                          Copiar URL
                        </button>
                        {chip.qrUrl && (
                          <button
                            onClick={() => setQrChip(chip)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
                            title="Ver QR"
                          >
                            <QrCode className="h-4 w-4 text-slate-600" />
                            Ver QR
                          </button>
                        )}
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60"
                          title="Pendiente de endpoint"
                        >
                          <Download className="h-4 w-4" />
                          Descargar QR
                        </button>
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60"
                          title="Se activara con el modulo ERP"
                        >
                          <Send className="h-4 w-4" />
                          Enviar a produccion
                        </button>
                        <button
                          onClick={() => setDetailChip(chip)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4 text-slate-600" />
                          Detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {qrChip && (
        <QrPreviewModal
          shortCode={qrChip.shortCode}
          internalLabel={qrChip.internalLabel}
          isPhysical={false}
          onClose={() => setQrChip(null)}
        />
      )}
      {detailChip && (
        <ChipDetailsDrawer
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          chip={detailChip as any}
          onClose={() => setDetailChip(null)}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
}
