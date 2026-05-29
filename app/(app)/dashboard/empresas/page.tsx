"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, Loader2, XCircle, Briefcase, Clock, Ban, Archive, ArrowRight, Upload } from "lucide-react";

type CorporateTab =
  | "solicitantes"
  | "aprobados"
  | "pagos_enviados"
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

type RequestStatus =
  | "pending_company_review"
  | "approved_unpaid"
  | "rejected_by_company"
  | "paid_active"
  | "suspended"
  | "archived";

function getStatusInfo(status: RequestStatus) {
  const map: Record<RequestStatus, { icon: React.ReactNode; color: string; title: string; description: string }> = {
    pending_company_review: {
      icon: <Clock className="h-5 w-5" />,
      color: "bg-amber-50 border-amber-200 text-amber-800",
      title: "Solicitud enviada",
      description: "Tu empresa debe revisar y aprobar tu solicitud de vinculación.",
    },
    approved_unpaid: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "bg-blue-50 border-blue-200 text-blue-800",
      title: "Aprobada — pendiente de pago",
      description: "Tu empresa aprobó tu solicitud. Está pendiente de compra/pago corporativo.",
    },
    rejected_by_company: {
      icon: <XCircle className="h-5 w-5" />,
      color: "bg-rose-50 border-rose-200 text-rose-800",
      title: "Solicitud rechazada",
      description: "Tu solicitud fue rechazada por la empresa. Consulta con tu departamento de RRHH.",
    },
    paid_active: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      title: "Vinculación activa",
      description: "Tu cuenta corporativa está activa. Ya puedes usar los servicios de PreRescue ID.",
    },
    suspended: {
      icon: <Ban className="h-5 w-5" />,
      color: "bg-red-50 border-red-200 text-red-800",
      title: "Vinculación suspendida",
      description: "Tu vinculación empresarial está suspendida. Contacta a tu empresa para más información.",
    },
    archived: {
      icon: <Archive className="h-5 w-5" />,
      color: "bg-slate-50 border-slate-200 text-slate-600",
      title: "Vinculación archivada",
      description: "Tu vinculación empresarial fue archivada.",
    },
  };
  return map[status] || map.pending_company_review;
}

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
  const [corporateOrders, setCorporateOrders] = useState<any[]>([]);
  const [companyCodeError, setCompanyCodeError] = useState("");
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [proofFileUploading, setProofFileUploading] = useState(false);
  const [proofFileName, setProofFileName] = useState("");
  const [proofUploadedName, setProofUploadedName] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

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

    if (!paymentProofUrl) {
      toast.error("Debes adjuntar un comprobante de pago antes de enviar.");
      return;
    }

    try {
      setSubmittingCorporateOrder(true);
      const res = await fetch("/api/organizations/corporate-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: payloadMembers, paymentProofUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar compra corporativa");
      toast.success("Compra corporativa enviada para revisión");
      setSelectedMembers({});
      setMemberProducts({});
      setPaymentProofUrl("");
      setProofUploadedName("");
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
      pagos_enviados: null,
      rechazados: "rejected_by_company",
      pagados: "paid_active",
      suspendidos: "suspended",
      archivados: "archivados",
    };

    const status = map[nextTab];
    if (nextTab === "pagos_enviados" || nextTab === "pagados") {
      const ordersRes = await fetch("/api/organizations/corporate-orders");
      const ordersJson = await ordersRes.json();
      if (ordersRes.ok) setCorporateOrders(ordersJson.orders || []);
      setMembers([]);
    } else if (status) {
      const res = await fetch(`/api/organizations/members?status=${status}`);
      const json = await res.json();
      if (res.ok) setMembers(json.members || []);
    }
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyCodeError("");

    if (!form.companyCode.trim()) {
      setCompanyCodeError("Ingresa un código empresarial.");
      return;
    }

    try {
      setSubmittingJoin(true);
      const res = await fetch("/api/organizations/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyCode: form.companyCode.toUpperCase().trim(),
          employeeAge: form.employeeAge ? Number(form.employeeAge) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error || "No se pudo enviar solicitud";
        if (msg.toLowerCase().includes("código") || msg.toLowerCase().includes("code") || msg.toLowerCase().includes("no encontrad")) {
          setCompanyCodeError("El código empresarial ingresado no existe. Verifica con tu empleador.");
        }
        throw new Error(msg);
      }
      toast.success(json.message || "Solicitud enviada");
      setForm({ ...form, companyCode: form.companyCode.toUpperCase().trim() });
      await loadAll();
    } catch (err: any) {
      if (!companyCodeError) toast.error(err?.message || "No se pudo enviar solicitud");
    } finally {
      setSubmittingJoin(false);
    }
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

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("¿Seguro que deseas cancelar esta compra? Los empleados volverán a 'Aprobados sin pagar'.")) return;
    setCancellingOrder(orderId);
    try {
      const res = await fetch(`/api/organizations/corporate-orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cancelar");
      toast.success("Compra cancelada");
      await loadMembersByTab("pagos_enviados");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cancelar");
    } finally {
      setCancellingOrder(null);
    }
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

  // ==================== EMPLOYEE VIEW (not a corporate account admin) ====================
  if (!isCorporateAccount) {
    // If there's an active request, show its status
    if (activeRequest) {
      const statusInfo = getStatusInfo(activeRequest.corporateStatus as RequestStatus);
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Vinculación Empresarial</h1>
              <p className="text-sm text-muted-foreground">Estado de tu solicitud</p>
            </div>
          </div>

          <div className={`rounded-2xl border-2 p-5 ${statusInfo.color}`}>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                {statusInfo.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="font-black text-lg">{statusInfo.title}</h2>
                <p className="text-sm opacity-80">{statusInfo.description}</p>
                {activeRequest.organization && (
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold bg-white/40 rounded-xl px-3 py-2">
                    <Building2 className="h-4 w-4" />
                    <span>{activeRequest.organization.displayName || activeRequest.organization.legalName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeRequest.corporateStatus === "rejected_by_company" && (
            <div className="rounded-2xl border-2 border-dashed border-rose-200 p-5 bg-rose-50/30">
              <p className="text-sm font-semibold text-rose-700 mb-3">
                ¿Quieres intentar de nuevo con otra empresa?
              </p>
              <JoinForm
                form={form}
                setForm={setForm}
                companyCodeError={companyCodeError}
                submittingJoin={submittingJoin}
                handleSubmitJoin={handleSubmitJoin}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Vincularme a una empresa</h1>
            <p className="text-sm text-muted-foreground">Conecta tu cuenta con tu empleador</p>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-indigo-900">
                ¿Tu empresa trabaja con PreRescue ID?
              </p>
              <p className="text-sm text-indigo-700/70 mt-1">
                Ingresa el código empresarial que te proporcionaron para solicitar tu vinculación y acceder a los beneficios corporativos.
              </p>
            </div>
          </div>
        </div>

        <JoinForm
          form={form}
          setForm={setForm}
          companyCodeError={companyCodeError}
          submittingJoin={submittingJoin}
          handleSubmitJoin={handleSubmitJoin}
        />
      </div>
    );
  }

  // ==================== CORPORATE ADMIN VIEW ====================
  const tabs: { key: CorporateTab; label: string }[] = [
    { key: "solicitantes", label: "Solicitantes" },
    { key: "aprobados", label: "Aprobados sin pagar" },
    { key: "pagos_enviados", label: "Pagos enviados" },
    { key: "pagados", label: "Pagados / activos" },
    { key: "rechazados", label: "Rechazados" },
    { key: "archivados", label: "Archivados" },
    { key: "suspendidos", label: "Suspendidos" },
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

      {tab === "pagos_enviados" && (
        <div className="space-y-4">
          <div className="rounded-2xl border p-4 bg-blue-50/30 border-blue-200">
            <p className="text-xs font-semibold text-blue-700">
              Compras corporativas enviadas con comprobante y pendientes de revisión por PreRescue ID.
            </p>
          </div>
          {corporateOrders.filter(o =>
            o.paymentStatus === "under_review" || o.adminReviewStatus === "pending"
          ).length === 0 ? (
            <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Sin pagos enviados pendientes de revisión.</div>
          ) : (
            corporateOrders.filter(o =>
              o.paymentStatus === "under_review" || o.adminReviewStatus === "pending"
            ).map((order: any) => (
              <div key={order.id} className="rounded-2xl border p-4 bg-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-sm">Orden #{order.orderNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">En revisión</span>
                    <p className="font-black text-primary">${order.amount?.toFixed(2)}</p>
                  </div>
                </div>
                {order.corporateEmployeeItems?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1 border-t border-dashed border-slate-100">
                    <span className="font-semibold">{item.organizationMember?.profile?.firstName || "—"} {item.organizationMember?.profile?.lastName || ""}</span>
                    <span>·</span>
                    <span>{item.product?.name || "Producto"} x{item.quantity}</span>
                    <span>·</span>
                    <span>${item.subtotal?.toFixed(2)}</span>
                  </div>
                ))}
                {order.paymentProofUrl && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Comprobante adjuntado
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "pagados" && (
        <div className="space-y-4">
          {members.map((m) => {
            const memberOrders = corporateOrders.filter((o: any) =>
              o.corporateEmployeeItems?.some((item: any) => item.organizationMemberId === m.id)
            );
            const allItems = memberOrders.flatMap((o: any) => o.corporateEmployeeItems || []);
            const profileComplete = Boolean(m.profile?.firstName && m.profile?.lastName && m.profile?.bloodType && m.profile?.bloodType !== "Pendiente");
            const fulfillmentStatus = allItems[0]?.fulfillmentStatus || "pending_assignment";
            const chip = allItems[0]?.chip;

            return (
              <div key={m.id} className="rounded-2xl border p-4 bg-card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{m.profile?.firstName} {m.profile?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{m.profile?.user?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {allItems.map((item: any) => (
                        <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {item.product?.name || "Producto"} x{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full border font-semibold ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      Perfil: {profileComplete ? "Completado" : "Pendiente"}
                    </span>
                    <span className={`px-2 py-1 rounded-full border font-semibold ${
                      fulfillmentStatus === "activated" ? "bg-emerald-50 text-emerald-700" :
                      fulfillmentStatus === "assigned_reserved" ? "bg-blue-50 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      Chip: {fulfillmentStatus === "activated" ? "Activado" :
                             fulfillmentStatus === "assigned_reserved" ? "Asignado" : "Pendiente"}
                    </span>
                    {chip?.shortCode && (
                      <span className="px-2 py-1 rounded-full border bg-slate-50 text-slate-600 font-mono">
                        {chip.shortCode}
                      </span>
                    )}
                    {allItems[0]?.activatedAt && (
                      <span className="px-2 py-1 rounded-full border bg-slate-50 text-slate-600">
                        Act.: {new Date(allItems[0].activatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {members.length === 0 && <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Sin empleados pagados/activos.</div>}
        </div>
      )}

      {(tab === "suspendidos" || tab === "archivados") && (
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

          <div className={`p-4 rounded-xl border-2 transition-all ${paymentProofUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
            {paymentProofUrl ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700 truncate">
                    {proofUploadedName || "Comprobante adjuntado"}
                  </span>
                </div>
                <button
                  onClick={() => { setPaymentProofUrl(""); setProofUploadedName(""); }}
                  className="text-xs text-rose-600 font-semibold hover:underline shrink-0"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comprobante de pago</p>
                <p className="text-[10px] text-muted-foreground">Selecciona una imagen o captura del comprobante.</p>
                <div className="flex items-center gap-3">
                  <input
                    id="corporate-proof-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={proofFileUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("El archivo es muy pesado (máx 5MB)");
                        return;
                      }
                      setProofFileName(file.name);
                      setProofFileUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("type", "payment");
                        formData.append("bucket", "payment-proofs");
                        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                        if (!uploadRes.ok) throw new Error("Error al subir archivo");
                        const { url } = await uploadRes.json();
                        setPaymentProofUrl(url);
                        setProofUploadedName(file.name);
                        toast.success("Comprobante adjuntado");
                      } catch {
                        toast.error("Error al subir el comprobante");
                      } finally {
                        setProofFileUploading(false);
                      }
                    }}
                  />
                  <label
                    htmlFor="corporate-proof-upload"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all"
                  >
                    {proofFileUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Seleccionar archivo</>
                    )}
                  </label>
                </div>
                <p className="text-[9px] text-muted-foreground">Máx 5MB. Formatos: JPG, PNG, WebP.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="font-bold">Total general: ${totalGeneral.toFixed(2)}</p>
            <button onClick={submitCorporateOrder} disabled={submittingCorporateOrder || !paymentProofUrl} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">
              {submittingCorporateOrder ? "Enviando..." : "Enviar compra corporativa"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SHARED JOIN FORM COMPONENT ====================
function JoinForm({
  form,
  setForm,
  companyCodeError,
  submittingJoin,
  handleSubmitJoin,
}: {
  form: {
    companyCode: string;
    firstName: string;
    lastName: string;
    employeeNationalId: string;
    employeeAge: string;
    employeePhone: string;
    employeePosition: string;
    employeeDepartment: string;
    employeeInternalId: string;
    employeeNote: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  companyCodeError: string;
  submittingJoin: boolean;
  handleSubmitJoin: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <form onSubmit={handleSubmitJoin} className="rounded-2xl border p-5 bg-card space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">
          Código empresarial <span className="text-rose-500">*</span>
        </label>
        <input
          className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-bold tracking-widest text-center uppercase ${
            companyCodeError
              ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500"
              : "border-indigo-200 bg-indigo-50/30 focus:border-indigo-400 focus:ring-indigo-400"
          } outline-none transition-all`}
          placeholder="Ejemplo: ACP2026"
          value={form.companyCode}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
            setForm((prev) => ({ ...prev, companyCode: val }));
            if (companyCodeError) setForm((prev) => ({ ...prev, companyCode: val }));
          }}
          maxLength={20}
          required
          autoComplete="off"
        />
        {companyCodeError && (
          <p className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1">
            <XCircle className="h-3.5 w-3.5" />
            {companyCodeError}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          El código que te proporcionó tu empleador. Se convertirá a mayúsculas automáticamente.
        </p>
      </div>

      <div className="border-t border-dashed border-slate-200" />

      <div className="space-y-1.5">
        <p className="text-sm font-semibold">Tus datos personales</p>
        <p className="text-xs text-muted-foreground">Completa con la información que tu empresa necesita.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Cédula / ID</label>
          <input
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="8-000-0000"
            value={form.employeeNationalId}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeNationalId: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Edad</label>
          <input
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="25"
            type="number"
            min={1}
            max={120}
            value={form.employeeAge}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeAge: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
          <input
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="+507 6000-0000"
            value={form.employeePhone}
            onChange={(e) => setForm((prev) => ({ ...prev, employeePhone: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Cargo</label>
          <input
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="Ej: Operador, Supervisor"
            value={form.employeePosition}
            onChange={(e) => setForm((prev) => ({ ...prev, employeePosition: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Departamento</label>
          <input
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="Ej: Logística, RRHH"
            value={form.employeeDepartment}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeDepartment: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ID laboral interno</label>
          <input
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="Opcional"
            value={form.employeeInternalId}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeInternalId: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nota opcional</label>
        <textarea
          className="w-full border rounded-xl px-3 py-2.5"
          placeholder="Cualquier información adicional que quieras compartir con tu empresa..."
          rows={2}
          value={form.employeeNote}
          onChange={(e) => setForm((prev) => ({ ...prev, employeeNote: e.target.value }))}
        />
      </div>

      <button
        type="submit"
        disabled={submittingJoin}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-sm hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {submittingJoin ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando solicitud...
          </>
        ) : (
          <>
            Enviar solicitud
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Tu solicitud será enviada a la empresa para que la revise. No compartimos datos médicos en este proceso.
      </p>
    </form>
  );
}