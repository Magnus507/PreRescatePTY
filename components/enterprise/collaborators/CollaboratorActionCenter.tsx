"use client";

import { Member } from "./types";
import { Loader2, CheckCircle2, XCircle, Ban, Shield } from "lucide-react";

type ActionHandler = (memberId: string, action: "suspend" | "unsuspend" | "archive" | "restore" | "reject" | "delete_forever" | "approve") => Promise<void>;

interface CollaboratorActionCenterProps {
  member: Member;
  actingOn: string | null;
  onAction: ActionHandler;
  statusInfo: Record<string, { label: string; color: string; bg: string }>;
}

export default function CollaboratorActionCenter({ member, actingOn, onAction, statusInfo }: CollaboratorActionCenterProps) {
  const isActing = actingOn === member.id;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Centro de Acciones</h3>
          <p className="text-[10px] text-muted-foreground">Operaciones sobre el colaborador</p>
        </div>
      </div>

      {/* Botones según estado */}
      <div className="flex flex-wrap gap-2 mb-4">
        {isActing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <>
            {/* PENDIENTE */}
            {member.corporateStatus === "pending_company_review" && (
              <>
                <button
                  onClick={() => onAction(member.id, "approve")}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => onAction(member.id, "reject")}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </button>
              </>
            )}

            {/* APROBADO O ACTIVO */}
            {(member.corporateStatus === "approved_unpaid" || member.corporateStatus === "paid_active") && (
              <button
                onClick={() => onAction(member.id, "suspend")}
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <Ban className="h-4 w-4" />
                Suspender
              </button>
            )}

            {/* SUSPENDIDO */}
            {member.corporateStatus === "suspended" && (
              <button
                onClick={() => onAction(member.id, "unsuspend")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Reactivar
              </button>
            )}

            {/* ARCHIVADO */}
            {member.corporateStatus === "archived" && (
              <button
                onClick={() => onAction(member.id, "restore")}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Restaurar
              </button>
            )}

            {/* RECHAZADO */}
            {member.corporateStatus === "rejected_by_company" && (
              <button
                onClick={() => onAction(member.id, "restore")}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Restaurar
              </button>
            )}
          </>
        )}
      </div>

      {/* Información operativa */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase">Estado</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo[member.corporateStatus]?.bg || ""} ${statusInfo[member.corporateStatus]?.color || ""}`}>
            {statusInfo[member.corporateStatus]?.label || member.corporateStatus}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase">Solicitud</p>
          <p className="text-xs font-semibold mt-1">
            {new Date((member as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase">Actualización</p>
          <p className="text-xs font-semibold mt-1">
            {new Date((member as unknown as { updatedAt: string }).updatedAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
          </p>
        </div>
      </div>
    </div>
  );
}