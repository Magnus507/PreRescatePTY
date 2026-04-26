"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  Heart, Phone, AlertTriangle, Droplets, Pill, 
  Activity, User, MessageCircle, Loader2, Calendar,
  ShieldCheck, MapPin, Share2, Clock, Crown, ArrowLeft, Lightbulb, MousePointerClick
} from "lucide-react";

interface EmergencyProfile {
  firstName: string;
  lastName: string;
  displayName: string;
  sex: string;
  age: number | null;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  additionalNotes: string;
  photoUrl: string | null;
  isVerifiedAdmin?: boolean; // New flag
  emergencyContacts: {
    fullName: string;
    relationship: string;
    phone: string;
  }[];
}

export default function EmergencyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const shortCode = params.shortCode as string;
  const source = searchParams.get("source") || "qr";
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isParamedic, setIsParamedic] = useState<boolean | null>(null);
  const [scanTime] = useState(new Date().toLocaleString("es-PA", { 
    timeZone: "America/Panama",
    hour: '2-digit', 
    minute: '2-digit',
    day: '2-digit',
    month: 'short'
  }));

  useEffect(() => {
    async function load() {
      try {
        const scanBody: Record<string, unknown> = { sourceType: source };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              fetch(`/api/public/${shortCode}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...scanBody,
                  geoLat: pos.coords.latitude,
                  geoLng: pos.coords.longitude,
                  geoAccuracy: pos.coords.accuracy,
                }),
              });
            },
            () => {
              fetch(`/api/public/${shortCode}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(scanBody),
              });
            },
            { timeout: 3000 }
          );
        } else {
          fetch(`/api/public/${shortCode}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanBody),
          });
        }

        const res = await fetch(`/api/public/${shortCode}?t=${Date.now()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Perfil no disponible");
        } else {
          setProfile(data.profile);
        }
      } catch {
        setError("Error al cargar el perfil de emergencia");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [shortCode, source]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
        <Activity className="h-16 w-16 animate-pulse text-red-600 mb-6" />
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <p className="text-sm font-black uppercase tracking-widest text-gray-500">Accediendo a Protocolo...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl text-center border border-gray-100">
          <div className="bg-amber-50 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-amber-100">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tighter italic leading-none">Vínculo Inactivo</h1>
          <p className="text-gray-500 mb-10 text-lg leading-relaxed font-medium">
            Este código aún no ha sido activado. Si ya tienes tu empaque, activa el código físico para habilitar tu perfil de emergencia.
          </p>
          <a
            href="/activar"
            className="group relative inline-flex items-center justify-center gap-2 w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xl overflow-hidden transition-all hover:bg-black active:scale-95 shadow-xl shadow-red-100"
          >
            Activar Código <ShieldCheck className="h-6 w-6" />
          </a>
        </div>
      </div>
    );
  }

  if (isParamedic === null) {
    return (
      <div className="min-h-screen bg-[#DA1A21] flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        {/* Aesthetic Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-white rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[5%] w-64 h-64 bg-black rounded-full blur-[120px]" />
        </div>

        <div className="max-w-md w-full text-center space-y-12 relative z-10">
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-xl rounded-[2.5rem] w-28 h-28 flex items-center justify-center mx-auto border border-white/30 shadow-2xl">
              <Activity className="h-14 w-14 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Triaje de Emergencia</h1>
                <p className="text-red-100/70 font-bold uppercase tracking-widest text-[10px]">PreRescate Panama | Protocolo V.2</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-xl font-medium text-white leading-relaxed px-4">
              ¿Eres personal capacitado en <span className="font-black underline decoration-white/40">primera respuesta médica</span>?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <button
              onClick={() => setIsParamedic(true)}
              className="group relative w-full bg-white text-[#DA1A21] py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-tighter italic flex items-center justify-center gap-3"
            >
              SÍ, soy Paramédico <ShieldCheck className="h-8 w-8" />
            </button>
            <button
              onClick={() => setIsParamedic(false)}
              className="w-full bg-black/20 backdrop-blur-md border-2 border-white/20 text-white py-6 rounded-[2.5rem] font-black text-lg hover:bg-black/30 transition-all active:scale-95 uppercase tracking-widest"
            >
              No, soy un Ciudadano
            </button>
          </div>

          <div className="pt-8 flex items-center justify-center gap-10 opacity-40">
                <div className="h-px bg-white flex-1" />
                <Droplets className="h-5 w-5" />
                <div className="h-px bg-white flex-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 selection:bg-red-100">
      {/* High-Impact Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-white/90">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile.isVerifiedAdmin && (
               <a 
                 href="/" 
                 className="group h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                 title="Volver al Inicio"
               >
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
               </a>
            )}
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 bg-[#DA1A21] rounded-lg flex items-center justify-center shadow-lg shadow-red-100">
                  <Heart className="h-4 w-4 text-white fill-white animate-pulse" />
               </div>
               <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Estado de Rescate</p>
                  <p className="text-xs font-black text-[#DA1A21] uppercase tracking-tight leading-none">Emergencia Crítica</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
             <Clock className="h-3 w-3 text-slate-500" />
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{scanTime}</span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* PANIC CALL 911 (Always Priority) */}
        <a
          href="tel:911"
          className="flex items-center justify-between gap-4 w-full bg-[#DA1A21] text-white p-6 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(218,26,33,0.4)] hover:bg-black transition-all active:scale-95 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#DA1A21]/20" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-red-500/30">
                <Phone className="h-8 w-8 fill-white animate-bounce" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200">Central de Urgencias</p>
                <p className="text-3xl font-black leading-none uppercase tracking-tighter">Llamar al 911</p>
            </div>
          </div>
          <Share2 className="h-6 w-6 text-white/30" />
        </a>

        {/* Civil Protocol View */}
        {!isParamedic && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                    <AlertTriangle className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                     <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Protocolo Ciudadano</h2>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Guía de Primeros Auxilios</p>
                </div>
              </div>
              
              <div className="grid gap-4">
                <InstructionItem 
                    number="01" 
                    title="Asegura el Entorno" 
                    desc="Detente en zona segura y pide espacio. Si estás en un vehículo, enciende las luces de emergencia." 
                />
                <InstructionItem 
                    number="02" 
                    title="Evalúa el Daño" 
                    desc="¿Hay derrame de combustible? ¿Riesgo de atropello? No te arriesgues." 
                />
                <InstructionItem 
                    number="03" 
                    title="Manejo del Trauma" 
                    desc="No muevas a la persona ni su cuello. Una lesión cervical es fatal si se manipula sin equipo profesional." 
                />
                <InstructionItem 
                    number="04" 
                    title="Comunicación" 
                    desc="Háblale por su nombre, dile que la ayuda viene en camino y no permitas que se duerma." 
                />
              </div>

              <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <p className="text-sm font-black text-slate-400 uppercase">Equipos de Rescate Alertados</p>
                </div>
                <button 
                    onClick={() => setIsParamedic(true)}
                    className="flex items-center gap-2 group text-xs font-black text-[#DA1A21] bg-red-50 px-6 py-3 rounded-xl hover:bg-[#DA1A21] hover:text-white transition-all uppercase tracking-tighter"
                >
                    Soy personal médico <ShieldCheck className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Medical Section (PARAMEDICS ONLY) */}
        {isParamedic && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-10 duration-1000">
            {/* VITAL IDENTITY CARD */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#DA1A21] to-red-600 rounded-[3.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000"></div>
                <div className="relative bg-white p-8 rounded-[3rem] border border-white shadow-2xl flex flex-col md:flex-row items-center gap-8 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 space-y-2 text-right hidden md:block">
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Vínculo Seguro</p>
                         <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Verificado</p>
                    </div>

                    {profile.photoUrl ? (
                      <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-[6px] border-slate-50 shadow-2xl flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                        <Image 
                          src={profile.photoUrl} 
                          alt={`Foto de ${profile.firstName}`} 
                          width={160}
                          height={160}
                          className="w-full h-full object-cover" 
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 border-2 border-dashed border-slate-200">
                        <User className="h-20 w-20" />
                      </div>
                    )}

                    <div className="text-center md:text-left flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full mb-3 border border-red-100">
                         <span className="text-[10px] font-black uppercase tracking-widest">Ficha de Emergencia</span>
                      </div>
                      <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-1 uppercase">
                         {profile.firstName} <br /> {profile.lastName}
                      </h1>
                      
                      {profile.isVerifiedAdmin && (
                        <div className="flex flex-col items-center md:items-start mb-6">
                           <div className="relative mb-2">
                              <Crown className="h-10 w-10 text-yellow-500 fill-yellow-500 animate-bounce" />
                              <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full" />
                           </div>
                           <div className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-2 rounded-full border border-slate-700 shadow-2xl">
                              <ShieldCheck className="h-4 w-4 text-emerald-400" />
                              <span className="text-[12px] font-black uppercase tracking-[0.2em] italic">Demo En Vivo</span>
                           </div>
                        </div>
                      )}

                      {profile.displayName !== `${profile.firstName} ${profile.lastName.charAt(0)}.` && (
                        <p className="text-sm font-black text-slate-400 mb-4 mt-1 uppercase tracking-widest">
                           ALIAS: {profile.displayName}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-[#DA1A21] text-white rounded-2xl shadow-lg shadow-red-200">
                          <Droplets className="h-5 w-5 fill-white" />
                          <span className="text-xl font-black uppercase tracking-tighter leading-none">SANGRE: {profile.bloodType}</span>
                        </div>
                        {profile.age !== null && (
                          <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                            <Calendar className="h-5 w-5" />
                            <span className="text-xl font-black uppercase tracking-tighter leading-none">Edad: {profile.age}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-100 text-slate-800 rounded-2xl border border-slate-200">
                          <span className="text-xl font-black uppercase tracking-tighter leading-none">SEXO: {profile.sex === 'M' ? 'MASCULINO' : profile.sex === 'F' ? 'FEMENINO' : 'NO REPORTADO'}</span>
                        </div>
                      </div>
                    </div>
                </div>
            </div>

            {/* CRITICAL GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <MedicalCard
                icon={<AlertTriangle className="h-7 w-7 text-amber-500" />}
                title="ALERGIAS"
                content={profile.allergies}
                critical={!!(profile.allergies && !profile.allergies.toLowerCase().includes("no report"))}
                color="amber"
              />
              <MedicalCard
                icon={<Activity className="h-7 w-7 text-blue-500" />}
                title="CONDICIONES"
                content={profile.chronicConditions}
                color="blue"
              />
              <MedicalCard
                icon={<Pill className="h-7 w-7 text-emerald-500" />}
                title="MEDICAMENTOS"
                content={profile.medications}
                color="emerald"
              />
              <MedicalCard
                icon={<MessageCircle className="h-7 w-7 text-slate-500" />}
                title="INSTRUCCIONES"
                content={profile.additionalNotes || "Sin notas adicionales reportadas por el usuario."}
                color="slate"
              />
            </div>
          </div>
        )}

        {/* EMERGENCY CONTACTS */}
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-600 rounded-[3rem] blur opacity-10"></div>
            <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-50 h-12 w-12 rounded-2xl p-2.5 border border-emerald-100 flex items-center justify-center">
                        <Heart className="h-8 w-8 text-emerald-600 fill-emerald-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Contactos de Rescate</h2>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-1">Alertar Familiares inmediatamente</p>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.emergencyContacts.length > 0 ? (
                    profile.emergencyContacts.map((contact, idx) => (
                    <a
                        key={idx}
                        href={`tel:${contact.phone}`}
                        className="flex items-center justify-between p-6 rounded-[2.2rem] bg-emerald-50/40 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all group active:scale-95 shadow-sm"
                    >
                        <div className="flex-1">
                            <p className="font-black text-slate-900 group-hover:text-white transition-colors uppercase tracking-tight text-xl leading-none mb-1">
                                {contact.fullName}
                            </p>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 rounded-lg group-hover:bg-white/20">
                                <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest group-hover:text-white">
                                    {contact.relationship}
                                </span>
                            </div>
                        </div>
                        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl shadow-emerald-100 group-hover:bg-white group-hover:text-emerald-700 transition-all flex items-center justify-center">
                            <Phone className="h-6 w-6 fill-current" />
                        </div>
                    </a>
                    ))
                ) : (
                    <div className="col-span-full p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                         <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay contactos registrados</p>
                    </div>
                )}
              </div>
            </div>
        </div>

        <div className="pt-10 flex flex-col items-center gap-6">
             <div className="flex items-center gap-8 opacity-20">
                  <div className="h-px bg-slate-400 w-24" />
                  <MapPin className="h-6 w-6 text-slate-600" />
                  <div className="h-px bg-slate-400 w-24" />
             </div>
             <div className="text-center group cursor-default">
                  {profile.isVerifiedAdmin ? (
                    <div className="bg-red-600 text-white px-6 py-2 rounded-full mb-4 inline-block font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-red-200">
                       Perfil de Demostración Oficial
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-300 font-black tracking-[0.4em] uppercase mb-1">PRE-RESCATE PANAMÁ</p>
                  )}
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest transition-all group-hover:text-[#DA1A21]">Intelligent Prevention Ecosystem v.2.4</p>
             </div>
        </div>

      </main>

      {profile.isVerifiedAdmin && (
        <div className="pointer-events-none">
          {/* Desktop: Strategic Instruction Panels */}
          <div className="hidden xl:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-6 w-72 z-40 animate-in slide-in-from-left-10 duration-1000 pointer-events-auto">
             <div className="p-8 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-2xl relative group overflow-hidden hover:bg-white transition-all">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12 group-hover:scale-125 transition-transform duration-700">
                   <Lightbulb className="h-32 w-32" />
                </div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="h-10 w-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Lightbulb className="h-5 w-5" />
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none mb-1">El Propósito</h4>
                      <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none italic">¿Por qué PreRescate?</h3>
                   </div>
                </div>
                <div className="space-y-4 relative z-10">
                   {[
                     "Identificación vital en segundos.",
                     "Ahorra minutos de oro en accidentes.",
                     "Protege a tu familia con alertas GPS."
                   ].map((t, i) => (
                      <div key={i} className="flex gap-3 text-[11px] font-bold text-slate-500 leading-snug items-start">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                         {t}
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-6 w-72 z-40 animate-in slide-in-from-right-10 duration-1000 pointer-events-auto">
             <div className="p-8 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-2xl relative group overflow-hidden hover:bg-white transition-all">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 -rotate-12 group-hover:scale-125 transition-transform duration-700">
                   <MousePointerClick className="h-32 w-32" />
                </div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="h-10 w-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                      <MousePointerClick className="h-5 w-5" />
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 leading-none mb-1">El Protocolo</h4>
                      <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none italic">¿Cómo funciona?</h3>
                   </div>
                </div>
                <div className="space-y-4 relative z-10">
                   {[
                     "Escanea el NFC o QR del chip.",
                     "Valida alergias y ficha médica.",
                     "Notifica a la red de emergencia."
                   ].map((t, i) => (
                      <div key={i} className="flex gap-3 text-[11px] font-bold text-slate-500 leading-snug items-start">
                         <div className="h-4 w-4 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">{i+1}</div>
                         {t}
                      </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Mobile Accessory: Subtle Instruction Banner */}
          <div className="xl:hidden fixed bottom-6 left-6 right-6 z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 bg-brand rounded-xl flex items-center justify-center text-white shrink-0">
                      <Lightbulb className="h-4 w-4" />
                   </div>
                   <p className="text-[10px] font-medium text-slate-300 leading-tight">
                      Estás viendo una <span className="text-white font-black uppercase tracking-widest text-[9px]">Demo Interactiva</span>. Escanea este QR para probarlo tú mismo.
                   </p>
                </div>
                <button className="px-4 py-2 bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-colors whitespace-nowrap">
                   Entendido
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
const InstructionItem = ({ number, title, desc }: { number: string; title: string; desc: string }) => (
    <div className="group flex gap-5 p-6 rounded-[2.2rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-[#DA1A21]/20 transition-all duration-500">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-inner group-hover:bg-red-50 group-hover:text-[#DA1A21] transition-colors">
            {number}
        </div>
        <div>
            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg leading-tight">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium">{desc}</p>
        </div>
    </div>
);

const MedicalCard = ({ icon, title, content, critical = false, color = "slate" }: { icon: any; title: string; content: string; critical?: boolean; color?: string }) => {
    
    const colorMap: Record<string, string> = {
        amber: "bg-amber-50 group-hover:bg-amber-100/50 border-amber-100",
        blue: "bg-blue-50 group-hover:bg-blue-100/50 border-blue-100",
        emerald: "bg-emerald-50 group-hover:bg-emerald-100/50 border-emerald-100",
        slate: "bg-slate-50 group-hover:bg-slate-100/50 border-slate-100"
    };

    return (
        <div className={`group relative p-8 rounded-[3rem] border transition-all duration-500 ${critical ? "bg-red-50 border-red-200 shadow-xl shadow-red-100/50" : "bg-white border-slate-100 shadow-sm hover:shadow-xl"}`}>
            <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-2xl shadow-sm ${critical ? 'bg-white text-red-600' : 'bg-slate-50 text-slate-600'} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                     <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none">{title}</p>
                </div>
            </div>
            <p className={`text-xl leading-tight uppercase tracking-tighter ${critical ? "font-black text-red-600" : "font-black text-slate-900"}`}>
                {content || "No reportado"}
            </p>
            
            {critical && (
                <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Atención Crítica</span>
                </div>
            )}
        </div>
    );
};
