"use client";

import { Member } from "./types";
import { ClipboardList } from "lucide-react";

interface CollaboratorProgramTabProps {
  member: Member;
}

export default function CollaboratorProgramTab({ member }: CollaboratorProgramTabProps) {
  const statusDescriptions: Record<string, string> = {
    pending_company_review: "Esperando aprobación de la empresa. Una vez aprobado, podrá completar su compra corporativa.",
    approved_unpaid: "Aprobado por la empresa. Puede completar su compra corporativa para activar sus beneficios.",
    paid_active: "Puede utilizar todos los beneficios del programa PreRescue.",
    suspended: "Acceso pausado temporalmente. Contacta al administrador para más información.",
    rejected_by_company: "Solicitud no aprobada por la empresa. Contacta al administrador si tienes preguntas.",
    archived: "Colaborador eliminado del sistema. Sus beneficios corporativos han sido desactivados.",
  };

  const statusColors: Record<string, string> = {
    paid_active: "bg-emerald-100 text-emerald-600",
    pending_company_review: "bg-blue-100 text-blue-600",
    suspended: "bg-red-100 text-red-600",
    rejected_by_company: "bg-rose-100 text-rose-600",
    approved_unpaid: "bg-amber-100 text-amber-600",
    archived: "bg-slate-200 text-slate-600",
  };

  const description = statusDescriptions[member.corporateStatus] || "Estado desconocido";
  const colorClass = statusColors[member.corporateStatus] || "bg-slate-200 text-slate-600";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Estado en el programa</h3>
      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-lg mb-2">{member.corporateStatus}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}