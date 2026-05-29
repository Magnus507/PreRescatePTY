"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, Loader2, XCircle } from "lucide-react";

type CorporateTab =
  | "solicitantes"
  | "aprobados"
  | "rechazados"
  | "pagados"
  | "suspendidos"
  | "archivados";

export default function EmpresasPage() {
  const [loading, setLoading] = useState(true);
  const [isCorporateAccount, setIsCorporateAccount] = useState(false);

  const [myStatus, setMyStatus] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<CorporateTab>("solicitantes");

  const [form, setForm] = useState({
    companyCode: "",
    firstName: "",
    lastName: "",
    employeeNationalId: "",
    employeeAge: "",
    employeePhone: "",
    employeePosition: "",
    employeeDepartment: "",
    employeeInternalId: "",
    employeeNote: "",
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const my = await fetch("/api/organizations/my-status");
      const myJson = await my.json();
      if (my.ok) setMyStatus(myJson);

      const corp = await fetch("/api/organizations/members?status=pending_company_review");
      if (corp.ok) {
        setIsCorporateAccount(true);
        const corpJson = await corp.json();
        setMembers(corpJson.members || []);
      } else {
        setIsCorporateAccount(false);
      }
    } catch {
      toast.error("Error al cargar módulo empresarial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadMembersByTab = async (nextTab: CorporateTab) => {
    const map: Record<CorporateTab, string | null> = {
      solicitantes: "pending_company_review",
      aprobados: "approved_unpaid",
      rechazados: "rejected_by_company",
      pagados: "paid_active",
      suspendidos: "suspended",
      archivados: "archived",
    };

    const status = map[nextTab];
    if (!status) return;
    const res = await fetch(`/api/organizations/members?status=${status}`);
    const json = await res.json();
    if (res.ok) setMembers(json.members || []);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/organizations/join-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        employeeAge: form.employeeAge ? Number(form.employeeAge) : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || "No se pudo enviar solicitud");
    toast.success(json.message || "Solicitud enviada");
    await loadAll();
  };

  const handleDecision = async (id: string, action: "approve" | "reject") => {
    const res = await fetch(`/api/organizations/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || "No se pudo actualizar");
    toast.success("Estado actualizado");
    await loadMembersByTab(tab);
  };

  const activeRequest = useMemo(() => {
    const reqs = myStatus?.requests || [];
    return reqs.find((r: any) =>
      ["pending_company_review", "approved_unpaid", "paid_active", "suspended", "archived"].includes(r.corporateStatus)
    );
  }, [myStatus]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando módulo empresarial...</p>
      </div>
    );
  }

  if (!isCorporateAccount) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-3xl font-black">Vinculación Empresarial</h1>

        {activeRequest ? (
          <div className="rounded-2xl border p-5 bg-card">
            <p className="font-semibold">Estado actual: {activeRequest.corporateStatus}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Empresa: {activeRequest.organization?.displayName || activeRequest.organization?.legalName}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitJoin} className="rounded-2xl border p-5 bg-card space-y-4">
            <p className="text-sm text-muted-foreground">Ingresa el código empresarial y tus datos administrativos.</p>
            <input className="w-full border rounded-xl px-3 py-2" placeholder="Código empresarial" value={form.companyCode} onChange={(e) => setForm({ ...form, companyCode: e.target.value })} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-xl px-3 py-2" placeholder="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <input className="border rounded-xl px-3 py-2" placeholder="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <input className="border rounded-xl px-3 py-2" placeholder="Cédula" value={form.employeeNationalId} onChange={(e) => setForm({ ...form, employeeNationalId: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Edad" value={form.employeeAge} onChange={(e) => setForm({ ...form, employeeAge: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Teléfono" value={form.employeePhone} onChange={(e) => setForm({ ...form, employeePhone: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Cargo" value={form.employeePosition} onChange={(e) => setForm({ ...form, employeePosition: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Departamento" value={form.employeeDepartment} onChange={(e) => setForm({ ...form, employeeDepartment: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="ID laboral" value={form.employeeInternalId} onChange={(e) => setForm({ ...form, employeeInternalId: e.target.value })} />
            </div>
            <textarea className="w-full border rounded-xl px-3 py-2" placeholder="Nota opcional" value={form.employeeNote} onChange={(e) => setForm({ ...form, employeeNote: e.target.value })} />
            <button className="px-4 py-2 bg-primary text-white rounded-xl font-semibold">Enviar solicitud</button>
            <p className="text-xs text-muted-foreground">Tu solicitud será enviada con estado pending_company_review.</p>
          </form>
        )}
      </div>
    );
  }

  const tabs: { key: CorporateTab; label: string }[] = [
    { key: "solicitantes", label: "Solicitantes" },
    { key: "aprobados", label: "Aprobados sin pagar" },
    { key: "rechazados", label: "Rechazados" },
    { key: "pagados", label: "Pagados / activos" },
    { key: "suspendidos", label: "Suspendidos" },
    { key: "archivados", label: "Archivados" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black">Gestión Empresarial</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={async () => {
              setTab(t.key);
              await loadMembersByTab(t.key);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.key ? "bg-primary text-white" : "bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "pagados" || tab === "suspendidos" || tab === "archivados") && (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">Próximamente en siguientes fases.</div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="rounded-2xl border p-4 bg-card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-semibold">{m.profile?.firstName} {m.profile?.lastName}</p>
                <p className="text-sm text-muted-foreground">{m.profile?.user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cédula: {m.employeeNationalId || "—"} · Edad: {m.employeeAge || "—"} · Tel: {m.employeePhone || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cargo/Depto: {m.employeePosition || "—"} / {m.employeeDepartment || "—"} · ID laboral: {m.employeeInternalId || "—"}
                </p>
                {m.employeeNote && <p className="text-xs text-muted-foreground">Nota: {m.employeeNote}</p>}
              </div>

              {tab === "solicitantes" && (
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(m.id, "approve")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Aprobar
                  </button>
                  <button onClick={() => handleDecision(m.id, "reject")} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold inline-flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Sin registros en esta pestaña.</div>}
      </div>

      {tab === "aprobados" && (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
          La compra corporativa se habilitará en la siguiente fase.
        </div>
      )}
    </div>
  );
}
