"use client";

import { Member } from "./types";

interface CollaboratorInfoTabProps {
  member: Member;
}

export default function CollaboratorInfoTab({ member }: CollaboratorInfoTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Datos personales</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">NOMBRE COMPLETO</p>
          <p className="text-sm font-semibold">{member.profile?.firstName} {member.profile?.lastName}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CORREO ELECTRÓNICO</p>
          <p className="text-sm font-semibold">{member.profile?.user?.email || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TELÉFONO</p>
          <p className="text-sm font-semibold">{member.employeePhone || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CÉDULA</p>
          <p className="text-sm font-semibold">{member.employeeNationalId || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CARGO</p>
          <p className="text-sm font-semibold">{member.employeePosition || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">DEPARTAMENTO</p>
          <p className="text-sm font-semibold">{member.employeeDepartment || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">FECHA DE SOLICITUD</p>
          <p className="text-sm font-semibold">
            {new Date((member as unknown as { createdAt: string }).createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ESTADO ACTUAL</p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border`}>
            {member.corporateStatus}
          </span>
        </div>
      </div>
    </div>
  );
}