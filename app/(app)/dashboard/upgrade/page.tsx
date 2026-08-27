"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import {
  Check,
  Users,
  Building2,
  ChevronRight,
  ArrowRight,
  Loader2,
  MapPin,
  Phone,
  PackageCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PACKAGE_THEMES } from "@/domains/shared/constants";

interface UpgradeState {
  packageId?: string | null;
}

interface UpgradePackage {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  recommended?: boolean;
  maxChips: number;
  maxProfiles: number;
  allowsFamilyProfiles?: boolean;
  allowsOrganizationModule?: boolean;
  serviceDurationMonths: number;
  accountType?: string | null;
}

interface CheckoutContext {
  recipientName?: string;
  phone?: string;
  address?: string;
  city?: string;
}

type PaymentMethod = "yappy" | "bank_transfer";

export default function UpgradePage() {
  const router = useRouter();
  const checkoutRef = useRef<HTMLDivElement>(null);
  const queryHandledRef = useRef(false);
  const [state, setState] = useState<UpgradeState | null>(null);
  const [packages, setPackages] = useState<UpgradePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<UpgradePackage | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("yappy");
  const [shippingData, setShippingData] = useState({
    recipientName: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stateRes, pkgsRes, checkoutRes] = await Promise.all([
          fetch("/api/account/state", { cache: "no-store" }),
          fetch("/api/public/packages"),
          fetch("/api/orders/checkout-context", { cache: "no-store" }),
        ]);

        const stateData = await stateRes.json() as UpgradeState;
        const pkgsData = await pkgsRes.json() as { packages?: UpgradePackage[] };
        const checkoutData = checkoutRes.ok
          ? await checkoutRes.json() as CheckoutContext
          : null;

        setState(stateData);
        setPackages(pkgsData.packages || []);
        if (checkoutData) {
          setShippingData((prev) => ({
            recipientName: prev.recipientName || checkoutData.recipientName || "",
            phone: prev.phone || checkoutData.phone || "",
            address: prev.address || checkoutData.address || "",
            city: prev.city || checkoutData.city || "",
            notes: prev.notes,
          }));
        }
      } catch (err) {
        console.error("Error loading for upgrade:", err);
        toast.error("No pudimos cargar las opciones de compra.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (queryHandledRef.current || packages.length === 0) return;
    queryHandledRef.current = true;

    const packageId = new URLSearchParams(window.location.search).get("packageId");
    if (!packageId) return;

    const targetPackage = packages.find((pkg) => pkg.id === packageId && pkg.accountType !== "company");
    if (!targetPackage) return;

    setSelectedPackage(targetPackage);
    window.setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [packages]);

  const getColorClass = (colorKey?: string | null) => {
    const theme = PACKAGE_THEMES[colorKey || "standard"];
    return theme?.styles || PACKAGE_THEMES.standard.styles;
  };

  const openCheckout = (pkg: UpgradePackage) => {
    setSelectedPackage(pkg);
    window.setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const submitPackageOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPackage || submittingOrder) return;

    setSubmittingOrder(true);
    try {
      const response = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          customerName: shippingData.recipientName.trim(),
          customerPhone: shippingData.phone.trim(),
          shippingAddress: shippingData.address.trim(),
          shippingCity: shippingData.city.trim(),
          shippingNotes: shippingData.notes.trim(),
          paymentMethod,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo crear el pedido del paquete");
      }

      if (data?.operationsSyncWarning) {
        console.warn("PACKAGE_ORDER_OPERATIONS_SYNC_WARNING", data.operationsSyncWarning);
      }

      toast.success("Pedido creado. Completa el pago desde Mis pedidos.");
      router.push("/dashboard/pedidos");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el pedido";
      toast.error(message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando opciones de mejora...</p>
      </div>
    );
  }

  const displayPackages = packages;

  return (
    <div className="pb-12">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
          Inventario Extra <span className="text-primary px-3 py-1 rounded-full bg-primary/10 text-xs font-bold uppercase tracking-widest">Tienda</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Elige cualquiera de estos paquetes acumulativos para añadir físicamente más tarjetas NFC y espacio para nuevos perfiles dentro de tu misma cuenta base.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {displayPackages.map((pkg) => {
          const colors = getColorClass(pkg.color);
          const isCurrent = state?.packageId === pkg.id;

          return (
            <div
              key={pkg.id}
              className={`relative p-8 rounded-[2.5rem] border group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-card ${pkg.recommended ? "border-primary/50 shadow-xl shadow-primary/5" : "border-border active:scale-[0.98]"}`}
            >
              {pkg.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg shadow-primary/20">
                  ⭐ El más recomendado
                </div>
              )}

              <div className={`h-14 w-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-6`}>
                <span className="text-3xl">{pkg.icon || PACKAGE_THEMES[pkg.color || "standard"]?.icon}</span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black">{pkg.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    Último adquirido
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black">${pkg.price}</span>
                <span className="text-xs text-muted-foreground">Pago único</span>
              </div>

              <p className="text-sm text-balance text-muted-foreground mb-6 h-10 italic">
                {pkg.description || "Mejora tu cobertura y seguridad hoy."}
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{pkg.maxChips} Stickers NFC/QR</span>
                </li>
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{pkg.maxProfiles} Perfiles Médicos</span>
                </li>
                {pkg.allowsFamilyProfiles && (
                  <li className="flex items-start gap-2 text-sm font-medium">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>Cuentas Familiares</span>
                  </li>
                )}
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>Alertas Ilimitadas</span>
                </li>
                {pkg.allowsOrganizationModule && (
                  <li className="flex items-start gap-2 text-sm font-medium">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>Módulo Administrativo</span>
                  </li>
                )}
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>Vigencia {pkg.serviceDurationMonths / 12} años</span>
                </li>
              </ul>

              {pkg.accountType === "company" ? (
                <Link
                  href={`/contacto?subject=Solicitud%20de%20Compra%20de%20Paquete%20${encodeURIComponent(pkg.name)}`}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Contactar Ventas <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openCheckout(pkg)}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all ${
                    pkg.recommended
                      ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
                      : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  Comprar Combo <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedPackage && (
        <div ref={checkoutRef} className="scroll-mt-24 mb-12 rounded-[2.5rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 mb-3">
                <PackageCheck className="h-4 w-4" /> Checkout de paquete
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">{selectedPackage.name}</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {selectedPackage.maxChips} dispositivos · {selectedPackage.maxProfiles} perfiles · ${selectedPackage.price}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPackage(null)}
              className="self-end sm:self-start h-10 w-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar checkout"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={submitPackageOrder} className="space-y-6">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-slate-600">
              <p className="font-black text-slate-900">Datos de entrega del pedido</p>
              <p className="mt-1 text-xs font-medium leading-relaxed">
                Puedes usar una dirección distinta a la de tu perfil. Estos datos se guardan como una copia inmutable del pedido y no modifican tu información médica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Nombre de quien recibe</span>
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  autoComplete="name"
                  value={shippingData.recipientName}
                  onChange={(e) => setShippingData((prev) => ({ ...prev, recipientName: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Teléfono de contacto</span>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    minLength={7}
                    maxLength={30}
                    type="tel"
                    autoComplete="tel"
                    value={shippingData.phone}
                    onChange={(e) => setShippingData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Dirección exacta</span>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    rows={3}
                    autoComplete="street-address"
                    value={shippingData.address}
                    onChange={(e) => setShippingData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ciudad / Área</span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="address-level2"
                  value={shippingData.city}
                  onChange={(e) => setShippingData((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Método de pago</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="yappy">Yappy</option>
                  <option value="bank_transfer">Transferencia bancaria</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Notas de entrega (opcional)</span>
                <textarea
                  maxLength={500}
                  rows={2}
                  value={shippingData.notes}
                  onChange={(e) => setShippingData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Edificio, piso, referencias o instrucciones para la entrega"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total del pedido</p>
                <p className="mt-1 text-2xl font-black text-slate-950">${selectedPackage.price}</p>
              </div>
              <button
                type="submit"
                disabled={submittingOrder}
                className="rounded-full bg-primary px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submittingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {submittingOrder ? "Creando pedido..." : "Crear pedido"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-[3rem] p-10 bg-slate-900 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] -mr-48 -mt-48 transition-all group-hover:scale-110" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Soluciones Corporativas</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-4">¿Necesitas proteger a todo tu equipo?</h2>
            <p className="text-slate-300 mb-6 text-lg leading-relaxed">
              Ofrecemos lotes corporativos de chips para empresas, colegios y flotillas con decenas de integrantes.
              Recibirás credenciales corporativas (Owner/Admin) para delegar chips independientemente a tus colaboradores.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link href="/contacto?subject=Membresía%20Empresarial" className="px-8 py-4 bg-primary rounded-2xl font-black text-white hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98]">
                Cotizar Empresas <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-shrink-0">
            <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
              <Users className="h-8 w-8 text-primary/80" />
              <span className="text-[10px] font-bold uppercase text-slate-400">RRHH Admin</span>
            </div>
            <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 backdrop-blur-sm translate-y-6">
              <CreditCard className="h-8 w-8 text-blue-400/80" />
              <span className="text-[10px] font-bold uppercase text-slate-400">Facturación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreditCard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
