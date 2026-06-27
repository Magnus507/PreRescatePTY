"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, Package, AlertCircle, Box, CheckCircle2, Truck } from "lucide-react";

type Item = {
  id: string;
  quantity: number;
  deliveryStatus?: string | null;
  deliveredAt?: string | null;
  product?: { id?: string; name?: string } | null;
  chip?: { shortCode?: string; activatedAt?: string | null } | null;
  organizationMember?: { profile?: { firstName?: string; lastName?: string } | null } | null;
};

type Order = {
  id: string;
  orderNumber?: string;
  amount?: number;
  paymentStatus?: string;
  items: Item[];
};

function fmtMoney(v?: number) {
  if (typeof v !== "number") return "—";
  return v.toLocaleString("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("es-PA", { dateStyle: "short", timeStyle: "short" }); }
  catch { return v; }
}

function memberName(item: Item) {
  const p = item.organizationMember?.profile;
  const name = [p?.firstName?.trim(), p?.lastName?.trim()].filter(Boolean).join(" ");
  return name || "—";
}

export default function DistribucionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveringItem, setDeliveringItem] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmItem, setConfirmItem] = useState<Item | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/corporate-orders/${id}/distribution`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Error ${res.status}`);
      }
      const d = (await res.json()) as { order: Order };
      setOrder(d.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la distribución");
    } finally { setLoading(false); }
  }, [id]);

  const handleMarkDelivered = useCallback(async (itemId: string) => {
    const item = order?.items?.find((i) => i.id === itemId) ?? null;
    setConfirmItem(item);
  }, [order]);

  const executeMarkDelivered = useCallback(async () => {
    if (!confirmItem) return;

    setDeliveringItem(confirmItem.id);
    setDeliveryError(null);

    try {
      const res = await fetch(`/api/organizations/corporate-orders/${id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corporateOrderEmployeeItemId: confirmItem.id,
          deliveryStatus: "delivered",
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Error ${res.status}`);
      }

      await load();
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Error al marcar entrega");
    } finally {
      setDeliveringItem(null);
      setConfirmItem(null);
    }
  }, [id, load, confirmItem]);

  const handleCopyLink = useCallback((itemId: string, shortCode?: string | null) => {
    if (!shortCode) return;
    const publicUrl = `${window.location.origin}/e/${shortCode}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    });
  }, []);

  const pendingIds = order?.items?.filter((i) => i.deliveryStatus !== "delivered").map((i) => i.id) ?? [];

  const handleMarkAllDelivered = useCallback(async () => {
    if (!id) return;
    if (!window.confirm("¿Confirmas marcar como entregados todos los colaboradores pendientes?")) return;

    setBulkLoading(true);
    setDeliveryError(null);

    try {
      const res = await fetch(`/api/organizations/corporate-orders/${id}/delivery/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corporateOrderEmployeeItemIds: pendingIds,
          deliveryStatus: "delivered",
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Error ${res.status}`);
      }

      await load();
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Error al marcar entrega masiva");
    } finally {
      setBulkLoading(false);
    }
  }, [id, load, pendingIds]);

  useEffect(() => { load(); }, [load]);

  const pendientes = order?.items?.filter((i) => i.deliveryStatus !== "delivered").length ?? 0;
  const entregados = order?.items?.filter((i) => i.deliveryStatus === "delivered").length ?? 0;
  const activados = order?.items?.filter((i) => i.deliveryStatus === "delivered" && i.chip?.activatedAt).length ?? 0;

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (error) return <div className="flex items-center justify-center py-24"><div className="space-y-2 text-center"><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><p className="text-sm font-medium text-destructive">{error}</p></div></div>;

  if (!order) return <div className="flex items-center justify-center py-24"><p className="text-sm text-muted-foreground">Sin datos</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Package className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Distribución</h1>
          <p className="text-sm text-muted-foreground">Detalle de entrega del pedido.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Pedido</p>
          <p className="mt-1 text-lg font-bold">{order.orderNumber || order.id}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Monto</p>
          <p className="mt-1 text-lg font-bold">{fmtMoney(order.amount)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Pago</p>
          <p className="mt-1 text-lg font-bold">{order.paymentStatus || "—"}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Items</p>
          <p className="mt-1 text-lg font-bold">{order.items.length} · {pendientes} pend. · {entregados} entreg.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background p-5 space-y-3">
        <p className="text-xs font-black uppercase text-muted-foreground">Progreso de distribución</p>
        <p className="text-3xl font-black tracking-tighter">
          {Math.round((entregados / (order?.items?.length ?? (pendientes + entregados))) * 100) || 0}%
        </p>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.round((entregados / (order?.items?.length ?? 1)) * 100) || 0}%` }}
          />
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {entregados} de {order?.items?.length ?? 0} entregados
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {pendientes} pendientes
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Total colaboradores</p>
          <p className="mt-1 text-lg font-bold">{order?.items?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Entregados</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{entregados}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
          <p className="mt-1 text-lg font-bold text-amber-700">{pendientes}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background p-5 space-y-3">
        <p className="text-xs font-black uppercase text-muted-foreground">Estado de activaciones</p>
        <p className="text-[10px] font-medium text-muted-foreground">
          La activación ocurre cuando el colaborador registra oficialmente su producto.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">Total entregados</p>
            <p className="mt-1 text-lg font-bold">{entregados}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">Activados</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {entregados > 0
                ? Math.round((activados / entregados) * 100) || 0
                : 0}%
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">Pendientes de activar</p>
            <p className="mt-1 text-lg font-bold text-amber-700">
              {entregados - activados}
            </p>
          </div>
        </div>
      </div>

      {pendientes > 0 && (
        <button
          onClick={handleMarkAllDelivered}
          disabled={bulkLoading}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
        >
          {bulkLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          Marcar todos los pendientes
        </button>
      )}

      <div className="space-y-2">
        {deliveryError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {deliveryError}
          </div>
        )}
        {order.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">{item.product?.name || "Producto sin nombre"}</p>
              <p className="text-xs text-muted-foreground">Colaborador: {memberName(item)}</p>
              <p className="text-xs text-muted-foreground">Chip shortCode: {item.chip?.shortCode || "—"}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1">
                <Box className="h-3.5 w-3.5" /> Cantidad: {item.quantity}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1">
                {item.deliveryStatus === "delivered" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Truck className="h-3.5 w-3.5 text-amber-600" />}
                {item.deliveryStatus || "pendiente"}
              </span>
              {item.deliveredAt ? <span>Entregado: {fmtDate(item.deliveredAt)}</span> : <span>Pendiente</span>}
              {item.deliveryStatus !== "delivered" && (
                <button
                  onClick={() => handleMarkDelivered(item.id)}
                  disabled={deliveringItem === item.id}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {deliveringItem === item.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Marcar entregado
                </button>
              )}
              {item.chip?.shortCode && (
                <>
                  <a
                    href={`/e/${item.chip.shortCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Ver enlace
                  </a>
                  <button
                    onClick={() => handleCopyLink(item.id, item.chip?.shortCode)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-[10px] font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    {copiedItem === item.id ? "Copiado" : "Copiar enlace"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-xl space-y-4">
            <div>
              <p className="text-sm font-black">Confirmar entrega</p>
              <p className="mt-1 space-y-1 text-xs text-muted-foreground">
                <span>Producto: <strong>{confirmItem.product?.name || "Producto sin nombre"}</strong></span>
                <br />
                <span>Colaborador: <strong>{memberName(confirmItem)}</strong></span>
                <br />
                <span>Cantidad: <strong>{confirmItem.quantity}</strong></span>
                <br />
                <span>Chip shortCode: <strong>{confirmItem.chip?.shortCode || "—"}</strong></span>
              </p>
            </div>

            <p className="text-xs font-medium text-foreground">
              ¿Confirmas que este producto fue entregado al colaborador?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmItem(null)}
                disabled={deliveringItem === confirmItem.id}
                className="rounded-xl border border-border px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={executeMarkDelivered}
                disabled={deliveringItem === confirmItem.id}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {deliveringItem === confirmItem.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Confirmar entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
