"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShoppingCart, Package, Loader2,
  MapPin, CheckCircle2, Clock, AlertTriangle,
  Upload, ArrowRight, UserRound, Plus, ShieldCheck, Cpu,
  Info, Phone
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { type StoreProductLike } from "@/lib/products/group-products-by-store-section";

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
  availableStock?: number;
  reservedStock?: number;
  estimatedProductionTime: string | null;
  stock?: number;
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
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingNotes: string;
  paymentMethod: "yappy" | "bank_transfer";
}

interface CheckoutContext {
  recipientName?: string;
  phone?: string;
  address?: string;
  city?: string;
}

interface PaymentConfig {
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
}

function isBusinessProduct(product: Product): boolean {
  const mapping = product.operationalMapping;
  return (
    mapping?.storeSection === "business_devices" ||
    mapping?.deviceType === "business" ||
    mapping?.purchaseFlow === "company_request" ||
    mapping?.requiresCompanyContext === true
  );
}

function getStockValue(product: Product | null | undefined) {
  if (!product) return 0;
  const candidates = [product.availableStock, product.stock, product.reservedStock ? Math.max(0, (product.availableStock ?? product.stock ?? 0) - product.reservedStock) : undefined];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  }
  return 0;
}

function getStockMessage(product: Product | null | undefined, quantity: number) {
  const availableStock = getStockValue(product);
  if (availableStock <= 0) {
    return "No tenemos stock disponible ahora. Puedes crear el pedido; producción estimada: 2 semanas.";
  }
  if (quantity <= availableStock) {
    return "Disponible para pedido.";
  }
  const remaining = quantity - availableStock;
  return `Tenemos ${availableStock} disponibles. Las ${remaining} restantes entran a producción. Tiempo estimado: 2 semanas.`;
}

function normalizePrice(price: number | string | null | undefined) {
  if (typeof price === "number" && Number.isFinite(price)) return price;
  if (typeof price === "string") {
    const normalized = Number(price);
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}

function getProductTotal(product: Product | null | undefined, quantity: number) {
  return normalizePrice(product?.price) * quantity;
}

// ─── Component ───────────────────────────────────────────────────
export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [catalogQuantities, setCatalogQuantities] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"yappy" | "bank_transfer">("yappy");
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [shippingData, setShippingData] = useState({
    recipientName: "",
    phone: "",
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

    // Convenience only: these defaults never become authoritative until the
    // customer reviews/submits them. The order stores its own delivery snapshot.
    fetch("/api/orders/checkout-context", { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then((data: CheckoutContext | null) => {
        if (!data) return;
        setShippingData(prev => ({
          recipientName: prev.recipientName || data.recipientName || "",
          phone: prev.phone || data.phone || "",
          address: prev.address || data.address || "",
          city: prev.city || data.city || "",
          notes: prev.notes,
        }));
      })
      .catch(() => {
        // Checkout remains fully usable when the profile has no saved defaults.
      });
  }, []);

  // Separate personal vs business products
  const personalProducts = products.filter((p) => !isBusinessProduct(p));
  const businessProducts = products.filter((p) => isBusinessProduct(p));
  const selectedStock = getStockValue(selectedProduct);
  const selectedTotal = getProductTotal(selectedProduct, quantity);
  const selectedStockMessage = getStockMessage(selectedProduct, quantity);
  const getCatalogQuantity = (productId: string) => catalogQuantities[productId] ?? 1;

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
          quantity,
          unitPrice: selectedProduct.price,
        }],
        customerName: shippingData.recipientName.trim(),
        customerPhone: shippingData.phone.trim(),
        shippingAddress: shippingData.address.trim(),
        shippingCity: shippingData.city.trim(),
        shippingNotes: shippingData.notes.trim(),
        paymentMethod,
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
        setLastOrderId(data.order?.id || null);
        setProofUploaded(false);
        if (paymentMethod === "yappy") {
          toast.success("Pedido creado. Continua con el pago Yappy.");
          router.push("/dashboard/pedidos");
          return;
        }
        setShowSuccessModal(true);
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

  const handleSelectProduct = (product: Product, options?: { resetQuantity?: boolean }) => {
    setSelectedProduct(product);
    setQuantity(options?.resetQuantity === false ? getCatalogQuantity(product.id) : 1);
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

  const handleChangeProduct = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setShowCheckout(false);
    // Keep reviewed delivery details if the customer only changes product.
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateCatalogQuantity = (productId: string, nextQuantity: number) => {
    const normalized = Number.isFinite(nextQuantity) ? Math.min(99, Math.max(1, Math.floor(nextQuantity))) : 1;
    setCatalogQuantities((prev) => ({ ...prev, [productId]: normalized }));
    if (selectedProduct?.id === productId) {
      setQuantity(normalized);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-5">
      <div className="relative">
        <div className="h-16 w-16 rounded-[1.75rem] bg-[#DA1A21]/10 ring-1 ring-[#DA1A21]/10 flex items-center justify-center shadow-[0_20px_60px_-28px_rgba(218,26,33,0.45)]">
          <Loader2 className="h-8 w-8 animate-spin text-[#DA1A21]" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-black text-slate-900 dark:text-white">Preparando Tienda</p>
        <p className="text-xs font-medium text-slate-400">Cargando catálogo y métodos de pago seguros.</p>
      </div>
    </div>
  );

  // ─── Error state ───────────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="h-16 w-16 rounded-[1.75rem] bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-200 dark:border-amber-500/20 shadow-[0_20px_60px_-28px_rgba(245,158,11,0.35)]">
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
      <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <Package className="h-10 w-10 text-slate-300" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-black text-slate-900 dark:text-white mb-1">La tienda está temporalmente sin productos disponibles.</p>
        <p className="text-xs text-slate-400 font-medium">Te avisaremos cuando vuelva el inventario.</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/dashboard/chips"
          className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
        >
          Ver Mis dispositivos
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 border border-slate-200 dark:border-slate-800 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
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
      <div className="relative overflow-hidden rounded-[2rem] bg-[#05070D] min-h-[220px] sm:min-h-[240px] flex flex-col justify-center px-6 sm:px-10 py-8 sm:py-10 ring-1 ring-white/10 shadow-[0_30px_90px_-50px_rgba(2,6,23,0.9)]">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#DA1A21]/12 via-transparent to-[#05070D]" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#DA1A21]/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-4 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-[#DA1A21]" />
            <span className="text-white/75 text-[9px] font-black uppercase tracking-[0.25em]">Tienda oficial segura</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.05] mb-3">
            Elige tu <span className="text-[#DA1A21]">pedido</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-white/60 font-medium max-w-lg leading-relaxed mb-4">
            Compra productos oficiales con Yappy o transferencia y sigue todo desde Mis pedidos.
          </p>

          {/* Microcopy + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-300/90">
              <Clock className="h-3.5 w-3.5" />
              Pago Yappy automático o transferencia
            </div>
            <Link
              href="/dashboard/pedidos"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070D] rounded-full px-2 py-1"
            >
              Ver mis pedidos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main content (hidden during checkout on mobile) ──── */}
      <div className={showCheckout || showSuccessModal ? "hidden md:block" : "block"}>
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                Productos personales
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Elige el producto y la cantidad que necesitas.
              </p>
            </div>
          </div>

          {personalProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {personalProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const cardQuantity = getCatalogQuantity(p.id);
                const stock = getStockValue(p);
                const total = getProductTotal(p, cardQuantity);
                const productPrice = normalizePrice(p.price);

                return (
                  <div
                    key={p.id}
                    className={`group rounded-[2rem] border bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)] transition-all duration-300 dark:bg-slate-950/80 ${
                      isSelected
                        ? "border-[#DA1A21]/30 ring-4 ring-[#DA1A21]/10"
                        : "border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="rounded-[2rem] bg-gradient-to-b from-white to-slate-50/80 p-5 sm:p-6 dark:from-slate-950 dark:to-slate-950">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#DA1A21]">
                            {isSelected ? "Seleccionado" : "Producto"}
                          </p>
                          <h3 className="mt-1 text-lg font-black tracking-tighter text-slate-950 dark:text-white">
                            {p.name}
                          </h3>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unitario</p>
                          <p className="text-base font-black text-slate-950 dark:text-white">${productPrice.toFixed(2)}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {p.description || "Producto disponible"}
                      </p>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Stock</p>
                          <p className="mt-1 text-lg font-black tracking-tighter text-slate-950 dark:text-white">{stock}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cantidad</p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCatalogQuantity(p.id, cardQuantity - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                              aria-label={`Disminuir cantidad de ${p.name}`}
                              disabled={cardQuantity <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={cardQuantity}
                              onChange={(event) => updateCatalogQuantity(p.id, Number(event.target.value))}
                              className="h-8 w-12 rounded-xl border border-slate-200 bg-white text-center text-sm font-black text-slate-950 outline-none focus:border-[#DA1A21]/30 focus:ring-2 focus:ring-[#DA1A21]/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => updateCatalogQuantity(p.id, cardQuantity + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                              aria-label={`Aumentar cantidad de ${p.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
                          <p className="mt-1 text-lg font-black tracking-tighter text-[#DA1A21]">${total.toFixed(2)}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {getStockMessage(p, cardQuantity)}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            updateCatalogQuantity(p.id, cardQuantity);
                            handleSelectProduct(p, { resetQuantity: false });
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#DA1A21] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#B9141B] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                        >
                          {isSelected ? "Continuar" : "Seleccionar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-black text-slate-900 dark:text-white">No hay productos personales disponibles.</p>
              <p className="mt-1 text-xs text-slate-400">Vuelve más tarde cuando haya inventario publicado.</p>
            </div>
          )}
        </section>

        {businessProducts.length > 0 && (
          <section className="pt-4">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-5 sm:p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Compras para empresa</p>
                  <h2 className="text-lg sm:text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                    Gestiona pedidos empresariales desde Empresa.
                  </h2>
                  <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">
                    Los pedidos empresariales se mantienen en un flujo separado para conservar aprobación, asignación y control internos.
                  </p>
                </div>
                <Link
                  href="/dashboard/empresas"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Ir a Empresa <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* ─── Selection summary + Form (inline, mobile-first) ──── */}
      {showCheckout && selectedProduct && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Selection summary */}
          <div className="mb-6 p-5 sm:p-6 rounded-[1.75rem] border border-[#DA1A21]/20 bg-[#DA1A21]/5 shadow-[0_20px_60px_-40px_rgba(218,26,33,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-[#DA1A21] flex items-center justify-center shrink-0 shadow-lg shadow-[#DA1A21]/20">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#DA1A21] mb-0.5">Producto seleccionado</p>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    ${selectedTotal.toFixed(2)} total · cantidad {quantity} · stock {selectedStock}
                  </p>
                </div>
              </div>
              <button
                onClick={handleChangeProduct}
                className="shrink-0 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                Cambiar producto
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-[#DA1A21]/10">
              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#DA1A21]/60" />
                <span>Cuando recibas tu pedido, revisa el pago y sube tu comprobante desde Mis pedidos.</span>
              </div>
            </div>
            <p className="mt-3 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {selectedStockMessage}
            </p>
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
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium space-y-3 shadow-[0_18px_50px_-30px_rgba(245,158,11,0.35)]">
                      <p>Necesitas crear un perfil médico antes de solicitar accesorios personalizados.</p>
                      <Link
                        href="/dashboard/perfiles-medicos"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
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
                            className={`w-full text-left p-4 rounded-[1.5rem] border transition-all duration-300 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.28)] ${
                              isSelected
                                ? "border-[#DA1A21]/30 bg-[#DA1A21]/6 ring-4 ring-[#DA1A21]/5"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-700"
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
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                      {profile.profileType === "personal" ? "Principal" : "Familiar"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                {chip ? (
                                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                                    /e/{chip.shortCode}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-500/20">
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
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Información de entrega</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[11px] font-medium leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  Estos datos identifican a quien recibirá este pedido. Los precargamos desde tu cuenta cuando existen, pero puedes cambiarlos sin modificar tu perfil médico.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nombre de quien recibe</label>
                    <div className="relative">
                      <UserRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        required
                        minLength={2}
                        maxLength={200}
                        autoComplete="name"
                        type="text"
                        value={shippingData.recipientName}
                        onChange={e => setShippingData({...shippingData, recipientName: e.target.value})}
                        placeholder="Nombre y apellido"
                        className="w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 pl-14 pr-6 py-5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Teléfono de contacto</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        required
                        minLength={7}
                        maxLength={30}
                        autoComplete="tel"
                        inputMode="tel"
                        type="tel"
                        value={shippingData.phone}
                        onChange={e => setShippingData({...shippingData, phone: e.target.value})}
                        placeholder="Ej. 6000-0000"
                        className="w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 pl-14 pr-6 py-5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Dirección exacta</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-5 h-5 w-5 text-slate-400" />
                    <textarea
                      required
                      minLength={5}
                      maxLength={500}
                      autoComplete="street-address"
                      rows={2}
                      value={shippingData.address}
                      onChange={e => setShippingData({...shippingData, address: e.target.value})}
                      placeholder="Calle, No. de Casa, Edificio, Apartamento..."
                      className="w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 pl-14 pr-6 py-5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all resize-none outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Ciudad / Área</label>
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="address-level2"
                      type="text"
                      value={shippingData.city}
                      onChange={e => setShippingData({...shippingData, city: e.target.value})}
                      placeholder="Panamá, Chitré..."
                      className="w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 px-6 py-5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Método de pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("yappy")}
                        className={`rounded-2xl border px-4 py-4 text-left text-[10px] font-black uppercase tracking-wider transition ${paymentMethod === "yappy" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}
                      >
                        Yappy
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bank_transfer")}
                        className={`rounded-2xl border px-4 py-4 text-left text-[10px] font-black uppercase tracking-wider transition ${paymentMethod === "bank_transfer" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}
                      >
                        Transferencia
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Notas adicionales</label>
                  <input
                    type="text"
                    maxLength={500}
                    value={shippingData.notes}
                    onChange={e => setShippingData({...shippingData, notes: e.target.value})}
                    placeholder="Referencia de entrega, color de casa..."
                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 px-6 py-5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-[#DA1A21]/10 focus:border-[#DA1A21]/30 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Total + submit */}
              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.25)]">
                  <span className="text-sm font-black text-slate-500 uppercase tracking-tight">Total</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#DA1A21] tracking-tighter">
                    ${selectedTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="w-full py-5 bg-[#DA1A21] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-[#DA1A21]/20 hover:bg-[#B9141B] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                >
                  {creatingOrder ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Confirmando...</>
                  ) : (
                    <><Package className="h-5 w-5" /> Crear pedido</>
                  )}
                </button>

                <p className="text-[9px] text-center text-slate-400 font-bold uppercase opacity-60">
                  El monto y los datos de entrega se validan en el servidor.
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
            <div className="h-16 w-16 rounded-[1.75rem] bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white mb-2">
              Pedido creado
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
              Tu pedido fue creado. Si no hay stock suficiente, la producción estimada es de 2 semanas. Revisa el pago y sube tu comprobante desde Mis pedidos.
            </p>
          </div>

          <div className="space-y-5">
            {/* Payment info */}
            <div className="grid grid-cols-1 gap-4">
                <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center shadow-[0_16px_40px_-30px_rgba(15,23,42,0.25)]">
                  <p className="text-[10px] font-black uppercase text-emerald-500 mb-3">ACH / Banco</p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#DA1A21] text-white rounded-full font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-[#B9141B] transition-all disabled:opacity-50"
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
                className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                Ir a Mis pedidos <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/dashboard/chips"
                className="w-full py-4 border border-slate-200 dark:border-slate-800 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-center flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
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
            <div className="h-20 w-20 bg-emerald-500 rounded-[1.75rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>

            <h3 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3 text-slate-900 dark:text-white">
              Pedido creado
            </h3>
            <p className="text-sm font-bold text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
              Tu pedido fue creado. Si no hay stock suficiente, la producción estimada es de 2 semanas. Revisa el pago y sube tu comprobante desde Mis pedidos.
            </p>

            <div className="grid grid-cols-1 gap-4 mb-8">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center flex flex-col justify-center shadow-[0_16px_40px_-30px_rgba(15,23,42,0.25)]">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-3">ACH / Banco</p>
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#DA1A21] text-white rounded-full font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-[#B9141B] transition-all disabled:opacity-50"
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
                className="flex-1 py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                Ir a Mis pedidos <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/dashboard/chips"
                className="flex-1 py-5 border border-slate-200 dark:border-slate-800 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
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
