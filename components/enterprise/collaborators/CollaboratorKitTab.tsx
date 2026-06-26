"use client";

import { CorporateKitData } from "./types";
import { Loader2, Users, Package, Smartphone, ClipboardList } from "lucide-react";

interface CollaboratorKitTabProps {
  kitData: CorporateKitData | null;
  kitLoading: boolean;
  kitError: string | null;
  onRetry: () => void;
}

export default function CollaboratorKitTab({ kitData, kitLoading, kitError, onRetry }: CollaboratorKitTabProps) {
  if (kitLoading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando kit empresarial...</p>
      </div>
    );
  }

  if (kitError) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
        <p className="text-sm font-semibold text-red-700">{kitError}</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!kitData) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
        <p className="text-xs font-semibold text-muted-foreground">Sin datos de kit disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Kit Empresarial</h3>

      {/* Perfil corporativo */}
      {kitData.corporateProfile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Perfil corporativo</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Nombre</p>
              <p className="text-sm font-semibold">{kitData.corporateProfile.firstName} {kitData.corporateProfile.lastName}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Tipo de sangre</p>
              <p className="text-sm font-semibold">{kitData.corporateProfile.bloodType || "—"}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Teléfono</p>
              <p className="text-sm font-semibold">{kitData.corporateProfile.phone || "—"}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Productos del kit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Package className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Productos</h4>
          {kitData.corporateOrderItems.length > 0 && (
            <span className="ml-auto text-[10px] font-bold text-muted-foreground">{kitData.corporateOrderItems.length} ítem(s)</span>
          )}
        </div>
        {kitData.corporateOrderItems.length > 0 ? (
          <div className="space-y-3">
            {kitData.corporateOrderItems.map((item) => {
              const fulfillmentColors: Record<string, string> = {
                pending_assignment: "bg-amber-50 text-amber-700 border-amber-200",
                assigned_reserved: "bg-blue-50 text-blue-700 border-blue-200",
                activated: "bg-emerald-50 text-emerald-700 border-emerald-200",
                delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
              };
              const fulfillmentLabels: Record<string, string> = {
                pending_assignment: "Pendiente",
                assigned_reserved: "Reservado",
                activated: "Activado",
                delivered: "Entregado",
              };
              const fStatus = fulfillmentLabels[item.fulfillmentStatus] || item.fulfillmentStatus;
              const fColor = fulfillmentColors[item.fulfillmentStatus] || "bg-slate-50 text-slate-600 border-slate-200";
              return (
                <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.product.productType}</p>
                      <p className="text-[10px] text-muted-foreground">Cantidad: {item.quantity}</p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${fColor}`}>{fStatus}</span>
                  </div>
                  {item.chip && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Chip: {item.chip.shortCode}
                    </p>
                  )}
                  {item.activatedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Activado: {new Date(item.activatedAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <p className="text-xs font-semibold text-muted-foreground">Sin productos asignados todavía.</p>
          </div>
        )}
      </div>

      {/* Chip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Smartphone className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Chip</h4>
        </div>
        {(() => {
          const chip = kitData.corporateOrderItems.find(i => i.chip)?.chip;
          return chip ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">ShortCode</p>
                <p className="text-sm font-semibold font-mono">{chip.shortCode}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Serial</p>
                <p className="text-sm font-semibold font-mono">{chip.serialPublic}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Estado</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  chip.status === "activated" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  chip.status === "suspended" ? "bg-red-50 text-red-700 border-red-200" :
                  chip.status === "sold" ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-slate-50 text-slate-600 border-slate-200"
                }`}>{chip.status}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Activación</p>
                <p className="text-sm font-semibold">{chip.activatedAt ? new Date(chip.activatedAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs font-semibold text-muted-foreground">Sin chip asignado todavía.</p>
            </div>
          );
        })()}
      </div>

      {/* Pedido asociado */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Pedido asociado</h4>
        </div>
        {(() => {
          const order = kitData.corporateOrderItems.find(i => i.order)?.order;
          return order ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Número</p>
                <p className="text-sm font-semibold font-mono">{order.orderNumber}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Monto</p>
                <p className="text-sm font-semibold">${order.amount.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Pago</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  order.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  order.paymentStatus === "under_review" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-slate-50 text-slate-600 border-slate-200"
                }`}>{order.paymentStatus}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Fecha</p>
                <p className="text-sm font-semibold">{new Date(order.createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs font-semibold text-muted-foreground">Sin pedido asociado todavía.</p>
            </div>
          );
        })()}
      </div>

    </div>
  );
}