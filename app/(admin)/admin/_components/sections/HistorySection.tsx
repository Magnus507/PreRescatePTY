"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  CreditCard,
  ExternalLink,
  History,
  Loader2,
  Package,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { ActivationCodeReveal } from "./ActivationCodeReveal";

type HistoryEntityType =
  | "unit"
  | "commercial_order"
  | "digital_batch"
  | "print_order"
  | "production_order"
  | "dispatch"
  | "warranty"
  | "replacement"
  | "return";

type HistoryResponse = {
  subject: null | {
    entityType: HistoryEntityType;
    entityId: string;
    entityCode: string | null;
    internalLabel: string | null;
    title: string;
    subtitle: string | null;
    currentStatus: string | null;
    activationStatus: string | null;
  };
  timeline: Array<{
    id: string;
    occurredAt: string;
    source: string;
    eventType: string;
    label: string;
    description: string | null;
    severity: "info" | "success" | "warning" | "danger";
    entityType: string;
    entityId: string;
    entityCode: string | null;
    internalLabel: string | null;
    productCode: string | null;
    productName: string | null;
    referenceType: string | null;
    referenceId: string | null;
    related: Record<string, string | null>;
  }>;
  summary: {
    totalEvents: number;
    firstEventAt: string | null;
    lastEventAt: string | null;
    currentStatus: string | null;
    activationStatus: string | null;
    deliveredPendingActivation: boolean | null;
  };
  nextPage?: number | null;
  suggestions?: Array<{ type: HistoryEntityType; id: string; label: string; subtitle: string | null }>;
};

type CommercialOrderHistoryDetail = {
  order: {
    id: string;
    code: string;
    sourceType: string | null;
    sourceId: string | null;
    status: string;
    effectiveStatus: string;
    customerType: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerReference: string | null;
    salesChannel: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      productCode: string | null;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      unit: string;
      createdAt: string;
    }>;
  };
  dispatch: null | {
    id: string;
    code: string;
    status: string;
    destinationType: string;
    destinationName: string | null;
    destinationReference: string | null;
    destinationAddress: string | null;
    carrierName: string | null;
    trackingReference: string | null;
    scheduledAt: string | null;
    sentAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      internalLabel: string | null;
      productCode: string | null;
      productName: string | null;
      quantity: number;
      unit: string;
      status: string;
      pickedAt: string | null;
      packedAt: string | null;
      dispatchedAt: string | null;
      deliveredAt: string | null;
      unitRecord: null | {
        id: string;
        internalLabel: string;
        productCode: string;
        productName: string;
        productType: string;
        status: string;
        qaStatus: string | null;
        activationStatus: string;
        reservedAt: string | null;
        dispatchedAt: string | null;
        deliveredAt: string | null;
        activatedAt: string | null;
        createdAt: string;
        chip: null | {
          serialPublic: string;
          shortCode: string;
          nfcUrl: string;
          qrUrl: string;
          status: string;
          serviceStatus: string;
          activatedAt: string | null;
        };
      };
    }>;
  };
};

type SubmittedHistorySearch = {
  search: string;
  entityType: HistoryEntityType | "";
  entityId: string;
};

const ENTITY_OPTIONS: Array<{ value: HistoryEntityType; label: string }> = [
  { value: "unit", label: "Unidad" },
  { value: "commercial_order", label: "Pedido" },
  { value: "digital_batch", label: "Lote digital" },
  { value: "print_order", label: "Imprenta" },
  { value: "production_order", label: "Producción" },
  { value: "dispatch", label: "Despacho" },
  { value: "warranty", label: "Garantía" },
  { value: "replacement", label: "Reemplazo" },
  { value: "return", label: "Devolución" },
];

const STATUS_LABELS: Record<string, string> = {
  delivered: "Entregado",
  completed: "Completado",
  closed: "Cerrado",
  dispatched: "Despachado",
  sent: "En tránsito",
  in_transit: "En tránsito",
  processing: "Procesando",
  pending: "Pendiente",
  paid: "Pagado",
  under_review: "En revisión",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  available: "Disponible",
  reserved: "Reservado",
  qa_pending: "QC pendiente",
  qa_failed: "QC fallido",
  passed: "QC aprobado",
  not_activated: "No activado",
  activated: "Activado",
  active: "Activo",
};

function statusLabel(value: string | null | undefined) {
  if (!value) return "—";
  return STATUS_LABELS[value] || value.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDateTime(value) : "—";
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

const severityStyles: Record<string, string> = {
  info: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-rose-100 text-rose-700 border-rose-200",
};

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}

export function HistorySection() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<HistoryEntityType | "">("");
  const [submitted, setSubmitted] = useState<SubmittedHistorySearch>({
    search: "",
    entityType: "",
    entityId: "",
  });
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<CommercialOrderHistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (submitted.search) params.set("search", submitted.search);
        if (submitted.entityType) params.set("entityType", submitted.entityType);
        if (submitted.entityId) params.set("entityId", submitted.entityId);
        const res = await fetch(`/api/admin/operations/history?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "No se pudo cargar historial");
        if (!cancelled) setData(payload as HistoryResponse);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "No se pudo cargar historial");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [submitted, page]);

  useEffect(() => {
    const subject = data?.subject;
    if (!subject || subject.entityType !== "commercial_order") {
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setDetail(null);
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/admin/operations/history/${encodeURIComponent(subject.entityId)}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "No se pudo cargar el expediente");
        if (!cancelled) setDetail(payload.detail as CommercialOrderHistoryDetail);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "No se pudo cargar el expediente");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [data?.subject]);

  const empty = useMemo(
    () =>
      !loading &&
      !data?.subject &&
      !data?.suggestions?.length &&
      !submitted.search &&
      !submitted.entityId,
    [loading, data, submitted.search, submitted.entityId]
  );

  const displayedStatus =
    data?.subject?.entityType === "commercial_order" && detail
      ? detail.order.effectiveStatus
      : data?.summary.currentStatus;

  const backToHistoryList = () => {
    setDetail(null);
    setDetailLoading(false);
    setData(null);
    setPage(0);
    setSubmitted({ search: search.trim(), entityType, entityId: "" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight">
          <History className="h-8 w-8 text-primary" />
          Historial
        </h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Buscar
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Etiqueta, pedido, despacho, lote..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </label>
          <label className="lg:w-56">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Tipo
            </span>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as HistoryEntityType | "")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">Todos</option>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setPage(0);
              setSubmitted({ search: search.trim(), entityType, entityId: "" });
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Buscar
          </button>
        </div>
      </div>

      {data?.subject ? (
        <div className="flex">
          <button
            type="button"
            onClick={backToHistoryList}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary/30 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <span aria-hidden="true">←</span>
            Volver al historial
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : data?.suggestions?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Resultados</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {data.suggestions.map((item) => (
              <button
                key={`${item.type}:${item.id}`}
                type="button"
                onClick={() =>
                  setSubmitted({
                    search: item.label,
                    entityType: item.type,
                    entityId: item.id,
                  })
                }
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">{item.label}</div>
                <div className="text-xs text-slate-500">{item.subtitle || item.type}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!submitted.entityId && (page > 0 || data?.nextPage != null) ? (
        <div className="flex gap-3">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">
            Anterior
          </button>
          <button disabled={data?.nextPage == null} onClick={() => setPage(data?.nextPage ?? page)} className="rounded-lg border px-4 py-2 disabled:opacity-40">
            Siguiente
          </button>
        </div>
      ) : null}

      {data?.subject ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Registro</p>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">{data.subject.title}</h3>
            <p className="text-sm text-slate-500">{data.subject.subtitle}</p>
            <div className="flex flex-wrap gap-2 pt-2 text-xs">
              {displayedStatus ? <span className="rounded-full border px-2.5 py-1">{statusLabel(displayedStatus)}</span> : null}
              {data.summary.activationStatus ? <span className="rounded-full border px-2.5 py-1">{statusLabel(data.summary.activationStatus)}</span> : null}
              {data.summary.deliveredPendingActivation ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">Entregado · pendiente de activar</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {detailLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Cargando expediente completo…</p>
        </div>
      ) : detail ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">Expediente consolidado</p>
            <p className="mt-1 text-sm text-slate-500">Venta, cliente, producto, unidad física y entrega en un solo lugar para soporte.</p>
          </div>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="mb-3 flex items-center gap-2 font-black text-slate-950 dark:text-white">
              <CreditCard className="h-4 w-4 text-primary" /> Pedido
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailField label="Código" value={detail.order.code} />
              <DetailField label="Estado final" value={statusLabel(detail.order.effectiveStatus)} />
              <DetailField label="Pago" value={statusLabel(detail.order.paymentStatus)} />
              <DetailField label="Cumplimiento" value={statusLabel(detail.order.fulfillmentStatus)} />
              <DetailField label="Total" value={formatMoney(detail.order.totalAmount, detail.order.currency)} />
              <DetailField label="Canal" value={detail.order.salesChannel} />
              <DetailField label="Creado" value={formatDateTime(detail.order.createdAt)} />
              <DetailField label="Última actualización" value={formatDateTime(detail.order.updatedAt)} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="mb-3 flex items-center gap-2 font-black text-slate-950 dark:text-white">
              <UserRound className="h-4 w-4 text-primary" /> Cliente
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailField label="Nombre" value={detail.order.customerName} />
              <DetailField label="Teléfono" value={detail.order.customerPhone} />
              <DetailField label="Correo" value={detail.order.customerEmail} />
              <DetailField label="Referencia" value={detail.order.customerReference} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="mb-3 flex items-center gap-2 font-black text-slate-950 dark:text-white">
              <Package className="h-4 w-4 text-primary" /> Productos vendidos
            </h4>
            <div className="space-y-3">
              {detail.order.items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 sm:grid-cols-2 xl:grid-cols-5">
                  <DetailField label="Producto" value={item.productName} />
                  <DetailField label="SKU" value={item.productCode} />
                  <DetailField label="Cantidad" value={`${item.quantity} ${item.unit}`} />
                  <DetailField label="Precio unitario" value={formatMoney(item.unitPrice, detail.order.currency)} />
                  <DetailField label="Total" value={formatMoney(item.totalPrice, detail.order.currency)} />
                </div>
              ))}
            </div>
          </section>

          {detail.dispatch ? (
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="mb-3 flex items-center gap-2 font-black text-slate-950 dark:text-white">
                <Truck className="h-4 w-4 text-primary" /> Despacho y entrega
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailField label="Despacho" value={detail.dispatch.code} />
                <DetailField label="Estado" value={statusLabel(detail.dispatch.status)} />
                <DetailField label="Cliente / destino" value={detail.dispatch.destinationName} />
                <DetailField label="Dirección" value={detail.dispatch.destinationAddress} />
                <DetailField label="Transportista" value={detail.dispatch.carrierName} />
                <DetailField label="Tracking" value={detail.dispatch.trackingReference} />
                <DetailField label="Enviado" value={formatOptionalDate(detail.dispatch.sentAt || detail.dispatch.dispatchedAt)} />
                <DetailField label="Entregado" value={formatOptionalDate(detail.dispatch.deliveredAt)} />
              </div>
            </section>
          ) : null}

          {detail.dispatch?.items.some((item) => item.unitRecord) ? (
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="mb-3 flex items-center gap-2 font-black text-slate-950 dark:text-white">
                <Smartphone className="h-4 w-4 text-primary" /> Unidad física
              </h4>
              <div className="space-y-4">
                {detail.dispatch.items
                  .filter((item) => item.unitRecord)
                  .map((item) => {
                    const unit = item.unitRecord!;
                    const chip = unit.chip;
                    return (
                      <div key={unit.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <DetailField label="Etiqueta / unidad" value={unit.internalLabel} />
                          <DetailField label="Producto" value={`${unit.productName} · ${unit.productCode}`} />
                          <DetailField label="Estado físico" value={statusLabel(unit.status)} />
                          <DetailField label="QC" value={statusLabel(unit.qaStatus)} />
                          <DetailField label="Activación" value={statusLabel(unit.activationStatus)} />
                          <DetailField label="Entregada" value={formatOptionalDate(unit.deliveredAt || item.deliveredAt)} />
                          <DetailField label="Activada" value={formatOptionalDate(unit.activatedAt || chip?.activatedAt)} />
                          <DetailField label="Serial público" value={chip?.serialPublic} />
                        </div>

                        {chip ? (
                          <div className="mt-3 grid gap-3 lg:grid-cols-3">
                            <DetailField label="Shortcode público" value={chip.shortCode} />
                            <DetailField
                              label="NFC / perfil público"
                              value={
                                <a href={chip.nfcUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  Abrir perfil <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              }
                            />
                            <DetailField
                              label="QR público"
                              value={
                                <a href={chip.qrUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  Abrir QR <QrCode className="h-3.5 w-3.5" />
                                </a>
                              }
                            />
                          </div>
                        ) : null}

                        <ActivationCodeReveal
                          orderId={detail.order.id}
                          unitId={unit.id}
                          activationStatus={unit.activationStatus}
                        />
                      </div>
                    );
                  })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {data?.timeline?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Actividad</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.timeline.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.description || item.eventType}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.internalLabel || item.entityCode || item.entityType}
                      {item.productName ? ` · ${item.productName}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full border px-2.5 py-1 ${severityStyles[item.severity]}`}>{item.severity}</span>
                  <span className="text-slate-500">{formatDateTime(item.occurredAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !data?.subject && !data?.timeline?.length && !data?.suggestions?.length && (submitted.search || submitted.entityId) ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <AlertTriangle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-black uppercase tracking-widest text-slate-400">Sin resultados</p>
        </div>
      ) : null}

      {empty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-black uppercase tracking-widest text-slate-400">
            No hay pedidos terminados. También puedes buscar un pedido, despacho o etiqueta interna.
          </p>
        </div>
      ) : null}
    </div>
  );
}
