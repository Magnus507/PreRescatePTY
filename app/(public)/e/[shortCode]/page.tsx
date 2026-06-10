"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Heart, Phone, AlertTriangle, Droplets, Pill, 
  Activity, User, MessageCircle, Loader2, Calendar,
  ShieldCheck, MapPin, Share2, Clock, Crown, ArrowLeft, Lightbulb, MousePointerClick,
  Brain, Footprints, Baby
} from "lucide-react";
import { IndustrialProfileView } from "./_components/IndustrialProfileView";
import { formatEmergencyLocation } from "@/domains/shared/services/emergency-location";

interface EmergencyProfile {
  firstName: string;
  lastName: string;
  displayName: string;
  sex: string;
  age: number | null;
  profileType?: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  photoUrl: string | null;
  isVerifiedAdmin?: boolean;
  isMinor?: boolean;
  vulnerabilityStatus?: {
    hasCognitiveImpairment: boolean | null;
    hasWanderingRisk: boolean | null;
    isNonVerbal: boolean | null;
    communicationAssistance: string | null;
  } | null;
  safeReturn?: {
    instructions: string | null;
  } | null;
  emergencyContacts: {
    fullName: string;
    relationship: string;
    phone: string;
  }[];
  organization?: {
    name: string;
    location: string | null;
    department: string | null;
  } | null;
  publicMedicalExtras?: {
    insuranceProvider: string | null;
    preferredHospital: string | null;
    primaryDoctorName: string | null;
    primaryDoctorPhone: string | null;
    emergencyInstructions: string | null;
  };
}

interface ChipMetadata {
  shortCode: string;
  serialPublic: string;
  internalLabel: string;
  productType: string;
  batchId?: string;
  originalStatus?: string;
}

type SummaryProfile = Pick<
  EmergencyProfile,
  "bloodType" | "age" | "sex" | "allergies" | "chronicConditions" | "medications"
>;

function sanitizeTelPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWhatsAppPhone(phone: string) {
  const trimmed = phone.trim();
  const withoutInternationalPrefix = trimmed.startsWith("+")
    ? trimmed.slice(1)
    : trimmed.startsWith("00")
      ? trimmed.slice(2)
      : trimmed;
  const digits = withoutInternationalPrefix.replace(/\D/g, "");
  return digits.length === 8 ? `507${digits}` : digits;
}

function normalizeSexLabel(sex: string) {
  if (sex === "M") return "Masculino";
  if (sex === "F") return "Femenino";
  return "No reportado";
}

/** v2: Special assistance badges shown below the patient name */
function SpecialAssistanceBadges({ profile }: { profile: EmergencyProfile }) {
  const vs = profile.vulnerabilityStatus;
  const badges: { label: string; color: string; icon: ReactNode }[] = [];

  if (profile.isMinor) {
    badges.push({ label: "Menor de edad", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Baby className="h-3.5 w-3.5" /> });
  }
  if (vs?.hasCognitiveImpairment) {
    badges.push({ label: "Persona vulnerable", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Brain className="h-3.5 w-3.5" /> });
  }
  if (vs?.hasWanderingRisk) {
    badges.push({ label: "Riesgo de desorientación", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <Footprints className="h-3.5 w-3.5" /> });
  }
  if (vs?.isNonVerbal) {
    badges.push({ label: "Comunicación asistida", color: "bg-violet-100 text-violet-700 border-violet-200", icon: <MessageCircle className="h-3.5 w-3.5" /> });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {badges.map((b, i) => (
        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest ${b.color}`}>
          {b.icon}
          {b.label}
        </span>
      ))}
    </div>
  );
}

/** v2: Safe return instructions card */
function SafeReturnCard({ safeReturn }: { safeReturn: EmergencyProfile["safeReturn"] }) {
  if (!safeReturn?.instructions) return null;
  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-teal-200 shadow-xl shadow-teal-100/50 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100">
          <Footprints className="h-7 w-7 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Retorno Seguro</h2>
          <p className="text-xs text-teal-600 font-bold uppercase tracking-widest mt-1">Instrucciones de apoyo</p>
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">
        Esta persona puede requerir apoyo para contactar a su familia o regresar a un lugar seguro.
      </p>
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
        <p className="text-sm font-semibold text-teal-900 leading-relaxed whitespace-pre-wrap">{safeReturn.instructions}</p>
      </div>
    </div>
  );
}

/** v2: Communication assistance card (paramedic view) */
function CommunicationAssistanceCard({ vulnerabilityStatus }: { vulnerabilityStatus: EmergencyProfile["vulnerabilityStatus"] }) {
  if (!vulnerabilityStatus?.isNonVerbal || !vulnerabilityStatus.communicationAssistance) return null;
  return (
    <div className="bg-white border border-violet-200 rounded-[2rem] p-5 md:p-6 shadow-lg space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-violet-50 rounded-xl flex items-center justify-center border border-violet-100">
          <MessageCircle className="h-5 w-5 text-violet-600" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-violet-700">Instrucciones de comunicación</h3>
      </div>
      <p className="text-sm font-semibold text-slate-900 leading-relaxed">{vulnerabilityStatus.communicationAssistance}</p>
    </div>
  );
}

/** Reusable profile hero card shared by citizen + paramedic views */
function PatientMedicalCard({ profile, isParamedic }: { profile: EmergencyProfile; isParamedic?: boolean }) {
  const hasAllergies = profile.allergies && profile.allergies.trim() && !profile.allergies.toLowerCase().includes("no report");
  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#DA1A21] to-red-600 rounded-[3.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000" />
      <div className="relative bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white shadow-2xl flex flex-col md:flex-row items-center gap-5 md:gap-8 overflow-hidden">
        {profile.photoUrl ? (
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-[4px] md:border-[6px] border-slate-50 shadow-2xl flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
            <img src={profile.photoUrl} alt={`Foto de ${profile.firstName}`} className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${profile.firstName}&background=DA1A21&color=fff&size=200`; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 border-2 border-dashed border-slate-200">
            <User className="h-14 w-14 md:h-20 md:w-20" />
          </div>
        )}

        <div className="text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full mb-3 border border-red-100">
            <span className="text-[10px] font-black uppercase tracking-widest">Ficha de Emergencia</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-1 uppercase">
            {profile.firstName} <br /> {profile.lastName}
          </h1>

          {isParamedic && profile.isVerifiedAdmin && (
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
            <p className="text-sm font-black text-slate-400 mb-4 mt-1 uppercase tracking-widest">ALIAS: {profile.displayName}</p>
          )}

          {/* v2: Special assistance badges */}
          <SpecialAssistanceBadges profile={profile} />

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mt-3">
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-[#DA1A21] text-white rounded-xl md:rounded-2xl shadow-lg shadow-red-200">
              <Droplets className="h-4 w-4 md:h-5 md:w-5 fill-white" />
              <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SANGRE: {profile.bloodType}</span>
            </div>
            {profile.isMinor ? (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-200">
                <Baby className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Menor de edad</span>
              </div>
            ) : profile.age !== null && (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white rounded-xl md:rounded-2xl shadow-lg shadow-slate-200">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Edad: {profile.age}</span>
              </div>
            )}
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-50 text-slate-950 rounded-xl md:rounded-2xl border border-slate-300 shadow-sm">
              <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SEXO: {profile.sex === 'M' ? 'MASCULINO' : profile.sex === 'F' ? 'FEMENINO' : 'NO REPORTADO'}</span>
            </div>
          </div>

          {isParamedic && (
            <div className="mt-4 space-y-2 md:hidden">
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Alergias</p>
                    <p className="text-sm font-bold text-slate-900 break-words">{profile.allergies || "No reportado"}</p>
                    {hasAllergies && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">• Atención crítica</p>}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Activity className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Condiciones</p>
                    <p className="text-sm font-bold text-slate-900 break-words">{profile.chronicConditions || "No reportado"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Pill className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Medicamentos</p>
                    <p className="text-sm font-bold text-slate-900 break-words">{profile.medications || "No reportado"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CriticalMedicalSummary({ profile }: { profile: SummaryProfile }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-4 shadow-lg space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Resumen Médico Crítico</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SummaryChip icon={<Droplets className="h-4 w-4 text-red-600" />} label={`Sangre: ${profile.bloodType || "No reportado"}`} tone="red" />
        <SummaryChip icon={<Calendar className="h-4 w-4 text-slate-700" />} label={`Edad: ${profile.age ?? "No reportado"}`} tone="slate" />
        <SummaryChip icon={<User className="h-4 w-4 text-slate-700" />} label={`Sexo: ${normalizeSexLabel(profile.sex)}`} tone="slate" />
      </div>
      <div className="grid grid-cols-1 gap-2">
        <SummaryRow icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title="Alergias" value={profile.allergies || "No reportado"} />
        <SummaryRow icon={<Activity className="h-4 w-4 text-blue-500" />} title="Condiciones" value={profile.chronicConditions || "No reportado"} />
        <SummaryRow icon={<Pill className="h-4 w-4 text-emerald-500" />} title="Medicamentos" value={profile.medications || "No reportado"} />
      </div>
    </div>
  );
}

export default function EmergencyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const shortCode = params.shortCode as string;
  const source = searchParams.get("source") || "qr";
  const normalizedSource = source === "nfc" ? "nfc" : "qr";
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [isUnactivated, setIsUnactivated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isParamedic, setIsParamedic] = useState<boolean | null>(null);
  const [scanLocation, setScanLocation] = useState("");
  const [whatsappUrls, setWhatsappUrls] = useState<Record<number, string>>({});
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
        const scanBody: Record<string, unknown> = { sourceType: normalizedSource };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const locationLabel = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
              setScanLocation(locationLabel);
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

        if (data.status === "unactivated" || data.status === "inactive") {
          setIsUnactivated(true);
        } else if (!res.ok) {
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
  }, [shortCode, normalizedSource]);

  // Recompute WhatsApp URLs when scanLocation or profile updates
  useEffect(() => {
    if (!profile) return;
    const personName = `${profile.firstName} ${profile.lastName}`.trim() || profile.displayName;
    const publicProfileUrl = `${window.location.origin}/e/${shortCode}`;
    const locInfo = formatEmergencyLocation(scanLocation);
    const urls: Record<number, string> = {};
    profile.emergencyContacts.forEach((contact, idx) => {
      const whatsappPhone = normalizeWhatsAppPhone(contact.phone);
      let message: string;
      if (locInfo.mapsUrl) {
        message = [
          `Hola ${contact.fullName}, ${personName} podría necesitar ayuda.`,
          `Su ficha PreRescue ID fue escaneada recientemente.`,
          ``,
          `Ubicación aproximada:`,
          locInfo.mapsUrl,
          ``,
          `Ficha PreRescue ID:`,
          publicProfileUrl,
          ``,
          `Por favor intenta contactarle o verifica si necesita asistencia.`,
        ].join("\n");
      } else if (scanLocation) {
        message = [
          `Hola ${contact.fullName}, ${personName} podría necesitar ayuda.`,
          `Su ficha PreRescue ID fue escaneada recientemente.`,
          ``,
          `Ubicación aproximada:`,
          scanLocation,
          ``,
          `Ficha PreRescue ID:`,
          publicProfileUrl,
          ``,
          `Por favor intenta contactarle o verifica si necesita asistencia.`,
        ].join("\n");
      } else {
        message = [
          `Hola ${contact.fullName}, ${personName} podría necesitar ayuda.`,
          `Su ficha PreRescue ID fue escaneada recientemente.`,
          ``,
          `No se pudo obtener ubicación exacta.`,
          ``,
          `Ficha PreRescue ID:`,
          publicProfileUrl,
          ``,
          `Por favor intenta contactarle o verifica si necesita asistencia.`,
        ].join("\n");
      }
      urls[idx] = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
    });
    setWhatsappUrls(urls);
  }, [scanLocation, profile, shortCode]);

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

  if (isUnactivated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full">
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden relative">
            <div className="h-3 bg-red-600 w-full" />
            <div className="p-6 md:p-10 lg:p-14 text-center">
              <div className="bg-red-50 h-20 w-20 md:h-28 md:w-28 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 border border-red-100 shadow-xl shadow-red-100/50">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
              <div className="space-y-4 mb-8 md:mb-12">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Chip aún no activado</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Identificador válido en PreRescate</p>
              </div>
              <div className="space-y-6">
                <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-sm mx-auto">Este identificador existe, pero todavía no tiene un perfil médico vinculado.</p>
                <p className="text-slate-400 text-sm font-semibold leading-relaxed max-w-md mx-auto">Si este chip es tuyo, actívalo desde tu cuenta usando el código de activación.</p>
                <div className="grid grid-cols-1 gap-4">
                  <Link href="/activar" className="group relative inline-flex items-center justify-center gap-3 w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-2xl transition-all hover:bg-black active:scale-95 shadow-2xl shadow-red-200">Ir a activar chip <ShieldCheck className="h-7 w-7" /></Link>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none rotate-12"><Activity className="h-64 w-64" /></div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">PreRescate Panamá</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Soporte Técnico: +507 66XX-XXXX</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl text-center border border-gray-100">
          <div className="bg-amber-50 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-amber-100"><AlertTriangle className="h-12 w-12 text-amber-500" /></div>
          <h1 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tighter italic leading-none">Vínculo Inválido</h1>
          <p className="text-gray-500 mb-10 text-lg leading-relaxed font-medium">El código escaneado no existe o ha sido retirado del sistema. Por favor verifica tu dispositivo.</p>
          <Link href="/" className="group relative inline-flex items-center justify-center gap-2 w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xl overflow-hidden transition-all hover:bg-black active:scale-95 shadow-xl">Volver al Inicio <ArrowLeft className="h-6 w-6" /></Link>
        </div>
      </div>
    );
  }

  if (isParamedic === null) {
    return (
      <div className="min-h-screen bg-[#DA1A21] flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-white rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[5%] w-64 h-64 bg-black rounded-full blur-[120px]" />
        </div>
        <div className="max-w-md w-full text-center space-y-12 relative z-10">
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-xl rounded-[2.5rem] w-28 h-28 flex items-center justify-center mx-auto border border-white/30 shadow-2xl"><Activity className="h-14 w-14 text-white animate-pulse" /></div>
            <div className="space-y-1"><h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">PRE RESCUE ID</h1></div>
          </div>
          <div className="space-y-4"><p className="text-xl font-medium text-white leading-relaxed px-4">¿Eres personal capacitado en <span className="font-black underline decoration-white/40">primera respuesta médica</span>?</p></div>
          <div className="grid grid-cols-1 gap-5">
            <button onClick={() => setIsParamedic(true)} className="group relative w-full bg-white text-[#DA1A21] py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-tighter italic flex items-center justify-center gap-3">SÍ, soy Paramédico <ShieldCheck className="h-8 w-8" /></button>
            <button onClick={() => setIsParamedic(false)} className="w-full bg-black/20 backdrop-blur-md border-2 border-white/20 text-white py-6 rounded-[2.5rem] font-black text-lg hover:bg-black/30 transition-all active:scale-95 uppercase tracking-widest">No, soy un Ciudadano</button>
          </div>
          <div className="pt-4 flex items-center justify-center gap-10 opacity-40"><div className="h-px bg-white flex-1" /><Droplets className="h-5 w-5" /><div className="h-px bg-white flex-1" /></div>
          <p className="text-xs text-white/40 font-black uppercase tracking-[0.35em] -mt-4">PreRescate Panamá</p>
        </div>
      </div>
    );
  }

  // Corporate profile — route to IndustrialProfileView only for actual corporate profiles
  if (profile.profileType === "corporate") {
    return <IndustrialProfileView profile={profile} scanLocation={scanLocation} isParamedic={isParamedic} />;
  }

  const extras = profile.publicMedicalExtras;
  const hasExtras = !!(
    extras?.insuranceProvider ||
    extras?.preferredHospital ||
    extras?.primaryDoctorName ||
    extras?.primaryDoctorPhone ||
    extras?.emergencyInstructions
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 selection:bg-red-100">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-white/90">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile.isVerifiedAdmin && (
              <Link href="/" className="group h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm" title="Volver al Inicio">
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            )}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-[#DA1A21] rounded-lg flex items-center justify-center shadow-lg shadow-red-100"><Heart className="h-4 w-4 text-white fill-white animate-pulse" /></div>
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
        {/* PANIC CALL 911 */}
        <a href="tel:911" className="flex items-center justify-between gap-4 w-full bg-gradient-to-r from-brand to-red-700 text-white p-6 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(218,26,33,0.4)] hover:shadow-glow-md transition-all active:scale-95 group relative overflow-hidden btn-premium animate-pulse-subtle">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#DA1A21]/20" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-red-500/30"><Phone className="h-8 w-8 fill-white animate-bounce" /></div>
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
            <PatientMedicalCard profile={profile} />
            <SafeReturnCard safeReturn={profile.safeReturn} />
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100"><AlertTriangle className="h-7 w-7 text-amber-500" /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Protocolo Ciudadano</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Guía de Primeros Auxilios</p>
                </div>
              </div>
              <div className="grid gap-4">
                <InstructionItem number="01" title="Asegura el Entorno" desc="Detente en zona segura y pide espacio. Si estás en un vehículo, enciende las luces de emergencia." />
                <InstructionItem number="02" title="Evalúa el Daño" desc="¿Hay derrame de combustible? ¿Riesgo de atropello? No te arriesgues." />
                <InstructionItem number="03" title="Manejo del Trauma" desc="No muevas a la persona ni su cuello. Una lesión cervical es fatal si se manipula sin equipo profesional." />
                <InstructionItem number="04" title="Comunicación" desc="Háblale por su nombre, dile que la ayuda viene en camino y no permitas que se duerma." />
              </div>
              <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <p className="text-sm font-black text-slate-400 uppercase">Usa las acciones manuales de emergencia</p>
                </div>
                <button onClick={() => setIsParamedic(true)} className="flex min-h-11 items-center gap-2 group text-xs font-black text-[#A11218] bg-red-50 px-6 py-3 rounded-xl hover:bg-[#DA1A21] hover:text-white transition-all uppercase tracking-tighter">
                  Soy personal médico <ShieldCheck className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Medical Section (PARAMEDICS ONLY) */}
        {isParamedic && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-10 duration-1000">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#DA1A21] to-red-600 rounded-[3.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000" />
              <div className="relative bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white shadow-2xl flex flex-col md:flex-row items-center gap-5 md:gap-8 overflow-hidden">
                {profile.photoUrl ? (
                  <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-[4px] md:border-[6px] border-slate-50 shadow-2xl flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                    <img src={profile.photoUrl} alt={`Foto de ${profile.firstName}`} className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=" + profile.firstName + "&background=DA1A21&color=fff&size=200"; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 border-2 border-dashed border-slate-200"><User className="h-14 w-14 md:h-20 md:w-20" /></div>
                )}
                <div className="text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full mb-3 border border-red-100"><span className="text-[10px] font-black uppercase tracking-widest">Ficha de Emergencia</span></div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-1 uppercase">{profile.firstName} <br /> {profile.lastName}</h1>
                  {profile.isVerifiedAdmin && (
                    <div className="flex flex-col items-center md:items-start mb-6">
                      <div className="relative mb-2"><Crown className="h-10 w-10 text-yellow-500 fill-yellow-500 animate-bounce" /><div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full" /></div>
                      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-2 rounded-full border border-slate-700 shadow-2xl"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span className="text-[12px] font-black uppercase tracking-[0.2em] italic">Demo En Vivo</span></div>
                    </div>
                  )}
                  {profile.displayName !== `${profile.firstName} ${profile.lastName.charAt(0)}.` && <p className="text-sm font-black text-slate-400 mb-4 mt-1 uppercase tracking-widest">ALIAS: {profile.displayName}</p>}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                    <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-[#DA1A21] text-white rounded-xl md:rounded-2xl shadow-lg shadow-red-200"><Droplets className="h-4 w-4 md:h-5 md:w-5 fill-white" /><span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SANGRE: {profile.bloodType}</span></div>
                    {profile.age !== null && <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white rounded-xl md:rounded-2xl shadow-lg shadow-slate-200"><Calendar className="h-4 w-4 md:h-5 md:w-5" /><span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Edad: {profile.age}</span></div>}
                    <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-50 text-slate-950 rounded-xl md:rounded-2xl border border-slate-300 shadow-sm"><span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SEXO: {profile.sex === 'M' ? 'MASCULINO' : profile.sex === 'F' ? 'FEMENINO' : 'NO REPORTADO'}</span></div>
                  </div>
                  <div className="mt-4 space-y-2 md:hidden">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-red-700">Alergias</p><p className="text-sm font-bold text-slate-900 break-words">{profile.allergies || "No reportado"}</p>{profile.allergies && !profile.allergies.toLowerCase().includes("no report") && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">• Atención crítica</p>}</div></div></div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"><div className="flex items-start gap-2"><Activity className="mt-0.5 h-4 w-4 text-blue-600" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Condiciones</p><p className="text-sm font-bold text-slate-900 break-words">{profile.chronicConditions || "No reportado"}</p></div></div></div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"><div className="flex items-start gap-2"><Pill className="mt-0.5 h-4 w-4 text-emerald-600" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Medicamentos</p><p className="text-sm font-bold text-slate-900 break-words">{profile.medications || "No reportado"}</p></div></div></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" /><div><p className="text-[10px] font-black uppercase tracking-widest text-red-700">Alergias</p><p className="text-sm font-bold text-slate-900 break-words">{profile.allergies || "No reportado"}</p>{profile.allergies && !profile.allergies.toLowerCase().includes("no report") && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">• Atención crítica</p>}</div></div></div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3"><div className="flex items-start gap-2"><Activity className="mt-0.5 h-4 w-4 text-blue-600" /><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Condiciones</p><p className="text-sm font-bold text-slate-900 break-words">{profile.chronicConditions || "No reportado"}</p></div></div></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><div className="flex items-start gap-2"><Pill className="mt-0.5 h-4 w-4 text-emerald-600" /><div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Medicamentos</p><p className="text-sm font-bold text-slate-900 break-words">{profile.medications || "No reportado"}</p></div></div></div>
            </div>
          </div>
        )}

        {/* EMERGENCY CONTACTS — citizen view only */}
        {!isParamedic && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-600 rounded-[3rem] blur opacity-10" />
          <div className="relative bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl space-y-5 md:space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-50 h-12 w-12 rounded-2xl p-2.5 border border-emerald-100 flex items-center justify-center"><Heart className="h-8 w-8 text-emerald-600 fill-emerald-600 animate-pulse" /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Contactos de Rescate</h2>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-1">Contactos de emergencia registrados</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {profile.emergencyContacts.length > 0 ? (
                profile.emergencyContacts.map((contact, idx) => {
                  const contactPhone = sanitizeTelPhone(contact.phone);
                  const whatsappUrl = whatsappUrls[idx] || "";
                  return (
                    <div key={idx} className="p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-emerald-50/30 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-8 shadow-sm">
                      <div className="flex items-center gap-4 md:gap-6 text-center md:text-left flex-col md:flex-row w-full md:w-auto">
                        <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl md:text-2xl shadow-lg shadow-emerald-100 shrink-0">{contact.fullName[0].toUpperCase()}</div>
                        <div>
                          <p className="font-black text-slate-900 uppercase tracking-tight text-xl md:text-2xl leading-none mb-1">{contact.fullName}</p>
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                            <ShieldCheck className="h-3 w-3 text-emerald-700" />
                            <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">{contact.relationship}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full md:w-auto">
                        <a href={`tel:${contactPhone}`} className="inline-flex items-center justify-center gap-2 px-5 py-3 md:px-8 md:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl md:rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-glow-sm transition-all active:scale-95 shadow-xl shadow-emerald-100/50 btn-premium"><Phone className="h-4 w-4 fill-white" /> Llamar</a>
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 md:px-8 md:py-4 bg-[#25D366] text-white rounded-xl md:rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#128C7E] transition-all active:scale-95 shadow-xl shadow-emerald-100"><MessageCircle className="h-4 w-4 fill-white" /> WhatsApp</a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay contactos registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* v2: Communication assistance (paramedic view) */}
        {isParamedic && <CommunicationAssistanceCard vulnerabilityStatus={profile.vulnerabilityStatus} />}

        {/* v2: Safe return (paramedic view) */}
        {isParamedic && <SafeReturnCard safeReturn={profile.safeReturn} />}

        {/* Medical extras — paramedic view (keeps original format) */}
        {isParamedic && hasExtras && (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-5 md:p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700">Información médica adicional</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {extras?.insuranceProvider && <PublicExtraItem label="Aseguradora" value={extras.insuranceProvider} />}
              {extras?.preferredHospital && <PublicExtraItem label="Hospital preferido" value={extras.preferredHospital} />}
              {extras?.primaryDoctorName && <PublicExtraItem label="Médico tratante" value={extras.primaryDoctorName} />}
            </div>
            {extras?.primaryDoctorPhone && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Teléfono del médico</p><p className="text-sm font-bold text-slate-900">{extras.primaryDoctorPhone}</p></div>
                <a href={`tel:${sanitizeTelPhone(extras.primaryDoctorPhone)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"><Phone className="h-4 w-4" /> Llamar médico</a>
              </div>
            )}
            {extras?.emergencyInstructions && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">Instrucciones especiales</p>
                <p className="text-sm font-semibold text-amber-900">{extras.emergencyInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Paramedic emergency contacts at end */}
        {isParamedic && profile.emergencyContacts.length > 0 && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-600 rounded-[3rem] blur opacity-10" />
            <div className="relative bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl space-y-5 md:space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 h-12 w-12 rounded-2xl p-2.5 border border-emerald-100 flex items-center justify-center"><Heart className="h-8 w-8 text-emerald-600 fill-emerald-600 animate-pulse" /></div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Contactos de Rescate</h2>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-1">Contactos de emergencia registrados</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {profile.emergencyContacts.map((contact, idx) => {
                  const contactPhone = sanitizeTelPhone(contact.phone);
                  const whatsappUrl = whatsappUrls[idx] || "";
                  return (
                    <div key={idx} className="p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-emerald-50/30 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-8 shadow-sm">
                      <div className="flex items-center gap-4 md:gap-6 text-center md:text-left flex-col md:flex-row w-full md:w-auto">
                        <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl md:text-2xl shadow-lg shadow-emerald-100 shrink-0">{contact.fullName[0].toUpperCase()}</div>
                        <div>
                          <p className="font-black text-slate-900 uppercase tracking-tight text-xl md:text-2xl leading-none mb-1">{contact.fullName}</p>
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                            <ShieldCheck className="h-3 w-3 text-emerald-700" />
                            <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">{contact.relationship}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full md:w-auto">
                        <a href={`tel:${contactPhone}`} className="inline-flex items-center justify-center gap-2 px-5 py-3 md:px-8 md:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl md:rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-glow-sm transition-all active:scale-95 shadow-xl shadow-emerald-100/50 btn-premium"><Phone className="h-4 w-4 fill-white" /> Llamar</a>
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 md:px-8 md:py-4 bg-[#25D366] text-white rounded-xl md:rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#128C7E] transition-all active:scale-95 shadow-xl shadow-emerald-100"><MessageCircle className="h-4 w-4 fill-white" /> WhatsApp</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 text-center">
          <p className="text-[10px] text-slate-300 font-black tracking-[0.4em] uppercase">PRE-RESCATE PANAMÁ</p>
        </div>
      </main>

      {profile.isVerifiedAdmin && (
        <div className="pointer-events-none">
          <div className="hidden xl:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-6 w-72 z-40 animate-in slide-in-from-left-10 duration-1000 pointer-events-auto">
            <div className="p-8 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-2xl relative group overflow-hidden hover:bg-white transition-all">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12 group-hover:scale-125 transition-transform duration-700"><Lightbulb className="h-32 w-32" /></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="h-10 w-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><Lightbulb className="h-5 w-5" /></div>
                <div><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none mb-1">El Propósito</h4><h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none italic">¿Por qué PreRescate?</h3></div>
              </div>
              <div className="space-y-4 relative z-10">
                {["Identificación vital en segundos.", "Ahorra minutos de oro en accidentes.", "Contacta a tu familia con llamadas y WhatsApp manual."].map((t, i) => (
                  <div key={i} className="flex gap-3 text-[11px] font-bold text-slate-500 leading-snug items-start"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />{t}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-6 w-72 z-40 animate-in slide-in-from-right-10 duration-1000 pointer-events-auto">
            <div className="p-8 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-2xl relative group overflow-hidden hover:bg-white transition-all">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 -rotate-12 group-hover:scale-125 transition-transform duration-700"><MousePointerClick className="h-32 w-32" /></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="h-10 w-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200"><MousePointerClick className="h-5 w-5" /></div>
                <div><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 leading-none mb-1">El Protocolo</h4><h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none italic">¿Cómo funciona?</h3></div>
              </div>
              <div className="space-y-4 relative z-10">
                {["Escanea el NFC o QR del chip.", "Valida alergias y ficha médica.", "Usa llamada o WhatsApp desde el perfil."].map((t, i) => (
                  <div key={i} className="flex gap-3 text-[11px] font-bold text-slate-500 leading-snug items-start"><div className="h-4 w-4 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">{i + 1}</div>{t}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="xl:hidden fixed bottom-6 left-6 right-6 z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-brand rounded-xl flex items-center justify-center text-white shrink-0"><Lightbulb className="h-4 w-4" /></div>
                <p className="text-[10px] font-medium text-slate-300 leading-tight">Estás viendo una <span className="text-white font-black uppercase tracking-widest text-[9px]">Demo Interactiva</span>. Escanea este QR para probarlo tú mismo.</p>
              </div>
              <button className="px-4 py-2 bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-colors whitespace-nowrap">Entendido</button>
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
    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-inner group-hover:bg-red-50 group-hover:text-[#DA1A21] transition-colors">{number}</div>
    <div><h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg leading-tight">{title}</h3><p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium">{desc}</p></div>
  </div>
);

const SummaryChip = ({ icon, label, tone }: { icon: ReactNode; label: string; tone: "red" | "slate" }) => {
  const toneClass = tone === "red" ? "bg-red-50 border-red-100 text-slate-900" : "bg-slate-100 border-slate-200 text-slate-900";
  return (<div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${toneClass}`}>{icon}<p className="text-xs font-black uppercase tracking-tight">{label}</p></div>);
};

const SummaryRow = ({ icon, title, value }: { icon: ReactNode; title: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="flex items-start gap-2"><div className="mt-0.5">{icon}</div><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p><p className="text-sm font-bold text-slate-900 break-words">{value}</p></div></div>
  </div>
);

const PublicExtraItem = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
    <p className="text-sm font-bold text-slate-900">{value}</p>
  </div>
);