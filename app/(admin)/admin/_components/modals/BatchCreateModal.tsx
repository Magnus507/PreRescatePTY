"use client";

import { useState } from "react";
import { Loader2, Package, Users, Key, Mail } from "lucide-react";

interface BatchCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  onSuccess: () => void;
}

interface BatchCreateResult {
  membersCreated: number;
  department: string;
  tempPassword: string;
  emails: string[];
}

export function BatchCreateModal({ isOpen, onClose, orgId, orgName, onSuccess }: BatchCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchCreateResult | null>(null);
  const [formData, setFormData] = useState({
    departmentName: "",
    quantity: 10,
    emailPrefix: "",
    tempPassword: "PR" + Math.floor(Math.random() * 900000 + 100000)
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json() as BatchCreateResult | { error?: string };

      if (!res.ok || "error" in data) {
        const errorMessage = "error" in data ? data.error : "Error desconocido";
        alert("Error: " + (errorMessage || "Error desconocido"));
        return;
      }

      setResult(data as BatchCreateResult);
      onSuccess();
    } catch {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setFormData({
      departmentName: "",
      quantity: 10,
      emailPrefix: "",
      tempPassword: "PR" + Math.floor(Math.random() * 900000 + 100000)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        
        {result ? (
          /* ===== SUCCESS VIEW ===== */
          <div className="space-y-6">
            <div className="text-center">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Lote Creado Exitosamente</h3>
              <p className="text-muted-foreground mt-2">
                Se crearon <strong>{result.membersCreated}</strong> miembros en <strong>{result.department}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-black uppercase text-amber-700">Contraseña Temporal del Lote</span>
              </div>
              <p className="font-mono text-lg font-black text-amber-900 tracking-widest">{result.tempPassword}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-h-60 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-black uppercase text-slate-500">Correos Generados ({result.emails.length})</span>
              </div>
              <div className="space-y-1">
                {result.emails.map((email: string, i: number) => (
                  <p key={i} className="font-mono text-[11px] text-slate-600 py-0.5 border-b border-slate-100 last:border-0">{email}</p>
                ))}
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* ===== FORM VIEW ===== */
          <>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Crear Lote de Empleados</h3>
                <p className="text-sm text-muted-foreground">{orgName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nombre del Departamento / Lote</label>
                <input
                  placeholder="ej. Otaweros, Mantenimiento, Seguridad..."
                  className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  value={formData.departmentName}
                  onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Cantidad de Empleados</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Prefijo de Email (Opcional)</label>
                  <input
                    placeholder="Auto: dept_001@..."
                    className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={formData.emailPrefix}
                    onChange={e => setFormData({ ...formData, emailPrefix: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Contraseña Temporal (Compartida)</label>
                <input
                  className="w-full bg-muted/50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold tracking-widest"
                  value={formData.tempPassword}
                  onChange={e => setFormData({ ...formData, tempPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-700 font-medium">
                <strong>Vista previa:</strong> Se crearán {formData.quantity} cuentas con formato: <br />
                <code className="font-mono text-[10px] mt-1 block">
                  {(formData.emailPrefix || formData.departmentName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'dept')}_001@{orgName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}.prerescue.id
                </code>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-4 font-bold text-muted-foreground hover:bg-muted/50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Package className="h-4 w-4" /> Generar Lote</>}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
