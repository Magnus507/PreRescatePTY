"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { YappyRenewalButton } from "@/components/payments/YappyRenewalButton";

type RenewalState = {
  price: string;
  currency: string;
  months: number;
  accessMode: "PENDING_ACTIVATION" | "FULL" | "ESSENTIAL";
  serviceEndDate: string | null;
  latestPayment: {
    id: string;
    status: string;
    amount: string;
    confirmedAt: string | null;
    createdAt: string;
  } | null;
};

export default function AnnualRenewalPage() {
  const [data, setData] = useState<RenewalState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account/renewal", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar la renovacion");
      setData(payload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#DA1A21]" />
      </div>
    );
  }

  const active = data.accessMode === "FULL";
  const endDate = data.serviceEndDate
    ? new Intl.DateTimeFormat("es-PA", { dateStyle: "long" }).format(new Date(data.serviceEndDate))
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_-36px_rgba(15,23,42,0.28)] sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DA1A21]/15 bg-[#DA1A21]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#B9141B]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acceso anual
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Renueva la administración de tu cuenta
            </h1>
            <p className="text-sm font-medium leading-7 text-slate-600 sm:text-base">
              Tus dispositivos, QR/NFC y ficha pública de emergencia continúan funcionando. La renovación habilita nuevamente la administración de perfiles y dispositivos por {data.months} meses.
            </p>
          </div>

          <div className="min-w-[12rem] rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Renovación anual</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">${data.price}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{data.currency} / {data.months} meses</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            {active ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <Clock3 className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Estado actual</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {active ? "Acceso completo" : data.accessMode === "ESSENTIAL" ? "Administración vencida" : "Pendiente de primera activación"}
              </p>
            </div>
          </div>

          {endDate && (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
              Vigencia registrada hasta <strong className="text-slate-950">{endDate}</strong>.
            </p>
          )}

          <div className="mt-5 space-y-2 text-sm font-semibold text-slate-600">
            <p>• Hasta 10 perfiles médicos por cuenta personal.</p>
            <p>• Rotación y reasignación de dispositivos mientras el acceso esté vigente.</p>
            <p>• Reactivación de dispositivos suspendidos.</p>
            <p>• Soporte dentro del panel permanece disponible.</p>
          </div>

          <Link href="/dashboard/chips" className="mt-6 inline-flex text-sm font-black text-[#DA1A21] hover:underline">
            Volver a mis dispositivos
          </Link>
        </div>

        <YappyRenewalButton onPaymentUpdate={refresh} />
      </section>
    </div>
  );
}
