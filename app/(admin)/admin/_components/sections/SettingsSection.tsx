"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Loader2, Mail, QrCode, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const FIELD_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/5 dark:border-slate-700 dark:bg-slate-900";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-widest text-slate-500";

export function SettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [configs, setConfigs] = useState({
    yappy_handle: "",
    yappy_qr_url: "",
    bank_name: "",
    bank_account_type: "",
    bank_account_number: "",
    bank_account_name: "",
    sender_email: "",
    demo_profile_shortcode: "",
  });

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los ajustes");
      if (data.configs) setConfigs((current) => ({ ...current, ...data.configs }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar ajustes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudieron guardar los ajustes");
      toast.success("Ajustes guardados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar ajustes");
    } finally {
      setSaving(false);
    }
  };

  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingQR(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "general");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir el QR");
      setConfigs((current) => ({ ...current, yappy_qr_url: data.url || "" }));
      toast.success("QR actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir QR");
    } finally {
      setUploadingQR(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Ajustes</h2>
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando" : "Guardar"}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center gap-3"><QrCode className="h-5 w-5 text-indigo-600" /><h3 className="font-black text-slate-950 dark:text-white">Yappy</h3></div>
          <div className="space-y-4">
            <label className="block"><span className={LABEL_CLASS}>Usuario Yappy</span><input className={`mt-2 ${FIELD_CLASS}`} value={configs.yappy_handle} onChange={(event) => setConfigs({ ...configs, yappy_handle: event.target.value })} placeholder="@PreRescue.ID" /></label>
            <div>
              <span className={LABEL_CLASS}>QR</span>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  {configs.yappy_qr_url ? <Image src={configs.yappy_qr_url} alt="QR Yappy" width={112} height={112} unoptimized className="h-full w-full object-contain p-2" /> : <QrCode className="h-7 w-7 text-slate-300" />}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {uploadingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingQR ? "Subiendo" : "Cambiar QR"}
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleQRUpload} disabled={uploadingQR} />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center gap-3"><Banknote className="h-5 w-5 text-emerald-600" /><h3 className="font-black text-slate-950 dark:text-white">Transferencia ACH</h3></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={LABEL_CLASS}>Banco</span><input className={`mt-2 ${FIELD_CLASS}`} value={configs.bank_name} onChange={(event) => setConfigs({ ...configs, bank_name: event.target.value })} /></label>
            <label><span className={LABEL_CLASS}>Tipo de cuenta</span><input className={`mt-2 ${FIELD_CLASS}`} value={configs.bank_account_type} onChange={(event) => setConfigs({ ...configs, bank_account_type: event.target.value })} /></label>
            <label className="sm:col-span-2"><span className={LABEL_CLASS}>Número de cuenta</span><input className={`mt-2 ${FIELD_CLASS}`} value={configs.bank_account_number} onChange={(event) => setConfigs({ ...configs, bank_account_number: event.target.value })} /></label>
            <label className="sm:col-span-2"><span className={LABEL_CLASS}>Beneficiario</span><input className={`mt-2 ${FIELD_CLASS}`} value={configs.bank_account_name} onChange={(event) => setConfigs({ ...configs, bank_account_name: event.target.value })} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center gap-3"><Mail className="h-5 w-5 text-primary" /><h3 className="font-black text-slate-950 dark:text-white">Sistema</h3></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={LABEL_CLASS}>Correo remitente</span><input type="email" className={`mt-2 ${FIELD_CLASS}`} value={configs.sender_email} onChange={(event) => setConfigs({ ...configs, sender_email: event.target.value })} placeholder="soporte@prerescatepty.com" /></label>
            <label><span className={LABEL_CLASS}>ShortCode demo</span><input className={`mt-2 ${FIELD_CLASS}`} value={configs.demo_profile_shortcode} onChange={(event) => setConfigs({ ...configs, demo_profile_shortcode: event.target.value })} /></label>
          </div>
        </section>
      </div>
    </div>
  );
}
