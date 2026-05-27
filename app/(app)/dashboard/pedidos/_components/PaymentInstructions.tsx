"use client";

import { QrCode, Banknote } from "lucide-react";

interface PaymentInstructionsProps {
  paymentConfig: Record<string, any> | null;
}

/**
 * Displays Yappy QR + bank transfer instructions for manual payment.
 * Data comes from /api/public/config.
 */
export function PaymentInstructions({ paymentConfig }: PaymentInstructionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      <div className="p-6 rounded-3xl bg-white border border-border flex flex-col items-center gap-3 shadow-sm transition-all hover:scale-[1.02]">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          {paymentConfig?.yappy_qr_url ? (
            <img src={paymentConfig.yappy_qr_url} alt="QR" className="h-full w-full object-contain p-1" />
          ) : (
            <QrCode className="h-6 w-6" />
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">YAPPY</p>
        <p className="text-sm font-black text-indigo-600">{paymentConfig?.yappy_handle || "@PreRescue.ID"}</p>
      </div>
      <div className="p-6 rounded-3xl bg-white border border-border flex flex-col items-center gap-3 shadow-sm transition-all hover:scale-[1.02]">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Banknote className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {paymentConfig?.bank_name || "BANCO GENERAL"}
        </p>
        <p className="text-[11px] font-bold leading-tight">
          {paymentConfig?.bank_account_type || "Cta Corriente"}: {paymentConfig?.bank_account_number || "03-72-01-..."}<br />
          {paymentConfig?.bank_account_name || "PreRescue ID PTY S.A."}
        </p>
      </div>
    </div>
  );
}