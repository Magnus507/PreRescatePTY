"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ShoppingCart, Store, Package, Loader2, X, MapPin, CreditCard, CheckCircle2, QrCode, Clock, AlertTriangle, Upload, ArrowRight, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number;
  image: string | null;
  productType: string;
  estimatedProductionTime: string | null;
  requiresPersonalization: boolean;
}

interface ProfileOption {
  id: string;
  firstName: string;
  lastName: string;
  profileType: string;
  displayNamePublic?: string | null;
  assignedChips?: { id: string; shortCode: string }[];
}

interface PaymentConfig {
  yappy_qr_url?: string;
  yappy_handle?: string;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
}

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
  const router = useRouter();

  const [shippingData, setShippingData] = useState({
    address: "",
    city: "",
    notes: ""
  });

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/public/config")
      .then(res => res.json())
      .then(data => {
        if (data.configs) setPaymentConfig(data.configs);
      });
  }, []);

  const loadProfiles = async (product?: Product) => {
    const target = product ?? null;
    if (!target?.requiresPersonalization) return;
    setProfileLoading(true);
    try {
      const res = await fetch("/api/users/perfiles-medicos");
      const json = await res.json();
      const payload = json.data ?? json;
      const profiles: ProfileOption[] = [];
      if (payload.ownProfile) {
        profiles.push({ ...payload.ownProfile, profileType: "personal" });
      }
      if (Array.isArray(payload.familyProfiles)) {
        profiles.push(...payload.familyProfiles.map((p: any) => ({ ...p, profileType: "family" })));
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
      const body: any = {
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

        // Soft warning if profile has no chip
        const selectedProfile = profileOptions.find(p => p.id === selectedProfileId);
        const hasChip = !!selectedProfile?.assignedChips?.[0];
        if (!hasChip) {
          const ok = confirm("Este perfil todavía no tiene un chip/QR activo asociado. Puedes continuar, pero el accesorio quedará pendiente de vinculación de QR antes de fabricarse. ¿Deseas continuar?");
          if (!ok) {
            setCreatingOrder(false);
            return;
          }
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

  const handleOpenCheckout = (product: Product) => {
    setSelectedProduct(product);
    setShowCheckout(true);
    setSelectedProfileId("");
    setProfileOptions([]);
    setProfileLoading(false);
    if (product.requiresPersonalization) {
      // Use setTimeout to ensure state is updated before calling loadProfiles
      loadProfiles(product);
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
    } catch (err) {
      toast.error("Error al subir el comprobante");
      console.error(err);
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 className="h-10 w-10 animate-spin text-primary" />
       <p className="text-xs font-black uppercase tracking-widest opacity-40 italic">Cargando Productos Vitales...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className={(showCheckout || showSuccessModal) ? "hidden md:block" : "block"}>

      {/* Hero Section */}
      <div className="relative h-[300px] rounded-[3rem] overflow-hidden bg-slate-900 group shadow-2xl shadow-slate-900/20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-transparent z-10" />
        <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&q=80')] bg-cover bg-center group-hover:scale-105 transition-transform [transition-duration:3000ms]" />
        
        <div className="relative h-full flex flex-col justify-center px-12 z-20 space-y-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 w-fit px-4 py-1.5 rounded-full">
            <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Catálogo Oficial {new Date().getFullYear()}</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter">
            Equipamiento <br /> de Protección
          </h1>
          <p className="text-slate-100 text-sm font-medium max-w-md opacity-80 leading-relaxed">
            Adquiere los accesorios oficiales de PreRescue ID para mantener tu red de protección siempre activa y visible.
          </p>
        </div>
      </div>

      {/* Featured Products */}
      <div>
        <div className="flex items-center justify-between mb-10">
           <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase">
                <span className="text-brand">PRE</span>{' '}
                <span className="text-slate-900 dark:text-white">RESCUE</span>{' '}
                <span className="text-brand">ID</span>
              </h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Tienda de accesorios <span className="text-brand">Pre</span>Rescue<span className="text-brand">ID</span>
              </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {products.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/60 dark:hover:shadow-none transition-all flex flex-col">
              <div className="aspect-square bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative p-8 md:p-12 overflow-hidden transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-700">
                 <div className="absolute top-4 right-4 md:top-8 md:right-8 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-slate-900 shadow-xl rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest z-10">
                   {p.category}
                 </div>
                 <div className="absolute bottom-4 left-4 z-10">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${
                      p.productType === 'sticker' ? 'bg-blue-500/90 text-white' :
                      p.productType === 'llavero' ? 'bg-amber-500/90 text-white' :
                      p.productType === 'tarjeta' ? 'bg-purple-500/90 text-white' :
                      p.productType === 'brazalete' ? 'bg-emerald-500/90 text-white' :
                      p.productType === 'combo' ? 'bg-rose-500/90 text-white' :
                      'bg-slate-500/90 text-white'
                    }`}>
                      {p.productType === 'sticker' ? 'Sticker' :
                       p.productType === 'llavero' ? 'Llavero' :
                       p.productType === 'tarjeta' ? 'Tarjeta' :
                       p.productType === 'brazalete' ? 'Brazalete' :
                       p.productType === 'combo' ? 'Combo' :
                       p.productType || 'Producto'}
                    </span>
                 </div>
                 {p.image ? (
                   <img src={`/api/image-proxy?bucket=general&path=${encodeURIComponent(p.image.split('/').slice(-2).join('/'))}`} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => { if (p.image) e.currentTarget.src = p.image; }} />
                 ) : (
                   <Store className="h-20 w-20 md:h-24 md:w-24 text-slate-200 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700" />
                 )}
              </div>
              <div className="p-6 md:p-10 flex-1 flex flex-col">
                <h3 className="text-xl md:text-2xl font-black tracking-tighter mb-2 md:mb-3 group-hover:text-primary transition-colors">{p.name}</h3>
                <p className="text-xs md:text-sm text-slate-400 font-medium line-clamp-2 mb-4 md:mb-6 flex-1 leading-relaxed">
                  {p.description || "Accesorio certificado de alta durabilidad."}
                </p>

                {p.estimatedProductionTime && (
                   <div className="flex items-center gap-2 mb-4 text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 w-fit px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                      <Clock className="h-3 w-3 md:h-4 md:w-4" />
                      {p.estimatedProductionTime}
                   </div>
                )}

                {p.requiresPersonalization && (
                   <div className="flex items-center gap-2 mb-4 text-[10px] md:text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 w-fit px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                      <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                      Requiere personalización
                   </div>
                )}

                <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-slate-50 dark:border-slate-800">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión</span>
                      <p className="text-3xl font-black text-primary italic leading-none">${p.price.toFixed(2)}</p>
                   </div>
                   <button 
                     onClick={() => handleOpenCheckout(p)}
                     className="bg-slate-900 dark:bg-primary text-white px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2"
                   >
                     Solicitar <ShoppingCart className="h-4 w-4" />
                   </button>
                </div>
              </div>
            </div>
          ))}

          {products.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 py-32 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-6">
                <Package className="h-12 w-12 text-slate-200" />
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Suministros agotados temporalmente</p>
            </div>
          )}
        </div>
      </div>

      </div>

      {/* Mobile inline checkout */}
      {showCheckout && selectedProduct && (
        <div className="block md:hidden animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setShowCheckout(false)}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-all shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {selectedProduct.name}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                ${selectedProduct.price.toFixed(2)} — {selectedProduct.estimatedProductionTime || "Envío gratis"}. Completa los datos para solicitarlo.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-6">
            {/* Profile Selector for personalized products */}
            {selectedProduct.requiresPersonalization && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                  <UserRound className="h-3.5 w-3.5 inline mr-1" />
                  ¿Para quién es este accesorio?
                </p>
                {profileLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando perfiles...
                  </div>
                ) : profileOptions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
                    No tienes perfiles médicos configurados. Crea uno en Mis Perfiles Médicos antes de continuar.
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
                              ? "border-primary bg-primary/5"
                              : "border-slate-200 hover:border-slate-300 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
                              }`}>
                                <UserRound className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">
                                  {profile.firstName} {profile.lastName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                    {profile.profileType === "personal" ? "Principal" : "Familiar"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              {chip ? (
                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                  /e/{chip.shortCode}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
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

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Dirección Exacta</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-5 h-5 w-5 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={shippingData.address}
                    onChange={e => setShippingData({...shippingData, address: e.target.value})}
                    placeholder="Calle, No. de Casa, Edificio, Apartamento..."
                    className="w-full bg-muted/30 rounded-2xl border border-border pl-14 pr-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Ciudad / Provincia</label>
                  <input
                    required
                    type="text"
                    value={shippingData.city}
                    onChange={e => setShippingData({...shippingData, city: e.target.value})}
                    placeholder="Panamá, Chitré..."
                    className="w-full bg-muted/30 rounded-2xl border border-border px-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Referencia de Pago</label>
                  <div className="w-full bg-slate-900 text-white rounded-2xl px-6 py-5 flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Yappy Manual</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Notas Especiales</label>
                <input
                  type="text"
                  value={shippingData.notes}
                  onChange={e => setShippingData({...shippingData, notes: e.target.value})}
                  placeholder="Cerca de la farmacia, color de casa..."
                  className="w-full bg-muted/30 rounded-2xl border border-border px-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-2xl font-black text-primary">${selectedProduct.price.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                disabled={creatingOrder}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {creatingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
                {creatingOrder ? "Confirmando..." : "Confirmar Pedido"}
              </button>
              <p className="text-[9px] text-center text-muted-foreground font-bold uppercase opacity-60">
                Al confirmar, tu pedido aparecerá en revisión por el equipo administrativo.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* Desktop checkout modal */}
      {showCheckout && selectedProduct && (
        <div className="hidden md:block fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row">
              <div className="hidden md:flex w-1/3 bg-slate-50 dark:bg-slate-900 p-10 flex-col justify-between border-r border-slate-100 dark:border-slate-800">
                 <div>
                    <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                       <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase italic">{selectedProduct.name}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tight">Resumen de Pedido</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase">
                       <span className="text-slate-400">Subtotal</span>
                       <span>${selectedProduct.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-black uppercase">
                       <span className="text-slate-400">Entrega</span>
                       <span className="text-emerald-500">Gratis</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                       <span className="text-[10px] font-black uppercase tracking-widest">Total</span>
                       <span className="text-2xl font-black text-primary">${selectedProduct.price.toFixed(2)}</span>
                    </div>
                 </div>
              </div>

              <form onSubmit={handleCreateOrder} className="flex-1 p-10 space-y-8 max-h-[90vh] overflow-y-auto">
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-2xl font-black tracking-tighter uppercase">Datos de Entrega</h4>
                    <button type="button" onClick={() => setShowCheckout(false)} className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors">
                       <X className="h-6 w-6" />
                    </button>
                 </div>

                 {/* Profile Selector for personalized products */}
                 {selectedProduct.requiresPersonalization && (
                   <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                       <UserRound className="h-3.5 w-3.5 inline mr-1" />
                       ¿Para quién es este accesorio?
                     </p>
                     {profileLoading ? (
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Loader2 className="h-4 w-4 animate-spin" /> Cargando perfiles...
                       </div>
                     ) : profileOptions.length === 0 ? (
                       <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
                         No tienes perfiles médicos configurados. Crea uno en Mis Perfiles Médicos antes de continuar.
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
                                   ? "border-primary bg-primary/5"
                                   : "border-slate-200 hover:border-slate-300 bg-slate-50"
                               }`}
                             >
                               <div className="flex items-center justify-between gap-3">
                                 <div className="flex items-center gap-3 min-w-0">
                                   <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                     isSelected ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
                                   }`}>
                                     <UserRound className="h-5 w-5" />
                                   </div>
                                   <div className="min-w-0">
                                     <p className="font-bold text-sm truncate">
                                       {profile.firstName} {profile.lastName}
                                     </p>
                                     <div className="flex items-center gap-2 mt-0.5">
                                       <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                         {profile.profileType === "personal" ? "Principal" : "Familiar"}
                                       </span>
                                     </div>
                                   </div>
                                 </div>
                                 <div className="shrink-0 text-right">
                                   {chip ? (
                                     <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                       /e/{chip.shortCode}
                                     </span>
                                   ) : (
                                     <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
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

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Dirección Exacta</label>
                       <div className="relative">
                          <MapPin className="absolute left-5 top-5 h-5 w-5 text-slate-400" />
                          <textarea 
                            required
                            rows={2}
                            value={shippingData.address}
                            onChange={e => setShippingData({...shippingData, address: e.target.value})}
                            placeholder="Calle, No. de Casa, Edificio, Apartamento..."
                            className="w-full bg-slate-50 dark:bg-slate-900 rounded-3xl border-none pl-14 pr-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Ciudad / Provincia</label>
                          <input 
                            required
                            type="text"
                            value={shippingData.city}
                            onChange={e => setShippingData({...shippingData, city: e.target.value})}
                            placeholder="Panamá, Chitré..."
                            className="w-full bg-slate-50 dark:bg-slate-900 rounded-3xl border-none px-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-primary/10 transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Referencia de Pago</label>
                          <div className="w-full bg-slate-900 text-white rounded-3xl px-6 py-5 flex items-center gap-3">
                             <CreditCard className="h-4 w-4 text-primary" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Yappy Manual</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Notas Especiales</label>
                       <input 
                         type="text"
                         value={shippingData.notes}
                         onChange={e => setShippingData({...shippingData, notes: e.target.value})}
                         placeholder="Cerca de la farmacia, color de casa..."
                         className="w-full bg-slate-50 dark:bg-slate-900 rounded-3xl border-none px-6 py-5 text-sm font-bold placeholder:opacity-40 focus:ring-4 focus:ring-primary/10 transition-all"
                       />
                    </div>
                 </div>

                 <div className="pt-6">
                    <button 
                      type="submit" 
                      disabled={creatingOrder}
                      className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                       {creatingOrder ? <Loader2 className="h-6 w-6 animate-spin" /> : <Package className="h-6 w-6" />}
                       Confirmar Pedido Vital
                    </button>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase mt-4 opacity-60">Al confirmar, tu pedido aparecerá en revisión por el equipo administrativo.</p>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Mobile inline success */}
      {showSuccessModal && (
        <div className="block md:hidden animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => { setShowSuccessModal(false); router.push("/dashboard/pedidos"); }}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-accent transition-all shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-2xl font-black tracking-tight">¡Pedido Recibido!</h2>
              <p className="text-xs text-muted-foreground font-medium">
                Tu orden ha sido registrada. Puedes realizar el pago y subir tu comprobante aquí mismo o después desde Mis Pedidos.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Payment info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 bg-muted/30 rounded-[2rem] border border-border text-center">
                <p className="text-[10px] font-black uppercase text-indigo-500 mb-2">Yappy</p>
                <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-2xl mx-auto mb-3 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                  {paymentConfig?.yappy_qr_url ? (
                    <img src={paymentConfig.yappy_qr_url} alt="QR" className="h-full w-full object-contain p-2" />
                  ) : (
                    <QrCode className="h-8 w-8 text-indigo-400 opacity-20" />
                  )}
                </div>
                <p className="text-md font-black text-indigo-600">{paymentConfig?.yappy_handle || '@...'}</p>
              </div>
              <div className="p-6 bg-muted/30 rounded-[2rem] border border-border text-center flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-3">ACH / Banco</p>
                <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 leading-tight">
                  {paymentConfig?.bank_name || 'BANCO'}<br/>
                  {paymentConfig?.bank_account_type || 'CUENTA'}<br/>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm tracking-widest">{paymentConfig?.bank_account_number || '...'}</span>
                </p>
              </div>
            </div>

            {/* Upload proof */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${proofUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
              {proofUploaded ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <p className="font-bold text-emerald-700">Comprobante enviado. Tu pago está en revisión.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sube tu comprobante de pago</p>
                  <p className="text-[10px] text-muted-foreground">Selecciona una imagen o captura del comprobante de tu pago.</p>
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {uploadingProof ? (
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

            <p className="text-[9px] text-muted-foreground text-center">
              También puedes subir tu comprobante después desde <button onClick={() => router.push("/dashboard/pedidos")} className="underline font-bold text-primary">Mis Pedidos</button>.
            </p>

            <button
              onClick={() => router.push("/dashboard/pedidos")}
              className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              Ir a Mis Pedidos <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop success modal */}
      {showSuccessModal && (
        <div className="hidden md:block fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-2xl animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-[3.5rem] shadow-2xl relative overflow-hidden p-12 text-center border border-white/10">
              <div className="h-20 w-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20 animate-bounce">
                 <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              
              <h3 className="text-4xl font-black tracking-tighter mb-4 italic uppercase">¡Pedido Recibido!</h3>
              <p className="text-sm font-bold text-slate-400 mb-8 max-w-sm mx-auto uppercase tracking-tight leading-relaxed">
                 Tu orden ha sido registrada. Puedes realizar el pago y subir tu comprobante aquí mismo o después desde Mis Pedidos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-black uppercase text-indigo-500 mb-2">Yappy</p>
                    <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-2xl mx-auto mb-3 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                       {paymentConfig?.yappy_qr_url ? (
                          <img src={paymentConfig.yappy_qr_url} alt="QR" className="h-full w-full object-contain p-2" />
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

              {/* Upload proof section */}
              <div className={`p-6 mb-8 rounded-2xl border-2 transition-all ${proofUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                {proofUploaded ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <p className="font-bold text-emerald-700">Comprobante enviado. Tu pago está en revisión.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sube tu comprobante de pago</p>
                    <p className="text-[10px] text-muted-foreground">Selecciona una imagen o captura del comprobante de tu pago.</p>
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
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {uploadingProof ? (
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

              <p className="text-[9px] text-muted-foreground mb-6">
                También puedes subir tu comprobante después desde <button onClick={() => router.push("/dashboard/pedidos")} className="underline font-bold text-primary">Mis Pedidos</button>.
              </p>

              <button 
                onClick={() => router.push("/dashboard/pedidos")}
                className="w-full py-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2"
              >
                Ir a Mis Pedidos <ArrowRight className="h-4 w-4" />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}