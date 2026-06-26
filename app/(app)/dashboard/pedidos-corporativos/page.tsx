"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Loader2 } from "lucide-react";
import EnterpriseOrdersSection from "@/components/enterprise/orders/EnterpriseOrdersSection";

type CorporateOrder = {
  id: string;
  paymentStatus?: string;
  adminReviewStatus?: string;
  orderType?: string;
  orderStatus?: string;
  orderNumber?: string;
  amount?: number;
  createdAt?: string;
  corporateEmployeeItems?: {
    id: string;
    organizationMemberId: string;
    quantity: number;
    subtotal?: number;
    fulfillmentStatus?: string | null;
    chip?: { shortCode?: string } | null;
    activatedAt?: string | null;
    product?: { id?: string; name?: string };
    organizationMember?: {
      profile?: { firstName?: string; lastName?: string } | null;
      employeePosition?: string | null;
      employeeDepartment?: string | null;
      employeeNationalId?: string | null;
    };
  }[];
  paymentProofUrl?: string;
  corporateDeliveryStatus?: string;
  estimatedDeliveryDate?: string;
  deliveryNote?: string;
};

export default function PedidosCorporativosPage() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const validStatuses = ["under_review", "approved", "rejected"];
  const initialStatusFilter = statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;

  const [corporateOrders, setCorporateOrders] = useState<CorporateOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations/corporate-orders");
      if (res.ok) {
        const data = await res.json();
        setCorporateOrders(data.orders || []);
      }
    } catch {
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("¿Seguro que deseas cancelar esta compra? Los empleados volverán a 'Aprobados sin pagar'.")) return;
    setCancellingOrder(orderId);
    try {
      const res = await fetch(`/api/organizations/corporate-orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cancelar");
      toast.success("Compra cancelada");
      await loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setCancellingOrder(null);
    }
  };

  if (loading && corporateOrders.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Pedidos Corporativos</h1>
          <p className="text-sm text-muted-foreground">
            Compras corporativas enviadas con comprobante y pendientes de revisión.
          </p>
        </div>
      </div>

      <EnterpriseOrdersSection
        corporateOrders={corporateOrders}
        cancellingOrder={cancellingOrder}
        onCancelOrder={handleCancelOrder}
        initialStatusFilter={initialStatusFilter}
      />
    </div>
  );
}