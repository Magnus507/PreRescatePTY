"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { resolveImageSrc } from "@/lib/resolve-image-src";
import Link from "next/link";
import {
  ShoppingCart, Store, Package, Loader2,
  MapPin, CreditCard, CheckCircle2, QrCode, Clock, AlertTriangle,
  Upload, ArrowRight, UserRound, Plus, ShieldCheck, Cpu,
  Building2, ChevronDown, ChevronUp, Shield, Home,
  Heart, Briefcase, Info
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { groupProductsByStoreSection, getStoreSectionTitle, type StoreProductLike } from "@/lib/products/group-products-by-store-section";

interface Product extends StoreProductLike {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency?: string;
  category: string;
  operationsProductCode?: string | null;
  isPublished?: boolean;
  isVisible?: boolean;
  stockSource?: string | null;
}

interface ProfileOption {
  id: string;
  firstName: string;
  lastName: string;
  profileType: string;
  displayNamePublic?: string | null;
  assignedChips?: { id: string; shortCode: string }[];
}

type ProfileOptionSource = Omit<ProfileOption, "profileType">;

interface CreateOrderItem {
  productType: string;
  quantity: number;
  unitPrice: number;
  profileId?: string;
}

interface CreateOrderBody {
  items: CreateOrderItem[];
  shippingAddress: string;
  shippingCity: string;
  shippingNotes: string;
}

interface PaymentConfig {
  yappy_qr_url?: string;
  yappy_handle?: string;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
}

// ─── Combo card config ───────────────────────────────────────────
interface ComboInfo {
  name: string;
  chips: number;
  useCase: string;
  icon: React.ElementType;
  recommended?: boolean;
}

const COMBO_META: Record<string, ComboInfo> = {
  "Combo Estándar": {
    name: "Combo Estándar",
    chips: 1,
    useCase: "Para una persona",
    icon: UserRound,
  },
  "Combo Dúo": {
    name: "Combo Dúo",
    chips: 2,
    useCase: "Para ti y un familiar",
    icon: Heart,
  },
  "Combo Familiar": {
    name: "Combo Familiar",
    chips: 4,
    useCase: "Para el hogar",
    icon: Home,
  },
  "Combo Hogar Full": {
    name: "Combo Hogar Full",
    chips: 6,
    useCase: "Mayor cobertura familiar",
    icon: Shield,
    recommended: true,
  },
};

const BUSINESS_NAMES = ["Combo Empresa", "Corporativo"];

// ─── Helpers ─────────────────────────────────────────────────────
function getComboMeta(name: string): ComboInfo | null {
  return COMBO_META[name] ?? null;
}

function isBusinessProduct(name: string): boolean {
  return BUSINESS_NAMES.some((b) => name.toLowerCase().includes(b.toLowerCase()));
}

function getBusinessLabel(name: string): string {
  if (name.toLowerCase().includes("corporativo")) return "Corporativo";
  return "Combo Empresa";
}

// ─── Component ───────────────────────────────────────────────────
export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [showBusinessSection, setShowBusinessSection] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [shippingData, setShippingData] = useState({
    address: "",
    city: "",
    notes: ""
  });

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.products)) setProducts(data.products);
        setLoading(false);
      })
      .catch(() => {
        setError("No pudimos cargar la tienda.");
        setLoading(false);
      });

    fetch("/api/public/config")
      .then(res => res.json())
      .then(data => {
        if (data.configs) setPaymentConfig(data.configs);
      });
  }, []);

  // Separate personal vs business products
  const personalProducts = products.filter((p) => !isBusinessProduct(p.name));
  const businessProducts = products.filter((p) => isBusinessProduct(p.name));
  const personalGrouped = groupProductsByStoreSection(personalProducts, "public");

  const loadProfiles = async (product?: Product) => {
    const target = product ?? null;
    if (!target?.requiresPersonalization) return;
    setProfileLoading(true);
    try {
      const res = await fetch("/api/users/perfiles-medicos");
      const json = await res.json();
      const payload: { ownProfile?: ProfileOptionSource; familyProfiles?: ProfileOptionSource[] } = json.data ?? json;
      const profiles: ProfileOption[] = [];
      if (payload.ownProfile) {
        profiles.push({ ...payload.ownProfile, profileType: "personal" });
      }
      if (Array.isArray(payload.familyProfiles)) {
        profiles.push(...payload.familyProfiles.map((p: ProfileOptionSource) => ({ ...p, profileType: "family" })));
      }
      setProfileOptions(profiles);
      if (profiles.length > 0) {
        const withChip = profiles.find(p => p.assignedChips && p.assignedChips.length > 0);
        setSelectedProfileId(withChip?.id || profiles[0]?.id || "");
      }
    } catch {
      toast.error("Error al cargar perfiles");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setCreatingOrder(true);
    try {
      const body: CreateOrderBody = {
        items: [{
          productType: selectedProduct.id,
          quantity: 1,
          unitPrice: selectedProduct.price,
        }],
        shippingAddress: shippingData.address,
        shippingCity: shippingData.city,
        shippingNotes: shippingData.notes
      };

      if (selectedProduct.requiresPersonalization) {
        if (!selectedProfileId) {
          toast.error("Selecciona un perfil médico para este accesorio.");
          setCreatingOrder(false);
          return;
        }
        body.items[0].profileId = selectedProfileId;

        const selectedProfile = profileOptions.find(p => p.id === selectedProfileId);
        const hasChip = !!selectedProfile?.assignedChips?.[0];
        if (!hasChip) {
          toast.error("Este perfil no tiene un chip activo. Activa un chip antes de solicitar accesorios personalizados.");
          setCreatingOrder(false);
          return;
        }
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      if (res.ok) {
        setShowCheckout(false);
        setShowSuccessModal(true);
        setLastOrderId(data.order?.id || null);
        setProofUploaded(false);
      } else {
        toast.error(data?.error || "Error al procesar el pedido");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lastOrderId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy pesado (máx 5MB)");
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "payment");
      formData.append("bucket", "payment-proofs");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Error al subir archivo");
      const { url } = await uploadRes.json();

      const res = await fetch(`/api/orders/${lastOrderId}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentProofUrl: url }),
      });

      if (res.ok) {
        setProofUploaded(true);
        toast.success("Comprobante enviado. Tu pago está en revisión.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Error al registrar comprobante");
      }
    } catch {
      toast.error("Error al subir el comprobante");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSelectCombo = (product: Product) => {
    setSelectedProduct(product);
    setShowCheckout(true);
    setSelectedProfileId("");
    setProfileOptions([]);
    setProfileLoading(false);
    if (product.requiresPersonalization) {
      loadProfiles(product);
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleChangeCombo = () => {
    setSelectedProduct(null);
    setShowCheckout(false);
    setShippingData({ address: "", city: "", notes: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Loading state ─────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-[#DA1A21]/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#DA1A21]" />
        </div>
      </div>
      <p className="text-xs font-black uppercase tracking-widest opacity-40 italic">Cargando tienda...</p>
    </div>
  );

  // ─── Error state ───────────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-200 dark:border-amber-500/20">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-black text-slate-900 dark:text-white mb-1">{error}</p>
        <p className="text-xs text-slate-400 font-medium">Verifica tu conexión e intenta de nuevo.</p>
      </div>
      <button
        onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
        className="px-6 py-3 bg-[#DA1A21] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#B9141B] transition-all"
      >
        Reintentar
      </button>
    </div>
  );

  // ─── Empty state ───────────────────────────────────────────────
  if (products.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
        <Package className="h-10 w-10 text-slate-300" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-black text-slate-900 dark:text-white mb-1">La tienda está temporalmente sin productos disponibles.</p>
        <p className="text-xs text-slate-400 font-medium">Te avisaremos cuando vuelva el inventario.</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/dashboard/chips"
          className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
        >
          Ver Mis dispositivos
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );

  // ─── Main render ───────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* ─── Hero compacto ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#05070D] min-h-[200px] sm:min-h-[220px] flex flex-col justify-center px-6 sm:px-10 py-8 sm:py-10">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#DA1A21]/10 via-transparent to-[#05070D]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#DA1A21]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#DA1A21]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-[#DA1A21]" />
            <span className="text-white/70 text-[9px] font-black uppercase tracking-[0.25em]">Protección para activar</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.05] mb-3">
            Elige tu <span className="text-[#DA1A21]">protección</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-white/60 font-medium max-w-lg leading-relaxed mb-4">
            Compra tus chips PreRescueID y actívalos desde Mis dispositivos cuando los recibas.
          </p>

          {/* Microcopy + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400/80">
              <Clock className="h-3.5 w-3.5" />
              Pedido con pago en revisión manual
            </div>
            <Link
              href="/dashboard/pedidos"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              Ver mis pedidos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main content (hidden during checkout on mobile) ──── */}
      <div className={showCheckout || showSuccessModal ? "hidden md:block" : "block"}>
        {/* ─── Personal combos section ─────────────────────────── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                Combos personales
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Protección para ti y tu familia
              </p>
            </div>
          </div>

          {/* Products grid — personal only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {personalGrouped.map((group) =>
              group.products.map((p) => {
                const comboMeta = getComboMeta(p.name);
                const isOutOfStock = (p.availableStock ?? p.stock ?? 0) === 0;
                const isSelected = selectedProduct?.id === p.id && showCheckout;
                const ComboIcon = comboMeta?.icon || Store;

                return (
                  <div
                    key={p.id}
                    className={`relative group rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col ${
                      isSelected
                        ? "border-[#DA1A21] bg-[#DA1A21]/5 shadow-lg shadow-[#DA1A21]/10"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg"
                    }`}
                  >
                    {/* Recommended badge */}
                    {comboMeta?.recommended && (
                      <div className="absolute -top-[1px] -right-[1px] z-10">
                        <div className="bg-[#DA1A21] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-bl-[1.2rem] rounded-tr-[1.4rem]">
                          Recomendado
                        </div>
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col">
                      {/* Icon + name */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[#DA1A21] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}>
                          <ComboIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                            {p.name}
                          </h3>
                          {comboMeta && (
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                              {comboMeta.useCase}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Chips included */}
                      {comboMeta && (
                        <div className="flex items-center gap-2 mb-3">
                          <Cpu className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {comboMeta.chips} {comboMeta.chips === 1 ? "chip incluido" : "chips incluidos"}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      {p.description && (
                        <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-4 flex-1 leading-relaxed">
                          {p.description}
                        </p>
                      )}

                      {/* Availability */}
                      <div className="mb-4">
                        {isOutOfStock ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Agotado temporalmente</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Disponible</span>
                          </div>
                        )}
                      </div>

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio</span>
                          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                            ${p.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectCombo(p)}
                          disabled={isOutOfStock}
                          className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                            isOutOfStock
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#DA1A21] text-white shadow-lg shadow-[#DA1A21]/20"
                              : "bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95"
                          }`}
                        >
                          {isOutOfStock ? "Agotado" : isSelected ? "Seleccionado" : "Elegir combo"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ─── Business section (separated) ─────────────────────── */}
        {businessProducts.length > 0 && (
          <section className="space-y-4 pt-4">
            <button
              onClick={() => setShowBusinessSection(!showBusinessSection)}
              className="w-full flex items-center justify-between p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900 dark:text-white">Para empresas</p>
                  <p className="text-[10px] font-medium text-slate-400">Protección para equipos, colaboradores o instituciones.</p>
                </div>
              </div>
              {showBusinessSection ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {showBusinessSection && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {businessProducts.map((p) => {
                  const isOutOfStock = (p.availableStock ?? p.stock ?? 0) === 0;
                  return (
                    <div
                      key={p.id}
                      className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tighter">
                            {getBusinessLabel(p.name)}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            {p.description || "Solicitud con flujo separado"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-400">
                          Los pedidos empresariales requieren revisión y flujo separado.
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800 mt-auto">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio</span>
                          <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            ${p.price.toFixed(2)}
                          </p>
                        </div>
                        {isOutOfStock ? (
                          <span className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest cursor-not-allowed">
                            Agotado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectCombo(p)}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all"
                          >
                            Solicitar atención empresarial
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ─── Accessories section (secondary, only if data exists) ── */}
        {personalGrouped
          .filter((g) => g.section === "custom_products")
          .map((group) =>
            group.products.length > 0 && (
              <section key={group.section} className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white">
                      {getStoreSectionTitle(group.section)}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{group.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.products.map((p) => {
                    const isOutOfStock = (p.availableStock ?? p.stock ?? 0) === 0;
                    return (
                      <div key={p.id} className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                        {p.imageUrl || p.image ? (
                          <div className="aspect-[3/2] bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
                            <Image
                              src={resolveImageSrc(p.imageUrl || p.image, "general")}
                              alt={p.name}
                              fill
                              className="object-cover"
                              unoptimized={Boolean((p.imageUrl || p.image)?.startsWith("http"))}
                            />
                          </div>
                        ) : (
                          <div className="aspect-[3/2] bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <Store className="h-10 w-10 text-slate-200" />
                          </div>
                        )}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">{p.name}</h4>
                          <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mb-3 flex-1 leading-relaxed">
                            {p.description || "Accesorio certificado"}
                          </p>

                          {p.requiresPersonalization && (
                            <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 w-fit px-2.5 py-1 rounded-lg">
                              <AlertTriangle className="h-3 w-3" />
                              Requiere perfil con chip activo
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                            <p className="text-lg font-black text-slate-900 dark:text-white">${p.price.toFixed(2)}</p>
                            <button
                              onClick={() => handleSelectCombo(p)}
                              disabled={isOutOfStock}
                              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                isOutOfStock
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed"
                                  : "bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 active:scale-95"
                              }`}
                            >
                              {isOutOfStock ? "Agotado" : "Elegir"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
          )}
      </div>

      {/* ─── Selection summary + Form (inline, mobile-first) ──── */}
      {showCheckout && selectedProduct && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Selection summary */}
          <div className="mb-6 p-5 sm:p-6 rounded-[1.5rem] border-2 border-[#DA1A21]/20 bg-[#DA1A21]/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-[#DA1A21] flex items-center justify-center shrink-0 shadow-lg shadow-[#DA1A21]/20">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#DA1A21] mb-0.5">Combo seleccionado</p>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
                    {selectedProduct.name}
                  </h3>
                  {(() => {
                    const meta = getComboMeta(selectedProduct.name);
                    return meta ? (
                      <p className="text-xs font-medium text-slate-400 mt-0.5">
                        {meta.chips} {meta.chips === 1 ? "chip incluido" : "chips incluidos"} · ${selectedProduct.price.toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-slate-400 mt-0.5">
                        ${selectedProduct.price.toFixed(2)}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={handleChangeCombo}
                className="shrink-0 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
              >
                Cambiar combo
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-[#DA1A21]/10">
              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#DA1A21]/60" />
                <span>Cuando recibas tus chips, actívalos desde Mis dispositivos.</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div ref={formRef}>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* Profile Selector for personalized products */}
              {selectedProduct.requiresPersonalization && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                    <UserRound className="h-3.5 w-3.5 inline mr-1" />
                    ¿Para quién es este accesorio?
                  </p>
                  {profileLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando perfiles...
                    </div>
                  ) : profileOptions.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium space-y-3">
                      <p>Necesitas crear un perfil médico antes de solicitar accesorios personalizados.</p>
                      <Link
                        href="/dashboard/perfiles-medicos"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> Crear perfil médico
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profileOptions.map((profile) => {
                        const chip = profile.assignedChips?.[0];
                        const isSelected = selectedProfileId === profile.id;
                        return (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => setSelectedProfileId(profile.id)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? "border-[#DA1A21] bg-[#DA1A21]/5"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-[#DA1A21] text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                }`}>
                                  <UserRound className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm truncate text-slate-900 dark:text-white">
                                    {profile.firstName} {profile.lastName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                      {profile.profileType === "personal" ? "Principal" : "Familiar"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                {chip ? (
                                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                    /e/{chip.shortCode}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-500/20">
                                    Sin chip activo
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping form */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-6 bg-[#DA1A21] rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Información de envío</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Dirección exacta</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-5 h-5 w-5 text-slate-400" />
                    <textarea
                      required
                      rows={2}
                      value={shippingData.address}
                      onChange={e => setShippingData({...shippingData, address: e.target.value})}
                      placeholder="Calle, No. de Casa, Edificio, Apartamento..."
                      className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 pl-14 pr-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all resize-none outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Ciudad / Área</label>
                    <input
                      required
                      type="text"
                      value={shippingData.city}
                      onChange={e => setShippingData({...shippingData, city: e.target.value})}
                      placeholder="Panamá, Chitré..."
                      className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Método de pago</label>
                    <div className="w-full bg-slate-900 text-white rounded-2xl px-6 py-5 flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-[#DA1A21]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Yappy Manual</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Notas adicionales</label>
                  <input
                    type="text"
                    value={shippingData.notes}
                    onChange={e => setShippingData({...shippingData, notes: e.target.value})}
                    placeholder="Referencia de entrega, color de casa..."
                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Total + submit */}
              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-sm font-black text-slate-500 uppercase tracking-tight">Total</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#DA1A21] tracking-tighter">
                    ${selectedProduct.price.toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="w-full py-5 bg-[#DA1A21] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#DA1A21]/20 hover:bg-[#B9141B] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {creatingOrder ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Confirmando...</>
                  ) : (
                    <><Package className="h-5 w-5" /> Crear pedido</>
                  )}
                </button>

                <p className="text-[9px] text-center text-slate-400 font-bold uppercase opacity-60">
                  Al crear tu pedido, quedará en revisión. Recibirás instrucciones de pago.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Success screen (mobile inline) ────────────────────── */}
      {showSuccessModal && (
        <div className="block md:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white mb-2">
              Pedido creado
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
              Tu pedido fue creado. Sube tu comprobante y revisa el estado en Mis pedidos.
            </p>
          </div>

          <div className="space-y-5">
            {/* Payment info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black uppercase text-indigo-500 mb-2">Yappy</p>
                <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-2xl mx-auto mb-3 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                  {paymentConfig?.yappy_qr_url ? (
                    <Image
                      src={paymentConfig.yappy_qr_url}
                      alt="QR"
                      width={96}
                      height={96}
                      unoptimized
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <QrCode className="h-8 w-8 text-indigo-400 opacity-20" />
                  )}
                </div>
                <p className="text-md font-black text-indigo-600">{paymentConfig?.yappy_handle || '@...'}</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-3">ACH / Banco</p>
                <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 leading-tight">
                  {paymentConfig?.bank_name || 'BANCO'}<br/>
                  {paymentConfig?.bank_account_type || 'CUENTA'}<br/>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm tracking-widest">{paymentConfig?.bank_account_number || '...'}</span>
                </p>
              </div>
            </div>

            {/* Upload proof */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${
              proofUploaded
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800'
            }`}>
              {proofUploaded ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Comprobante enviado. Tu pago está en revisión.</p>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sube tu comprobante de pago</p>
                  <p className="text-[10px] text-slate-400">Selecciona una imagen o captura del comprobante de tu pago.</p>
                  <div className="flex items-center justify-center gap-3">
                    <input
                      id="proof-upload-tienda-mobile"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleUploadProof}
                      disabled={uploadingProof}
                    />
                    <label
                      htmlFor="proof-upload-tienda-mobile"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#DA1A21] text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-[#B9141B] transition-all disabled:opacity-50"
                    >
                      {uploadingProof ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                      ) : (
                        <><Upload className="h-4 w-4" /> Seleccionar archivo</>
                      )}
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400">Máx 5MB. Formatos: JPG, PNG, WebP.</p>
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-400 text-center">
              También puedes subir tu comprobante después desde{' '}
              <button onClick={() => router.push("/dashboard/pedidos")} className="underline font-bold text-[#DA1A21]">Mis Pedidos</button>.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/dashboard/pedidos")}
                className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                Ir a Mis pedidos <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/dashboard/chips"
                className="w-full py-4 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-center flex items-center justify-center gap-2"
              >
                Ver Mis dispositivos <Cpu className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Desktop success modal ─────────────────────────────── */}
      {showSuccessModal && (
        <div className="hidden md:block fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-2xl animate-in zoom-in-95 duration-300">
          <div className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-[3rem] shadow-2xl relative overflow-hidden p-10 sm:p-12 text-center border border-white/10">
            <div className="h-20 w-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>

            <h3 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3 text-slate-900 dark:text-white">
              Pedido creado
            </h3>
            <p className="text-sm font-bold text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
              Tu pedido fue creado. Sube tu comprobante y revisa el estado en Mis pedidos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black uppercase text-indigo-500 mb-2">Yappy</p>
                <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-2xl mx-auto mb-3 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                  {paymentConfig?.yappy_qr_url ? (
                    <Image
                      src={paymentConfig.yappy_qr_url}
                      alt="QR"
                      width={96}
                      height={96}
                      unoptimized
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <QrCode className="h-8 w-8 text-indigo-400 opacity-20" />
                  )}
                </div>
                <p className="text-md font-black text-indigo-600">{paymentConfig?.yappy_handle || '@...'}</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-3">ACH / Banco</p>
                <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 leading-tight">
                  {paymentConfig?.bank_name || 'BANCO'}<br/>
                  {paymentConfig?.bank_account_type || 'CUENTA'}<br/>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm tracking-widest">{paymentConfig?.bank_account_number || '...'}</span>
                </p>
              </div>
            </div>

            {/* Upload proof */}
            <div className={`p-6 mb-8 rounded-2xl border-2 transition-all ${
              proofUploaded
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800'
            }`}>
              {proofUploaded ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">Comprobante enviado. Tu pago está en revisión.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sube tu comprobante de pago</p>
                  <p className="text-[10px] text-slate-400">Selecciona una imagen o captura del comprobante de tu pago.</p>
                  <div className="flex items-center justify-center gap-3">
                    <input
                      id="proof-upload-tienda"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleUploadProof}
                      disabled={uploadingProof}
                    />
                    <label
                      htmlFor="proof-upload-tienda"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#DA1A21] text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-[#B9141B] transition-all disabled:opacity-50"
                    >
                      {uploadingProof ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                      ) : (
                        <><Upload className="h-4 w-4" /> Seleccionar archivo</>
                      )}
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400">Máx 5MB. Formatos: JPG, PNG, WebP.</p>
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-400 mb-6">
              También puedes subir tu comprobante después desde{' '}
              <button onClick={() => router.push("/dashboard/pedidos")} className="underline font-bold text-[#DA1A21]">Mis Pedidos</button>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/dashboard/pedidos")}
                className="flex-1 py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                Ir a Mis pedidos <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/dashboard/chips"
                className="flex-1 py-5 border border-slate-200 dark:border-slate-800 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
              >
                Ver Mis dispositivos <Cpu className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}