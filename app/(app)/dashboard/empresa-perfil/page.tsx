"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Building2, Loader2, ExternalLink, Save, Upload, Download, QrCode, Camera } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

type CorporatePublicProfile = {
  id: string;
  shortCode: string;
  status: "draft" | "active" | "hidden";
  logoUrl: string | null;
  displayName: string | null;
  legalName: string | null;
  ruc: string | null;
  industry: string | null;
  description: string | null;
  slogan: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  mainServices: string | null;
  mainProducts: string | null;
  securityContactName: string | null;
  securityPhone: string | null;
  emergencyProcedure: string | null;
  customEmployeeMessage: string | null;
  showCompanyCode: boolean;
  showLogo: boolean;
  showDisplayName: boolean;
  showLegalName: boolean;
  showRuc: boolean;
  showIndustry: boolean;
  showDescription: boolean;
  showSlogan: boolean;
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showAddress: boolean;
  showMainServices: boolean;
  showMainProducts: boolean;
  showSecurityContactName: boolean;
  showSecurityPhone: boolean;
  showEmergencyProcedure: boolean;
  showCustomEmployeeMessage: boolean;
};

export default function EmpresaPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profile, setProfile] = useState<CorporatePublicProfile | null>(null);
  const [companyCode, setCompanyCode] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations/public-profile");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cargar");
      setProfile(json.profile || null);
      if (json.companyCode) setCompanyCode(json.companyCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }

  const createProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organizations/public-profile", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear");
      setProfile(json.profile);
      toast.success("Perfil empresarial creado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el perfil");
    } finally {
      setLoading(false);
    }
  };

  type PublicProfilePayload = CorporatePublicProfile & { companyCode?: string };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const body: PublicProfilePayload = { ...profile };
      if (companyCode) {
        body.companyCode = companyCode;
      }

      const res = await fetch("/api/organizations/public-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setProfile(json.profile);
      toast.success("Perfil empresarial actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy pesado (máx 5MB)");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");
      formData.append("bucket", "general");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Error al subir logo");
      const { url } = await uploadRes.json();

      // Update profile with new logoUrl
      const res = await fetch("/api/organizations/public-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, logoUrl: url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar logo");
      setProfile(json.profile);
      toast.success("Logo actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateField = (key: keyof CorporatePublicProfile, value: CorporatePublicProfile[keyof CorporatePublicProfile]) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-perfil-${profile?.shortCode || "empresa"}.png`;
    a.click();
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando perfil empresarial...</p>
      </div>
    );
  }

  // No profile yet — create button
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Perfil Empresarial</h1>
            <p className="text-sm text-muted-foreground">Perfil de cortesía para tu empresa</p>
          </div>
        </div>
        <div className="rounded-2xl border p-6 bg-card space-y-4">
          <p className="text-sm text-muted-foreground">
            Crea un perfil empresarial de cortesía para publicar información básica de tu organización.
          </p>
          <button onClick={createProfile} className="px-6 py-3 rounded-xl bg-primary text-white font-black text-sm hover:opacity-90 transition-all">
            Crear perfil empresarial
          </button>
        </div>
      </div>
    );
  }

  const profileUrl = `${window.location.origin}/empresa/${profile.shortCode}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Perfil Empresarial</h1>
            <p className="text-sm text-muted-foreground">Información pública de cortesía</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${
          profile.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          profile.status === "hidden" ? "bg-slate-50 text-slate-500 border border-slate-200" :
          "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          {profile.status === "active" ? "Publicado" : profile.status === "hidden" ? "Oculto" : "Borrador"}
        </span>
      </div>

      {/* Logo + QR Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-widest">Logo / Foto</h2>
          </div>
          <div className="p-5 flex flex-col items-center gap-4">
            {profile.logoUrl ? (
              <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 relative">
                <Image
                  src={profile.logoUrl}
                  alt="Logo"
                  className="object-contain p-2"
                  fill
                  sizes="112px"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
            ) : (
              <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-slate-300" />
              </div>
            )}
            <div className="space-y-2 text-center">
              <input
                id="logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
              >
                {uploadingLogo ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                ) : (
                  <><Upload className="h-4 w-4" /> {profile.logoUrl ? "Cambiar logo" : "Subir logo"}</>
                )}
              </label>
              <p className="text-[9px] text-muted-foreground">JPG, PNG, WebP. Máx 5MB.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={profile.showLogo}
                onChange={(e) => updateField("showLogo", e.target.checked)}
              />
              Mostrar logo en perfil público
            </label>
          </div>
        </div>

        {/* QR Code */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
            <QrCode className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-widest">QR del perfil</h2>
          </div>
          <div className="p-5 flex flex-col items-center gap-4">
            <div ref={qrRef} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <QRCodeCanvas value={profileUrl} size={140} level="M" />
            </div>
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-xl px-3 py-2 text-xs font-mono bg-slate-50 truncate"
                  readOnly
                  value={profileUrl}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl);
                    toast.success("Link copiado");
                  }}
                  className="px-3 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50 shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest text-center hover:opacity-90 transition-all"
                >
                  Abrir perfil
                </a>
                <button
                  onClick={downloadQR}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all inline-flex items-center justify-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status + Link (compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Visibilidad</label>
          <select
            value={profile.status}
            onChange={(e) => updateField("status", e.target.value)}
            className="w-full border rounded-xl px-3 py-2.5 text-sm font-bold bg-white"
          >
            <option value="draft">Borrador</option>
            <option value="active">Publicado</option>
            <option value="hidden">Oculto</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Link público</label>
          <div className="flex gap-2">
            <input className="flex-1 border rounded-xl px-3 py-2.5 text-sm font-mono bg-slate-50" readOnly value={profileUrl} />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(profileUrl);
                  toast.success("Link copiado");
                } catch {
                  toast.error("No se pudo copiar");
                }
              }}
              className="px-4 py-2.5 border rounded-xl text-sm font-bold hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sección: Identidad */}
      <SectionCard title="Identidad">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithVisibility
            label="Nombre público"
            value={profile.displayName || ""}
            visible={profile.showDisplayName}
            onValueChange={(v) => updateField("displayName", v)}
            onVisibilityChange={(v) => updateField("showDisplayName", v)}
          />
          <FieldWithVisibility
            label="Razón social"
            value={profile.legalName || ""}
            visible={profile.showLegalName}
            onValueChange={(v) => updateField("legalName", v)}
            onVisibilityChange={(v) => updateField("showLegalName", v)}
          />
          <FieldWithVisibility
            label="RUC"
            value={profile.ruc || ""}
            visible={profile.showRuc}
            onValueChange={(v) => updateField("ruc", v)}
            onVisibilityChange={(v) => updateField("showRuc", v)}
          />
          <FieldWithVisibility
            label="Rubro / Industria"
            value={profile.industry || ""}
            visible={profile.showIndustry}
            onValueChange={(v) => updateField("industry", v)}
            onVisibilityChange={(v) => updateField("showIndustry", v)}
          />
          <div className="md:col-span-2">
            <FieldWithVisibility
              label="Slogan"
              value={profile.slogan || ""}
              visible={profile.showSlogan}
              onValueChange={(v) => updateField("slogan", v)}
              onVisibilityChange={(v) => updateField("showSlogan", v)}
            />
          </div>
          <div className="md:col-span-2">
            <FieldWithVisibility
              label="Descripción"
              value={profile.description || ""}
              visible={profile.showDescription}
              onValueChange={(v) => updateField("description", v)}
              onVisibilityChange={(v) => updateField("showDescription", v)}
              textarea
            />
          </div>
        </div>
      </SectionCard>

      {/* Sección: Contacto */}
      <SectionCard title="Contacto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithVisibility
            label="Teléfono"
            value={profile.phone || ""}
            visible={profile.showPhone}
            onValueChange={(v) => updateField("phone", v)}
            onVisibilityChange={(v) => updateField("showPhone", v)}
          />
          <FieldWithVisibility
            label="WhatsApp"
            value={profile.whatsapp || ""}
            visible={profile.showWhatsapp}
            onValueChange={(v) => updateField("whatsapp", v)}
            onVisibilityChange={(v) => updateField("showWhatsapp", v)}
          />
          <FieldWithVisibility
            label="Email"
            value={profile.email || ""}
            visible={profile.showEmail}
            onValueChange={(v) => updateField("email", v)}
            onVisibilityChange={(v) => updateField("showEmail", v)}
          />
          <FieldWithVisibility
            label="Website"
            value={profile.website || ""}
            visible={profile.showWebsite}
            onValueChange={(v) => updateField("website", v)}
            onVisibilityChange={(v) => updateField("showWebsite", v)}
          />
          <div className="md:col-span-2">
            <FieldWithVisibility
              label="Dirección"
              value={profile.address || ""}
              visible={profile.showAddress}
              onValueChange={(v) => updateField("address", v)}
              onVisibilityChange={(v) => updateField("showAddress", v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Sección: Servicios */}
      <SectionCard title="Servicios y productos">
        <div className="space-y-4">
          <FieldWithVisibility
            label="Servicios principales"
            value={profile.mainServices || ""}
            visible={profile.showMainServices}
            onValueChange={(v) => updateField("mainServices", v)}
            onVisibilityChange={(v) => updateField("showMainServices", v)}
            textarea
          />
          <FieldWithVisibility
            label="Productos principales"
            value={profile.mainProducts || ""}
            visible={profile.showMainProducts}
            onValueChange={(v) => updateField("mainProducts", v)}
            onVisibilityChange={(v) => updateField("showMainProducts", v)}
            textarea
          />
        </div>
      </SectionCard>

      {/* Sección: Seguridad */}
      <SectionCard title="Seguridad y emergencia">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithVisibility
            label="Contacto de seguridad"
            value={profile.securityContactName || ""}
            visible={profile.showSecurityContactName}
            onValueChange={(v) => updateField("securityContactName", v)}
            onVisibilityChange={(v) => updateField("showSecurityContactName", v)}
          />
          <FieldWithVisibility
            label="Teléfono de seguridad"
            value={profile.securityPhone || ""}
            visible={profile.showSecurityPhone}
            onValueChange={(v) => updateField("securityPhone", v)}
            onVisibilityChange={(v) => updateField("showSecurityPhone", v)}
          />
          <div className="md:col-span-2">
            <FieldWithVisibility
              label="Procedimiento de emergencia"
              value={profile.emergencyProcedure || ""}
              visible={profile.showEmergencyProcedure}
              onValueChange={(v) => updateField("emergencyProcedure", v)}
              onVisibilityChange={(v) => updateField("showEmergencyProcedure", v)}
              textarea
            />
          </div>
        </div>
      </SectionCard>

      {/* Sección: PreRescue ID */}
      <SectionCard title="PreRescue ID">
        <div className="space-y-4">
          <FieldWithVisibility
            label="Mensaje personalizado para empleados"
            value={profile.customEmployeeMessage || ""}
            visible={profile.showCustomEmployeeMessage}
            onValueChange={(v) => updateField("customEmployeeMessage", v)}
            onVisibilityChange={(v) => updateField("showCustomEmployeeMessage", v)}
            textarea
          />
          {/* Company code field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Código empresarial</label>
            <input
              className="w-full border rounded-xl px-3 py-2.5 text-sm font-bold tracking-widest uppercase"
              placeholder="Ejemplo: ACP2026"
              value={companyCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
                setCompanyCode(val);
              }}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Este código lo usan tus empleados para solicitar vinculación a tu empresa.</p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="space-y-1">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={profile.showCompanyCode}
                  onChange={(e) => updateField("showCompanyCode", e.target.checked)}
                />
                Mostrar código empresarial
              </label>
              <p className="text-xs text-amber-700">
                Recomendado solo para espacios internos donde transiten empleados.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="px-8 py-3.5 rounded-xl bg-primary text-white font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4" /> Guardar perfil empresarial</>}
        </button>
      </div>
    </div>
  );
}

// ==================== COMPONENTS ====================

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
        <span className="h-1.5 w-6 bg-primary rounded-full" />
        <h2 className="font-bold text-sm uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldWithVisibility({
  label,
  value,
  visible,
  onValueChange,
  onVisibilityChange,
  textarea,
}: {
  label: string;
  value: string;
  visible: boolean;
  onValueChange: (v: string) => void;
  onVisibilityChange: (v: boolean) => void;
  textarea?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <label className="inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => onVisibilityChange(e.target.checked)}
            className="h-3 w-3"
          />
          Mostrar
        </label>
      </div>
      {textarea ? (
        <textarea
          className="w-full border rounded-xl px-3 py-2.5 text-sm font-medium resize-none"
          rows={3}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full border rounded-xl px-3 py-2.5 text-sm font-medium"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
      )}
    </div>
  );
}