"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, Clock, CheckCircle2, XCircle, UserRound, Upload, ShoppingCart } from "lucide-react";

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
}: EnterpriseRequestsSectionProps) {
  const [orderProofUploading, setOrderProofUploading] = useState(false);
  const selectedApprovedRequestIds = Object.entries(selectedApprovedRequests)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const selectedApprovedTotal = companyRequests
    .filter((r) => selectedApprovedRequestIds.includes(r.id))
    .reduce((sum: number, r) => {
      return sum + (r.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
    }, 0);

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

  if (companyRequests.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Package className="h-8 w-8" />
        </div>
        <p className="text-base font-semibold text-slate-700 mb-1">Sin solicitudes de productos</p>
        <p className="text-sm text-muted-foreground">Tus colaboradores aún no han solicitado productos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending requests */}
      {companyRequests.filter((r) => r.status === "pending_company_approval").length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pendientes de revisión ({companyRequests.filter((r) => r.status === "pending_company_approval").length})
          </h3>
          {companyRequests.filter((r) => r.status === "pending_company_approval").map((req) => {
            const member = req.organizationMember;
            const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
            const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
            return (
              <div key={req.id} className="rounded-2xl border border-amber-200 bg-white shadow-md overflow-hidden">
                <div className="p-5 bg-amber-50/50 border-b border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-sm">{memberName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {member?.employeePosition && `${member.employeePosition} · `}
                        {member?.employeeNationalId && `Céd: ${member.employeeNationalId}`}
                        {!member?.employeePosition && !member?.employeeNationalId && (
                          <>Solicitado {req.createdAt ? new Date(req.createdAt).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" }) : "—"}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-primary">${reqTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {(req.items || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black shrink-0">
                            {item.quantity}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{item.product?.name || "Producto"}</p>
                            <p className="text-[10px] text-muted-foreground">${item.unitPrice?.toFixed(2)} c/u</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">${item.subtotal?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {req.items?.some((i) => i.note) && (
                    <div className="space-y-1">
                      {req.items.filter((i) => i.note).map((i) => (
                        <p key={i.id} className="text-[10px] text-muted-foreground italic">Nota para {i.product?.name}: {i.note}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onReviewRequest(req.id, "approve")}
                      disabled={reviewingRequest === req.id}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {reviewingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprobar solicitud
                    </button>
                    <button
                      onClick={() => { /* handled by parent */ }}
                      disabled={reviewingRequest === req.id}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-black text-sm hover:bg-rose-100 transition-all disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approved requests — selectable for payment */}
      {companyRequests.filter((r) => r.status === "approved_pending_payment").length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Aprobadas — pendientes de pago ({companyRequests.filter((r) => r.status === "approved_pending_payment").length})
            </h3>
            <button
              onClick={onSelectAllApproved}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
            >
              {companyRequests.filter((r) => r.status === "approved_pending_payment" && !r.orderId).every((r) => selectedApprovedRequests[r.id]) ? "Deseleccionar" : "Seleccionar todas"}
            </button>
          </div>
          {companyRequests.filter((r) => r.status === "approved_pending_payment").map((req) => {
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
      {companyRequests.filter((r) => r.status === "payment_under_review").length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pagos en revisión ({companyRequests.filter((r) => r.status === "payment_under_review").length})
          </h3>
          {companyRequests.filter((r) => r.status === "payment_under_review").map((req) => {
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
      {companyRequests.filter((r) => r.status === "paid_approved").length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Pagos aprobados ({companyRequests.filter((r) => r.status === "paid_approved").length})
          </h3>
          {companyRequests.filter((r) => r.status === "paid_approved").map((req) => {
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
      {companyRequests.filter((r) => r.status === "rejected_by_company").length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Rechazadas ({companyRequests.filter((r) => r.status === "rejected_by_company").length})
          </h3>
          {companyRequests.filter((r) => r.status === "rejected_by_company").map((req) => {
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