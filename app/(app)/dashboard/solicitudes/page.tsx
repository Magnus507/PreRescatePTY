"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Package, Loader2 } from "lucide-react";
import EnterpriseRequestsSection from "@/components/enterprise/requests/EnterpriseRequestsSection";

// Types
type MemberProfile = {
  firstName?: string;
  lastName?: string;
  user?: { email?: string } | null;
};

type CompanyRequestItem = {
  id: string;
  quantity: number;
  subtotal?: number;
  unitPrice?: number;
  note?: string;
  product?: { name?: string };
};

type CompanyRequest = {
  id: string;
  status: string;
  orderId?: string | null;
  items?: CompanyRequestItem[];
  organizationMember?: {
    profile?: MemberProfile | null;
    employeePosition?: string | null;
    employeeDepartment?: string | null;
    employeeNationalId?: string | null;
  };
  rejectionReason?: string;
  createdAt?: string;
  companyReviewedAt?: string;
};

export default function SolicitudesPage() {
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);
  const [companyRequestsLoading, setCompanyRequestsLoading] = useState(true);
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [selectedApprovedRequests, setSelectedApprovedRequests] = useState<Record<string, boolean>>({});
  const [orderProofUrl, setOrderProofUrl] = useState("");
  const [orderProofName, setOrderProofName] = useState("");
  const [submittingOrderFromRequests, setSubmittingOrderFromRequests] = useState(false);

  const selectedApprovedRequestIds = useMemo(() => {
    return Object.entries(selectedApprovedRequests)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [selectedApprovedRequests]);

  const loadCompanyRequests = useCallback(async () => {
    setCompanyRequestsLoading(true);
    try {
      const res = await fetch("/api/organizations/product-requests");
      if (res.ok) {
        const data = await res.json();
        setCompanyRequests(data.requests || []);
      }
    } catch {
      toast.error("Error al cargar solicitudes");
    } finally {
      setCompanyRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanyRequests();
  }, [loadCompanyRequests]);

  const handleReviewRequest = async (requestId: string, action: "approve" | "reject", reason?: string) => {
    setReviewingRequest(requestId);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "reject" && reason) body.rejectionReason = reason;
      const res = await fetch(`/api/organizations/product-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al procesar solicitud");
      toast.success(action === "approve" ? "Solicitud aprobada" : "Solicitud rechazada");
      await loadCompanyRequests();
      setShowRejectModal(null);
      setRejectReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar solicitud");
    } finally {
      setReviewingRequest(null);
    }
  };

  const toggleApprovedRequest = (requestId: string) => {
    setSelectedApprovedRequests((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
  };

  const selectAllApproved = () => {
    const approved = companyRequests.filter((r) => r.status === "approved_pending_payment" && !r.orderId);
    const allSelected = approved.every((r) => selectedApprovedRequests[r.id]);
    if (allSelected) {
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(selectedApprovedRequests)) {
        if (!approved.find((r) => r.id === key)) next[key] = true;
      }
      setSelectedApprovedRequests(next);
    } else {
      const next: Record<string, boolean> = {};
      for (const r of approved) next[r.id] = true;
      setSelectedApprovedRequests(next);
    }
  };

  const handleSubmitOrderFromRequests = async () => {
    if (selectedApprovedRequestIds.length === 0) {
      toast.error("Selecciona al menos una solicitud aprobada");
      return;
    }
    if (!orderProofUrl) {
      toast.error("Debes adjuntar un comprobante de pago");
      return;
    }
    setSubmittingOrderFromRequests(true);
    try {
      const res = await fetch("/api/organizations/corporate-orders/from-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: selectedApprovedRequestIds,
          paymentProofUrl: orderProofUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear la orden");
      toast.success(`Orden ${json.orderNumber} creada — pago enviado a revisión`);
      setSelectedApprovedRequests({});
      setOrderProofUrl("");
      setOrderProofName("");
      await loadCompanyRequests();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la orden");
    } finally {
      setSubmittingOrderFromRequests(false);
    }
  };

  const handleUploadProof = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "payment");
    formData.append("bucket", "payment-proofs");
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error("Error al subir archivo");
    const { url } = await uploadRes.json();
    setOrderProofUrl(url);
    setOrderProofName(file.name);
    toast.success("Comprobante adjuntado");
  };

  if (companyRequestsLoading && companyRequests.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Package className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Solicitudes de Productos</h1>
          <p className="text-sm text-muted-foreground">
            Revisa y aprueba o rechaza las solicitudes de productos enviadas por tus colaboradores.
          </p>
        </div>
      </div>

      <EnterpriseRequestsSection
        companyRequests={companyRequests}
        companyRequestsLoading={companyRequestsLoading}
        reviewingRequest={reviewingRequest}
        rejectReason={rejectReason}
        showRejectModal={showRejectModal}
        selectedApprovedRequests={selectedApprovedRequests}
        orderProofUrl={orderProofUrl}
        orderProofName={orderProofName}
        submittingOrderFromRequests={submittingOrderFromRequests}
        onReviewRequest={handleReviewRequest}
        onToggleApprovedRequest={toggleApprovedRequest}
        onSelectAllApproved={selectAllApproved}
        onSubmitOrderFromRequests={handleSubmitOrderFromRequests}
        onUploadProof={handleUploadProof}
        onRemoveProof={() => { setOrderProofUrl(""); setOrderProofName(""); }}
        onCloseRejectModal={() => { setShowRejectModal(null); setRejectReason(""); }}
        onRejectReasonChange={(reason) => setRejectReason(reason)}
      />
    </div>
  );
}