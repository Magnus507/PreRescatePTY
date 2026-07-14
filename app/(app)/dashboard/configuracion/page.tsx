"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { resolveImageSrc } from "@/lib/resolve-image-src";
import { 
  Shield, Lock, Bell, CreditCard,
  Trash2, Save, Loader2, User, Smartphone, Camera, Upload
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

interface AccountState {
  isExpired?: boolean;
  isInactive?: boolean;
  packageName?: string;
  serviceEndDate?: string;
}

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState("perfil");
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // States for editable fields
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [universalId, setUniversalId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [accountState, setAccountState] = useState<AccountState | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/users/profile?_t=${Date.now()}`);
        const data = await res.json();
        if (data.user) {
          setPhone(data.user.phone || "");
          setUserEmail(data.user.email || "");
          setFirstName(data.profile?.firstName || "");
          setLastName(data.profile?.lastName || "");
          setNationalId(data.profile?.nationalId || "");
          setAddress(data.profile?.address || "");
          setCity(data.profile?.city || "");
          setPhotoUrl(data.profile?.photoUrl || null);
          setUniversalId(`USR-${data.user.id?.substring(0, 8) || "PENDIENTE"}`);
          if (data.accountState) setAccountState(data.accountState);
        }
      } catch (err) {
        console.error("Error loading profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone, 
          firstName: firstName.trim(), 
          lastName: lastName.trim(), 
          nationalId: nationalId.trim(),
          address: address.trim(),
          city: city.trim()
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar");
      }

      toast.success("Configuración actualizada correctamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "profile");
    formData.append("bucket", "profile-photos");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPhotoUrl(data.url);
        toast.success("Foto actualizada correctamente");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Error al subir la foto");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error en la conexión con el servidor de carga");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmation = window.prompt("⚠️ ADVERTENCIA: Esta acción es irreversible.\n\nTodos tus datos médicos, perfiles y chips serán borrados o anonimizados permanentemente.\n\nPara confirmar, escribe exactamente: BORRAR CUENTA");
    
    if (confirmation !== "BORRAR CUENTA") {
      if (confirmation !== null) toast.error("Confirmación incorrecta.");
      return;
    }

    const password = window.prompt("Por seguridad, escribe tu contrasena actual para confirmar el borrado.");
    if (!password) {
      toast.error("Contrasena requerida.");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/users/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, password })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al borrar la cuenta");
      }

      toast.success("Tu cuenta ha sido eliminada. Cerrando sesión...");
      
      // Give time for the toast to be seen
      setTimeout(async () => {
        await signOut({ redirect: false });
        window.location.href = "/login";
      }, 2000);

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al borrar la cuenta");
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center rounded-[2rem] border border-slate-200/70 bg-white/80 px-6 py-14 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.34em] text-slate-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 shadow-sm">
            Ajustes del cliente
          </div>
          <div className="max-w-2xl space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Configuración</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Gestiona tu cuenta, seguridad y preferencias con una interfaz clara, clínica y fácil de leer.
            </p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 rounded-full bg-slate-950 px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.28em] text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.7)] transition-all hover:-translate-y-0.5 hover:bg-slate-900 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Sidebar Navigation */}
        <div className="space-y-3 lg:sticky lg:top-6 self-start">
          <SettingsTab 
            active={activeTab === "perfil"}
            icon={User}
            label="Perfil de cuenta"
            description="Datos personales y foto"
            onClick={() => setActiveTab("perfil")}
          />
          <SettingsTab 
            active={activeTab === "seguridad"}
            icon={Shield}
            label="Seguridad y acceso"
            description="Contraseña y sesiones"
            onClick={() => setActiveTab("seguridad")}
          />
          <SettingsTab 
            active={activeTab === "notificaciones"}
            icon={Bell}
            label="Notificaciones"
            description="Alertas y avisos"
            onClick={() => setActiveTab("notificaciones")}
          />
          <SettingsTab 
            active={activeTab === "plan"}
            icon={CreditCard}
            label="Suscripción y plan"
            description="Estado y gestión"
            onClick={() => setActiveTab("plan")}
          />
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Perfil de Cuenta Section */}
          {activeTab === "perfil" && (
            <div className="space-y-8">
              <Section title="Foto de perfil" icon={Camera} color="bg-slate-900">
                <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
                  <div className="relative group">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2.25rem] border border-slate-200 bg-slate-50 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.5)] ring-4 ring-white">
                      {photoUrl ? (
                         <div className="relative h-full w-full">
                           <Image
                             src={resolveImageSrc(photoUrl, "profile-photos")}
                             alt="Perfil"
                             className="object-cover"
                             fill
                             onError={(e) => { if (e.currentTarget.src !== photoUrl) e.currentTarget.src = photoUrl; }}
                           />
                         </div>
                      ) : (
                         <User className="h-12 w-12 text-slate-300" />
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition-all hover:scale-110 active:scale-95 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <Upload className="h-5 w-5" />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    </label>
                  </div>
                  <div className="max-w-xl space-y-2 text-center md:text-left">
                    <p className="text-lg font-black tracking-tight text-slate-950">Tu imagen médica</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Sube una foto clara de tu rostro. Esto ayuda al personal de emergencia a identificarte rápidamente en caso de crisis.
                    </p>
                    <p className="pt-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">WebP optimizado • máx. 2MB</p>
                  </div>
                </div>
              </Section>

              <Section title="Identidad de la cuenta" icon={User} color="bg-primary">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Nombre(s)</label>
                  <input 
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre real"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Apellido(s)</label>
                  <input 
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tus apellidos"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Cédula / ID / DNI</label>
                  <input 
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="Ej: 8-888-8888"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Teléfono vinculado</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +507 6000-0000"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Dirección de envío / residencia</label>
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Edificio, Casa..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Ciudad / provincia</label>
                  <input 
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ej: Ciudad de Panamá"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Email de acceso</label>
                  <div className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-slate-500 shadow-sm">
                    {userEmail}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">ID universal</label>
                  <div className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold uppercase text-slate-500 shadow-sm">
                    {universalId}
                  </div>
                </div>
              </div>
            </Section>
          </div>
          )}

          {/* Seguridad Section */}
          {activeTab === "seguridad" && (
            <Section title="Seguridad del sistema" icon={Lock} color="bg-slate-900">
               <div className="space-y-6">
                  <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                     <div className="space-y-1">
                        <p className="font-black text-slate-950">Contraseña</p>
                        <p className="text-xs leading-5 text-slate-500">Te enviaremos instrucciones para crear una nueva contraseña.</p>
                     </div>
                     <Link
                       href="/forgot-password"
                       className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                     >
                       Restablecer contraseña
                     </Link>
                  </div>

                  <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                     <div className="space-y-1">
                        <p className="font-black text-slate-950">Gestión de sesiones</p>
                        <p className="text-xs leading-5 text-slate-500">Muy pronto podrás consultar y cerrar sesiones abiertas desde otros dispositivos.</p>
                     </div>
                     <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Próximamente</span>
                  </div>
               </div>
            </Section>
          )}

          {/* Notificaciones Section */}
          {activeTab === "notificaciones" && (
            <Section title="Preferencias de alertamiento" icon={Smartphone} color="bg-indigo-600">
               <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center">
                     <div className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700">
                        Próximamente
                     </div>
                     <p className="text-sm leading-6 text-slate-600">
                        Estamos preparando controles personalizados para tus notificaciones.
                     </p>
                  </div>
                  <Toggle label="Notificaciones por SMS" description="Recibir alertas de geoposición por texto." defaultChecked disabled />
                  <Toggle label="Notificaciones por Email" description="Recibir el reporte completo del escaneo por correo." defaultChecked disabled />
                  <Toggle label="Sonido de Alerta Crítica" description="Activar sonido en tiempo real en el dashboard." defaultChecked disabled />
               </div>
            </Section>
          )}

          {/* Suscripcion & Plan Section */}
          {activeTab === "plan" && (
            <div className="space-y-8 scale-in fade-in duration-500">
               <Section title="Estado de la suscripción" icon={CreditCard} color="bg-amber-500">
                <div className={`rounded-[2rem] border p-6 shadow-sm ${accountState?.isExpired || accountState?.isInactive ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50'}`}>
                   <p className={`${accountState?.isExpired || accountState?.isInactive ? 'text-red-900' : 'text-amber-900'} mb-2 text-[10px] font-black uppercase tracking-[0.28em]`}>Plan actual</p>
                   <p className={`text-2xl font-black tracking-tight ${accountState?.isExpired || accountState?.isInactive ? 'text-red-950' : 'text-amber-950'}`}>
                     {accountState?.packageName || "Plan Personal"}
                   </p>
                   <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                     <span className={`text-sm font-medium ${accountState?.isExpired || accountState?.isInactive ? 'text-red-900/70' : 'text-amber-900/70'} leading-6`}>
                        {accountState?.serviceEndDate ? `Válido hasta: ${new Date(accountState.serviceEndDate).toLocaleDateString()}` : "Servicio no activado"}
                     </span>
                     <span className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] ${
                       accountState?.isInactive ? 'bg-slate-200 text-slate-600' : 
                       accountState?.isExpired ? 'bg-red-200 text-red-900' : 
                       'bg-emerald-200 text-emerald-900'
                     }`}>
                       {accountState?.isInactive ? "Inactivo" : accountState?.isExpired ? "Expirado" : "Activo"}
                     </span>
                   </div>
                </div>
                <Link href="/dashboard/upgrade" className="block w-full rounded-2xl bg-slate-950 px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.28em] text-white transition-all hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  {accountState?.isExpired || accountState?.isInactive ? "Activar ahora" : "Gestionar / Mejorar Plan"}
                </Link>
              </Section>

              {/* Danger Zone moved here as it belongs to account/subscription management */}
              <div className="rounded-[2.5rem] border border-red-100 bg-red-50 p-8 shadow-sm">
                 <div className="mb-5 flex items-center gap-4 text-red-700">
                    <Trash2 className="h-6 w-6" />
                    <h3 className="text-xl font-black tracking-tight uppercase">Zona crítica</h3>
                 </div>
                 <p className="mb-6 text-sm leading-6 text-red-900/70">
                   Si eliminas tu cuenta, perderás el acceso a todos tus chips y perfiles médicos. Esta acción es definitiva y no se puede deshacer.
                 </p>
                 <button 
                   onClick={handleDeleteAccount}
                   disabled={isDeleting}
                   className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.28em] text-white shadow-[0_18px_40px_-20px_rgba(220,38,38,0.45)] transition-all hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 >
                   {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                   Eliminar Cuenta Permanentemente
                 </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8 rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-right-4 duration-500 sm:p-8 lg:p-10">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SettingsTab({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`flex w-full items-center gap-4 rounded-[1.75rem] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-5 ${active ? "border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]" : "border-transparent bg-slate-50/70 hover:border-slate-200 hover:bg-white"}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className={`block text-sm font-black tracking-tight ${active ? "text-slate-950" : "text-slate-700"}`}>{label}</span>
        <span className={`mt-1 block text-xs leading-5 ${active ? "text-slate-500" : "text-slate-400"}`}>{description}</span>
      </div>
      {active && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
    </button>
  );
}

function Toggle({
  label,
  description,
  defaultChecked,
  disabled,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => { if (!disabled) setChecked(!checked); }}
      type="button"
      className={`flex w-full items-center justify-between rounded-[2rem] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-6 ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70' : 'cursor-pointer border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
    >
       <div className="max-w-md pr-6">
          <p className={`font-black ${disabled ? 'text-slate-600' : 'text-slate-950'}`}>{label}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
       </div>
       <div className={`h-8 w-14 rounded-full p-1 transition-all ${checked ? "bg-primary" : "bg-slate-300"}`}>
          <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : ""}`} />
       </div>
    </button>
  );
}
