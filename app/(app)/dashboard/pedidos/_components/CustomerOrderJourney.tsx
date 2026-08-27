"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clock3,
  Factory,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";

type StepState = "done" | "current" | "upcoming" | "blocked";

interface CustomerTracking {
  stage: string;
  label: string;
  message: string;
  steps: Array<{
    id: "payment" | "fulfillment" | "preparation" | "shipping" | "delivery";
    label: string;
    state: StepState;
  }>;
  fulfillment: {
    productionRequired: boolean;
    productionStatus: string | null;
    productionEstimateDays: number | null;
    reservedUnitCount: number;
    qaReadyUnitCount: number;
  };
  dispatch: {
    status: string;
    carrierName: string | null;
    trackingReference: string | null;
    scheduledAt: string | null;
    sentAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  } | null;
  updatedAt: string;
}

interface CustomerOrderJourneyProps {
  orderId: string;
}

const STEP_ICONS = {
  payment: ShieldCheck,
  fulfillment: Factory,
  preparation: PackageCheck,
  shipping: Truck,
  delivery: Check,
} as const;

function stageClasses(stage: string) {
  if (stage === "payment_rejected" || stage === "cancelled") {
    return {
      shell: "border-red-200 bg-red-50/80",
      icon: "bg-red-100 text-red-700",
      eyebrow: "text-red-700",
    };
  }
  if (stage === "payment_pending" || stage === "payment_review" || stage === "production") {
    return {
      shell: "border-amber-200 bg-amber-50/75",
      icon: "bg-amber-100 text-amber-700",
      eyebrow: "text-amber-700",
    };
  }
  if (stage === "shipped") {
    return {
      shell: "border-violet-200 bg-violet-50/75",
      icon: "bg-violet-100 text-violet-700",
      eyebrow: "text-violet-700",
    };
  }
  return {
    shell: "border-emerald-200 bg-emerald-50/70",
    icon: "bg-emerald-100 text-emerald-700",
    eyebrow: "text-emerald-700",
  };
}

function stepDotClasses(state: StepState) {
  if (state === "done") return "border-emerald-500 bg-emerald-500 text-white";
  if (state === "current") return "border-slate-950 bg-slate-950 text-white shadow-[0_0_0_5px_rgba(15,23,42,0.08)]";
  if (state === "blocked") return "border-red-500 bg-red-500 text-white";
  return "border-slate-200 bg-white text-slate-400";
}

export function CustomerOrderJourney({ orderId }: CustomerOrderJourneyProps) {
  const [tracking, setTracking] = useState<CustomerTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTracking() {
      try {
        const res = await fetch(`/api/orders/${orderId}/tracking?_t=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el seguimiento");
        if (!cancelled) setTracking(data.tracking || null);
      } catch (error) {
        console.error("CUSTOMER_ORDER_JOURNEY_LOAD_ERROR", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTracking();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">Sincronizando avance real del pedido</span>
      </div>
    );
  }

  if (!tracking) return null;

  const styles = stageClasses(tracking.stage);
  const CurrentIcon = tracking.stage === "production"
    ? Factory
    : tracking.stage === "shipped"
      ? Truck
      : tracking.stage === "cancelled" || tracking.stage === "payment_rejected"
        ? XCircle
        : tracking.stage === "payment_pending" || tracking.stage === "payment_review"
          ? Clock3
          : PackageCheck;

  return (
    <section className={`rounded-[2rem] border p-5 sm:p-6 ${styles.shell}`}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
            <CurrentIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-black uppercase tracking-[0.24em] ${styles.eyebrow}`}>Seguimiento operativo</p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">{tracking.label}</h4>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{tracking.message}</p>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[620px] grid-cols-5 gap-0">
            {tracking.steps.map((step, index) => {
              const Icon = STEP_ICONS[step.id];
              const lineDone = index < tracking.steps.length - 1 && tracking.steps[index + 1]?.state !== "upcoming";
              return (
                <div key={step.id} className="relative flex flex-col items-center text-center">
                  {index < tracking.steps.length - 1 && (
                    <span className={`absolute left-1/2 top-5 h-0.5 w-full ${lineDone ? "bg-emerald-400" : "bg-slate-200"}`} />
                  )}
                  <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${stepDotClasses(step.state)}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className={`mt-2 text-[9px] font-black uppercase tracking-[0.13em] ${step.state === "current" || step.state === "blocked" ? "text-slate-950" : "text-slate-500"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {(tracking.fulfillment.productionRequired || tracking.fulfillment.reservedUnitCount > 0 || tracking.dispatch) && (
          <div className="grid gap-2 sm:grid-cols-3">
            {tracking.fulfillment.productionRequired && (
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Producción</p>
                <p className="mt-1 text-xs font-black text-slate-900">
                  {tracking.fulfillment.productionStatus || "Requerida"}
                </p>
                {tracking.fulfillment.productionEstimateDays ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Estimado: {tracking.fulfillment.productionEstimateDays} días</p>
                ) : null}
              </div>
            )}

            {tracking.fulfillment.reservedUnitCount > 0 && (
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Inventario asignado</p>
                <p className="mt-1 text-xs font-black text-slate-900">{tracking.fulfillment.reservedUnitCount} unidad(es)</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{tracking.fulfillment.qaReadyUnitCount} con control de calidad aprobado</p>
              </div>
            )}

            {tracking.dispatch && (
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Envío</p>
                <p className="mt-1 text-xs font-black text-slate-900">{tracking.dispatch.carrierName || "Logística PreRescate"}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  {tracking.dispatch.trackingReference ? `Tracking: ${tracking.dispatch.trackingReference}` : "Seguimiento interno activo"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
