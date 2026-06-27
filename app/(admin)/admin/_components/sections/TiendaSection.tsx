"use client";

import { useState, useEffect } from "react";
import { Store, Plus, Package, DollarSign, Trash2, Loader2, X, Clock, AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number;
  image: string | null;
  isActive: boolean;
  productType: string;
  estimatedProductionTime: string | null;
  requiresPersonalization: boolean;
}

const PRODUCT_TYPES = [
  { value: "sticker", label: "Sticker" },
  { value: "llavero", label: "Llavero" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "brazalete", label: "Brazalete" },
  { value: "combo", label: "Combo" },
  { value: "initial_chip", label: "Primer chip empresarial" },
  { value: "otro", label: "Otro" },
];

const PRODUCT_TYPE_BADGES: Record<string, { color: string; label: string }> = {
  sticker: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Sticker" },
  llavero: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Llavero" },
  tarjeta: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Tarjeta" },
  brazalete: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Brazalete" },
  combo: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", label: "Combo" },
  initial_chip: { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", label: "Primer chip empresarial" },
  otro: { color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", label: "Otro" },
};

export function TiendaSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Accesorios",
    stock: "0",
    image: "",
    productType: "otro",
    estimatedProductionTime: "",
    requiresPersonalization: false
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingProduct ? "PATCH" : "POST";
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      
      const res = await fetch(url, {
        method,
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        toast.success(editingProduct ? "Producto actualizado" : "Producto creado");
        setShowModal(false);
        setEditingProduct(null);
        setFormData({ name: "", description: "", price: "", category: "Accesorios", stock: "0", image: "", productType: "otro", estimatedProductionTime: "", requiresPersonalization: false });
        loadProducts();
      } else {
        toast.error("Error al guardar producto");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Producto eliminado");
        loadProducts();
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || "",
      price: p.price.toString(),
      category: p.category,
      stock: p.stock.toString(),
      image: p.image || "",
      productType: p.productType || "otro",
      estimatedProductionTime: p.estimatedProductionTime || "",
      requiresPersonalization: p.requiresPersonalization
    });
    setShowModal(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-xs font-black uppercase tracking-widest opacity-40">Abriendo almacén...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 italic">
            <Store className="h-8 w-8 text-primary shadow-xl shadow-primary/20" /> Tienda PTY Management
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">Suministros de hardware y accesorios para la red PreRescate.</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: "", description: "", price: "", category: "Accesorios", stock: "0", image: "", productType: "otro", estimatedProductionTime: "", requiresPersonalization: false });
            setShowModal(true);
          }}
          className="px-8 py-4 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 group"
        >
          <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group flex flex-col">
            <div className="aspect-video bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative group-hover:bg-slate-100 transition-colors overflow-hidden">
                 {p.image ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                 ) : (
                   <Store className="h-12 w-12 text-slate-200" />
                 )}
               <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                  {p.category}
               </div>
               <div className="absolute bottom-4 left-4">
                  <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${PRODUCT_TYPE_BADGES[p.productType]?.color || PRODUCT_TYPE_BADGES.otro.color}`}>
                     {PRODUCT_TYPE_BADGES[p.productType]?.label || p.productType}
                  </span>
               </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="text-xl font-black tracking-tight mb-2 truncate">{p.name}</h3>
              <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-3 flex-1">{p.description || "Sin descripción"}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                 {p.estimatedProductionTime && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                       <Clock className="h-3 w-3" />
                       {p.estimatedProductionTime}
                    </span>
                 )}
                 {p.requiresPersonalization && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
                       <AlertTriangle className="h-3 w-3" />
                       Personalizable
                    </span>
                 )}
              </div>
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400">Precio</span>
                    <span className="text-2xl font-black text-primary italic">${p.price.toFixed(2)}</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-slate-400">Stock</span>
                    <span className={`text-lg font-black ${p.stock > 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>{p.stock}</span>
                 </div>
              </div>

              <div className="flex gap-2">
                 <button onClick={() => openEdit(p)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">
                    Editar
                 </button>
                 <button onClick={() => handleDelete(p.id, p.name)} className="p-4 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-2xl transition-all group/del shadow-sm">
                    <Trash2 className="h-4 w-4" />
                 </button>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 py-32 text-center flex flex-col items-center gap-6 border-4 border-dashed border-slate-100 rounded-[3.5rem]">
             <Package className="h-16 w-16 opacity-10 text-slate-400" />
             <div className="space-y-1">
                <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Almacén Vacío</p>
                <p className="text-xs font-medium text-slate-400">Registra tu primer producto físico para activarlo en la App.</p>
             </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-white/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <Store className="h-40 w-40 text-primary" />
              </div>

              <form onSubmit={handleSave} className="p-10 relative z-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase">Gestión de Stock PreRescate</p>
                    </div>
                    <button type="button" onClick={() => setShowModal(false)} className="p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400">
                       <X className="h-6 w-6" />
                    </button>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Tipo de Producto</label>
                       <select 
                         value={formData.productType}
                         onChange={e => setFormData({...formData, productType: e.target.value})}
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                       >
                         {PRODUCT_TYPES.map(pt => (
                           <option key={pt.value} value={pt.value}>{pt.label}</option>
                         ))}
                       </select>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Tiempo de Fabricación</label>
                       <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                            value={formData.estimatedProductionTime}
                            onChange={e => setFormData({...formData, estimatedProductionTime: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10"
                            placeholder="Ej: 3 a 5 días hábiles"
                          />
                       </div>
                    </div>

                    <div className="col-span-2 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.requiresPersonalization}
                            onChange={e => setFormData({...formData, requiresPersonalization: e.target.checked})}
                            className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Requiere Personalización
                          </span>
                       </label>
                       {formData.requiresPersonalization && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            El cliente deberá llenar datos adicionales
                          </span>
                       )}
                    </div>
                    
                    <div className="col-span-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Nombre del Producto</label>
                       <input 
                         required
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10"
                         placeholder="Ej: Llavero NFC PreRescate"
                       />
                    </div>
                    
                    <div className="col-span-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Descripción Detallada</label>
                       <textarea 
                         rows={2}
                         value={formData.description}
                         onChange={e => setFormData({...formData, description: e.target.value})}
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10 resize-none"
                         placeholder="Especificaciones, materiales..."
                       />
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Precio (USD)</label>
                       <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                            required
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Stock Actual</label>
                       <div className="relative">
                          <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                            required
                            type="number"
                            value={formData.stock}
                            onChange={e => setFormData({...formData, stock: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Categoría</label>
                       <select 
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value})}
                         className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                       >
                         <option value="Accesorios">Accesorios</option>
                         <option value="Hardware">Hardware</option>
                         <option value="Suscripciones">Suscripciones</option>
                         <option value="Extra">Extra</option>
                       </select>
                    </div>

                    <div className="col-span-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2 block">Imagen del Producto</label>
                       {formData.image ? (
                         <div className="relative">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={formData.image} alt="Preview" className="w-full h-48 object-cover rounded-2xl border border-slate-200" />
                           <button type="button" onClick={() => setFormData({...formData, image: ""})}
                             className="absolute top-2 right-2 p-2 bg-white/90 rounded-xl shadow-md hover:bg-white transition-all">
                             <X className="h-4 w-4 text-slate-600" />
                           </button>
                         </div>
                       ) : (
                         <label className="flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                           <Upload className="h-8 w-8 text-slate-300 mb-2" />
                           <span className="text-xs font-bold text-slate-400">Seleccionar imagen</span>
                           <span className="text-[10px] text-slate-300 mt-1">JPG, PNG o WebP — máximo 5MB</span>
                           <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                             onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (!file) return;
                               if (file.size > 5 * 1024 * 1024) { toast.error("El archivo supera 5MB"); return; }
                               try {
                                 const fd = new FormData();
                                 fd.append("file", file);
                                 fd.append("bucket", "general");
                                 const res = await fetch("/api/upload", { method: "POST", body: fd });
                                 if (!res.ok) throw new Error("Error al subir imagen");
                                 const data = await res.json();
                                 setFormData({...formData, image: data.url});
                                 toast.success("Imagen subida correctamente");
                               } catch { toast.error("Error al subir imagen"); }
                             }} />
                         </label>
                       )}
                    </div>
                 </div>

                 <div className="pt-6 flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.5rem] border border-slate-100 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 shadow-sm">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-2 py-5 bg-primary text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                       {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                       {editingProduct ? "Actualizar Inventario" : "Publicar en Tienda"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
