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
  Plus,
  X,
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

interface DigitalBatchItem {
  id: string;
  internalLabel: string;
  sequenceNumber: number;
  qrUrl: string;
  nfcUrl: string | null;
  activationUrl: string | null;
  shortCode: string | null;
  status: string;
}

interface DigitalBatch {
  id: string;
  code: string;
  name: string | null;
  productType: string;
  finishedGoodCode: string | null;
  prefix: string;
  startNumber: number;
  endNumber: number;
  quantity: number;
  status: string;
  notes: string | null;
  items: DigitalBatchItem[];
  consumedItems?: number;
  createdAt: string;
  updatedAt: string;
}

interface DigitalBatchFormState {
  code: string;
  name: string;
  productType: string;
  finishedGoodCode: string;
  prefix: string;
  startNumber: string;
  endNumber: string;
  notes: string;
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
  { label: "Generado", icon: Cpu },
  { label: "Disponible digital", icon: ShieldCheck },
  { label: "QR", icon: QrCode },
  { label: "Enviado a imprenta", icon: Download },
  { label: "Impreso recibido", icon: Printer },
  { label: "Ensamblado", icon: Paintbrush },
];

const EMPTY_BATCH_FORM: DigitalBatchFormState = {
  code: "",
  name: "",
  productType: "sticker_normal",
  finishedGoodCode: "PRP-FG-STICKER",
  prefix: "Inicial",
  startNumber: "1",
  endNumber: "10",
  notes: "",
};

export function DigitalResourcesSection() {
  const [activeTab, setActiveTab] = useState<DigitalView>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DigitalChip[]>([]);
  const [digitalBatches, setDigitalBatches] = useState<DigitalBatch[]>([]);
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
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchForm, setBatchForm] = useState<DigitalBatchFormState>(EMPTY_BATCH_FORM);

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

  const loadDigitalBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/digital-batches", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar lotes digitales");
      setDigitalBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar lotes digitales");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDigitalBatches();
  }, [loadDigitalBatches]);

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

  const updateBatchForm = (field: keyof DigitalBatchFormState, value: string) => {
    setBatchForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startNumber = Number(batchForm.startNumber);
    const endNumber = Number(batchForm.endNumber);
    if (!Number.isFinite(startNumber) || !Number.isFinite(endNumber)) {
      toast.error("El rango debe ser numérico");
      return;
    }
    setSavingBatch(true);
    try {
      const res = await fetch("/api/admin/operations/digital-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: batchForm.code.trim(),
          name: batchForm.name.trim() || null,
          productType: batchForm.productType,
          finishedGoodCode: batchForm.finishedGoodCode,
          prefix: batchForm.prefix.trim(),
          startNumber,
          endNumber,
          notes: batchForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear lote digital");
      toast.success("Lote digital creado");
      setBatchForm(EMPTY_BATCH_FORM);
      setShowBatchModal(false);
      await loadDigitalBatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear lote digital");
    } finally {
      setSavingBatch(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Cpu className="h-8 w-8 text-primary" />
          Recursos digitales QR/link
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Administra lotes digitales, etiquetas internas, shortCodes y enlaces de activación asociados al inventario trazable.
        </p>
      </div>

      <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-black tracking-tight text-indigo-950">Flujo digital hacia imprenta y ensamblaje</h3>
            <p className="mt-1 text-sm font-semibold text-indigo-700">
              Un recurso digital no es una unidad física ni stock disponible. Se convierte en unidad cuando impresión y ensamblaje se completan.
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
          <h3 className="text-xl font-black tracking-tight text-slate-950">Lotes digitales QR+link</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cada lote crea una secuencia interna única antes de pasar a impresión y ensamblaje físico.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
          >
            <Plus className="h-4 w-4" />
            Crear lote
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {digitalBatches.map((batch) => (
            <article key={batch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black text-primary">{batch.code}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{batch.name || "Sin nombre"}</p>
                </div>
                <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                  {batch.status}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-500">
                {batch.prefix}-{String(batch.startNumber).padStart(4, "0")} a {String(batch.endNumber).padStart(4, "0")}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {batch.productType} · {batch.finishedGoodCode} · {batch.quantity} unidades
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Consumidos: {batch.consumedItems || 0}
              </p>
            </article>
          ))}
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
            No hay lotes digitales todavía
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Crea un lote QR/link antes de enviarlo a imprenta.
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
                    Usuario vinculado
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
                          Marcar impreso
                        </button>
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60"
                          title="Se activará con el flujo de ensamblaje"
                        >
                          <Send className="h-4 w-4" />
                          Enviar a ensamblaje
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

      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateBatch} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Recursos digitales</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear lote QR+link</h3>
                </div>
                <button type="button" onClick={() => setShowBatchModal(false)} className="rounded-2xl border border-slate-200 p-3 text-slate-400 hover:bg-slate-50" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Code</span>
                  <input required value={batchForm.code} onChange={(e) => updateBatchForm("code", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="DB-0001" />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                  <input value={batchForm.name} onChange={(e) => updateBatchForm("name", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Lote inicial normal" />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span>
                  <select value={batchForm.productType} onChange={(e) => updateBatchForm("productType", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                    <option value="sticker_normal">Sticker PreRescatePTY</option>
                    <option value="sticker_empresarial">Sticker PreRescatePTY Empresarial</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Producto terminado</span>
                  <select value={batchForm.finishedGoodCode} onChange={(e) => updateBatchForm("finishedGoodCode", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                    <option value="PRP-FG-STICKER">PRP-FG-STICKER</option>
                    <option value="PRP-FG-STICKER-EMP">PRP-FG-STICKER-EMP</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prefijo</span>
                  <input required value={batchForm.prefix} onChange={(e) => updateBatchForm("prefix", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Inicial" />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inicio</span>
                  <input required type="number" min="1" value={batchForm.startNumber} onChange={(e) => updateBatchForm("startNumber", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fin</span>
                  <input required type="number" min="1" value={batchForm.endNumber} onChange={(e) => updateBatchForm("endNumber", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea value={batchForm.notes} onChange={(e) => updateBatchForm("notes", e.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowBatchModal(false)} className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancelar</button>
                <button type="submit" disabled={savingBatch} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                  {savingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Guardar lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
