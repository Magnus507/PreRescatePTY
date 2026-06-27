"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Loader2, Package, Clock, CheckCircle2, XCircle, UserRound, Upload, ShoppingCart, Search, ArrowUpDown, Filter } from "lucide-react";

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
  product?: { name?: string; productType?: string };
};

type GroupMemberItem = {
  requestId: string;
  memberName: string;
  employeePosition?: string | null;
  employeeNationalId?: string | null;
  itemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
};

type ProductGroup = {
  productType: string;
  groupLabel: string;
  color: "blue" | "amber" | "emerald";
  items: GroupMemberItem[];
  totalQuantity: number;
  subtotal: number;
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

interface EnterpriseRequestsSectionProps {
  companyRequests: CompanyRequest[];
  companyRequestsLoading: boolean;
  reviewingRequest: string | null;
  rejectReason: string;
  showRejectModal: string | null;
  selectedApprovedRequests: Record<string, boolean>;
  orderProofUrl: string;
  orderProofName: string;
  submittingOrderFromRequests: boolean;
  onReviewRequest: (requestId: string, action: "approve" | "reject", reason?: string) => Promise<void>;
  onToggleApprovedRequest: (requestId: string) => void;
  onSelectAllApproved: () => void;
  onSubmitOrderFromRequests: () => Promise<void>;
  onUploadProof: (file: File) => Promise<void>;
  onRemoveProof: () => void;
  onCloseRejectModal: () => void;
  onRejectReasonChange: (reason: string) => void;
  initialStatusFilter?: string;
}


export default function EnterpriseRequestsSection({
  companyRequests,
  companyRequestsLoading,
  reviewingRequest,
  rejectReason,
  showRejectModal,
  selectedApprovedRequests,
  orderProofUrl,
  orderProofName,
  submittingOrderFromRequests,
  onReviewRequest,
  onToggleApprovedRequest,
  onSelectAllApproved,
  onSubmitOrderFromRequests,
  onUploadProof,
  onRemoveProof,
  onCloseRejectModal,
  onRejectReasonChange,
  initialStatusFilter,
}: EnterpriseRequestsSectionProps) {
  const [orderProofUploading, setOrderProofUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || "all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const selectedApprovedRequestIds = Object.entries(selectedApprovedRequests)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const selectedApprovedTotal = companyRequests
    .filter((r) => selectedApprovedRequestIds.includes(r.id))
    .reduce((sum: number, r) => {
      return sum + (r.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
    }, 0);

  // KPIs
  const kpis = useMemo(() => {
    const total = companyRequests.length;
    const pending = companyRequests.filter((r) => r.status === "pending_company_approval").length;
    const approved = companyRequests.filter((r) => r.status === "approved_pending_payment").length;
    const paymentReview = companyRequests.filter((r) => r.status === "payment_under_review").length;
    const paid = companyRequests.filter((r) => r.status === "paid_approved").length;
    const rejected = companyRequests.filter((r) => r.status === "rejected_by_company").length;
    return { total, pending, approved, paymentReview, paid, rejected };
  }, [companyRequests]);

  // Filtered and sorted requests
  const processedRequests = useMemo(() => {
    let filtered = [...companyRequests];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        const member = r.organizationMember;
        const memberName = member?.profile
          ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.toLowerCase()
          : "";
        const email = member?.profile?.user?.email?.toLowerCase() || "";
        const position = member?.employeePosition?.toLowerCase() || "";
        const department = member?.employeeDepartment?.toLowerCase() || "";
        const products = (r.items || [])
          .map((i) => i.product?.name?.toLowerCase() || "")
          .join(" ");

        return (
          memberName.includes(query) ||
          email.includes(query) ||
          position.includes(query) ||
          department.includes(query) ||
          products.includes(query)
        );
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [companyRequests, statusFilter, searchQuery, sortOrder]);

  // Product group helpers
  const getProductGroupInfo = (productType: string, productName?: string): { label: string; color: "blue" | "amber" | "emerald" } => {
    const map: Record<string, { label: string; color: "blue" | "amber" | "emerald" }> = {
      initial_chip: { label: "Primer chip empresarial", color: "blue" },
      tarjeta: { label: "Credenciales NFC", color: "amber" },
      brazalete: { label: "Pulseras NFC", color: "amber" },
      qr: { label: "QR personalizados", color: "amber" },
      sticker: { label: "Stickers NFC", color: "emerald" },
      tag: { label: "Tags NFC", color: "emerald" },
      llavero: { label: "Llaveros NFC", color: "emerald" },
      combo: { label: "Combos", color: "emerald" },
    };
    return map[productType] || { label: productName || "Producto", color: "emerald" };
  };

  // Summary of all pending requests
  const pendingSummary = useMemo(() => {
    const pending = companyRequests.filter((r) => r.status === "pending_company_approval");
    const collaboratorSet = new Set<string>();
    let totalProducts = 0;
    let totalAmount = 0;
    for (const req of pending) {
      const key = [req.organizationMember?.profile?.firstName, req.organizationMember?.profile?.lastName].filter(Boolean).join("|") || req.id;
      collaboratorSet.add(key);
      for (const item of req.items || []) {
        totalProducts += item.quantity;
        totalAmount += item.subtotal || 0;
      }
    }
    return { collaborators: collaboratorSet.size, totalProducts, totalAmount };
  }, [companyRequests]);

  // Group pending requests by product type
  const pendingGroups = useMemo(() => {
    const pending = processedRequests.filter((r) => r.status === "pending_company_approval");
    const groupsMap = new Map<string, ProductGroup>();

    for (const req of pending) {
      const memberName = req.organizationMember?.profile
        ? `${req.organizationMember.profile.firstName || ""} ${req.organizationMember.profile.lastName || ""}`.trim()
        : "—";

      for (const item of req.items || []) {
        const productType = (item as CompanyRequestItem).product?.productType || "other";
        const productName = item.product?.name || "Producto";
        const { label: groupLabel, color } = getProductGroupInfo(productType, productName);

        if (!groupsMap.has(productType)) {
          groupsMap.set(productType, {
            productType,
            groupLabel,
            color,
            items: [],
            totalQuantity: 0,
            subtotal: 0,
          });
        }

        const group = groupsMap.get(productType)!;
        group.items.push({
          requestId: req.id,
          memberName,
          employeePosition: req.organizationMember?.employeePosition,
          employeeNationalId: req.organizationMember?.employeeNationalId,
          itemId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          subtotal: item.subtotal || 0,
          createdAt: req.createdAt,
        });
        group.totalQuantity += item.quantity;
        group.subtotal += item.subtotal || 0;
      }
    }

    return Array.from(groupsMap.values());
  }, [processedRequests]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy pesado (máx 5MB)");
      return;
    }
    setOrderProofUploading(true);
    try {
      await onUploadProof(file);
    } finally {
      setOrderProofUploading(false);
    }
  };

  if (companyRequestsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
          <p className="text-2xl font-black text-slate-900">{kpis.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pendientes</p>
          <p className="text-2xl font-black text-amber-900">{kpis.pending}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1">
          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Aprobadas</p>
          <p className="text-2xl font-black text-blue-900">{kpis.approved}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-1">
          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">En revisión</p>
          <p className="text-2xl font-black text-indigo-900">{kpis.paymentReview}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Pagadas</p>
          <p className="text-2xl font-black text-emerald-900">{kpis.paid}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
          <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Rechazadas</p>
          <p className="text-2xl font-black text-rose-900">{kpis.rejected}</p>
        </div>
      </div>

      {/* Pending summary card */}
      {pendingSummary.collaborators > 0 && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg text-indigo-900">Solicitudes pendientes</h3>
              <p className="text-sm text-indigo-600/80">
                {pendingSummary.collaborators === 1 ? "1 colaborador" : `${pendingSummary.collaborators} colaboradores`} · {pendingSummary.totalProducts} {pendingSummary.totalProducts === 1 ? "producto" : "productos"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total</p>
            <p className="text-3xl font-black text-indigo-900">${pendingSummary.totalAmount.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por colaborador, email, cargo, departamento o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-white appearance-none"
            >
              <option value="all">Todas</option>
              <option value="pending_company_approval">Pendientes</option>
              <option value="approved_pending_payment">Aprobadas</option>
              <option value="payment_under_review">Pago en revisión</option>
              <option value="paid_approved">Pagadas</option>
              <option value="rejected_by_company">Rechazadas</option>
            </select>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === "newest" ? "Más recientes" : "Más antiguas"}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {processedRequests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Package className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-slate-700 mb-1">
            {companyRequests.length === 0
              ? "No hay solicitudes de productos registradas todavía."
              : "No hay solicitudes que coincidan con este filtro."}
          </p>
          <p className="text-sm text-muted-foreground">
            {companyRequests.length === 0
              ? "Tus colaboradores aún no han solicitado productos."
              : "Intenta ajustar los filtros o la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending requests — grouped by product type */}
          {pendingGroups.length > 0 && (
            <div className="space-y-6">
              {pendingGroups.map((group) => {
                const colorMap = {
                  blue: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-800", badge: "bg-blue-500", light: "bg-blue-100" },
                  amber: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-800", badge: "bg-amber-500", light: "bg-amber-100" },
                  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", badge: "bg-emerald-500", light: "bg-emerald-100" },
                }[group.color];

                return (
                  <div key={group.productType} className={`rounded-2xl border-2 ${colorMap.border} ${colorMap.bg} overflow-hidden shadow-md`}>
                    {/* Group header */}
                    <div className={`px-5 py-4 ${colorMap.bg} border-b ${colorMap.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${colorMap.light} flex items-center justify-center shrink-0`}>
                          <Package className={`h-5 w-5 ${colorMap.text}`} />
                        </div>
                        <div>
                          <h4 className={`font-black text-base ${colorMap.text}`}>{group.groupLabel}</h4>
                          <p className="text-xs text-muted-foreground">
                            {group.items.length} {group.items.length === 1 ? "colaborador" : "colaboradores"} · {group.totalQuantity} {group.totalQuantity === 1 ? "producto" : "productos"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-black ${colorMap.text} uppercase tracking-widest`}>Subtotal</p>
                        <p className={`text-2xl font-black ${colorMap.text}`}>${group.subtotal.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Members in group */}
                    <div className="divide-y divide-slate-100 bg-white">
                      {group.items.map((memberItem) => {
                        const req = companyRequests.find((r) => r.id === memberItem.requestId)!;
                        return (
                          <div key={`${memberItem.requestId}-${memberItem.itemId}`} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                  <UserRound className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-slate-900 truncate">{memberItem.memberName}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {memberItem.employeePosition && `${memberItem.employeePosition} · `}
                                    {memberItem.employeeNationalId && `Céd: ${memberItem.employeeNationalId}`}
                                    {!memberItem.employeePosition && !memberItem.employeeNationalId && (
                                      <>Solicitado {memberItem.createdAt ? new Date(memberItem.createdAt).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" }) : "—"}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">{memberItem.quantity} × ${memberItem.unitPrice.toFixed(2)}</p>
                                  <p className={`text-lg font-black ${colorMap.text}`}>${memberItem.subtotal.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                onClick={() => onReviewRequest(memberItem.requestId, "approve")}
                                disabled={reviewingRequest === memberItem.requestId}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                {reviewingRequest === memberItem.requestId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Aprobar
                              </button>
                              <button
                                onClick={() => onReviewRequest(memberItem.requestId, "reject")}
                                disabled={reviewingRequest === memberItem.requestId}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-black text-xs hover:bg-rose-100 transition-all disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Rechazar
                              </button>
                            </div>

                            {/* Item note */}
                            {(() => {
                              const reqItem = req?.items?.find((i) => i.id === memberItem.itemId);
                              return reqItem?.note ? (
                                <p className="text-[10px] text-muted-foreground italic pl-1">Nota: {reqItem.note}</p>
                              ) : null;
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Approved requests — selectable for payment */}
          {processedRequests.filter((r) => r.status === "approved_pending_payment").length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Aprobadas — pendientes de pago ({processedRequests.filter((r) => r.status === "approved_pending_payment").length})
                </h3>
                <button
                  onClick={onSelectAllApproved}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                >
                  {processedRequests.filter((r) => r.status === "approved_pending_payment" && !r.orderId).every((r) => selectedApprovedRequests[r.id]) ? "Deseleccionar" : "Seleccionar todas"}
                </button>
              </div>
              {processedRequests.filter((r) => r.status === "approved_pending_payment").map((req) => {
                const member = req.organizationMember;
                const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                const alreadyLinked = !!req.orderId;
                return (
                  <div key={req.id} className={`rounded-2xl border bg-white p-5 space-y-3 shadow-sm transition-all ${
                    selectedApprovedRequests[req.id] ? "border-blue-500 ring-2 ring-blue-500/10" : alreadyLinked ? "border-slate-200 opacity-60" : "border-blue-200"
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {!alreadyLinked && (
                          <input
                            type="checkbox"
                            checked={!!selectedApprovedRequests[req.id]}
                            onChange={() => onToggleApprovedRequest(req.id)}
                            className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                        )}
                        {alreadyLinked && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold shrink-0">EN ORDEN</span>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <p className="font-semibold text-sm">{memberName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary">${reqTotal.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">Aprobada {req.companyReviewedAt ? new Date(req.companyReviewedAt).toLocaleDateString("es-PA") : "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(req.items || []).map((item) => (
                        <span key={item.id} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                          {item.product?.name || "Producto"} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Payment creation panel */}
              {selectedApprovedRequestIds.length > 0 && (
                <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50/50 to-white p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-blue-900">Crear pago corporativo</p>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
                      <p className="text-2xl font-black text-primary">${selectedApprovedTotal.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Upload proof */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${orderProofUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                    {orderProofUrl ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <span className="text-sm font-semibold text-emerald-700 truncate">{orderProofName || "Comprobante adjuntado"}</span>
                        </div>
                        <button onClick={onRemoveProof} className="text-xs text-rose-600 font-semibold hover:underline shrink-0">Quitar</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comprobante de pago</p>
                        <p className="text-[10px] text-muted-foreground">Adjunta imagen o captura del comprobante de transferencia/depósito.</p>
                        <div className="flex items-center gap-3">
                          <input
                            id="order-proof-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={orderProofUploading}
                            onChange={handleFileUpload}
                          />
                          <label htmlFor="order-proof-upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all">
                            {orderProofUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><Upload className="h-4 w-4" /> Seleccionar archivo</>}
                          </label>
                        </div>
                        <p className="text-[9px] text-muted-foreground">Máx 5MB. Formatos: JPG, PNG, WebP.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">{selectedApprovedRequestIds.length} solicitud(es) seleccionada(s)</p>
                    <button
                      onClick={onSubmitOrderFromRequests}
                      disabled={submittingOrderFromRequests || !orderProofUrl}
                      className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {submittingOrderFromRequests ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                      {submittingOrderFromRequests ? "Creando orden..." : "Enviar pago a revisión"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment under review */}
          {processedRequests.filter((r) => r.status === "payment_under_review").length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pagos en revisión ({processedRequests.filter((r) => r.status === "payment_under_review").length})
              </h3>
              {processedRequests.filter((r) => r.status === "payment_under_review").map((req) => {
                const member = req.organizationMember;
                const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                return (
                  <div key={req.id} className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <p className="font-semibold text-sm">{memberName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary">${reqTotal.toFixed(2)}</p>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold border border-indigo-200">En revisión</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(req.items || []).map((item) => (
                        <span key={item.id} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100">
                          {item.product?.name || "Producto"} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paid / approved */}
          {processedRequests.filter((r) => r.status === "paid_approved").length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Pagos aprobados ({processedRequests.filter((r) => r.status === "paid_approved").length})
              </h3>
              {processedRequests.filter((r) => r.status === "paid_approved").map((req) => {
                const member = req.organizationMember;
                const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                return (
                  <div key={req.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <p className="font-semibold text-sm">{memberName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">${reqTotal.toFixed(2)}</p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold border border-emerald-200">Pagado</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(req.items || []).map((item) => (
                        <span key={item.id} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                          {item.product?.name || "Producto"} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rejected requests */}
          {processedRequests.filter((r) => r.status === "rejected_by_company").length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Rechazadas ({processedRequests.filter((r) => r.status === "rejected_by_company").length})
              </h3>
              {processedRequests.filter((r) => r.status === "rejected_by_company").map((req) => {
                const member = req.organizationMember;
                const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                return (
                  <div key={req.id} className="rounded-2xl border border-rose-200 bg-white p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <p className="font-semibold text-sm">{memberName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-rose-500">${reqTotal.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">Rechazada {req.companyReviewedAt ? new Date(req.companyReviewedAt).toLocaleDateString("es-PA") : "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(req.items || []).map((item) => (
                        <span key={item.id} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-100">
                          {item.product?.name || "Producto"} × {item.quantity}
                        </span>
                      ))}
                    </div>
                    {req.rejectionReason && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                        Motivo: {req.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Rechazar solicitud</h3>
              <button onClick={onCloseRejectModal} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas rechazar esta solicitud? El empleado será notificado.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                placeholder="Ej: No disponible en inventario, presupuesto insuficiente..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none h-24"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCloseRejectModal}
                className="flex-1 px-4 py-3 rounded-xl border border-border font-black text-sm hover:bg-accent transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => onReviewRequest(showRejectModal, "reject", rejectReason)}
                disabled={reviewingRequest === showRejectModal}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-black text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {reviewingRequest === showRejectModal ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}