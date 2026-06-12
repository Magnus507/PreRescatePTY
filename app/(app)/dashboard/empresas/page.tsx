"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Building2, CheckCircle2, Loader2, XCircle, Briefcase, Clock, Ban, Archive, ArrowRight, Upload, Pencil, Smartphone, ExternalLink, Plus, Save, Activity, AlertCircle, UserRound, ShieldCheck, Users, ShoppingCart, Package, Minus, PlusCircle, Copy, ChevronLeft } from "lucide-react";
import { MedicalProfileForm } from "@/components/forms/MedicalProfileForm";

type CorporateTab =
  | "solicitantes"
  | "solicitudes"
  | "aprobados"
  | "pagos_enviados"
  | "rechazados"
  | "pagados"
  | "suspendidos"
  | "archivados";

type MemberProfile = {
  firstName?: string;
  lastName?: string;
  bloodType?: string | null;
  user?: { email?: string } | null;
};

type CorporateMember = {
  id: string;
  employeeNationalId?: string | null;
  employeeAge?: string | null;
  employeePhone?: string | null;
  employeePosition?: string | null;
  employeeDepartment?: string | null;
  employeeInternalId?: string | null;
  employeeNote?: string | null;
  profile?: MemberProfile | null;
  corporateStatus?: string | null;
};

type CorporateProduct = {
  id: string;
  name?: string;
  price?: number;
  isActive?: boolean;
  requiresPersonalization?: boolean;
  productType?: string;
  estimatedProductionTime?: string;
};

type MemberProductSelection = {
  productId: string;
  quantity: number;
  note: string;
};

type CorporateContact = {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
};

type CorporateContactForm = Omit<CorporateContact, "id">;

type CompanyRequestItem = {
  id: string;
  quantity: number;
  subtotal?: number;
  unitPrice?: number;
  note?: string;
  product?: { name?: string };
};

type CompanyRequest = {
  id: string;
  status: string;
  orderId?: string | null;
  items?: CompanyRequestItem[];
  organizationMember?: {
    profile?: MemberProfile | null;
    employeePosition?: string | null;
    employeeDepartment?: string | null;
    employeeNationalId?: string | null;
  };
  rejectionReason?: string;
  createdAt?: string;
  companyReviewedAt?: string;
};

type CorporateOrderItem = {
  id: string;
  organizationMemberId: string;
  quantity: number;
  subtotal?: number;
  fulfillmentStatus?: string | null;
  chip?: { shortCode?: string } | null;
  activatedAt?: string | null;
  product?: { id?: string; name?: string };
  organizationMember?: {
    profile?: MemberProfile | null;
    employeePosition?: string | null;
    employeeDepartment?: string | null;
    employeeNationalId?: string | null;
  };
};

type CorporateOrder = {
  id: string;
  paymentStatus?: string;
  adminReviewStatus?: string;
  orderType?: string;
  orderStatus?: string;
  orderNumber?: string;
  amount?: number;
  createdAt?: string;
  corporateEmployeeItems?: CorporateOrderItem[];
  paymentProofUrl?: string;
  corporateDeliveryStatus?: string;
  estimatedDeliveryDate?: string;
  deliveryNote?: string;
};

type CorporateChip = {
  shortCode: string;
  fulfillmentStatus?: string | null;
  status?: string | null;
};

type ApiObjectResponse<T> = T & {
  error?: string;
  message?: string;
  url?: string;
  orderNumber?: string;
};

type MembersResponse = ApiObjectResponse<{ members: CorporateMember[] }>;

type ProductsResponse = ApiObjectResponse<{ products: CorporateProduct[] }>;
type CompanyRequestsResponse = ApiObjectResponse<{ requests: CompanyRequest[] }>;
type OrdersResponse = ApiObjectResponse<{ orders: CorporateOrder[] }>;

type MyStatusResponse = ApiObjectResponse<MyStatus>;

type ActiveRequestOrderItem = {
  id: string;
  quantity?: number;
  product?: { name?: string; productType?: string };
  chip?: CorporateChip | null;
  fulfillmentStatus?: string | null;
};

type ActiveRequest = {
  corporateStatus: string;
  corporateProfile?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  corporateOrderItems?: ActiveRequestOrderItem[];
  organization?: { displayName?: string; legalName?: string };
};

type MyStatus = {
  requests?: ActiveRequest[];
};

// ApiListResponse removed (unused in this file)

type CorporateProfilePayload = typeof emptyProfileForm & {
  enableSpecialAssistance?: boolean;
  enableSafeReturn?: boolean;
  hasCognitiveImpairment?: boolean;
  hasWanderingRisk?: boolean;
  isNonVerbal?: boolean;
  communicationAssistance?: string;
  safeReturnInstructions?: string;
  safeReturnLocationName?: string;
  safeReturnAddress?: string;
  safeReturnLat?: string | number | null;
  safeReturnLng?: string | number | null;
  safeReturnContactName?: string;
  safeReturnPhone?: string;
  showVulnerabilityStatusPublic?: boolean;
  showCommunicationStatusPublic?: boolean;
  showSafeReturnPublic?: boolean;
  showSafeReturnLocationPublic?: boolean;
  address?: string;
  city?: string;
};
// CorpEditFormField removed (unused in this file)

type JoinFormState = {
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

const emptyProfileForm = {
  firstName: "", lastName: "", displayNamePublic: "", birthDate: "",
  sex: "", bloodType: "O+", allergies: "", chronicConditions: "",
  medications: "", additionalNotes: "", phone: "",
  nationalId: "",
  isInsured: false,
  insuranceProvider: "",
  insurancePolicyNumber: "",
  preferredHospital: "",
  insuranceEmergencyPhone: "",
  primaryDoctorName: "",
  primaryDoctorPhone: "",
  showInsuranceProviderPublic: false,
  showPreferredHospitalPublic: false,
  showPrimaryDoctorPublic: false,
  showPrimaryDoctorPhonePublic: false,
  showAdditionalNotesPublic: false,
};

const CORP_RELATIONSHIPS = ["Madre", "Padre", "Cónyuge", "Hermano/a", "Hijo/a", "Abuelo/a", "Amigo/a", "Otro"];
const emptyCorpContactForm = { fullName: "", relationship: "", phone: "", email: "" };

interface CorpFullProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayNamePublic: string | null;
  bloodType: string;
  phone: string | null;
  allergies: string;
  chronicConditions: string;
}

export default function EmpresasPage() {
  const [loading, setLoading] = useState(true);
  const [isCorporateAccount, setIsCorporateAccount] = useState(false);

  const [myStatus, setMyStatus] = useState<MyStatus | null>(null);
  const [members, setMembers] = useState<CorporateMember[]>([]);
  const [tab, setTab] = useState<CorporateTab>("aprobados");
  const [products, setProducts] = useState<CorporateProduct[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [memberProducts, setMemberProducts] = useState<Record<string, MemberProductSelection[]>>({});
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [submittingCorporateOrder, setSubmittingCorporateOrder] = useState(false);
  const [corporateOrders, setCorporateOrders] = useState<CorporateOrder[]>([]);
  const [companyCodeError, setCompanyCodeError] = useState("");
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [proofFileUploading, setProofFileUploading] = useState(false);
  const [proofUploadedName, setProofUploadedName] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  // Corporate profile editor
  const [showCorpEditor, setShowCorpEditor] = useState(false);
  const [corpEditForm, setCorpEditForm] = useState<CorporateProfilePayload>({ ...emptyProfileForm });
  const [corpEditProfileId, setCorpEditProfileId] = useState<string | null>(null);
  const [corpEditSaving, setCorpEditSaving] = useState(false);
  const [corpEditLoading, setCorpEditLoading] = useState(false);
  const [corpEditError, setCorpEditError] = useState("");
  // Full decrypted corporate profile for display
  const [corpFullProfile, setCorpFullProfile] = useState<CorpFullProfile | null>(null);

  // Corporate emergency contacts
  const [corpContacts, setCorpContacts] = useState<CorporateContact[]>([]);
  const [corpContactForm, setCorpContactForm] = useState<CorporateContactForm>({ ...emptyCorpContactForm });
  const [savingCorpContact, setSavingCorpContact] = useState(false);
  const [deletingCorpContactId, setDeletingCorpContactId] = useState<string | null>(null);
  const [showCorpContacts, setShowCorpContacts] = useState(false);

  // Employee product requests UI
  const [showProductRequest, setShowProductRequest] = useState(false);
  const [showAllCorporateProducts, setShowAllCorporateProducts] = useState(false);
  const [showAllProductRequests, setShowAllProductRequests] = useState(false);
  const [corporateActivationCode, setCorporateActivationCode] = useState("");
  const [activatingCorporateChip, setActivatingCorporateChip] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CorporateProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, { productId: string; quantity: number; note: string }>>({});
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState<CompanyRequest[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);

  const [form, setForm] = useState<JoinFormState>({
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

  const loadCorpFullProfile = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}`);
      if (!res.ok) return;
      const json = await res.json();
      const p = json.profile;
      if (p) {
        setCorpFullProfile({
          id: p.id,
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          displayNamePublic: p.displayNamePublic || null,
          bloodType: p.bloodType || "—",
          phone: p.phone || null,
          allergies: p.allergies || "",
          chronicConditions: p.chronicConditions || "",
        });
      }
    } catch {
      // silent — card will show minimal data from my-status
    }
  }, []);

  const loadCorpContacts = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts`);
      if (res.ok) {
        const data = await res.json();
        setCorpContacts(data.contacts || []);
      }
    } catch {
      // silent
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const my = await fetch("/api/organizations/my-status");
      const myJson = await my.json() as MyStatusResponse;
      if (my.ok) {
        setMyStatus(myJson);
        // Load full decrypted corporate profile
        const active = (myJson.requests || []).find((r) =>
          ["pending_company_review", "approved_unpaid", "paid_active", "suspended", "archived"].includes(r.corporateStatus)
        );
        if (active?.corporateProfile?.id) {
          loadCorpFullProfile(active.corporateProfile.id);
          loadCorpContacts(active.corporateProfile.id);
        }
      }

      // Only fetch members if user has an organization affiliation
      const hasOrg = myJson.requests && myJson.requests.length > 0;
      let corp: Response | null = null;
      if (hasOrg) {
        corp = await fetch("/api/organizations/members?status=approved_unpaid");
      }
      if (corp?.ok) {
        setIsCorporateAccount(true);
        const corpJson = await corp.json() as MembersResponse;
        setMembers(corpJson.members || []);
        const productsRes = await fetch("/api/products");
        const productsJson = await productsRes.json() as ProductsResponse;
        if (productsRes.ok) setProducts((productsJson.products || []).filter((p: { isActive?: boolean }) => p.isActive));
      } else {
        setIsCorporateAccount(false);
      }
    } catch {
      toast.error("Error al cargar módulo empresarial");
    } finally {
      setLoading(false);
    }
  }, [loadCorpFullProfile, loadCorpContacts]);

  const handleAddCorpContact = async () => {
    const profileId = activeRequest?.corporateProfile?.id;
    if (!profileId) {
      toast.error("No se encontró el perfil empresarial");
      return;
    }
    if (!corpContactForm.fullName.trim() || !corpContactForm.relationship.trim() || !corpContactForm.phone.trim()) {
      toast.error("Nombre, relación y teléfono son obligatorios");
      return;
    }
    setSavingCorpContact(true);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpContactForm),
      });
      const data = await res.json();
      if (res.ok) {
        setCorpContacts((prev) => [...prev, data.contact]);
        setCorpContactForm({ ...emptyCorpContactForm });
        toast.success("Contacto añadido");
      } else {
        toast.error(data.error || "Error al añadir contacto");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingCorpContact(false);
    }
  };

  const handleDeleteCorpContact = async (contactId: string) => {
    const profileId = activeRequest?.corporateProfile?.id;
    if (!profileId) {
      toast.error("No se encontró el perfil empresarial");
      return;
    }
    if (!confirm("¿Eliminar este contacto de emergencia?")) return;
    setDeletingCorpContactId(contactId);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${profileId}/contacts?id=${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCorpContacts((prev) => prev.filter((c) => c.id !== contactId));
        toast.success("Contacto eliminado");
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeletingCorpContactId(null);
    }
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
      return { ...prev, [memberId]: [...current, { productId, quantity: 1, note: "" }] };
    });
  };

  const removeMemberProduct = (memberId: string, productId: string) => {
    setMemberProducts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter((p: { productId?: string }) => p.productId !== productId),
    }));
  };

  const updateMemberProductQty = (memberId: string, productId: string, qty: number) => {
    setMemberProducts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).map((p: MemberProductSelection) => p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p),
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar compra corporativa");
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
  }, [loadAll]);

  // Load catalog when employee becomes paid_active
  const [shouldLoadCatalog, setShouldLoadCatalog] = useState(false);
  useEffect(() => {
    if (!shouldLoadCatalog) return;
    const load = async () => {
      try {
        const [prodRes, reqRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/organizations/product-requests/my"),
        ]);
          if (prodRes.ok) {
            const prodJson = await prodRes.json() as ProductsResponse;
          setCatalogProducts((prodJson.products || []).filter((p: { isActive?: boolean }) => p.isActive));
        }
        if (reqRes.ok) {
          const reqJson = await reqRes.json() as CompanyRequestsResponse;
          setMyRequests(reqJson.requests || []);
        }
      } catch {
        // silent
      } finally {
        setCatalogLoading(false);
        setMyRequestsLoading(false);
      }
    };
    load();
  }, [shouldLoadCatalog]);

  // Company product requests
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);
  const [companyRequestsLoading, setCompanyRequestsLoading] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Order creation from requests
  const [selectedApprovedRequests, setSelectedApprovedRequests] = useState<Record<string, boolean>>({});
  const [orderProofUploading, setOrderProofUploading] = useState(false);
  const [orderProofUrl, setOrderProofUrl] = useState("");
  const [orderProofName, setOrderProofName] = useState("");
  const [submittingOrderFromRequests, setSubmittingOrderFromRequests] = useState(false);

  const loadCompanyRequests = async () => {
    setCompanyRequestsLoading(true);
    try {
      const res = await fetch("/api/organizations/product-requests");
      if (res.ok) {
        const data = await res.json();
        setCompanyRequests(data.requests || []);
      }
    } catch {
      toast.error("Error al cargar solicitudes");
    } finally {
      setCompanyRequestsLoading(false);
    }
  };

  const selectedApprovedRequestIds = useMemo(() => {
    return Object.entries(selectedApprovedRequests)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [selectedApprovedRequests]);

  const selectedApprovedTotal = useMemo(() => {
    return companyRequests
      .filter((r) => selectedApprovedRequestIds.includes(r.id))
      .reduce((sum: number, r) => {
        return sum + (r.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
      }, 0);
  }, [companyRequests, selectedApprovedRequestIds]);

  const toggleApprovedRequest = (requestId: string) => {
    setSelectedApprovedRequests((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
  };

  const selectAllApproved = () => {
    const approved = companyRequests.filter((r) => r.status === "approved_pending_payment" && !r.orderId);
    const allSelected = approved.every((r) => selectedApprovedRequests[r.id]);
    if (allSelected) {
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(selectedApprovedRequests)) {
        if (!approved.find((r) => r.id === key)) next[key] = true;
      }
      setSelectedApprovedRequests(next);
    } else {
      const next: Record<string, boolean> = {};
      for (const r of approved) next[r.id] = true;
      setSelectedApprovedRequests(next);
    }
  };

  const handleSubmitOrderFromRequests = async () => {
    if (selectedApprovedRequestIds.length === 0) {
      toast.error("Selecciona al menos una solicitud aprobada");
      return;
    }
    if (!orderProofUrl) {
      toast.error("Debes adjuntar un comprobante de pago");
      return;
    }
    setSubmittingOrderFromRequests(true);
    try {
      const res = await fetch("/api/organizations/corporate-orders/from-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: selectedApprovedRequestIds,
          paymentProofUrl: orderProofUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear la orden");
      toast.success(`Orden ${json.orderNumber} creada — pago enviado a revisión`);
      setSelectedApprovedRequests({});
      setOrderProofUrl("");
      setOrderProofName("");
      await loadCompanyRequests();
      await loadMembersByTab("pagos_enviados");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la orden");
    } finally {
      setSubmittingOrderFromRequests(false);
    }
  };

  const handleReviewRequest = async (requestId: string, action: "approve" | "reject", reason?: string) => {
    setReviewingRequest(requestId);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "reject" && reason) body.rejectionReason = reason;
      const res = await fetch(`/api/organizations/product-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al procesar solicitud");
      toast.success(action === "approve" ? "Solicitud aprobada" : "Solicitud rechazada");
      await loadCompanyRequests();
      setShowRejectModal(null);
      setRejectReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar solicitud");
    } finally {
      setReviewingRequest(null);
    }
  };

  const loadMembersByTab = async (nextTab: CorporateTab) => {
    setMembers([]);
    const map: Record<CorporateTab, string | null> = {
      solicitantes: "pending_company_review",
      solicitudes: null,
      aprobados: "approved_unpaid",
      pagos_enviados: null,
      rechazados: "rejected_by_company",
      pagados: "paid_active",
      suspendidos: "suspended",
      archivados: "archived",
    };

    const status = map[nextTab];
    if (nextTab === "solicitudes") {
      await loadCompanyRequests();
    } else if (nextTab === "pagos_enviados" || nextTab === "pagados") {
      const ordersRes = await fetch("/api/organizations/corporate-orders");
      const ordersJson = await ordersRes.json();
      if (ordersRes.ok) setCorporateOrders(ordersJson.orders || []);
    } else if (nextTab === "aprobados") {
      const [membersRes, ordersRes] = await Promise.all([
        fetch(`/api/organizations/members?status=${status}`),
        fetch("/api/organizations/corporate-orders"),
      ]);
      const membersJson = await membersRes.json() as MembersResponse;
      const ordersJson = await ordersRes.json() as OrdersResponse;
      if (ordersRes.ok) setCorporateOrders(ordersJson.orders || []);

      if (membersRes.ok) {
        const pendingOrders = (ordersJson.orders || []).filter(
          (o) =>
            o.orderType === "corporate_employee_purchase" &&
            (o.adminReviewStatus === "pending" || o.paymentStatus === "under_review") &&
            o.orderStatus !== "cancelled" &&
            o.paymentStatus !== "rejected"
        );
        const pendingMemberIds = new Set<string>();
        for (const order of pendingOrders) {
          for (const item of order.corporateEmployeeItems || []) {
            pendingMemberIds.add(item.organizationMemberId);
          }
        }
        const filtered = (membersJson.members || []).filter(
          (m) => !pendingMemberIds.has(m.id)
        );
        setMembers(filtered);
      }
    } else if (status) {
      const res = await fetch(`/api/organizations/members?status=${status}`);
      const json = await res.json() as MembersResponse;
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
    } catch (err: unknown) {
      if (!companyCodeError) toast.error(err instanceof Error ? err.message : "No se pudo enviar solicitud");
    } finally {
      setSubmittingJoin(false);
    }
  };

  const handleDecision = async (id: string, action: "approve" | "reject" | "archive" | "restore" | "unsuspend" | "delete_forever") => {
    const confirmMessages: Record<string, string> = {
      reject: "¿Seguro que deseas rechazar este colaborador? Esto solo afecta el vínculo corporativo. La cuenta personal del usuario no será afectada.",
      archive: "¿Seguro que deseas eliminar/despedir a este colaborador de la empresa? Se desactivarán sus beneficios corporativos, perfil empresarial y chip corporativo de esta empresa. Su cuenta personal y otros beneficios no serán afectados.",
      restore: "¿Restaurar este colaborador? Volverá al estado activo. Su cuenta personal no se verá afectada.",
      delete_forever: "¿Eliminar definitivamente este colaborador? Se eliminará el vínculo empresarial y los datos corporativos de esta empresa. No se eliminará la cuenta personal del usuario. Esta acción no se puede deshacer.",
    };
    const msg = confirmMessages[action];
    if (msg && !confirm(msg)) return;
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setCancellingOrder(null);
    }
  };

  const openCorporateProfileEditor = async () => {
    const active = activeRequest;
    const corpProfileId = active?.corporateProfile?.id;
    if (!corpProfileId) {
      toast.error("No se encontró perfil empresarial");
      return;
    }
      setCorpEditProfileId(corpProfileId);
      setCorpEditLoading(true);
      setCorpEditError("");
      setCorpEditForm({ ...emptyProfileForm });
      setShowCorpEditor(true);
      setCorpContactForm({ ...emptyCorpContactForm });
      loadCorpContacts(corpProfileId);
      try {
        const res = await fetch(`/api/users/perfiles-medicos/${corpProfileId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No se pudo cargar");
        const p = json.profile;
        setCorpEditForm({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          displayNamePublic: p.displayNamePublic || "",
          birthDate: p.birthDate ? new Date(p.birthDate).toISOString().split("T")[0] : "",
          sex: p.sex || "",
          bloodType: p.bloodType || "O+",
          allergies: p.allergies || "",
          chronicConditions: p.chronicConditions || "",
          medications: p.medications || "",
          additionalNotes: p.additionalNotes || "",
          phone: p.phone || "",
          nationalId: p.nationalId || "",
          isInsured: !!p.isInsured,
          insuranceProvider: p.insuranceProvider || "",
          insurancePolicyNumber: p.insurancePolicyNumber || "",
          preferredHospital: p.preferredHospital || "",
          insuranceEmergencyPhone: p.insuranceEmergencyPhone || "",
          primaryDoctorName: p.primaryDoctorName || "",
          primaryDoctorPhone: p.primaryDoctorPhone || "",
          showInsuranceProviderPublic: !!p.showInsuranceProviderPublic,
          showPreferredHospitalPublic: !!p.showPreferredHospitalPublic,
          showPrimaryDoctorPublic: !!p.showPrimaryDoctorPublic,
          showPrimaryDoctorPhonePublic: !!p.showPrimaryDoctorPhonePublic,
          showAdditionalNotesPublic: !!p.showAdditionalNotesPublic,
        });
        setCorpEditError(""); // Clear any previous error on success
      } catch (err: unknown) {
        setCorpEditForm({ ...emptyProfileForm }); // Do NOT keep stale data on error
        const message = err instanceof Error ? err.message : "Error al cargar perfil";
        setCorpEditError(message);
        toast.error(message || "Error al cargar perfil empresarial");
      } finally {
        setCorpEditLoading(false);
      }
  };

  const handleCorpEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corpEditProfileId) return;
    if (corpEditLoading) {
      toast.error("Espera a que termine de cargar el perfil antes de guardar.");
      return;
    }
    setCorpEditError("");
    setCorpEditSaving(true);
    try {
      const res = await fetch(`/api/users/perfiles-medicos/${corpEditProfileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpEditForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      toast.success("Perfil empresarial actualizado");
      setShowCorpEditor(false);
      // Reload
      const my = await fetch("/api/organizations/my-status");
      const myJson = await my.json() as MyStatusResponse;
      if (my.ok) {
        setMyStatus(myJson);
        const active = (myJson.requests || []).find((r) =>
          ["pending_company_review", "approved_unpaid", "paid_active", "suspended", "archived"].includes(r.corporateStatus)
        );
        if (active?.corporateProfile?.id) loadCorpFullProfile(active.corporateProfile.id);
      }
    } catch (err: unknown) {
      setCorpEditError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setCorpEditSaving(false);
    }
  };

  const activeRequest = useMemo(() => {
    const reqs = myStatus?.requests || [];
    return reqs.find((r) =>
      ["pending_company_review", "approved_unpaid", "paid_active", "suspended", "archived"].includes(r.corporateStatus)
    );
  }, [myStatus]);

  // Detect when employee goes from no-active to paid_active and load catalog
  // This must be after activeRequest declaration to avoid "used before declaration" error
  const prevActiveStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!isCorporateAccount && activeRequest) {
      const status = activeRequest.corporateStatus;
      if (status === "paid_active" && prevActiveStatus.current !== "paid_active") {
        setCatalogLoading(true);
        setMyRequestsLoading(true);
        setShouldLoadCatalog(true);
      }
      prevActiveStatus.current = status;
    }
  }, [isCorporateAccount, activeRequest]);

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
    if (activeRequest) {
      const statusInfo = getStatusInfo(activeRequest.corporateStatus as RequestStatus);
      const corpProfile = activeRequest.corporateProfile;
      const isPaidActive = activeRequest.corporateStatus === "paid_active";
      const canEdit = isPaidActive;
      const corporateChipItem = (activeRequest.corporateOrderItems ?? []).find((item) => item?.chip) || null;
      const corporateChip = corporateChipItem?.chip || null;
      const corporateFulfillmentStatus = corporateChipItem?.fulfillmentStatus || null;
      const hasCorporateOrderItems = (activeRequest.corporateOrderItems ?? []).length > 0;
      
      // Calcular estado de protección empresarial (not used directly here)
      const isDisabled = !isPaidActive;
      const profile = corpFullProfile;
      const initials = profile?.firstName && profile?.lastName
        ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
        : "EM";

      const loadCatalogAndRequests = async () => {
        if (!isPaidActive) return;
        setCatalogLoading(true);
        setMyRequestsLoading(true);
        try {
          const [prodRes, reqRes] = await Promise.all([
            fetch("/api/products"),
            fetch("/api/organizations/product-requests/my"),
          ]);
          if (prodRes.ok) {
            const prodJson = await prodRes.json();
            setCatalogProducts((prodJson.products || []).filter((p: { isActive?: boolean }) => p.isActive));
          }
          if (reqRes.ok) {
            const reqJson = await reqRes.json();
            setMyRequests(reqJson.requests || []);
          }
        } catch {
          // silent
        } finally {
          setCatalogLoading(false);
          setMyRequestsLoading(false);
        }
      };

      const handleOpenProductRequest = () => {
        setSelectedItems({});
        loadCatalogAndRequests();
        setShowProductRequest(true);
      };

      const handleToggleProduct = (product: CorporateProduct & { requiresPersonalization?: boolean; productType?: string }) => {
        if (selectedItems[product.id]) {
          const next = { ...selectedItems };
          delete next[product.id];
          setSelectedItems(next);
        } else {
          setSelectedItems({
            ...selectedItems,
            [product.id]: { productId: product.id, quantity: 1, note: "" },
          });
        }
      };

      const handleItemQty = (productId: string, qty: number) => {
        setSelectedItems((prev) => ({
          ...prev,
          [productId]: { ...prev[productId], quantity: Math.max(1, qty) },
        }));
      };

      const handleItemNote = (productId: string, note: string) => {
        setSelectedItems((prev) => ({
          ...prev,
          [productId]: { ...prev[productId], note },
        }));
      };

      const handleSubmitRequest = async () => {
        const items = Object.values(selectedItems).filter((i) => i.quantity > 0);
        if (items.length === 0) {
          toast.error("Selecciona al menos un producto.");
          return;
        }
        setSubmittingRequest(true);
        try {
          const res = await fetch("/api/organizations/product-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error al enviar solicitud");
          toast.success("Solicitud enviada a tu empresa.");
          setShowProductRequest(false);
          setSelectedItems({});
          await loadCatalogAndRequests();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Error al enviar solicitud");
        } finally {
          setSubmittingRequest(false);
        }
      };

      const requestTotal = Object.values(selectedItems).reduce((sum, item) => {
        const prod = catalogProducts.find((p) => p.id === item.productId);
        return sum + (prod?.price || 0) * item.quantity;
      }, 0);

      // Handler: activate corporate chip
      const handleActivateCorporateChip = async () => {
        if (!corporateActivationCode.trim()) {
          toast.error("Ingresa el código de activación del chip empresarial");
          return;
        }
        setActivatingCorporateChip(true);
        try {
          const res = await fetch("/api/chips/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activationCode: corporateActivationCode.trim() }),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "Error al activar chip empresarial");
            return;
          }
          toast.success("¡Chip empresarial activado! Tu protección empresarial ya está activa.");
          setCorporateActivationCode("");
          await loadAll();
          const active = (myStatus?.requests || []).find((r) =>
            ["pending_company_review", "approved_unpaid", "paid_active", "suspended", "archived"].includes(r.corporateStatus)
          );
          if (active?.corporateProfile?.id) {
            loadCorpFullProfile(active.corporateProfile.id);
            loadCorpContacts(active.corporateProfile.id);
          }
        } catch {
          toast.error("Error de conexión al activar chip");
        } finally {
          setActivatingCorporateChip(false);
        }
      };

      const PRODUCT_STATUS_LABELS: Record<string, string> = {
        pending_company_approval: "Pendiente de aprobación",
        approved_pending_payment: "Aprobada por empresa — pendiente de pago",
        rejected_by_company: "Rechazada",
        payment_under_review: "Pago en revisión",
        paid_approved: "Pago aprobado",
        cancelled: "Cancelada",
      };

      const PRODUCT_STATUS_COLORS: Record<string, string> = {
        pending_company_approval: "bg-amber-100 text-amber-700 border-amber-200",
        approved_pending_payment: "bg-blue-100 text-blue-700 border-blue-200",
        rejected_by_company: "bg-rose-100 text-rose-700 border-rose-200",
        payment_under_review: "bg-indigo-100 text-indigo-700 border-indigo-200",
        paid_approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
        cancelled: "bg-slate-100 text-slate-500 border-slate-200",
      };

      return (
        <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6 overflow-x-hidden">
          <div className={showCorpEditor ? "hidden md:block" : "block"}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Vinculación Empresarial</h1>
              <p className="text-sm text-muted-foreground">Estado de tu beneficio corporativo</p>
            </div>
          </div>

          {/* Status card */}
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

          {/* Corporate Medical Profile — styled like ProfileCard from Perfiles Médicos */}
          {corpProfile && (
            <div className={`group overflow-hidden rounded-[2.5rem] border transition-all hover:shadow-2xl hover:shadow-indigo-500/5 border-indigo-200/50 bg-indigo-500/[0.03] ${isDisabled ? 'opacity-70' : ''}`}>
              <div className="p-4 sm:p-8 flex flex-col md:flex-row items-start gap-4 sm:gap-8">
                <div className="relative flex flex-col items-center shrink-0">
                  <div className="h-20 w-20 rounded-[2rem] flex items-center justify-center font-black text-2xl shadow-inner mb-3 bg-indigo-500 text-white">
                    {initials}
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white">
                    Empresarial
                  </span>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                        <h3 className="text-2xl font-black tracking-tight leading-none">
                          {profile?.firstName || corpProfile.firstName || "Pendiente"} {profile?.lastName || corpProfile.lastName || ""}
                        </h3>
                        {profile?.displayNamePublic && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-tighter">
                            Alias: {profile.displayNamePublic}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter border ${
                          profile && profile.firstName && profile.lastName && profile.bloodType !== "—"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {profile && profile.firstName && profile.lastName && profile.bloodType !== "—" ? "Completado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile?.bloodType && profile.bloodType !== "—" && (
                          <div className="px-3 py-1.5 rounded-xl bg-indigo-500/5 border border-indigo-200/50 text-[11px] font-black text-indigo-600 uppercase flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5" /> {profile.bloodType}
                          </div>
                        )}
                        {corporateChip ? (
                          <div className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-200/50 text-[11px] font-black text-teal-700 uppercase flex items-center gap-2">
                            <Smartphone className="h-3.5 w-3.5" /> {corporateChip.shortCode}
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-muted border border-border text-[11px] font-black text-muted-foreground uppercase flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5" /> Sin Chip
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {corporateChip && (
                        <Link href={`/e/${corporateChip.shortCode}`} target="_blank"
                          className="p-3 rounded-xl border border-border hover:bg-slate-100 transition-all text-slate-500" title="Ver Perfil Público">
                          <ExternalLink className="h-5 w-5" />
                        </Link>
                      )}
                      {canEdit && (
                        <button onClick={() => setShowCorpContacts(!showCorpContacts)}
                          className={`p-3 rounded-xl border transition-all ${showCorpContacts ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'}`} title="Contactos de emergencia">
                          <Users className="h-5 w-5" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={openCorporateProfileEditor}
                          className="p-3 rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-all text-indigo-600" title="Editar Perfil Empresarial">
                          <Pencil className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!isDisabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TELÉFONO</p>
                        <p className="text-sm font-medium italic">{profile?.phone || corpProfile.phone || "—"}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ALERGIAS</p>
                        <p className="text-sm font-medium line-clamp-2 italic">{profile?.allergies || "Ninguna declarada"}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CONDICIONES</p>
                        <p className="text-sm font-medium line-clamp-2 italic">{profile?.chronicConditions || "Ninguna declarada"}</p>
                      </div>
                    </div>
                  )}

                  {isDisabled && !canEdit && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-200/50">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                        ⚠️ Este beneficio empresarial no está activo. Tu perfil personal no se ve afectado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Guardianes del Perfil Empresarial — expandible */}
          {showCorpContacts && canEdit && corpProfile && (
            <div className="rounded-[2rem] border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-emerald-900">Guardianes del Perfil Empresarial</h3>
                  <p className="text-xs text-muted-foreground">
                    Configura los contactos de emergencia exclusivos para este perfil empresarial.
                  </p>
                </div>
              </div>

              {/* Lista de contactos existentes */}
              {corpContacts.length > 0 && (
                <div className="space-y-2">
                  {corpContacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <UserRound className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{c.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">{c.relationship} · {c.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCorpContact(c.id)}
                        disabled={deletingCorpContactId === c.id}
                        className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shrink-0 disabled:opacity-50"
                      >
                        {deletingCorpContactId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario agregar contacto */}
              {corpContacts.length < 3 ? (
                <div className="p-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 space-y-3">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Añadir guardián</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre completo *"
                      value={corpContactForm.fullName}
                      onChange={(e) => setCorpContactForm({ ...corpContactForm, fullName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                    <select
                      value={corpContactForm.relationship}
                      onChange={(e) => setCorpContactForm({ ...corpContactForm, relationship: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 bg-white"
                    >
                      <option value="">Relación / Cargo *</option>
                      {CORP_RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder="Teléfono *"
                      value={corpContactForm.phone}
                      onChange={(e) => setCorpContactForm({ ...corpContactForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={corpContactForm.email}
                      onChange={(e) => setCorpContactForm({ ...corpContactForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <button
                    onClick={handleAddCorpContact}
                    disabled={savingCorpContact}
                    className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {savingCorpContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Añadir contacto de emergencia
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic">Has alcanzado el límite de 3 contactos de emergencia.</p>
              )}
            </div>
          )}

          {/* Corporate Chip standalone (only if no corporateProfile exists to show) */}
          {!corpProfile && isPaidActive && !corporateChip && hasCorporateOrderItems && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-300 text-white flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Chip empresarial</p>
                  <p className="text-xs text-muted-foreground">Chip empresarial pendiente de asignación o activación por tu empresa.</p>
                </div>
              </div>
            </div>
          )}

          {/* No corporate profile yet but paid_active */}
          {isPaidActive && !corpProfile && (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center">
              <p className="text-sm font-semibold text-indigo-700 mb-2">
                Tu beneficio empresarial está activo pero no tienes perfil empresarial configurado.
                Contacta al administrador de tu empresa para configurarlo.
              </p>
            </div>
          )}

          {/* Productos empresariales activos */}
          {isPaidActive && (
            <div className="rounded-[2rem] border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 sm:p-6 space-y-4 max-w-full overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-lg text-indigo-900">Productos empresariales activos</h3>
                  <p className="text-xs text-muted-foreground">
                    {corporateChip
                      ? `Todos usan tu QR empresarial /e/${corporateChip.shortCode}`
                      : "Estos productos están vinculados a tu chip empresarial"}
                  </p>
                </div>
              </div>

              {/* Lista de productos corporativos */}
              {(activeRequest.corporateOrderItems ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(showAllCorporateProducts ? (activeRequest.corporateOrderItems ?? []) : (activeRequest.corporateOrderItems ?? []).slice(0, 3)).map((item) => {
                    // NOTE: FULFILLMENT_LABELS etc defined inside map for readability — same as original
                    const FULFILLMENT_LABELS: Record<string, string> = {
                      pending_assignment: "Pendiente de asignación",
                      assigned_reserved: "Chip asignado",
                      in_production: "En preparación",
                      ready_for_assignment: "Listo para entrega",
                      delivered: "Entregado",
                      activated: "Activo",
                    };
                    const FULFILLMENT_COLORS: Record<string, string> = {
                      pending_assignment: "bg-amber-100 text-amber-700 border-amber-200",
                      assigned_reserved: "bg-blue-100 text-blue-700 border-blue-200",
                      in_production: "bg-indigo-100 text-indigo-700 border-indigo-200",
                      ready_for_assignment: "bg-sky-100 text-sky-700 border-sky-200",
                      delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
                      activated: "bg-emerald-100 text-emerald-800 border-emerald-300",
                    };
                    const FULFILLMENT_ICONS: Record<string, React.ReactNode> = {
                      pending_assignment: <Clock className="h-4 w-4 text-amber-500" />,
                      assigned_reserved: <Smartphone className="h-4 w-4 text-blue-500" />,
                      in_production: <Loader2 className="h-4 w-4 text-indigo-500" />,
                      ready_for_assignment: <Package className="h-4 w-4 text-sky-500" />,
                      delivered: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                      activated: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
                    };
                    const status = item.fulfillmentStatus || "pending_assignment";
                    const label = FULFILLMENT_LABELS[status] || status;
                    const color = FULFILLMENT_COLORS[status] || "bg-slate-100 text-slate-600 border-slate-200";
                    const icon = FULFILLMENT_ICONS[status] || <Package className="h-4 w-4 text-slate-400" />;

                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 truncate">
                              {item.product?.name || "Producto"}
                              {(item.quantity ?? 0) > 1 && <span className="text-muted-foreground ml-1">x{item.quantity ?? 1}</span>}
                            </p>
                            {item.product?.productType && (
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {item.product.productType}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0 whitespace-normal text-center max-w-[45%] ${color}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                  {(activeRequest.corporateOrderItems ?? []).length > 3 && (
                    <button
                      onClick={() => setShowAllCorporateProducts(!showAllCorporateProducts)}
                      className="w-full py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
                    >
                      {showAllCorporateProducts ? "Contraer productos" : `Ver todos los productos (${(activeRequest.corporateOrderItems ?? []).length})`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-amber-800">Pendiente de asignación</p>
                      <p className="text-xs text-amber-700">
                        {corporateChip
                          ? "Tu chip empresarial aún no tiene productos vinculados."
                          : "Tu empresa aún no te ha asignado un chip empresarial."}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-600 italic">
                    Cuando tu empresa asigne un chip empresarial, tus productos aparecerán vinculados aquí.
                  </p>
                </div>
              )}

              {/* Activar chip empresarial — card compacta */}
                {corporateChip && corporateChip.status !== "activated" &&
                  (activeRequest.corporateOrderItems ?? []).some((item) =>
                  ["assigned_reserved", "delivered", "ready_for_assignment"].includes(item.fulfillmentStatus ?? "")
                ) && (
                <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-blue-900">Activar chip empresarial</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Tu empresa ya te asignó el chip <span className="font-mono font-bold">{corporateChip.shortCode}</span>.{" "}
                        {corporateFulfillmentStatus === "delivered"
                          ? "Chip entregado. Ingresa el código para activar tu protección."
                          : "Ingresa el código de activación que viene en el empaque para activar tu protección empresarial."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-full">
                    <input
                      type="text"
                      value={corporateActivationCode}
                      onChange={(e) => setCorporateActivationCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleActivateCorporateChip(); }}
                      placeholder="XXXX-XXXX-XXXX"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-sm font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={handleActivateCorporateChip}
                      disabled={activatingCorporateChip || !corporateActivationCode.trim()}
                      className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
                    >
                      {activatingCorporateChip ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {activatingCorporateChip ? "Activando..." : "Activar chip"}
                    </button>
                  </div>
                </div>
              )}

              {/* Botones globales (solo si hay chip) */}
              {corporateChip && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href={`/e/${corporateChip.shortCode}`} target="_blank"
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all inline-flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5" /> Ver ficha
                  </Link>
                  <button onClick={async () => {
                    const url = `${window.location.origin}/e/${corporateChip.shortCode}`;
                    try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
                    catch { toast.error("No se pudo copiar"); }
                  }} className="px-4 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all inline-flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5" /> Copiar link
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Productos empresariales section */}
          {isPaidActive && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg">Productos empresariales</h3>
                    <p className="text-xs text-muted-foreground">Solicita stickers, llaveros, tarjetas o accesorios a tu empresa.</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenProductRequest}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <PlusCircle className="h-4 w-4" /> Solicitar productos
                </button>
              </div>
            </div>
          )}
          {!isPaidActive && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 bg-slate-50/50">
              <p className="text-xs font-medium text-muted-foreground italic">
                Cuando tu vinculación esté activa podrás solicitar productos empresariales.
              </p>
            </div>
          )}

          {activeRequest.corporateStatus === "rejected_by_company" && (
            <div className="rounded-2xl border-2 border-dashed border-rose-200 p-5 bg-rose-50/30">
              <p className="text-sm font-semibold text-rose-700 mb-3">
                ¿Quieres intentar de nuevo con otra empresa?
              </p>
              <JoinForm form={form} setForm={setForm} companyCodeError={companyCodeError} submittingJoin={submittingJoin} handleSubmitJoin={handleSubmitJoin} />
            </div>
          )}

          {/* Mis solicitudes de productos */}
          {isPaidActive && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Mis solicitudes de productos</h3>
                  <p className="text-xs text-muted-foreground">Estado de tus solicitudes enviadas a la empresa</p>
                </div>
              </div>
              {myRequestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : myRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Todavía no has solicitado productos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllProductRequests ? myRequests : myRequests.slice(0, 2)).map((req) => {
                    const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                    const statusLabel = PRODUCT_STATUS_LABELS[req.status] || req.status;
                    const statusColor = PRODUCT_STATUS_COLORS[req.status] || "bg-slate-100 text-slate-600 border-slate-200";
                    return (
                      <div key={req.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {(req.items || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-slate-900 truncate">{item.product?.name || "Producto"}</span>
                                <span className="text-muted-foreground shrink-0">x{item.quantity}</span>
                              </div>
                              <span className="font-bold text-primary shrink-0">${item.subtotal?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs font-medium text-muted-foreground">Total estimado</span>
                          <span className="font-black text-lg text-slate-900">${reqTotal.toFixed(2)}</span>
                        </div>
                        {req.rejectionReason && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                            Motivo: {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {myRequests.length > 2 && (
                    <button
                      onClick={() => setShowAllProductRequests(!showAllProductRequests)}
                      className="w-full py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
                    >
                      {showAllProductRequests ? "Contraer solicitudes" : `Ver todas las solicitudes (${myRequests.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Product Request Modal */}
          {showProductRequest && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-card w-full max-w-none sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/20 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
                <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-6 border-b border-border flex items-center justify-between shrink-0 bg-card/95 backdrop-blur">
                  <div>
                    <h3 className="font-black text-lg sm:text-2xl tracking-tight">Solicitar productos</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Selecciona los productos que necesitas. Tu empresa revisará y aprobará esta solicitud.
                    </p>
                  </div>
                  <button onClick={() => setShowProductRequest(false)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto pb-28 sm:pb-10 space-y-4">
                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : catalogProducts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="font-semibold">No hay productos disponibles</p>
                      <p className="text-xs mt-1">Tu empresa aún no ha configurado productos para solicitar.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {catalogProducts.map((product) => {
                        const isSelected = !!selectedItems[product.id];
                        const sel = selectedItems[product.id];
                        return (
                          <div
                            key={product.id}
                            className={`rounded-2xl border-2 p-5 transition-all cursor-pointer ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50/30 shadow-lg shadow-indigo-500/10"
                                : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm"
                            }`}
                            onClick={() => handleToggleProduct(product)}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-black text-base text-slate-900 leading-tight">{product.name}</h4>
                                  {product.requiresPersonalization && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest border border-amber-200 shrink-0">
                                      Personalizable
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{product.productType}</p>
                              </div>
                              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                              }`}>
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xl font-black text-primary">${product.price !== undefined ? product.price.toFixed(2) : "0.00"}</p>
                                {product.estimatedProductionTime && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Fabricación: {product.estimatedProductionTime}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-4 pt-4 border-t border-indigo-200 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-3">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cantidad</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleItemQty(product.id, (sel?.quantity || 1) - 1); }}
                                      className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-10 text-center font-bold text-lg">{sel?.quantity || 1}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleItemQty(product.id, (sel?.quantity || 1) + 1); }}
                                      className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Nota (opcional)</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: color, tamaño, especificaciones..."
                                    value={sel?.note || ""}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleItemNote(product.id, e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="sticky bottom-0 px-4 sm:px-8 py-4 sm:py-6 border-t border-border bg-card/95 backdrop-blur flex items-center justify-between gap-4 shrink-0">
                  <div>
                    {Object.keys(selectedItems).length > 0 && (
                      <p className="text-sm font-medium text-muted-foreground">
                        {Object.keys(selectedItems).length} producto(s) · Total estimado: <span className="font-black text-lg text-primary">${requestTotal.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowProductRequest(false)}
                      className="px-6 py-3 rounded-xl border border-border font-black text-sm hover:bg-accent transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmitRequest}
                      disabled={Object.keys(selectedItems).length === 0 || submittingRequest}
                      className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                      {submittingRequest ? "Enviando..." : "Enviar solicitud"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>

          {/* Corporate Profile Editor Modal */}
          {showCorpEditor && (
            <>
              {/* Mobile inline editor */}
              <div className="block md:hidden">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setShowCorpEditor(false)}
                    className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-all shrink-0"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Editar Perfil Médico Empresarial
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      Este perfil pertenece a tu beneficio empresarial. No afecta tu perfil personal.
                    </p>
                  </div>
                </div>

                {corpEditLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-6">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center space-y-2">
                      <p className="font-black text-lg tracking-tight text-foreground">Cargando información médica empresarial...</p>
                      <p className="text-sm text-muted-foreground max-w-xs">Espera un momento antes de editar tu perfil.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCorpEdit} className="space-y-6">
                    {corpEditError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{corpEditError}</p>}
                    <MedicalProfileForm
                      form={corpEditForm}
                      onChange={(field, val) => setCorpEditForm((prev) => ({ ...prev, [field]: val }))}
                    />
                  </form>
                )}
              </div>

              {/* Desktop modal */}
              <div className="hidden md:block fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-card w-full max-w-none sm:max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/20 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
                  <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-6 border-b border-border flex items-center justify-between shrink-0 bg-card/95 backdrop-blur">
                    <div>
                      <h3 className="font-black text-lg sm:text-2xl tracking-tight">Perfil médico empresarial</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">
                        Este perfil pertenece a tu beneficio empresarial. No afecta tu perfil personal.
                      </p>
                    </div>
                    <button onClick={() => setShowCorpEditor(false)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                  <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto pb-28 sm:pb-10">
                    {corpEditLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-6">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="text-center space-y-2">
                          <p className="font-black text-lg tracking-tight text-foreground">Cargando información médica empresarial...</p>
                          <p className="text-sm text-muted-foreground max-w-xs">Espera un momento antes de editar tu perfil.</p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleCorpEdit} className="space-y-6">
                        {corpEditError && <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 font-semibold">{corpEditError}</p>}
                        <MedicalProfileForm
                          form={corpEditForm}
                          onChange={(field, val) => setCorpEditForm((prev: CorporateProfilePayload) => ({ ...prev, [field]: val }))}
                        />
                        <div className="flex gap-6 pt-8 border-t border-border/50">
                          <button type="button" onClick={() => setShowCorpEditor(false)}
                            className="flex-1 px-6 py-4 rounded-2xl border border-border font-black text-sm hover:bg-accent transition-all">Cancelar</button>
                          <button type="submit" disabled={corpEditLoading || corpEditSaving}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
                            {corpEditSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : corpEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {corpEditSaving ? "Guardando..." : corpEditLoading ? "Cargando perfil..." : "Guardar perfil empresarial"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6 overflow-x-hidden">
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
              <p className="font-semibold text-indigo-900">¿Tu empresa trabaja con PreRescue ID?</p>
              <p className="text-sm text-indigo-700/70 mt-1">Ingresa el código empresarial que te proporcionaron para solicitar tu vinculación y acceder a los beneficios corporativos.</p>
            </div>
          </div>
        </div>
        <JoinForm form={form} setForm={setForm} companyCodeError={companyCodeError} submittingJoin={submittingJoin} handleSubmitJoin={handleSubmitJoin} />
      </div>
    );
  }

  // ==================== CORPORATE ADMIN VIEW ====================
  const tabs: { key: CorporateTab; label: string }[] = [
    { key: "solicitudes", label: "Solicitudes de productos" },
    { key: "aprobados", label: "Aprobados sin pagar" },
    { key: "pagos_enviados", label: "Pagos enviados" },
    { key: "pagados", label: "Pagados / activos" },
    { key: "rechazados", label: "Rechazados" },
    { key: "archivados", label: "Archivados" },
    { key: "suspendidos", label: "Suspendidos" },
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6 overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black">Gestión Empresarial</h1>
      </div>

      {/* Guidance banner */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1">
        <p className="text-xs font-semibold text-indigo-800 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Gestión de colaboradores y productos
        </p>
        <p className="text-[10px] text-indigo-700/70 leading-relaxed">
          Gestiona colaboradores en la sección <strong>Colaboradores</strong> (aprobación de nuevos miembros, suspender, archivar).
          Aquí gestionas solicitudes de productos, pagos corporativos y estado de vinculaciones activas.
          El perfil empresarial es separado del perfil personal del empleado.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-thin">
        {tabs.map((t) => (
          <button key={t.key} onClick={async () => { setTab(t.key); await loadMembersByTab(t.key); }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 ${tab === t.key ? "bg-primary text-white" : "bg-muted"}`}>{t.label}</button>
        ))}
      </div>

      {/* SOLICITUDES DE PRODUCTOS — company reviews employee product requests */}
      {tab === "solicitudes" && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-5 bg-indigo-50/30 border-indigo-200 space-y-2">
            <p className="text-xs font-semibold text-indigo-800 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Solicitudes de productos de colaboradores
            </p>
            <p className="text-[10px] text-indigo-700/70 leading-relaxed">
              Revisa y aprueba o rechaza las solicitudes de productos enviadas por tus colaboradores.
              Las solicitudes aprobadas quedarán pendientes de pago en la próxima fase.
            </p>
          </div>

          {companyRequestsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : companyRequests.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Package className="h-8 w-8" />
              </div>
              <p className="text-base font-semibold text-slate-700 mb-1">Sin solicitudes de productos</p>
              <p className="text-sm text-muted-foreground">Tus colaboradores aún no han solicitado productos.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending requests */}
              {companyRequests.filter((r) => r.status === "pending_company_approval").length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Pendientes de revisión ({companyRequests.filter((r) => r.status === "pending_company_approval").length})
                  </h3>
                  {companyRequests.filter((r) => r.status === "pending_company_approval").map((req) => {
                    const member = req.organizationMember;
                    const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                    const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                    return (
                      <div key={req.id} className="rounded-2xl border border-amber-200 bg-white shadow-md overflow-hidden">
                        <div className="p-5 bg-amber-50/50 border-b border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                              <UserRound className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-black text-sm">{memberName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {member?.employeePosition && `${member.employeePosition} · `}
                                {member?.employeeNationalId && `Céd: ${member.employeeNationalId}`}
                                {!member?.employeePosition && !member?.employeeNationalId && (
                                  <>Solicitado {req.createdAt ? new Date(req.createdAt).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" }) : "—"}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
                            <span className="text-xl font-black text-primary">${reqTotal.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                            {(req.items || []).map((item) => (
                              <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black shrink-0">
                                    {item.quantity}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{item.product?.name || "Producto"}</p>
                                    <p className="text-[10px] text-muted-foreground">${item.unitPrice?.toFixed(2)} c/u</p>
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-primary shrink-0">${item.subtotal?.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          {req.items?.some((i) => i.note) && (
                            <div className="space-y-1">
                              {req.items.filter((i) => i.note).map((i) => (
                                <p key={i.id} className="text-[10px] text-muted-foreground italic">Nota para {i.product?.name}: {i.note}</p>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleReviewRequest(req.id, "approve")}
                              disabled={reviewingRequest === req.id}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {reviewingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Aprobar solicitud
                            </button>
                            <button
                              onClick={() => { setShowRejectModal(req.id); setRejectReason(""); }}
                              disabled={reviewingRequest === req.id}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-black text-sm hover:bg-rose-100 transition-all disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Approved requests — selectable for payment */}
              {companyRequests.filter((r) => r.status === "approved_pending_payment").length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Aprobadas — pendientes de pago ({companyRequests.filter((r) => r.status === "approved_pending_payment").length})
                    </h3>
                    <button
                      onClick={selectAllApproved}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                    >
                      {companyRequests.filter((r) => r.status === "approved_pending_payment" && !r.orderId).every((r) => selectedApprovedRequests[r.id]) ? "Deseleccionar" : "Seleccionar todas"}
                    </button>
                  </div>
                  {companyRequests.filter((r) => r.status === "approved_pending_payment").map((req) => {
                    const member = req.organizationMember;
                    const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                    const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                    const alreadyLinked = !!req.orderId;
                    return (
                      <div key={req.id} className={`rounded-2xl border bg-white p-5 space-y-3 shadow-sm transition-all ${
                        selectedApprovedRequests[req.id] ? "border-blue-500 ring-2 ring-blue-500/10" : alreadyLinked ? "border-slate-200 opacity-60" : "border-blue-200"
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {!alreadyLinked && (
                              <input
                                type="checkbox"
                                checked={!!selectedApprovedRequests[req.id]}
                                onChange={() => toggleApprovedRequest(req.id)}
                                className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 shrink-0"
                              />
                            )}
                            {alreadyLinked && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold shrink-0">EN ORDEN</span>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <UserRound className="h-4 w-4" />
                              </div>
                              <p className="font-semibold text-sm">{memberName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-primary">${reqTotal.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">Aprobada {req.companyReviewedAt ? new Date(req.companyReviewedAt).toLocaleDateString("es-PA") : "—"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(req.items || []).map((item) => (
                            <span key={item.id} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                              {item.product?.name || "Producto"} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Payment creation panel */}
                  {selectedApprovedRequestIds.length > 0 && (
                    <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50/50 to-white p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-blue-900">Crear pago corporativo</p>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
                          <p className="text-2xl font-black text-primary">${selectedApprovedTotal.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Upload proof */}
                      <div className={`p-4 rounded-xl border-2 transition-all ${orderProofUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                        {orderProofUrl ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                              <span className="text-sm font-semibold text-emerald-700 truncate">{orderProofName || "Comprobante adjuntado"}</span>
                            </div>
                            <button onClick={() => { setOrderProofUrl(""); setOrderProofName(""); }} className="text-xs text-rose-600 font-semibold hover:underline shrink-0">Quitar</button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comprobante de pago</p>
                            <p className="text-[10px] text-muted-foreground">Adjunta imagen o captura del comprobante de transferencia/depósito.</p>
                            <div className="flex items-center gap-3">
                              <input
                                id="order-proof-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                disabled={orderProofUploading}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 5 * 1024 * 1024) { toast.error("El archivo es muy pesado (máx 5MB)"); return; }
                                  setOrderProofUploading(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    formData.append("type", "payment");
                                    formData.append("bucket", "payment-proofs");
                                    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                                    if (!uploadRes.ok) throw new Error("Error al subir archivo");
                                    const { url } = await uploadRes.json();
                                    setOrderProofUrl(url);
                                    setOrderProofName(file.name);
                                    toast.success("Comprobante adjuntado");
                                  } catch {
                                    toast.error("Error al subir el comprobante");
                                  } finally {
                                    setOrderProofUploading(false);
                                  }
                                }}
                              />
                              <label htmlFor="order-proof-upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all">
                                {orderProofUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><Upload className="h-4 w-4" /> Seleccionar archivo</>}
                              </label>
                            </div>
                            <p className="text-[9px] text-muted-foreground">Máx 5MB. Formatos: JPG, PNG, WebP.</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">{selectedApprovedRequestIds.length} solicitud(es) seleccionada(s)</p>
                        <button
                          onClick={handleSubmitOrderFromRequests}
                          disabled={submittingOrderFromRequests || !orderProofUrl}
                          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {submittingOrderFromRequests ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                          {submittingOrderFromRequests ? "Creando orden..." : "Enviar pago a revisión"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment under review */}
              {companyRequests.filter((r) => r.status === "payment_under_review").length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Pagos en revisión ({companyRequests.filter((r) => r.status === "payment_under_review").length})
                  </h3>
                  {companyRequests.filter((r) => r.status === "payment_under_review").map((req) => {
                    const member = req.organizationMember;
                    const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                    const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                    return (
                      <div key={req.id} className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <p className="font-semibold text-sm">{memberName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-primary">${reqTotal.toFixed(2)}</p>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold border border-indigo-200">En revisión</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(req.items || []).map((item) => (
                            <span key={item.id} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100">
                              {item.product?.name || "Producto"} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paid / approved */}
              {companyRequests.filter((r) => r.status === "paid_approved").length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Pagos aprobados ({companyRequests.filter((r) => r.status === "paid_approved").length})
                  </h3>
                  {companyRequests.filter((r) => r.status === "paid_approved").map((req) => {
                    const member = req.organizationMember;
                    const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                    const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                    return (
                      <div key={req.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <p className="font-semibold text-sm">{memberName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-600">${reqTotal.toFixed(2)}</p>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold border border-emerald-200">Pagado</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(req.items || []).map((item) => (
                            <span key={item.id} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                              {item.product?.name || "Producto"} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rejected requests */}
              {companyRequests.filter((r) => r.status === "rejected_by_company").length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Rechazadas ({companyRequests.filter((r) => r.status === "rejected_by_company").length})
                  </h3>
                  {companyRequests.filter((r) => r.status === "rejected_by_company").map((req) => {
                    const member = req.organizationMember;
                    const memberName = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
                    const reqTotal = (req.items || []).reduce((s: number, i) => s + (i.subtotal || 0), 0);
                    return (
                      <div key={req.id} className="rounded-2xl border border-rose-200 bg-white p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <p className="font-semibold text-sm">{memberName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-rose-500">${reqTotal.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">Rechazada {req.companyReviewedAt ? new Date(req.companyReviewedAt).toLocaleDateString("es-PA") : "—"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(req.items || []).map((item) => (
                            <span key={item.id} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-100">
                              {item.product?.name || "Producto"} × {item.quantity}
                            </span>
                          ))}
                        </div>
                        {req.rejectionReason && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                            Motivo: {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reject Reason Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg">Rechazar solicitud</h3>
                  <button onClick={() => { setShowRejectModal(null); setRejectReason(""); }} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  ¿Estás seguro de que deseas rechazar esta solicitud? El empleado será notificado.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: No disponible en inventario, presupuesto insuficiente..."
                    className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none h-24"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRejectModal(null); setRejectReason(""); }}
                    className="flex-1 px-4 py-3 rounded-xl border border-border font-black text-sm hover:bg-accent transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleReviewRequest(showRejectModal, "reject", rejectReason)}
                    disabled={reviewingRequest === showRejectModal}
                    className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-black text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {reviewingRequest === showRejectModal ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Confirmar rechazo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAGOS ENVIADOS — show orders with clear collaborator breakdown */}
      {tab === "pagos_enviados" && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-5 bg-amber-50/30 border-amber-200 space-y-2">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Compras corporativas enviadas con comprobante y pendientes de revisión por PreRescue ID.
            </p>
              <p className="text-[10px] text-amber-700/70 leading-relaxed">
              Los colaboradores incluidos en estas órdenes <strong>Aprobados sin pagar</strong> hasta que PreRescue ID apruebe o cancele el pago.
              Si el pago es aprobado, pasarán directamente a <strong>Pagados / activos</strong>.
            </p>
          </div>
          {corporateOrders.filter((o) => o.paymentStatus === "under_review" || o.adminReviewStatus === "pending").length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Clock className="h-8 w-8" />
              </div>
              <p className="text-base font-semibold text-slate-700 mb-1">Sin pagos enviados pendientes</p>
              <p className="text-sm text-muted-foreground">Todas las compras corporativas han sido procesadas o aún no se han enviado.</p>
            </div>
          ) : (
            corporateOrders.filter((o) => o.paymentStatus === "under_review" || o.adminReviewStatus === "pending").map((order) => {
              const totalMembers = new Set((order.corporateEmployeeItems || []).map((item) => item.organizationMemberId).filter(Boolean)).size;
              const memberNames = [...new Set((order.corporateEmployeeItems || []).map((item) => 
                `${item.organizationMember?.profile?.firstName || ""} ${item.organizationMember?.profile?.lastName || ""}`
              ).filter(Boolean))];
              return (
                <div key={order.id} className="rounded-[2rem] border border-blue-200/50 bg-white shadow-lg shadow-blue-500/5 overflow-hidden transition-all hover:shadow-xl">
                  {/* Order header */}
                  <div className="p-5 md:p-6 bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black">
                            #
                          </div>
                          <p className="font-black text-lg tracking-tight">Orden {order.orderNumber}</p>
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200/50">
                            En revisión
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 ml-1">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                          <p className="text-2xl font-black text-primary">${order.amount?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collaborators included — visible by default */}
                  <div className="p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-black text-blue-900 uppercase tracking-wider">
                          {totalMembers} {totalMembers === 1 ? "colaborador incluido" : "colaboradores incluidos"}
                        </p>
                      </div>
                      {memberNames.length > 0 && (
                        <p className="text-[10px] text-muted-foreground italic truncate max-w-[200px] md:max-w-none">
                          {memberNames.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Detailed item list */}
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {/* Header row */}
                      <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <span className="flex-[2]">Colaborador</span>
                        <span className="flex-1">Cédula</span>
                        <span className="flex-[2]">Producto</span>
                        <span className="w-16 text-center">Cant.</span>
                        <span className="w-24 text-right">Subtotal</span>
                      </div>
                      {order.corporateEmployeeItems?.map((item, idx: number) => {
                        const m = item.organizationMember;
                        const name = m?.profile ? `${m.profile.firstName || ""} ${m.profile.lastName || ""}`.trim() : "—";
                        return (
                          <div key={item.id} className="px-4 md:px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 hover:bg-blue-50/30 transition-colors">
                            <div className="flex-[2] flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                                {m?.employeePosition && (
                                  <p className="text-[10px] text-muted-foreground truncate">{m.employeePosition}{m?.employeeDepartment ? ` · ${m.employeeDepartment}` : ""}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 text-xs text-muted-foreground">
                              {m?.employeeNationalId || "—"}
                            </div>
                            <div className="flex-[2] text-xs font-medium text-slate-700">
                              {item.product?.name || "Producto"}
                            </div>
                            <div className="w-16 text-center text-sm font-bold text-slate-800">
                              x{item.quantity || 1}
                            </div>
                            <div className="w-24 text-right text-sm font-bold text-primary">
                              ${item.subtotal?.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Payment proof & delivery status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-3">
                        {order.paymentProofUrl && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Comprobante adjuntado
                          </div>
                        )}
                        {order.corporateDeliveryStatus && (
                          <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-semibold ${order.corporateDeliveryStatus === "delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : order.corporateDeliveryStatus === "in_transit" ? "bg-blue-50 text-blue-700 border-blue-200" : order.corporateDeliveryStatus === "ready_for_delivery" ? "bg-teal-50 text-teal-700 border-teal-200" : order.corporateDeliveryStatus === "on_hold" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-border"}`}>
                            {order.corporateDeliveryStatus === "delivered" ? "📦 Entregado" : order.corporateDeliveryStatus === "in_transit" ? "🚚 En tránsito" : order.corporateDeliveryStatus === "ready_for_delivery" ? "✅ Listo" : order.corporateDeliveryStatus === "on_hold" ? "⏸ En espera" : order.corporateDeliveryStatus === "preparation_pending" ? "⏳ Preparando" : order.corporateDeliveryStatus}
                          </span>
                        )}
                        {order.estimatedDeliveryDate && (
                          <span className="px-3 py-1.5 rounded-xl border bg-slate-50 text-slate-600 text-[10px] font-semibold">
                            Est: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {order.deliveryNote && (
                          <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">&quot;{order.deliveryNote}&quot;</span>
                        )}
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrder === order.id}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {cancellingOrder === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                          Cancelar compra
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Additional info card for already-approved/rejected orders */}
          {corporateOrders.filter((o) => o.adminReviewStatus === "approved" || o.paymentStatus === "rejected").length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2">
                Mostrar {corporateOrders.filter((o) => o.adminReviewStatus === "approved" || o.paymentStatus === "rejected").length} orden(es) procesada(s)
              </summary>
              <div className="mt-3 space-y-3">
                {corporateOrders.filter((o) => o.adminReviewStatus === "approved" || o.paymentStatus === "rejected").map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">Orden #{order.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold border ${
                        order.adminReviewStatus === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {order.adminReviewStatus === "approved" ? "✅ Aprobado" : "❌ Rechazado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {tab === "pagados" && (
        <div className="space-y-4">
          {members.map((m) => {
            const memberOrders = corporateOrders.filter((o) => o.corporateEmployeeItems?.some((item) => item.organizationMemberId === m.id));
            const allItems = memberOrders.flatMap((o) => o.corporateEmployeeItems || []);
            const profileComplete = Boolean(m.profile?.firstName && m.profile?.lastName && m.profile?.bloodType && m.profile?.bloodType !== "Pendiente");
            const fulfillmentStatus = allItems[0]?.fulfillmentStatus || "pending_assignment";
            const chip = allItems[0]?.chip;
            return (
              <div key={m.id} className="rounded-2xl border p-4 bg-card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{m.profile?.firstName} {m.profile?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{m.profile?.user?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">{allItems.map((item) => <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded">{item.product?.name || "Producto"} x{item.quantity}</span>)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full border font-semibold ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>Perfil: {profileComplete ? "Completado" : "Pendiente"}</span>
                    <span className={`px-2 py-1 rounded-full border font-semibold ${fulfillmentStatus === "activated" ? "bg-emerald-50 text-emerald-700" : fulfillmentStatus === "assigned_reserved" ? "bg-blue-50 text-blue-700" : fulfillmentStatus === "in_production" ? "bg-purple-50 text-purple-700" : fulfillmentStatus === "ready_for_assignment" ? "bg-teal-50 text-teal-700" : fulfillmentStatus === "delivered" ? "bg-slate-100 text-slate-600" : "bg-muted text-muted-foreground"}`}>
                      Chip: {fulfillmentStatus === "activated" ? "Activado" : fulfillmentStatus === "assigned_reserved" ? "Asignado / reservado" : fulfillmentStatus === "in_production" ? "En fabricación" : fulfillmentStatus === "ready_for_assignment" ? "Listo" : fulfillmentStatus === "delivered" ? "Entregado" : "Pendiente"}
                    </span>
                    {chip?.shortCode && <span className="px-2 py-1 rounded-full border bg-slate-50 text-slate-600 font-mono">{chip.shortCode}</span>}
                    {allItems[0]?.activatedAt && <span className="px-2 py-1 rounded-full border bg-slate-50 text-slate-600">Act.: {new Date(allItems[0].activatedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {members.length === 0 && <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Sin empleados pagados/activos.</div>}
        </div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="rounded-2xl border p-4 bg-card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-semibold">{m.profile?.firstName} {m.profile?.lastName}</p>
                <p className="text-sm text-muted-foreground">{m.profile?.user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Cédula: {m.employeeNationalId || "—"} · Edad: {m.employeeAge || "—"} · Tel: {m.employeePhone || "—"}</p>
                <p className="text-xs text-muted-foreground">Cargo/Depto: {m.employeePosition || "—"} / {m.employeeDepartment || "—"} · ID laboral: {m.employeeInternalId || "—"}</p>
                {m.employeeNote && <p className="text-xs text-muted-foreground">Nota: {m.employeeNote}</p>}
              </div>
              {tab === "solicitantes" && (
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(m.id, "approve")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Aprobar</button>
                  <button onClick={() => handleDecision(m.id, "reject")} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold inline-flex items-center gap-1"><XCircle className="h-4 w-4" /> Rechazar</button>
                </div>
              )}
              {tab === "aprobados" && (
                <div className="w-full space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={Boolean(selectedMembers[m.id])} onChange={() => toggleMemberSelection(m.id)} /> Seleccionar para compra</label>
                  {selectedMembers[m.id] && (
                    <div className="rounded-xl border p-3 space-y-2">
                      <select className="w-full border rounded-lg px-2 py-2 text-sm" defaultValue="" onChange={(e) => { addProductToMember(m.id, e.target.value); e.currentTarget.value = ""; }}>
                        <option value="">Agregar producto activo...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} (${(p.price ?? 0).toFixed(2)})</option>)}
                      </select>
                      {(memberProducts[m.id] || []).map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        if (!product) return null;
                        return (<div key={item.productId} className="flex items-center gap-2 text-sm"><span className="flex-1">{product.name}</span><input type="number" min={1} value={item.quantity} onChange={(e) => updateMemberProductQty(m.id, item.productId, Number(e.target.value))} className="w-16 border rounded px-2 py-1" /><span className="w-20 text-right">${((product.price ?? 0) * item.quantity).toFixed(2)}</span><button onClick={() => removeMemberProduct(m.id, item.productId)} className="text-rose-600">Quitar</button></div>);
                      })}
                      <p className="text-xs font-semibold text-right">Subtotal: ${getMemberSubtotal(m.id).toFixed(2)}</p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleDecision(m.id, "reject")} className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors">Rechazar</button>
                    <button onClick={() => handleDecision(m.id, "archive")} className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Eliminar</button>
                  </div>
                </div>
              )}
              {(tab === "rechazados" && m.corporateStatus === "rejected_by_company") && (
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(m.id, "restore")} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Restaurar</button>
                  <button onClick={() => handleDecision(m.id, "archive")} className="px-3 py-2 rounded-xl bg-slate-600 text-white text-sm font-semibold inline-flex items-center gap-1"><Archive className="h-4 w-4" /> Archivar</button>
                </div>
              )}
              {(tab === "archivados" && m.corporateStatus === "archived") && (
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(m.id, "restore")} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Restaurar</button>
                  <button onClick={() => handleDecision(m.id, "delete_forever")} className="px-3 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold inline-flex items-center gap-1"><XCircle className="h-4 w-4" /> Eliminar definitivo</button>
                </div>
              )}
              {(tab === "suspendidos" && m.corporateStatus === "suspended") && (
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(m.id, "unsuspend")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Reactivar</button>
                  <button onClick={() => handleDecision(m.id, "archive")} className="px-3 py-2 rounded-xl bg-slate-600 text-white text-sm font-semibold inline-flex items-center gap-1"><Archive className="h-4 w-4" /> Archivar</button>
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
          <div className={`p-4 rounded-xl border-2 transition-all ${paymentProofUrl ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-dashed border-slate-200"}`}>
            {paymentProofUrl ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700 truncate">{proofUploadedName || "Comprobante adjuntado"}</span>
                </div>
                <button
                  onClick={() => {
                    setPaymentProofUrl("");
                    setProofUploadedName("");
                  }}
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
                      setProofFileUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("type", "payment");
                        formData.append("bucket", "payment-proofs");
                        const uploadRes = await fetch("/api/upload", {
                          method: "POST",
                          body: formData,
                        });
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
                  <label htmlFor="corporate-proof-upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all">
                    {proofFileUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Seleccionar archivo
                      </>
                    )}
                  </label>
                </div>
                <p className="text-[9px] text-muted-foreground">Máx 5MB. Formatos: JPG, PNG, WebP.</p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-bold">Total general: {totalGeneral.toFixed(2)}</p>
            <button
              onClick={submitCorporateOrder}
              disabled={submittingCorporateOrder || !paymentProofUrl}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 w-full sm:w-auto"
            >
              {submittingCorporateOrder ? "Enviando..." : "Enviar compra corporativa"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
;
// ==================== SHARED JOIN FORM ====================
function JoinForm({
  form,
  setForm,
  companyCodeError,
  submittingJoin,
  handleSubmitJoin,
}: {
  form: JoinFormState;
  setForm: React.Dispatch<React.SetStateAction<JoinFormState>>;
  companyCodeError: string;
  submittingJoin: boolean;
  handleSubmitJoin: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <form onSubmit={handleSubmitJoin} className="rounded-2xl border p-5 bg-card space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">Código empresarial <span className="text-rose-500">*</span></label>
        <input className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-bold tracking-widest text-center uppercase ${companyCodeError ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500" : "border-indigo-200 bg-indigo-50/30 focus:border-indigo-400 focus:ring-indigo-400"} outline-none transition-all`}
          placeholder="Ejemplo: ACP2026" value={form.companyCode}
          onChange={(e) => { const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); setForm((prev) => ({ ...prev, companyCode: val })); }} maxLength={20} required autoComplete="off" />
        {companyCodeError && <p className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1"><XCircle className="h-3.5 w-3.5" />{companyCodeError}</p>}
      </div>
      <div className="border-t border-dashed border-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Cédula / ID</label><input className="w-full border rounded-xl px-3 py-2.5" placeholder="8-000-0000" value={form.employeeNationalId} onChange={(e) => setForm((prev) => ({ ...prev, employeeNationalId: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Edad</label><input className="w-full border rounded-xl px-3 py-2.5" placeholder="25" type="number" min={1} max={120} value={form.employeeAge} onChange={(e) => setForm((prev) => ({ ...prev, employeeAge: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Teléfono</label><input className="w-full border rounded-xl px-3 py-2.5" placeholder="+507 6000-0000" value={form.employeePhone} onChange={(e) => setForm((prev) => ({ ...prev, employeePhone: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Cargo</label><input className="w-full border rounded-xl px-3 py-2.5" placeholder="Ej: Operador, Supervisor" value={form.employeePosition} onChange={(e) => setForm((prev) => ({ ...prev, employeePosition: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Departamento</label><input className="w-full border rounded-xl px-3 py-2.5" placeholder="Ej: Logística, RRHH" value={form.employeeDepartment} onChange={(e) => setForm((prev) => ({ ...prev, employeeDepartment: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">ID laboral interno</label><input className="w-full border rounded-xl px-3 py-2.5" placeholder="Opcional" value={form.employeeInternalId} onChange={(e) => setForm((prev) => ({ ...prev, employeeInternalId: e.target.value }))} /></div>
      </div>
      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nota opcional</label><textarea className="w-full border rounded-xl px-3 py-2.5" placeholder="..." rows={2} value={form.employeeNote} onChange={(e) => setForm((prev) => ({ ...prev, employeeNote: e.target.value }))} /></div>
      <button type="submit" disabled={submittingJoin} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-sm hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {submittingJoin ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando solicitud...</> : <>Enviar solicitud <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}