import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, Activity, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "PreRescatePTY — Activación",
  description: "Pantalla pública segura previa a la activación del producto.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function PublicActivationPage({
  params,
}: {
  params: Promise<{ internalLabel: string }>;
}) {
  const { internalLabel } = await params;
  const label = internalLabel.trim();

  const item = await prisma.operationDigitalBatchItem.findUnique({
    where: { internalLabel: label },
    include: {
      batch: {
        select: {
          productType: true,
          finishedGoodCode: true,
          name: true,
        },
      },
      finishedGoodUnits: {
        select: {
          id: true,
          activationStatus: true,
          status: true,
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  const unit = item.finishedGoodUnits[0] || null;
  if (unit?.activationStatus === "activated" && item.shortCode) {
    redirect(`/e/${item.shortCode}`);
  }

  const isReadyForActivation = unit?.activationStatus === "not_activated";
  const statusLabel = unit
    ? isReadyForActivation
      ? "Pendiente de activación"
      : unit.status === "qa_pending"
        ? "En preparación"
        : "Pendiente"
    : item.status === "printed"
      ? "Pendiente de activación"
      : item.status === "sent_to_print"
        ? "Enviado a imprenta"
        : "En preparación";

  const productLabel =
    item.batch.finishedGoodCode === "PRP-FG-STICKER-EMP"
      ? "Sticker PreRescatePTY Empresarial"
      : "Sticker PreRescatePTY";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 font-sans">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl">
          <div className="h-3 bg-red-600" />
          <div className="p-6 sm:p-10 md:p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-slate-100 bg-slate-50 shadow-lg">
              {isReadyForActivation ? (
                <ShieldCheck className="h-10 w-10 text-slate-800" />
              ) : (
                <Activity className="h-10 w-10 text-slate-700" />
              )}
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
              PreRescatePTY / PreRescueID
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tighter text-slate-900 sm:text-5xl">
              Este producto requiere activación
            </h1>

            <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Etiqueta interna</p>
                <p className="mt-1 break-words text-base font-black text-slate-900">{label}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Producto</p>
                <p className="mt-1 text-base font-black text-slate-900">{productLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</p>
                <p className="mt-1 text-base font-black text-slate-900">{statusLabel}</p>
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
              Este código pertenece a un producto PreRescatePTY. Antes de la activación solo mostramos información operativa segura.
              No se muestran datos médicos, personales ni contactos de emergencia.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/activar"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-black active:scale-[0.98]"
              >
                Activar producto
                <ShieldCheck className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-700" />
            <p className="leading-relaxed">
              Venta, reserva y despacho no implican asignación al usuario final. La asignación solo ocurre cuando el código se activa.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
