"use client";

import { useState, useEffect } from "react";
import { 
  Settings, Shield, Lock, Bell, CreditCard, 
  Trash2, Save, Loader2, User, KeyRound, Smartphone, Camera, Upload
} from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ConfiguracionPage() {
  const router = useRouter();
  const { data: session } = useSession();
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
  const [accountState, setAccountState] = useState<any>(null);

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
    } catch (err: any) {
      toast.error(err.message);
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

    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al borrar la cuenta");
      }

      toast.success("Tu cuenta ha sido eliminada. Cerrando sesión...");
      
      // Give time for the toast to be seen
      setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, 2000);

    } catch (err: any) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-black text-slate-400 uppercase tracking-widest text-xs">Cargando Ajustes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Configuración</h1>
          <p className="text-muted-foreground font-medium italic">Gestiona tu cuenta, seguridad y preferencias del sistema</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-3"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="space-y-3">
          <SettingsTab 
            active={activeTab === "perfil"} 
            icon={User} 
            label="Perfil de Cuenta" 
            onClick={() => setActiveTab("perfil")} 
          />
          <SettingsTab 
            active={activeTab === "seguridad"} 
            icon={Shield} 
            label="Seguridad & Acceso" 
            onClick={() => setActiveTab("seguridad")} 
          />
          <SettingsTab 
            active={activeTab === "notificaciones"} 
            icon={Bell} 
            label="Notificaciones de Emergencia" 
            onClick={() => setActiveTab("notificaciones")} 
          />
          <SettingsTab 
            active={activeTab === "plan"} 
            icon={CreditCard} 
            label="Suscripción & Plan" 
            onClick={() => setActiveTab("plan")} 
          />
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Perfil de Cuenta Section */}
          {activeTab === "perfil" && (
            <div className="space-y-8">
              <Section title="Foto de Perfil" icon={Camera} color="bg-indigo-600">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                      {photoUrl ? (
                         <img src={photoUrl} alt="Perfil" className="h-full w-full object-cover" />
                      ) : (
                         <User className="h-12 w-12 text-indigo-300" />
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-90 transition-all">
                      <Upload className="h-5 w-5" />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    </label>
                  </div>
                  <div className="space-y-2 text-center md:text-left">
                    <p className="font-black text-xl tracking-tight">Tu Imagen Médica</p>
                    <p className="text-sm text-muted-foreground font-medium max-w-sm">
                      Sube una foto clara de tu rostro. Esto ayuda al personal de emergencia a identificarte rápidamente en caso de crisis.
                    </p>
                    <p className="text-[10px] font-black uppercase text-indigo-600/60 tracking-widest pt-1">WebP Optimizado • Máx 2MB</p>
                  </div>
                </div>
              </Section>

              <Section title="Identidad de la Cuenta" icon={User} color="bg-primary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre(s)</label>
                  <input 
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre real"
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Apellido(s)</label>
                  <input 
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tus apellidos"
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cédula / ID / DNI</label>
                  <input 
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="Ej: 8-888-8888"
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Teléfono Vinculado</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +507 6000-0000"
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dirección de Envío / Residencia</label>
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Edificio, Casa..."
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ciudad / Provincia</label>
                  <input 
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ej: Ciudad de Panamá"
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email de Acceso</label>
                  <div className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 font-bold italic cursor-not-allowed">
                    {userEmail}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ID Universal</label>
                  <div className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 font-bold italic cursor-not-allowed uppercase">
                    {universalId}
                  </div>
                </div>
              </div>
            </Section>
          </div>
          )}

          {/* Seguridad Section */}
          {activeTab === "seguridad" && (
            <Section title="Seguridad del Sistema" icon={Lock} color="bg-slate-900">
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                     <div>
                        <p className="font-black text-slate-900">Contraseña</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Sincronizada con el último cambio.</p>
                     </div>
                     <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Cambiar</button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                     <div>
                        <p className="font-black text-slate-900">Sesiones Activas</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Solo este dispositivo está conectado.</p>
                     </div>
                     <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase">Seguro</span>
                  </div>
               </div>
            </Section>
          )}

          {/* Notificaciones Section */}
          {activeTab === "notificaciones" && (
            <Section title="Preferencias de Alertamiento" icon={Smartphone} color="bg-indigo-600">
               <div className="space-y-4">
                  <Toggle label="Notificaciones por SMS" description="Recibir alertas de geoposición por texto." defaultChecked />
                  <Toggle label="Notificaciones por Email" description="Recibir el reporte completo del escaneo por correo." defaultChecked />
                  <Toggle label="Sonido de Alerta Crítica" description="Activar sonido en tiempo real en el dashboard." defaultChecked />
               </div>
            </Section>
          )}

          {/* Suscripcion & Plan Section */}
          {activeTab === "plan" && (
            <div className="space-y-8 scale-in fade-in duration-500">
               <Section title="Estado de la Suscripción" icon={CreditCard} color="bg-amber-500">
                <div className={`p-6 rounded-3xl border ${accountState?.isExpired || accountState?.isInactive ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                   <p className={`${accountState?.isExpired || accountState?.isInactive ? 'text-red-900' : 'text-amber-900'} font-black uppercase text-xs tracking-widest mb-2`}>Plan Actual</p>
                   <p className={`text-2xl font-black ${accountState?.isExpired || accountState?.isInactive ? 'text-red-950' : 'text-amber-950'} uppercase tracking-tighter`}>
                     {accountState?.packageName || "Plan Personal"}
                   </p>
                   <div className="mt-4 flex items-center justify-between">
                     <span className={`text-sm font-bold ${accountState?.isExpired || accountState?.isInactive ? 'text-red-900/60' : 'text-amber-900/60'} leading-none`}>
                        {accountState?.serviceEndDate ? `Válido hasta: ${new Date(accountState.serviceEndDate).toLocaleDateString()}` : "Servicio no activado"}
                     </span>
                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                       accountState?.isInactive ? 'bg-slate-200 text-slate-600' : 
                       accountState?.isExpired ? 'bg-red-200 text-red-900' : 
                       'bg-emerald-200 text-emerald-900'
                     }`}>
                       {accountState?.isInactive ? "Inactivo" : accountState?.isExpired ? "Expirado" : "Activo"}
                     </span>
                   </div>
                </div>
                <Link href="/dashboard/upgrade" className="block w-full text-center py-4 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">
                  {accountState?.isExpired || accountState?.isInactive ? "Activar ahora" : "Gestionar / Mejorar Plan"}
                </Link>
              </Section>

              {/* Danger Zone moved here as it belongs to account/subscription management */}
              <div className="p-10 rounded-[3rem] bg-red-50 border border-red-100">
                 <div className="flex items-center gap-4 mb-6 text-red-600">
                    <Trash2 className="h-6 w-6" />
                    <h3 className="text-xl font-black tracking-tight uppercase">Zona Crítica</h3>
                 </div>
                 <p className="text-sm text-red-900/60 font-medium mb-6 leading-relaxed">
                   Si eliminas tu cuenta, perderás el acceso a todos tus chips y perfiles médicos. Esta acción es definitiva y no se puede deshacer.
                 </p>
                 <button 
                   onClick={handleDeleteAccount}
                   disabled={isDeleting}
                   className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

function Section({ title, icon: Icon, color, children }: any) {
  return (
    <div className="p-10 rounded-[3.5rem] bg-white border border-border shadow-sm space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg font-black`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-black tracking-tight uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SettingsTab({ icon: Icon, label, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer transition-all ${active ? "bg-white border border-border shadow-md translate-x-1" : "hover:bg-slate-100/50 text-muted-foreground"}`}
    >
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${active ? "bg-primary/10 text-primary" : "bg-slate-100"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className={`font-black text-sm uppercase tracking-tight ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
    </div>
  );
}

function Toggle({ label, description, defaultChecked }: any) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div 
      onClick={() => setChecked(!checked)}
      className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-all group"
    >
       <div className="max-w-xs">
          <p className="font-black text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{description}</p>
       </div>
       <div className={`w-14 h-8 rounded-full p-1 transition-all ${checked ? "bg-primary" : "bg-slate-300"}`}>
          <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${checked ? "translate-x-6" : ""}`} />
       </div>
    </div>
  );
}
