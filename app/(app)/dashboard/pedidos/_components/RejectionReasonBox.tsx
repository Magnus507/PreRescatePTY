"use client";

interface RejectionReasonBoxProps {
  adminReviewNotes: string | null;
}

/**
 * Displays the admin's rejection reason when an order is rejected.
 */
export function RejectionReasonBox({ adminReviewNotes }: RejectionReasonBoxProps) {
  return (
    <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-left">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
        Motivo del rechazo: {adminReviewNotes?.trim() || "No especificado."}
      </p>
    </div>
  );
}