"use client";

import Image from "next/image";
import { QrCode, Banknote } from "lucide-react";

interface PaymentConfig {
  yappy_qr_url?: string | null;
  yappy_handle?: string | null;
  bank_name?: string | null;
  bank_account_type?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
}

interface PaymentInstructionsProps {
  paymentConfig: PaymentConfig | null;
}

/**
 * Displays Yappy QR + bank transfer instructions for manual payment.
 * Data comes from /api/public/config.
 */
export function PaymentInstructions({ paymentConfig }: PaymentInstructionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      <div className="p-6 rounded-[2rem] bg-white border border-slate-200 flex flex-col items-center gap-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.25)]">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
          {paymentConfig?.yappy_qr_url ? (
            <Image
              src={paymentConfig.yappy_qr_url}
              alt="QR"
              className="h-full w-full object-contain p-1"
              width={48}
              height={48}
            />
          ) : (
            <QrCode className="h-6 w-6" />
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Yappy</p>
        <p className="text-sm font-black text-indigo-700">{paymentConfig?.yappy_handle || "@PreRescue.ID"}</p>
      </div>
      <div className="p-6 rounded-[2rem] bg-white border border-slate-200 flex flex-col items-center gap-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.25)]">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Banknote className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
          {paymentConfig?.bank_name || "BANCO GENERAL"}
        </p>
        <p className="text-[11px] font-bold leading-tight text-slate-700">
          {paymentConfig?.bank_account_type || "Cta Corriente"}: {paymentConfig?.bank_account_number || "03-72-01-..."}<br />
          {paymentConfig?.bank_account_name || "PreRescue ID PTY S.A."}
        </p>
      </div>
    </div>
  );
}
