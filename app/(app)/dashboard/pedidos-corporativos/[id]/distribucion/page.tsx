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
  chip?: { shortCode?: string } | null;
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

  useEffect(() => { load(); }, [load]);

  const pendientes = order?.items?.filter((i) => i.deliveryStatus !== "delivered").length ?? 0;
  const entregados = order?.items?.filter((i) => i.deliveryStatus === "delivered").length ?? 0;

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

      <div className="space-y-2">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
