"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Printer, X } from "lucide-react";
import { toast } from "sonner";

interface PrintOrderItem {
  id: string;
  internalLabel: string;
  status: string;
  sentAt: string | null;
  receivedAt: string | null;
}

interface PrintOrder {
  id: string;
  code: string;
  supplierName: string;
  supplierReference: string | null;
  productType: string;
  finishedGoodCode: string | null;
  digitalBatchId: string;
  rangeStartLabel: string;
  rangeEndLabel: string;
  quantity: number;
  includesSticker: boolean;
  includesActivationCard: boolean;
  includesPresentation: boolean;
  includesPackaging: boolean;
  status: string;
  sentAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  items: PrintOrderItem[];
  sentItems?: number;
  receivedItems?: number;
}

interface FormState {
  code: string;
  supplierName: string;
  productType: string;
  finishedGoodCode: string;
  digitalBatchId: string;
  rangeStartLabel: string;
  rangeEndLabel: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  supplierName: "PanamaSticker",
  productType: "sticker_normal",
  finishedGoodCode: "PRP-FG-STICKER",
  digitalBatchId: "",
  rangeStartLabel: "",
  rangeEndLabel: "",
  notes: "",
};

export function PrintOrdersSection() {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadOrders = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/admin/operations/print-orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar ordenes a imprenta");
      setOrders(Array.isArray(data.printOrders) ? data.printOrders : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar ordenes a imprenta");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateForm = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/print-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          supplierName: form.supplierName.trim(),
          productType: form.productType,
          finishedGoodCode: form.finishedGoodCode,
          digitalBatchId: form.digitalBatchId.trim(),
          rangeStartLabel: form.rangeStartLabel.trim(),
          rangeEndLabel: form.rangeEndLabel.trim(),
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear orden a imprenta");
      toast.success("Orden a imprenta creada");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear orden a imprenta");
    } finally {
      setSaving(false);
    }
  };

  const markAction = async (id: string, action: "mark_sent" | "mark_received") => {
    try {
      const res = await fetch(`/api/admin/operations/print-orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la orden");
      toast.success(action === "mark_sent" ? "Marcada como enviada" : "Marcada como recibida");
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar la orden");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-950">Orden a imprenta</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Envia rangos de lotes digitales a proveedor y luego marca su recepcion.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">
              <Plus className="h-4 w-4" /> Crear orden
            </button>
            <button type="button" onClick={() => loadOrders({ silent: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black text-primary">{order.code}</p>
                  <h4 className="mt-1 text-sm font-black text-slate-950">{order.supplierName}</h4>
                </div>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest">{order.status}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-600">{order.rangeStartLabel} - {order.rangeEndLabel} · {order.quantity} uds · {order.finishedGoodCode}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Items: {order.items.length} · Enviados {order.sentItems || 0} · Recibidos {order.receivedItems || 0}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => markAction(order.id, "mark_sent")} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-800">Marcar enviado</button>
                <button type="button" onClick={() => markAction(order.id, "mark_received")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">Marcar recibido</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Imprenta</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear orden a imprenta</h3>
                </div>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-2xl border border-slate-200 p-3 text-slate-400 hover:bg-slate-50" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input value={form.code} onChange={(e) => updateForm("code", e.target.value)} placeholder="PRINT-0001" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <input value={form.supplierName} onChange={(e) => updateForm("supplierName", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <select value={form.productType} onChange={(e) => updateForm("productType", e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold">
                  <option value="sticker_normal">Sticker PreRescatePTY</option>
                  <option value="sticker_empresarial">Sticker PreRescatePTY Empresarial</option>
                </select>
                <select value={form.finishedGoodCode} onChange={(e) => updateForm("finishedGoodCode", e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold">
                  <option value="PRP-FG-STICKER">PRP-FG-STICKER</option>
                  <option value="PRP-FG-STICKER-EMP">PRP-FG-STICKER-EMP</option>
                </select>
                <input value={form.digitalBatchId} onChange={(e) => updateForm("digitalBatchId", e.target.value)} placeholder="Digital batch ID" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <input value={form.rangeStartLabel} onChange={(e) => updateForm("rangeStartLabel", e.target.value)} placeholder="Inicial-0001" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <input value={form.rangeEndLabel} onChange={(e) => updateForm("rangeEndLabel", e.target.value)} placeholder="Inicial-0010" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold md:col-span-2" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancelar</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  Guardar orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
