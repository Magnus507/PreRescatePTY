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

type CorporatePublicProfile = {
  id: string;
  shortCode: string;
  status: "draft" | "active" | "hidden";
  displayName: string | null;
  legalName: string | null;
  ruc: string | null;
  industry: string | null;
  description: string | null;
  slogan: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  mainServices: string | null;
  mainProducts: string | null;
  securityContactName: string | null;
  securityPhone: string | null;
  emergencyProcedure: string | null;
  customEmployeeMessage: string | null;
  showCompanyCode: boolean;
  showDisplayName: boolean;
  showLegalName: boolean;
  showRuc: boolean;
  showIndustry: boolean;
  showDescription: boolean;
  showSlogan: boolean;
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showAddress: boolean;
  showMainServices: boolean;
  showMainProducts: boolean;
  showSecurityContactName: boolean;
  showSecurityPhone: boolean;
  showEmergencyProcedure: boolean;
  showCustomEmployeeMessage: boolean;
};

export default function EmpresasPage() {
  const [loading, setLoading] = useState(true);
  const [isCorporateAccount, setIsCorporateAccount] = useState(false);

  const [myStatus, setMyStatus] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<CorporateTab>("solicitantes");
  const [publicProfile, setPublicProfile] = useState<CorporatePublicProfile | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [memberProducts, setMemberProducts] = useState<Record<string, { productId: string; quantity: number }[]>>({});
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [submittingCorporateOrder, setSubmittingCorporateOrder] = useState(false);

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
        await loadPublicProfile();
        const productsRes = await fetch("/api/products");
        const productsJson = await productsRes.json();
        if (productsRes.ok) setProducts((productsJson.products || []).filter((p: any) => p.isActive));
      } else {
        setIsCorporateAccount(false);
      }
    } catch {
      toast.error("Error al cargar módulo empresarial");
    } finally {
      setLoading(false);
    }
  };

  const loadPublicProfile = async () => {
    setPublicLoading(true);
    try {
      const res = await fetch("/api/organizations/public-profile");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el perfil público");
      setPublicProfile(json.profile || null);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cargar el perfil público");
    } finally {
      setPublicLoading(false);
    }
  };

  const createPublicProfile = async () => {
    try {
      setPublicLoading(true);
      const res = await fetch("/api/organizations/public-profile", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear el perfil");
      setPublicProfile(json.profile);
      toast.success("Perfil empresarial creado");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo crear el perfil");
    } finally {
      setPublicLoading(false);
    }
  };

  const savePublicProfile = async () => {
    if (!publicProfile) return;
    try {
      setSavingPublic(true);
      const res = await fetch("/api/organizations/public-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publicProfile),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setPublicProfile(json.profile);
      toast.success("Perfil empresarial actualizado");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo guardar");
    } finally {
      setSavingPublic(false);
    }
  };

  const updateProfileField = (key: keyof CorporatePublicProfile, value: any) => {
    if (!publicProfile) return;
    setPublicProfile({ ...publicProfile, [key]: value });
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
    setMemberProducts((prev) => prev[memberId] ? prev : { ...prev, [memberId]: [] });
  };

  const addProductToMember = (memberId: string, productId: string) => {
    if (!productId) return;
    setMemberProducts((prev) => {
      const current = prev[memberId] || [];
      const existing = current.find((p) => p.productId === productId);
      if (existing) {
        return {
          ...prev,
          [memberId]: current.map((p) => p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p),
        };
      }
      return { ...prev, [memberId]: [...current, { productId, quantity: 1 }] };
    });
  };

  const updateMemberProductQty = (memberId: string, productId: string, quantity: number) => {
    setMemberProducts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).map((p) => p.productId === productId ? { ...p, quantity: Math.max(1, quantity) } : p),
    }));
  };

  const removeMemberProduct = (memberId: string, productId: string) => {
    setMemberProducts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter((p) => p.productId !== productId),
    }));
  };

  const submitCorporateOrder = async () => {
    const payloadMembers = members
      .filter((m) => selectedMembers[m.id])
      .map((m) => ({ organizationMemberId: m.id, products: memberProducts[m.id] || [] }))
      .filter((m) => m.products.length > 0);

    if (payloadMembers.length === 0) {
      toast.error("Selecciona empleados con productos");
      return;
    }

    try {
      setSubmittingCorporateOrder(true);
      const res = await fetch("/api/organizations/corporate-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: payloadMembers, paymentProofUrl: paymentProofUrl || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar compra corporativa");
      toast.success("Compra corporativa enviada para revisión");
      setSelectedMembers({});
      setMemberProducts({});
      setPaymentProofUrl("");
      await loadMembersByTab("aprobados");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo enviar compra corporativa");
    } finally {
      setSubmittingCorporateOrder(false);
    }
  };

  const getMemberSubtotal = (memberId: string) => {
    return (memberProducts[memberId] || []).reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const totalGeneral = members
    .filter((m) => selectedMembers[m.id])
    .reduce((sum, m) => sum + getMemberSubtotal(m.id), 0);

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

      <div className="rounded-2xl border p-4 md:p-5 bg-card space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold">Perfil empresarial</h2>
          {publicProfile && (
            <span className="text-xs px-2 py-1 rounded-full border">Estado: {publicProfile.status}</span>
          )}
        </div>

        {!publicProfile ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crea un perfil empresarial de cortesía para publicar información básica de tu organización.
            </p>
            <button
              onClick={createPublicProfile}
              disabled={publicLoading}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              {publicLoading ? "Creando..." : "Crear perfil empresarial"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Nombre público</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.displayName || ""} onChange={(e) => updateProfileField("displayName", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Razón social</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.legalName || ""} onChange={(e) => updateProfileField("legalName", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">RUC</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.ruc || ""} onChange={(e) => updateProfileField("ruc", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Rubro</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.industry || ""} onChange={(e) => updateProfileField("industry", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Descripción</span>
                <textarea className="w-full border rounded-xl px-3 py-2" value={publicProfile.description || ""} onChange={(e) => updateProfileField("description", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Slogan</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.slogan || ""} onChange={(e) => updateProfileField("slogan", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Teléfono</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.phone || ""} onChange={(e) => updateProfileField("phone", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">WhatsApp</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.whatsapp || ""} onChange={(e) => updateProfileField("whatsapp", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Email</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.email || ""} onChange={(e) => updateProfileField("email", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Website</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.website || ""} onChange={(e) => updateProfileField("website", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Dirección</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.address || ""} onChange={(e) => updateProfileField("address", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Servicios principales</span>
                <textarea className="w-full border rounded-xl px-3 py-2" value={publicProfile.mainServices || ""} onChange={(e) => updateProfileField("mainServices", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Productos principales</span>
                <textarea className="w-full border rounded-xl px-3 py-2" value={publicProfile.mainProducts || ""} onChange={(e) => updateProfileField("mainProducts", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Contacto de seguridad</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.securityContactName || ""} onChange={(e) => updateProfileField("securityContactName", e.target.value)} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Teléfono de seguridad</span>
                <input className="w-full border rounded-xl px-3 py-2" value={publicProfile.securityPhone || ""} onChange={(e) => updateProfileField("securityPhone", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Procedimiento de emergencia</span>
                <textarea className="w-full border rounded-xl px-3 py-2" value={publicProfile.emergencyProcedure || ""} onChange={(e) => updateProfileField("emergencyProcedure", e.target.value)} />
              </label>
              <label className="text-sm space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">Mensaje para empleados</span>
                <textarea className="w-full border rounded-xl px-3 py-2" value={publicProfile.customEmployeeMessage || ""} onChange={(e) => updateProfileField("customEmployeeMessage", e.target.value)} />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Visibilidad por campo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  ["showDisplayName", "Mostrar nombre público"],
                  ["showLegalName", "Mostrar razón social"],
                  ["showRuc", "Mostrar RUC"],
                  ["showIndustry", "Mostrar rubro"],
                  ["showDescription", "Mostrar descripción"],
                  ["showSlogan", "Mostrar slogan"],
                  ["showPhone", "Mostrar teléfono"],
                  ["showWhatsapp", "Mostrar WhatsApp"],
                  ["showEmail", "Mostrar email"],
                  ["showWebsite", "Mostrar website"],
                  ["showAddress", "Mostrar dirección"],
                  ["showMainServices", "Mostrar servicios"],
                  ["showMainProducts", "Mostrar productos"],
                  ["showSecurityContactName", "Mostrar contacto de seguridad"],
                  ["showSecurityPhone", "Mostrar teléfono de seguridad"],
                  ["showEmergencyProcedure", "Mostrar procedimiento"],
                  ["showCustomEmployeeMessage", "Mostrar mensaje a empleados"],
                ].map(([field, label]) => (
                  <label key={field} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(publicProfile[field as keyof CorporatePublicProfile])}
                      onChange={(e) => updateProfileField(field as keyof CorporatePublicProfile, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publicProfile.showCompanyCode}
                  onChange={(e) => updateProfileField("showCompanyCode", e.target.checked)}
                />
                <span>Mostrar código empresarial</span>
              </label>
              <p className="text-xs text-amber-700">
                Recomendado solo para espacios internos donde transiten empleados.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <label className="text-sm space-y-1">
                <span className="text-xs text-muted-foreground">Estado público</span>
                <select
                  value={publicProfile.status}
                  onChange={(e) => updateProfileField("status", e.target.value as CorporatePublicProfile["status"])}
                  className="w-full border rounded-xl px-3 py-2"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="hidden">hidden</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Link público</p>
                <div className="flex gap-2 mt-1">
                  <input className="flex-1 border rounded-xl px-3 py-2 text-sm" readOnly value={`/empresa/${publicProfile.shortCode}`} />
                  <button
                    onClick={async () => {
                      try {
                        const fullUrl = `${window.location.origin}/empresa/${publicProfile.shortCode}`;
                        await navigator.clipboard.writeText(fullUrl);
                        toast.success("Link copiado");
                      } catch {
                        toast.error("No se pudo copiar el link");
                      }
                    }}
                    className="px-3 py-2 border rounded-xl text-sm font-semibold"
                  >
                    Copiar link
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={savePublicProfile}
                disabled={savingPublic || publicLoading}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold"
              >
                {savingPublic ? "Guardando..." : "Guardar perfil empresarial"}
              </button>
            </div>
          </div>
        )}
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

              {tab === "aprobados" && (
                <div className="w-full md:w-[420px] space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={Boolean(selectedMembers[m.id])} onChange={() => toggleMemberSelection(m.id)} />
                    Seleccionar para compra
                  </label>
                  {selectedMembers[m.id] && (
                    <div className="rounded-xl border p-3 space-y-2">
                      <select
                        className="w-full border rounded-lg px-2 py-2 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          addProductToMember(m.id, e.target.value);
                          e.currentTarget.value = "";
                        }}
                      >
                        <option value="">Agregar producto activo...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)})</option>
                        ))}
                      </select>
                      {(memberProducts[m.id] || []).map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.productId} className="flex items-center gap-2 text-sm">
                            <span className="flex-1">{product.name}</span>
                            <input type="number" min={1} value={item.quantity} onChange={(e) => updateMemberProductQty(m.id, item.productId, Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
                            <span className="w-20 text-right">${(product.price * item.quantity).toFixed(2)}</span>
                            <button onClick={() => removeMemberProduct(m.id, item.productId)} className="text-rose-600">Quitar</button>
                          </div>
                        );
                      })}
                      <p className="text-xs font-semibold text-right">Subtotal: ${getMemberSubtotal(m.id).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Sin registros en esta pestaña.</div>}
      </div>

      {tab === "aprobados" && (
        <div className="rounded-2xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Arma la compra corporativa para empleados aprobados sin pagar.</p>
          <label className="text-sm space-y-1 block">
            <span className="text-xs text-muted-foreground">Comprobante (URL opcional)</span>
            <input className="w-full border rounded-xl px-3 py-2" value={paymentProofUrl} onChange={(e) => setPaymentProofUrl(e.target.value)} placeholder="https://..." />
          </label>
          <div className="flex items-center justify-between">
            <p className="font-bold">Total general: ${totalGeneral.toFixed(2)}</p>
            <button onClick={submitCorporateOrder} disabled={submittingCorporateOrder} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
              {submittingCorporateOrder ? "Enviando..." : "Enviar compra corporativa"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
