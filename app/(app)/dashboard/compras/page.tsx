"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Minus, ShoppingCart, Truck, Package } from "lucide-react";
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
  const [quantity, setQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");

  const totalPrice = quantity * selectedProduct.price;

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
         setQuantity(1);
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
    if (!shippingAddress || !shippingCity) {
      toast.error("Por favor completa la dirección de envío");
      return;
    }

    setIsOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress,
          shippingCity,
          shippingNotes,
          providerReference: selectedProduct.packageId,
          items: [{
            productType: selectedProduct.isCombo ? `COMBO_${selectedProduct.name.split(' ')[1].toUpperCase()}` : "CHIP_EXTRA",
            quantity,
            unitPrice: selectedProduct.price
          }]
        }),
      });
      
      if (res.ok) {
        toast.success("Pedido procesado exitosamente. Sube tu comprobante en la sección de pedidos.");
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
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      <div>
        <h1 className="text-4xl font-black tracking-tighter mb-1 uppercase">Tienda Chips +</h1>
        <p className="text-muted-foreground font-medium">Solicita stickers NFC/QR para tus perfiles o reemplazos.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-10">
        <div className="flex-1 space-y-6">
          <div className="p-8 sm:p-12 rounded-[4rem] border border-border bg-card shadow-xl shadow-black/5 relative overflow-hidden transition-all duration-300">
             {selectedProduct.isCombo && (
               <div className="absolute top-0 right-0 px-6 py-2 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-bl-[2rem]">
                 Combo Seleccionado
               </div>
             )}
             <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mb-8 transition-colors ${selectedProduct.isCombo ? 'bg-indigo-600/10 text-indigo-600' : 'bg-primary/10 text-primary'}`}>
                <ShoppingCart className="h-10 w-10" />
             </div>
             
             <h2 className="text-4xl font-black tracking-tight mb-4">{selectedProduct.name}</h2>
             <p className="text-muted-foreground text-sm font-medium mb-12 max-w-md leading-relaxed">Stickers originales de alta resistencia. Vinculación vitalicia a nuestra red de asistencia nacional.</p>
             
             <div className="flex items-center justify-between p-6 rounded-[2.5rem] bg-muted/50 border border-border mb-12">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center hover:bg-slate-50 hover:text-primary transition-all active:scale-90 shadow-sm">
                  <Minus className="h-6 w-6" />
                </button>
                <div className="text-center">
                   <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Unidades</p>
                   <p className="text-5xl font-black tracking-tighter">{quantity}</p>
                </div>
                <button onClick={() => setQuantity(q => q + 1)} className="h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center hover:bg-slate-50 hover:text-primary transition-all active:scale-90 shadow-sm">
                  <Plus className="h-6 w-6" />
                </button>
             </div>

             <div className="space-y-6 mb-12 border-t border-border pt-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 flex items-center gap-3">
                  <div className="h-1.5 w-6 bg-primary rounded-full" />
                  Información para el Envío
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Ciudad / Área</p>
                    <input 
                      type="text" 
                      placeholder="Ej: David, Chiriquí" 
                      className="w-full bg-slate-50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Dirección Exacta</p>
                    <input 
                      type="text" 
                      placeholder="Calle, Edificio, Casa #" 
                      className="w-full bg-slate-50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Notas Adicionales</p>
                  <textarea 
                    placeholder="Referencia o lugar de entrega..." 
                    className="w-full bg-slate-50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none min-h-[100px] resize-none"
                    value={shippingNotes}
                    onChange={(e) => setShippingNotes(e.target.value)}
                  />
                </div>
             </div>

             <div className="flex items-center justify-between mb-10 p-6 bg-primary/[0.03] rounded-3xl border border-primary/10">
                <span className="font-black text-xl text-primary/60 uppercase tracking-tighter">Total:</span>
                <span className="text-5xl font-black text-primary tracking-tighter">${totalPrice.toFixed(2)}</span>
             </div>

             <button
               onClick={handleCreateOrder}
               disabled={isOrdering}
               className="w-full py-6 rounded-[2rem] bg-slate-950 text-white font-black text-base uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
             >
               {isOrdering ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShoppingCart className="h-6 w-6" />}
               Procesar Pedido
             </button>
          </div>
        </div>

        <div className="w-full xl:w-96 space-y-6">
          <div className="px-2">
            <h3 className="text-xl font-black tracking-tight mb-2">Combos Multi-perfil</h3>
            <p className="text-xs font-bold text-muted-foreground leading-relaxed">Protege a todo tu entorno con un solo paquete.</p>
          </div>
          
          <div className="space-y-4">
            {packages.map(pkg => (
              <div key={pkg.id} className={`relative p-6 rounded-[2.5rem] border-2 transition-all group overflow-hidden ${selectedProduct.packageId === pkg.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-white hover:border-primary/20'}`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="font-black text-lg tracking-tighter">{pkg.name}</h4>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">{pkg.maxChips} Chips Incluidos</p>
                  </div>
                  <span className="font-black text-xl tracking-tighter">${pkg.price}</span>
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
                     setQuantity(1);
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                   }}
                   className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
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
          
          <Link href="/dashboard/pedidos" className="flex items-center justify-between p-7 rounded-[2.5rem] border border-dashed border-border bg-slate-50/50 hover:bg-slate-50 transition-all group">
             <div>
                <p className="font-black text-sm tracking-tighter">Ir a mis Pedidos</p>
                <p className="text-[10px] font-bold text-muted-foreground">Historial y rastreo</p>
             </div>
             <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
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
