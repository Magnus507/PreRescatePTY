"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, RotateCcw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

type Tab = "warranties" | "replacements" | "returns";

type Candidate = {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  status: string;
  activationStatus: string;
  deliveredAt: string | null;
  dispatch: { id: string; code: string; status: string } | null;
  commercialOrder: { id: string; code: string; customerName: string | null; customerEmail: string | null; customerPhone: string | null } | null;
  commercialOrderItem: { id: string; productCode: string | null; productName: string } | null;
  finishedGood: { id: string; code: string; name: string } | null;
  warranties: Array<{ id: string; code: string; status: string; coverageStatus: string }>;
  replacements: Array<{ id: string; code: string; status: string }>;
  returns: Array<{ id: string; code: string; status: string }>;
};

type InventoryUnit = {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  qaStatus: string | null;
  inventoryStatus: string;
  activationStatus: string;
  reservedOrderId: string | null;
  dispatchId: string | null;
};

type Warranty = {
  id: string;
  code: string;
  status: string;
  coverageStatus: string;
  warrantyType: string;
  customerName: string | null;
  createdAt: string;
  unit?: { internalLabel: string; productName: string } | null;
};

type Replacement = {
  id: string;
  code: string;
  status: string;
  reason: string | null;
  customerName: string | null;
  replacementDispatchId: string | null;
  createdAt: string;
  originalUnit?: { internalLabel: string; productName: string } | null;
  replacementUnit?: { internalLabel: string; productName: string } | null;
};

type ReturnCase = {
  id: string;
  code: string;
  status: string;
  reason: string | null;
  resolution: string | null;
  customerName: string | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  createdAt: string;
  unit?: { internalLabel: string; productName: string } | null;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "warranties", label: "Garantías" },
  { id: "replacements", label: "Reemplazos" },
  { id: "returns", label: "Devoluciones" },
];

function makeCode(prefix: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

function statusClass(status: string) {
  if (["active", "approved", "prepared", "completed", "delivered"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["cancelled", "rejected", "discarded", "expired"].includes(status)) return "bg-red-50 text-red-700 ring-red-200";
  if (["claim_open", "received", "inspected"].includes(status)) return "bg-violet-50 text-violet-700 ring-violet-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

export function DirectPostSaleSection() {
  const [tab, setTab] = useState<Tab>("warranties");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [returns, setReturns] = useState<ReturnCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [endDate, setEndDate] = useState("");
  const [replacementUnits, setReplacementUnits] = useState<InventoryUnit[]>([]);
  const [replacementUnitId, setReplacementUnitId] = useState("");
  const [loadingReplacementUnits, setLoadingReplacementUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [candidateRes, warrantyRes, replacementRes, returnRes] = await Promise.all([
        fetch(`/api/admin/operations/postsale/candidates?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/warranties?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/replacements?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/returns?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [candidateData, warrantyData, replacementData, returnData] = await Promise.all([
        candidateRes.json().catch(() => ({})), warrantyRes.json().catch(() => ({})), replacementRes.json().catch(() => ({})), returnRes.json().catch(() => ({})),
      ]);
      if (!candidateRes.ok) throw new Error(candidateData.error || "No se pudieron cargar unidades de postventa");
      if (!warrantyRes.ok) throw new Error(warrantyData.error || "No se pudieron cargar garantías");
      if (!replacementRes.ok) throw new Error(replacementData.error || "No se pudieron cargar reemplazos");
      if (!returnRes.ok) throw new Error(returnData.error || "No se pudieron cargar devoluciones");
      setCandidates(Array.isArray(candidateData.candidates) ? candidateData.candidates : []);
      setWarranties(Array.isArray(warrantyData.warranties) ? warrantyData.warranties : []);
      setReplacements(Array.isArray(replacementData.replacements) ? replacementData.replacements : []);
      setReturns(Array.isArray(returnData.returns) ? returnData.returns : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar Postventa");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const selectedCandidate = useMemo(() => candidates.find((item) => item.id === selectedUnitId) || null, [candidates, selectedUnitId]);

  useEffect(() => {
    setReplacementUnits([]);
    setReplacementUnitId("");
    if (tab !== "replacements" || !selectedCandidate) return;
    setLoadingReplacementUnits(true);
    fetch(`/api/admin/operations/inventory/units?productCode=${encodeURIComponent(selectedCandidate.productCode)}&_t=${Date.now()}`, { cache: "no-store" })
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "No se pudo cargar stock de reemplazo");
        const units = Array.isArray(data.units) ? data.units.filter((unit: InventoryUnit) => unit.id !== selectedCandidate.id && unit.qaStatus === "passed" && unit.inventoryStatus === "available" && unit.activationStatus === "not_activated" && !unit.reservedOrderId && !unit.dispatchId) : [];
        setReplacementUnits(units);
        if (units[0]?.id) setReplacementUnitId(units[0].id);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar stock de reemplazo"))
      .finally(() => setLoadingReplacementUnits(false));
  }, [selectedCandidate, tab]);

  const resetCreate = () => {
    setShowCreate(false); setSelectedUnitId(""); setReason(""); setNotes(""); setEndDate(""); setReplacementUnits([]); setReplacementUnitId("");
  };

  const createCase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCandidate) return toast.error("Selecciona una unidad entregada");
    if ((tab === "replacements" || tab === "returns") && !reason.trim()) return toast.error("Indica el motivo");
    if (tab === "replacements" && !replacementUnitId) return toast.error("No hay una unidad de reemplazo disponible");

    setSaving(true);
    try {
      const context = {
        commercialOrderId: selectedCandidate.commercialOrder?.id || undefined,
        finishedGoodId: selectedCandidate.finishedGood?.id || undefined,
        customerName: selectedCandidate.commercialOrder?.customerName || undefined,
        customerEmail: selectedCandidate.commercialOrder?.customerEmail || undefined,
        customerPhone: selectedCandidate.commercialOrder?.customerPhone || undefined,
      };
      let url = "/api/admin/operations/warranties";
      let body: Record<string, unknown> = {
        code: makeCode("WAR"), unitId: selectedCandidate.id, dispatchId: selectedCandidate.dispatch?.id || undefined,
        commercialOrderItemId: selectedCandidate.commercialOrderItem?.id || undefined, ...context,
        warrantyType: "standard", endDate: endDate || undefined, notes: notes.trim() || undefined,
      };

      if (tab === "replacements") {
        url = "/api/admin/operations/replacements";
        const activeWarranty = selectedCandidate.warranties.find((item) => !["cancelled", "expired"].includes(item.status));
        body = {
          code: makeCode("REP"), originalUnitId: selectedCandidate.id, replacementUnitId,
          originalDispatchId: selectedCandidate.dispatch?.id || undefined,
          originalFinishedGoodId: selectedCandidate.finishedGood?.id || undefined,
          replacementFinishedGoodId: selectedCandidate.finishedGood?.id || undefined,
          warrantyId: activeWarranty?.id || undefined,
          replacementType: activeWarranty ? "warranty" : "service",
          reason: reason.trim(), notes: notes.trim() || undefined, ...context,
        };
      } else if (tab === "returns") {
        url = "/api/admin/operations/returns";
        const activeWarranty = selectedCandidate.warranties.find((item) => !["cancelled", "expired"].includes(item.status));
        body = {
          code: makeCode("RET"), unitId: selectedCandidate.id,
          originalDispatchId: selectedCandidate.dispatch?.id || undefined,
          warrantyId: activeWarranty?.id || undefined,
          returnType: "customer_return", reason: reason.trim(), notes: notes.trim() || undefined, ...context,
        };
      }

      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear el caso");
      toast.success(tab === "warranties" ? "Garantía creada" : tab === "replacements" ? "Reemplazo creado" : "Devolución creada");
      resetCreate();
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el caso");
    } finally { setSaving(false); }
  };

  const postEvent = async (kind: Tab, id: string, eventType: string, quantity?: number) => {
    const key = `${kind}:${id}:${eventType}`;
    setActionKey(key);
    try {
      const root = kind === "warranties" ? "warranties" : kind === "replacements" ? "replacements" : "returns";
      const reasonRequired = ["REJECTED", "CANCELLED", "DISCARDED"].includes(eventType);
      const reasonValue = reasonRequired ? window.prompt("Motivo") : null;
      if (reasonRequired && !reasonValue) return;
      const res = await fetch(`/api/admin/operations/${root}/${id}/events`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, quantity, reason: reasonValue || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar el caso");
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el caso");
    } finally { setActionKey(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  const count = tab === "warranties" ? warranties.length : tab === "replacements" ? replacements.length : returns.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest ${tab === item.id ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>{item.label}</button>)}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white"><Plus className="h-4 w-4" /> Nuevo</button>
          <button type="button" onClick={() => loadData({ silent: true })} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {count === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center text-xs font-black uppercase tracking-widest text-slate-400">Sin casos</div> : null}

      {tab === "warranties" && <div className="space-y-2">{warranties.map((item) => <CaseCard key={item.id} code={item.code} status={item.coverageStatus === "claim_open" ? "claim_open" : item.status} unit={item.unit?.internalLabel} product={item.unit?.productName} customer={item.customerName} date={item.createdAt} actions={warrantyActions(item).map((action) => ({ ...action, onClick: () => postEvent("warranties", item.id, action.eventType), busy: actionKey === `warranties:${item.id}:${action.eventType}` }))} />)}</div>}

      {tab === "replacements" && <div className="space-y-2">{replacements.map((item) => <CaseCard key={item.id} code={item.code} status={item.status} unit={item.originalUnit?.internalLabel} product={item.originalUnit?.productName} customer={item.customerName} date={item.createdAt} detail={item.replacementUnit?.internalLabel ? `Reemplazo: ${item.replacementUnit.internalLabel}` : undefined} actions={replacementActions(item).map((action) => ({ ...action, onClick: () => postEvent("replacements", item.id, action.eventType), busy: actionKey === `replacements:${item.id}:${action.eventType}` }))} />)}</div>}

      {tab === "returns" && <div className="space-y-2">{returns.map((item) => <CaseCard key={item.id} code={item.code} status={item.status} unit={item.unit?.internalLabel} product={item.unit?.productName} customer={item.customerName} date={item.createdAt} detail={`${item.receivedQuantity} recibida · ${item.acceptedQuantity} aceptada · ${item.rejectedQuantity} rechazada`} actions={returnActions(item).map((action) => ({ ...action, onClick: () => postEvent("returns", item.id, action.eventType, action.quantity), busy: actionKey === `returns:${item.id}:${action.eventType}` }))} />)}</div>}

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><form onSubmit={createCase} className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2">{tab === "warranties" ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <RotateCcw className="h-5 w-5 text-primary" />}<h3 className="text-xl font-black text-slate-950">{tab === "warranties" ? "Nueva garantía" : tab === "replacements" ? "Nuevo reemplazo" : "Nueva devolución"}</h3></div><button type="button" onClick={resetCreate} className="rounded-xl border border-slate-200 p-2 text-slate-400"><X className="h-4 w-4" /></button></div>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad entregada</span><select required value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><option value="">Seleccionar</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.internalLabel} · {item.productName}{item.commercialOrder?.customerName ? ` · ${item.commercialOrder.customerName}` : ""}</option>)}</select></label>
          {selectedCandidate && <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Pedido</span><strong>{selectedCandidate.commercialOrder?.code || "—"}</strong></div><div><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Despacho</span><strong>{selectedCandidate.dispatch?.code || "—"}</strong></div></div>}
          {tab === "replacements" && <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad de reemplazo</span>{loadingReplacementUnits ? <div className="mt-2 flex h-11 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div> : <select required value={replacementUnitId} onChange={(event) => setReplacementUnitId(event.target.value)} disabled={!selectedCandidate || replacementUnits.length === 0} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50"><option value="">{replacementUnits.length ? "Seleccionar" : "Sin stock disponible"}</option>{replacementUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.internalLabel}</option>)}</select>}</label>}
          {tab !== "warranties" && <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motivo</span><textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" /></label>}
          {tab === "warranties" && <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vence</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" /></label>}
          <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={resetCreate} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancelar</button><button type="submit" disabled={saving || candidates.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear</button></div>
      </form></div>}
    </div>
  );
}

function CaseCard({ code, status, unit, product, customer, date, detail, actions }: { code: string; status: string; unit?: string; product?: string; customer?: string | null; date: string; detail?: string; actions: Array<{ label: string; eventType: string; onClick: () => void; busy: boolean }> }) {
  return <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-primary">{code}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${statusClass(status)}`}>{status}</span></div><p className="mt-2 text-sm font-black text-slate-900">{unit || "—"} · {product || "—"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{customer || "—"} · {formatDate(date)}{detail ? ` · ${detail}` : ""}</p></div><div className="flex flex-wrap gap-2">{actions.map((action) => <button key={action.eventType} type="button" onClick={action.onClick} disabled={action.busy} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700 disabled:opacity-50">{action.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.label}</button>)}</div></article>;
}

function warrantyActions(item: Warranty) {
  if (["cancelled", "expired"].includes(item.status)) return [];
  if (item.coverageStatus === "claim_open") return [{ label: "Cerrar reclamo", eventType: "CLAIM_CLOSED" }, { label: "Cancelar", eventType: "CANCELLED" }];
  if (item.status === "suspended") return [{ label: "Activar", eventType: "ACTIVATED" }, { label: "Cancelar", eventType: "CANCELLED" }];
  return [{ label: "Abrir reclamo", eventType: "CLAIM_OPENED" }, { label: "Suspender", eventType: "SUSPENDED" }, { label: "Cancelar", eventType: "CANCELLED" }];
}

function replacementActions(item: Replacement) {
  if (["completed", "cancelled", "rejected"].includes(item.status)) return [];
  if (item.status === "draft") return [{ label: "Aprobar", eventType: "APPROVED" }, { label: "Rechazar", eventType: "REJECTED" }, { label: "Cancelar", eventType: "CANCELLED" }];
  if (item.status === "approved") return [{ label: "Preparar", eventType: "REPLACEMENT_PREPARED" }, ...(!item.replacementDispatchId ? [{ label: "Crear despacho", eventType: "DISPATCH_CREATED" }] : []), { label: "Cancelar", eventType: "CANCELLED" }];
  return [...(!item.replacementDispatchId ? [{ label: "Crear despacho", eventType: "DISPATCH_CREATED" }] : []), { label: "Completar", eventType: "COMPLETED" }, { label: "Cancelar", eventType: "CANCELLED" }];
}

function returnActions(item: ReturnCase) {
  if (["completed", "cancelled"].includes(item.status)) return [];
  if (item.status === "draft") return [{ label: "Recibida", eventType: "RECEIVED", quantity: 1 }, { label: "Cancelar", eventType: "CANCELLED" }];
  if (item.status === "received") return [{ label: "Inspeccionar", eventType: "INSPECTED" }, { label: "Cancelar", eventType: "CANCELLED" }];
  if (item.status === "inspected") return [{ label: "Aceptar", eventType: "ACCEPTED", quantity: 1 }, { label: "Rechazar", eventType: "REJECTED", quantity: 1 }, { label: "Descartar", eventType: "DISCARDED" }, { label: "Completar", eventType: "COMPLETED" }];
  return [{ label: "Completar", eventType: "COMPLETED" }, { label: "Cancelar", eventType: "CANCELLED" }];
}
