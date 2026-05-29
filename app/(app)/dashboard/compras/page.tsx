"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShoppingCart, Truck, Package } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BUSINESS_RULES } from "@/domains/shared/constants";

function ComprasContent() {
  const searchParams = useSearchParams();
  const packageIdParam = searchParams.get("packageId");

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState({
    id: "chip-extra", 
    name: "Chip+ NFC/QR Extra",
    price: BUSINESS_RULES.EXTRA_CHIP_PRICE,
    isCombo: false,
    packageId: null as string | null
  });
  const [isOrdering, setIsOrdering] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"yappy" | "bank_transfer">("yappy");

  const totalPrice = selectedProduct.price;

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    if (packageIdParam && packages.length > 0) {
      const pkg = packages.find(p => p.id === packageIdParam);
      if (pkg) {
         setSelectedProduct({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            isCombo: true,
            packageId: pkg.id
         });
         window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [packageIdParam, packages]);

  async function loadPackages() {
    try {
      const res = await fetch("/api/public/packages");
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrder() {
    if (!selectedProduct.packageId) {
      toast.error("Selecciona un paquete para continuar");
      return;
    }
    if (!customerName || !customerEmail) {
      toast.error("Nombre y email son requeridos");
      return;
    }
    if (!shippingAddress || !shippingCity) {
      toast.error("Por favor completa la dirección de envío");
      return;
    }

    setIsOrdering(true);
    try {
      const res = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedProduct.packageId,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          shippingCity,
          shippingNotes,
          paymentMethod,
        }),
      });
      
      if (res.ok) {
        toast.success("Orden manual creada. Continúa con el pago y sube tu comprobante en Pedidos.");
        setTimeout(() => {
          window.location.href = "/dashboard/pedidos";
        }, 1500);
      } else {
        toast.error("Error al crear el pedido");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setIsOrdering(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-tight">Cargando Tienda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-1 uppercase">Tienda Chips +</h1>
        <p className="text-muted-foreground font-medium text-sm">Solicita stickers NFC/QR para tus perfiles o reemplazos.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 xl:gap-10">
        {/* Mobile: Combos first, then order form */}
        {/* Desktop: order form first, combos sidebar */}
        
        {/* Combos — mostrado primero en mobile */}
        <div className="order-first xl:order-last w-full xl:w-96 space-y-4">
          <div className="px-1">
            <h3 className="text-lg md:text-xl font-black tracking-tight mb-1">Compra tu Combo</h3>
            <p className="text-xs font-bold text-muted-foreground leading-relaxed">Protege a todo tu entorno con un solo paquete.</p>
          </div>
          
          <div className="space-y-3">
            {packages.map(pkg => (
              <div key={pkg.id} className={`relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border-2 transition-all group overflow-hidden ${selectedProduct.packageId === pkg.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-white hover:border-primary/20'}`}>
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div>
                    <h4 className="font-black text-base md:text-lg tracking-tighter">{pkg.name}</h4>
                    <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase">{pkg.maxChips} Chips Incluidos</p>
                  </div>
                  <span className="font-black text-lg md:text-xl tracking-tighter">${pkg.price}</span>
                </div>
                <button
                   onClick={() => {
                     setSelectedProduct({
                        id: pkg.id,
                        name: pkg.name,
                        price: pkg.price,
                        isCombo: true,
                        packageId: pkg.id
                     });
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                   }}
                   className={`w-full py-3 md:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                     selectedProduct.packageId === pkg.id 
                       ? "bg-primary text-white shadow-lg" 
                       : "bg-slate-50 border border-border hover:bg-slate-100"
                   }`}
                >
                  {selectedProduct.packageId === pkg.id ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>
            ))}
          </div>
          
          <Link href="/dashboard/pedidos" className="flex items-center justify-between p-5 md:p-7 rounded-[1.5rem] md:rounded-[2.5rem] border border-dashed border-border bg-slate-50/50 hover:bg-slate-50 transition-all group">
             <div>
                <p className="font-black text-sm tracking-tighter">Ir a mis Pedidos</p>
                <p className="text-[10px] font-bold text-muted-foreground">Historial y rastreo</p>
             </div>
             <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>

        {/* Order Form */}
        <div className="flex-1 space-y-6">
          <div className="p-6 sm:p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-border bg-card shadow-xl shadow-black/5 relative overflow-hidden transition-all duration-300">
             {selectedProduct.isCombo && (
               <div className="absolute top-0 right-0 px-4 md:px-6 py-1.5 md:py-2 bg-indigo-600 text-white font-black text-[10px] md:text-[11px] uppercase tracking-widest rounded-bl-[1.5rem] md:rounded-bl-[2rem]">
                 Combo Seleccionado
               </div>
             )}
             <div className="h-14 w-14 md:h-20 md:w-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 transition-colors ${selectedProduct.isCombo ? 'bg-indigo-600/10 text-indigo-600' : 'bg-primary/10 text-primary'}">
                <ShoppingCart className="h-7 w-7 md:h-10 md:w-10" />
             </div>
             
             <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2 md:mb-4">{selectedProduct.name}</h2>
             <p className="text-muted-foreground text-xs md:text-sm font-medium mb-8 md:mb-12 max-w-md leading-relaxed">Stickers originales de alta resistencia. Vinculación vitalicia a nuestra red de asistencia nacional.</p>
             
             <div className="flex items-center justify-between p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] bg-muted/50 border border-border mb-8 md:mb-12">
               <div>
                 <p className="text-[9px] md:text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Combo Seleccionado</p>
                 <p className="text-lg md:text-2xl font-black tracking-tighter">{selectedProduct.name}</p>
               </div>
               <div className="text-right">
                 <p className="text-[9px] md:text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Chips Incluidos</p>
                 <p className="text-2xl md:text-3xl font-black tracking-tighter">
                   {(packages.find(p => p.id === selectedProduct.packageId)?.maxChips ?? 1)}
                 </p>
               </div>
             </div>

             <div className="space-y-5 md:space-y-6 mb-8 md:mb-12 border-t border-border pt-8 md:pt-10">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 md:mb-6 flex items-center gap-3">
                  <div className="h-1 w-4 md:h-1.5 md:w-6 bg-primary rounded-full" />
                  Datos del Cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre completo</p>
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      className="w-full bg-slate-50 border border-border rounded-2xl px-4 md:px-6 py-3 md:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1">Email</p>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      className="w-full bg-slate-50 border border-border rounded-2xl px-4 md:px-6 py-3 md:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1">Teléfono</p>
                    <input
                      type="text"
                      placeholder="+507 ..."
                      className="w-full bg-slate-50 border border-border rounded-2xl px-4 md:px-6 py-3 md:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5 md:space-y-6 mb-8 md:mb-12 border-t border-border pt-8 md:pt-10">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 md:mb-6 flex items-center gap-3">
                  <div className="h-1 w-4 md:h-1.5 md:w-6 bg-primary rounded-full" />
                  Información para el Envío
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1">Ciudad / Área</p>
                    <input 
                      type="text" 
                      placeholder="Ej: David, Chiriquí" 
                      className="w-full bg-slate-50 border border-border rounded-2xl px-4 md:px-6 py-3 md:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1">Dirección Exacta</p>
                    <input 
                      type="text" 
                      placeholder="Calle, Edificio, Casa #" 
                      className="w-full bg-slate-50 border border-border rounded-2xl px-4 md:px-6 py-3 md:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1">Notas Adicionales</p>
                  <textarea 
                    placeholder="Referencia o lugar de entrega..." 
                    className="w-full bg-slate-50 border border-border rounded-2xl px-4 md:px-6 py-3 md:py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none min-h-[80px] md:min-h-[100px] resize-none"
                    value={shippingNotes}
                    onChange={(e) => setShippingNotes(e.target.value)}
                  />
                </div>
             </div>

             <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground mb-2 md:mb-3 tracking-[0.2em]">Método de Pago</p>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {[
                    { key: 'yappy', label: 'Yappy' },
                    { key: 'bank_transfer', label: 'Transferencia Bancaria' }
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setPaymentMethod(option.key as "yappy" | "bank_transfer")}
                      className={`w-full rounded-2xl md:rounded-3xl border p-3 md:p-4 text-left transition-all ${paymentMethod === option.key ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-white hover:border-primary/20'}`}
                    >
                      <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em]">{option.label}</p>
                      <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">Selecciona la opción para tu comprobante.</p>
                    </button>
                  ))}
                </div>
             </div>

             <div className="flex items-center justify-between mb-8 md:mb-10 p-4 md:p-6 bg-primary/[0.03] rounded-2xl md:rounded-3xl border border-primary/10">
                <span className="font-black text-lg md:text-xl text-primary/60 uppercase tracking-tighter">Total:</span>
                <span className="text-3xl md:text-5xl font-black text-primary tracking-tighter">${totalPrice.toFixed(2)}</span>
             </div>

             <button
               onClick={handleCreateOrder}
               disabled={isOrdering}
               className="w-full py-4 md:py-6 rounded-[1.5rem] md:rounded-[2rem] bg-slate-950 text-white font-black text-sm md:text-base uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3 group"
             >
               {isOrdering ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />}
               Procesar Pedido
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComprasPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4 uppercase font-black text-xs animate-pulse">
        Cargando...
      </div>
    }>
      <ComprasContent />
    </Suspense>
  );
}