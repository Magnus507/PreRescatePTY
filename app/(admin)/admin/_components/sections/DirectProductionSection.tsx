"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Copy, ExternalLink, Factory, Loader2, PackageCheck, Plus, Printer, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { buildProductionQcChecklist } from "@/lib/operations/production-qc-checklist";

type FinishedGood = {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
};

type PrintOrder = {
  id: string;
  code: string;
  status: string;
};

type Unit = {
  id: string;
  qaStatus: string | null;
  status: string;
  activationStatus: string | null;
  reservedOrderId: string | null;
};

type DigitalItem = {
  id: string;
  internalLabel: string;
  shortCode: string | null;
  qrUrl: string | null;
  nfcUrl: string | null;
  nfcProgrammed: boolean;
  qrPrepared: boolean;
  status: string;
  finishedGoodUnitId?: string | null;
  qaStatus?: string | null;
  inventoryStatus?: string | null;
  activationStatus?: string | null;
  reservedOrderId?: string | null;
  finishedGoodUnits?: Unit[];
  printOrderItems?: Array<{ printOrder: PrintOrder }>;
};

type ProductionOrder = {
  id: string;
  code: string;
  title: string;
  status: string;
  plannedQuantity: number;
  producedQuantity: number;
  outputType: string;
  createdAt: string;
  updatedAt: string;
  digitalItems?: DigitalItem[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Pendiente",
  planned: "Preparando",
  sent_to_print: "Imprenta",
  print_received: "Recibida",
  started: "Ensamblaje",
  paused: "Pausada",
  qa_pending: "QC",
  completed: "Completada",
  cancelled: "Cancelada",
};

function getUnit(item: DigitalItem) {
  return item.finishedGoodUnits?.find((unit) => unit.id === item.finishedGoodUnitId)
    || item.finishedGoodUnits?.[0]
    || null;
}

export default function DirectProductionSection() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductionOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [finishedGoodId, setFinishedGoodId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [creating, setCreating] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${id}?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la producción");
      setDetail(data.productionOrder || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar producción");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`/api/admin/operations/production-orders?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/finished-goods?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [ordersData, productsData] = await Promise.all([ordersRes.json(), productsRes.json()]);
      if (!ordersRes.ok) throw new Error(ordersData.error || "No se pudo cargar producción");
      if (!productsRes.ok) throw new Error(productsData.error || "No se pudo cargar Productos base");
      setOrders(Array.isArray(ordersData.productionOrders) ? ordersData.productionOrders : []);
      const activeProducts = Array.isArray(productsData.finishedGoods)
        ? productsData.finishedGoods.filter((item: FinishedGood) => item.status === "active")
        : [];
      setProducts(activeProducts);
      if (!finishedGoodId && activeProducts[0]?.id) setFinishedGoodId(activeProducts[0].id);
      if (selectedOrderId) await loadDetail(selectedOrderId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar producción");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [finishedGoodId, loadDetail, selectedOrderId]);

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedOrderId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedOrderId);
  }, [loadDetail, selectedOrderId]);

  const createProduction = async (event: React.FormEvent) => {
    event.preventDefault();
    const plannedQuantity = Number(quantity);
    if (!finishedGoodId) return toast.error("Selecciona un Producto base");
    if (!Number.isInteger(plannedQuantity) || plannedQuantity <= 0) return toast.error("Cantidad inválida");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/operations/production-orders/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedGoodId, plannedQuantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la producción");
      toast.success("Producción creada");
      setShowCreate(false);
      setQuantity("1");
      setSelectedOrderId(data.productionOrder?.id || null);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear producción");
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (key: string, url: string, success: string, body?: unknown) => {
    setActionKey(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo completar la acción");
      toast.success(success);
      if (selectedOrderId) await loadDetail(selectedOrderId);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar producción");
    } finally {
      setActionKey(null);
    }
  };

  const printOrder = useMemo(() => {
    for (const item of detail?.digitalItems || []) {
      const found = item.printOrderItems?.[0]?.printOrder;
      if (found) return found;
    }
    return null;
  }, [detail]);

  const allDigitalReady = Boolean(detail?.digitalItems?.length) && (detail?.digitalItems || []).every((item) => item.nfcProgrammed && item.qrPrepared && item.shortCode);
  const activeCount = orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Factory className="h-5 w-5 text-violet-600" />
          <div>
            <h3 className="text-lg font-black text-slate-950">Producción</h3>
            <p className="text-xs font-bold text-slate-400">{activeCount} activas · {orders.length} total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">
            <Plus className="h-4 w-4" /> Nueva producción
          </button>
          <button type="button" onClick={() => loadData({ silent: true })} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-50" aria-label="Actualizar">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-slate-400">Sin producción</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const selected = selectedOrderId === order.id;
              return (
                <button key={order.id} type="button" onClick={() => setSelectedOrderId(selected ? null : order.id)} className={`grid w-full gap-3 px-4 py-4 text-left md:grid-cols-[1.2fr_1fr_110px_110px_120px] md:items-center ${selected ? "bg-violet-50/60" : "hover:bg-slate-50"}`}>
                  <div><p className="font-mono text-xs font-black text-primary">{order.code}</p><p className="mt-1 text-sm font-black text-slate-900">{order.title}</p></div>
                  <p className="text-xs font-bold text-slate-500">{order.outputType}</p>
                  <p className="text-xs font-black text-slate-700">{order.producedQuantity}/{order.plannedQuantity}</p>
                  <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600">{STATUS_LABELS[order.status] || order.status}</span>
                  <span className="text-right text-[10px] font-black uppercase tracking-widest text-primary">{selected ? "Cerrar" : "Abrir"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrderId && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          {detailLoading || !detail ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div><p className="font-mono text-xs font-black text-primary">{detail.code}</p><h4 className="mt-1 text-xl font-black text-slate-950">{detail.title}</h4></div>
                <div className="flex flex-wrap gap-2">
                  {(!detail.digitalItems || detail.digitalItems.length === 0) && !["completed", "cancelled"].includes(detail.status) && (
                    <button type="button" onClick={() => runAction("prepare", `/api/admin/operations/production-orders/${detail.id}/prepare-digital-items`, "Unidades digitales creadas", { quantity: detail.plannedQuantity })} disabled={Boolean(actionKey)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">Generar unidades</button>
                  )}
                  {allDigitalReady && !printOrder && (
                    <button type="button" onClick={() => runAction("print", `/api/admin/operations/production-orders/${detail.id}/send-to-print`, "Enviada a imprenta")} disabled={Boolean(actionKey)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"><Printer className="h-4 w-4" /> Enviar imprenta</button>
                  )}
                  {printOrder && ["sent", "partially_received"].includes(printOrder.status) && (
                    <button type="button" onClick={() => runAction("received", `/api/admin/operations/production-orders/${detail.id}/mark-print-received`, "Imprenta recibida")} disabled={Boolean(actionKey)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"><PackageCheck className="h-4 w-4" /> Recibido</button>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                {(detail.digitalItems || []).map((item) => {
                  const unit = getUnit(item);
                  const unitId = item.finishedGoodUnitId || unit?.id || null;
                  const qaStatus = unit?.qaStatus || item.qaStatus || null;
                  const inventoryStatus = unit?.status || item.inventoryStatus || null;
                  const pendingQc = Boolean(unitId && qaStatus === "pending" && inventoryStatus === "qa_pending");
                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-black text-slate-900">{item.internalLabel}</p><span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase text-slate-500 ring-1 ring-slate-200">{item.status}</span></div>
                          <p className="mt-1 text-xs font-bold text-slate-500">{item.shortCode || "Sin shortCode"}{qaStatus ? ` · QC ${qaStatus}` : ""}{inventoryStatus ? ` · ${inventoryStatus}` : ""}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.nfcUrl && <button type="button" onClick={() => navigator.clipboard.writeText(item.nfcUrl || "").then(() => toast.success("URL NFC copiada"))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700"><Copy className="h-3.5 w-3.5" /> NFC</button>}
                          {item.qrUrl && <a href={item.qrUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700"><ExternalLink className="h-3.5 w-3.5" /> QR</a>}
                          {!item.nfcProgrammed && <button type="button" onClick={() => runAction(`nfc-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-preparation/${item.id}/nfc-programmed`, "NFC marcado")} disabled={Boolean(actionKey)} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-sky-700 disabled:opacity-50">NFC listo</button>}
                          {!item.qrPrepared && <button type="button" onClick={() => runAction(`qr-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-preparation/${item.id}/qr-prepared`, "QR marcado")} disabled={Boolean(actionKey)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-emerald-700 disabled:opacity-50">QR listo</button>}
                          {item.status === "printed" && <button type="button" onClick={() => runAction(`assembly-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-assembly/${item.id}/assembled`, "Unidad ensamblada")} disabled={Boolean(actionKey)} className="rounded-lg bg-violet-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50">Ensamblar</button>}
                          {item.status === "assembled" && <button type="button" onClick={() => runAction(`pack-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-assembly/${item.id}/packaging-completed`, "Empaque completado")} disabled={Boolean(actionKey)} className="rounded-lg bg-amber-500 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50">Empacar</button>}
                          {item.status === "packaged" && <button type="button" onClick={() => runAction(`qc-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-assembly/${item.id}/complete`, "Enviada a QC")} disabled={Boolean(actionKey)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50"><ClipboardCheck className="h-3.5 w-3.5" /> QC</button>}
                          {pendingQc && unitId && <button type="button" onClick={() => runAction(`pass-${unitId}`, `/api/admin/operations/production-orders/${detail.id}/qa/${unitId}/pass`, "QC aprobado", { checklist: buildProductionQcChecklist(), notes: null })} disabled={Boolean(actionKey)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Aprobar QC</button>}
                          {pendingQc && unitId && <button type="button" onClick={() => { const reason = window.prompt("Motivo del rechazo QC"); if (reason) void runAction(`fail-${unitId}`, `/api/admin/operations/production-orders/${detail.id}/qa/${unitId}/fail`, "QC rechazado", { reason, notes: null }); }} disabled={Boolean(actionKey)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50">Rechazar QC</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={createProduction} className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="text-xl font-black text-slate-950">Nueva producción</h3><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 p-2 text-slate-400"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 space-y-4">
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Producto base</span><select required value={finishedGoodId} onChange={(event) => setFinishedGoodId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><option value="">Seleccionar</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}</select></label>
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</span><input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancelar</button><button type="submit" disabled={creating || products.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
