"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Heart, Phone, AlertTriangle, Droplets, Pill, Activity, User, MessageCircle, Loader2 } from "lucide-react";

interface EmergencyProfile {
  displayName: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  additionalNotes: string;
  photoUrl: string | null;
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
  const [scanTime] = useState(new Date().toLocaleString("es-PA", { timeZone: "America/Panama" }));

  useEffect(() => {
    async function load() {
      try {
        // Record scan event
        const scanBody: Record<string, unknown> = { sourceType: source };

        // Try to get geolocation
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

        // Fetch public profile
        const res = await fetch(`/api/public/${shortCode}`);
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
      <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Cargando perfil de emergencia...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Vínculo Desactivado</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Este código no está vinculado a un perfil médico activo o el servicio ha expirado.
          </p>
          <a
            href="/"
            className="inline-block w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-95"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  // --- Step 1: Paramedic Check ---
  if (isParamedic === null) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="bg-white/10 backdrop-blur-md rounded-full w-24 h-24 flex items-center justify-center mx-auto border border-white/20 animate-pulse">
            <Activity className="h-12 w-12 text-white" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white/90">Estatus de Emergencia</h1>
            <p className="text-lg font-medium text-red-50/80 leading-relaxed">
              ¿Eres personal de emergencias capacitado (Paramédico, Médico, Rescatista)?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setIsParamedic(true)}
              className="w-full bg-white text-red-600 py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-red-50 transition-all active:scale-95 uppercase tracking-wide"
            >
              SÍ, soy Paramédico
            </button>
            <button
              onClick={() => setIsParamedic(false)}
              className="w-full bg-transparent border-2 border-white/40 text-white py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95"
            >
              No, soy un civil
            </button>
          </div>

          <p className="text-xs text-red-200 mt-8 font-medium">
            Acceso a datos Vitales — PreRescate PTY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Red Pulse Header */}
      <div className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-white animate-pulse" />
            <span className="font-black italic tracking-tighter uppercase text-sm">Emergencia Activa</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">{scanTime}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Call 911 Button (Always available) */}
        <a
          href="tel:911"
          className="flex items-center justify-center gap-3 w-full bg-red-600 text-white py-6 rounded-3xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 group overflow-hidden relative"
        >
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10" />
          <Phone className="h-8 w-8 fill-white animate-bounce" />
          <div className="text-left font-sans">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Llamada Urgente</p>
            <p className="text-2xl font-black leading-none uppercase">LLAMAR AL 911</p>
          </div>
        </a>

        {/* Civil View (Instructions) */}
        {!isParamedic && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-8 w-8" />
                <h2 className="text-xl font-black uppercase tracking-tight">Qué hacer ahora</h2>
              </div>
              
              <div className="grid gap-4">
                <InstructionItem 
                    number="1" 
                    title="Manten la Calma" 
                    desc="Tu seguridad es lo primero. Asegura el área del accidente." 
                />
                <InstructionItem 
                    number="2" 
                    title="No Muevas al Herido" 
                    desc="A menos que haya riesgo de explosión o incendio inminente." 
                />
                <InstructionItem 
                    number="3" 
                    title="No Quites el Casco" 
                    desc="Cualquier movimiento brusco en el cuello puede ser fatal." 
                />
                <InstructionItem 
                    number="4" 
                    title="Habla con la Persona" 
                    desc="Pregúntale su nombre, si sabe dónde está y mantenla despierta." 
                />
              </div>

              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-400 italic">Esperando equipos de rescate...</p>
                <button 
                    onClick={() => setIsParamedic(true)}
                    className="text-xs font-black text-red-600 underline uppercase h-10 px-4"
                >
                    Soy paramédico
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Medical Profile Section (Paramedics Only) */}
        {isParamedic && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Identity Card */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
              {profile.photoUrl ? (
                <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-red-50 shadow-inner flex-shrink-0 text-white">
                  <img src={profile.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-[2rem] bg-gray-50 flex items-center justify-center text-gray-300 flex-shrink-0">
                  <User className="h-16 w-16" />
                </div>
              )}
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-1">Identificación del Paciente</p>
                <h1 className="text-3xl font-black text-gray-900 leading-none mb-2">{profile.displayName}</h1>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full">
                  <Droplets className="h-4 w-4 fill-white" />
                  <span className="text-sm font-black">SANGRE: {profile.bloodType}</span>
                </div>
              </div>
            </div>

            {/* Critical Medical Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MedicalCard
                icon={<AlertTriangle className="h-6 w-6 text-orange-500" />}
                title="ALERGIAS"
                content={profile.allergies || "No reporta"}
                critical={!!profile.allergies}
              />
              <MedicalCard
                icon={<Activity className="h-6 w-6 text-blue-500" />}
                title="CONDICIONES"
                content={profile.chronicConditions || "No reporta"}
              />
              <MedicalCard
                icon={<Pill className="h-6 w-6 text-emerald-500" />}
                title="MEDICAMENTOS"
                content={profile.medications || "No reporta"}
              />
              <MedicalCard
                icon={<MessageCircle className="h-6 w-6 text-gray-500" />}
                title="NOTAS"
                content={profile.additionalNotes || "N/A"}
              />
            </div>
          </div>
        )}

        {/* Emergency Contacts (Always available) */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 rounded-2xl p-2.5">
                <Heart className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-none">Contactos de Emergencia</h2>
                <p className="text-xs text-gray-400 mt-1">Avisar a sus familiares sobre el evento</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.emergencyContacts.map((contact, idx) => (
              <a
                key={idx}
                href={`tel:${contact.phone}`}
                className="flex items-center justify-between p-5 rounded-3xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-100 transition-colors group active:scale-95 text-gray-900"
              >
                <div>
                  <p className="font-black text-gray-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{contact.fullName}</p>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-0.5">{contact.relationship}</p>
                </div>
                <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                    <Phone className="h-5 w-5" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-300 font-black tracking-[0.2em] mt-8 uppercase">
          SISTEMA PROTEGIDO POR PRERESCATE PTY
        </p>
      </main>
    </div>
  );
}

// Helper Components
const InstructionItem = ({ number, title, desc }: { number: string; title: string; desc: string }) => (
    <div className="flex gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0 shadow-lg shadow-red-100">
            {number}
        </div>
        <div>
            <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mt-1 font-medium">{desc}</p>
        </div>
    </div>
);

const MedicalCard = ({ icon, title, content, critical = false }: { icon: any; title: string; content: string; critical?: boolean }) => (
  <div className={`p-6 rounded-[2.5rem] border ${critical ? "bg-red-50 border-red-200 shadow-sm text-red-600" : "bg-white border-gray-100 text-gray-700"} transition-all`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-2xl ${critical ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
        {icon}
      </div>
      <h3 className="text-xs font-black tracking-[0.2em] text-gray-400 uppercase">{title}</h3>
    </div>
    <p className={`text-lg leading-tight ${critical ? "font-black" : "font-bold"}`}>
      {content}
    </p>
  </div>
);
