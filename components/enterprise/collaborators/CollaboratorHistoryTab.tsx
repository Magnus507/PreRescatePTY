"use client";

import { Member } from "./types";
import { FileText, History } from "lucide-react";

interface CollaboratorHistoryTabProps {
  member: Member;
}

export default function CollaboratorHistoryTab({ member }: CollaboratorHistoryTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Historial de eventos</h3>
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Solicitud enviada</p>
              <p className="text-xs text-muted-foreground">
                {new Date((member as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Última actualización</p>
              <p className="text-xs text-muted-foreground">
                {new Date((member as unknown as { updatedAt: string }).updatedAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <p className="text-xs text-amber-800 font-semibold">
            El historial avanzado estará disponible próximamente.
          </p>
        </div>
      </div>
    </div>
  );
}