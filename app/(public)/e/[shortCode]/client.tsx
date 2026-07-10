"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
// Image optimization is intentionally not used here to preserve markup control
// and avoid layout shifts; using native <img> is acceptable for public QR view.
import Link from "next/link";
import { 
  Heart, Phone, AlertTriangle, Droplets, Pill, 
  Activity, User, MessageCircle, Loader2, Calendar,
  ShieldCheck, Share2, Clock, Crown, ArrowLeft, Lightbulb, MousePointerClick,
  Brain, Footprints, Baby, Eye
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
    locationName?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    contactName?: string | null;
    contactPhone?: string | null;
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

// ChipMetadata not currently used in this view — remove to satisfy lint

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

function PublicContextBadges({ profile }: { profile: EmergencyProfile }) {
  const vs = profile.vulnerabilityStatus;
  const badges: { label: string; color: string; icon: ReactNode }[] = [];

  if (profile.isMinor) {
    badges.push({ label: "Menor de edad", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Baby className="h-3.5 w-3.5" /> });
  }
  if (!profile.isMinor && profile.age !== null && profile.age >= 60) {
    badges.push({ label: "Adulto mayor", color: "bg-slate-100 text-slate-700 border-slate-200", icon: <Crown className="h-3.5 w-3.5" /> });
  }
  if ((profile.allergies || "").trim() && !profile.allergies.toLowerCase().includes("no report")) {
    badges.push({ label: "Alergia crítica", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> });
  }
  if ((profile.medications || "").trim() && !profile.medications.toLowerCase().includes("no report")) {
    badges.push({ label: "Medicación importante", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Pill className="h-3.5 w-3.5" /> });
  }
  if (vs?.hasCognitiveImpairment) {
    badges.push({ label: "Requiere asistencia", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Brain className="h-3.5 w-3.5" /> });
  }
  if (vs?.hasWanderingRisk) {
    badges.push({ label: "Riesgo de desorientación", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <Footprints className="h-3.5 w-3.5" /> });
  }
  if (vs?.isNonVerbal || vs?.communicationAssistance) {
    badges.push({ label: "Comunicación asistida", color: "bg-violet-100 text-violet-700 border-violet-200", icon: <MessageCircle className="h-3.5 w-3.5" /> });
  }
  if (profile.safeReturn?.instructions) {
    badges.push({ label: "Retorno seguro", color: "bg-teal-100 text-teal-700 border-teal-200", icon: <Footprints className="h-3.5 w-3.5" /> });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {badges.map((b, i) => (
        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest ${b.color}`}>
          {b.icon}
          {b.label}
        </span>
      ))}
    </div>
  );
}

function PublicAlertCard({ tone, title, value, note }: { tone: "red" | "blue" | "green" | "amber"; title: string; value: string; note?: string }) {
  const palette: Record<string, string> = {
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${palette[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <p className="text-sm font-bold text-slate-900 whitespace-pre-wrap">{value}</p>
      {note && <p className="mt-1 text-[10px] font-black uppercase tracking-widest">{note}</p>}
    </div>
  );
}

function PublicMedicalExtrasBlock({ profile }: { profile: EmergencyProfile }) {
  const extras = profile.publicMedicalExtras;
  const hasExtras = !!(
    extras &&
    (
      extras.insuranceProvider ||
      extras.preferredHospital ||
      extras.primaryDoctorName ||
      extras.primaryDoctorPhone ||
      extras.emergencyInstructions
    )
  );
  if (!hasExtras) return null;

  return (
    <section className="bg-white border border-emerald-200 rounded-[2.5rem] p-5 md:p-6 shadow-lg space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">Información médica adicional</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mt-1">Datos complementarios para atención médica y coordinación.</p>
        </div>
      </div>
      {extras?.emergencyInstructions && (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 md:p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Instrucciones especiales</p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">{extras.emergencyInstructions}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {extras?.insuranceProvider && <PublicExtraItem tone="emerald" label="Aseguradora" value={extras.insuranceProvider} />}
        {extras?.preferredHospital && <PublicExtraItem tone="blue" label="Hospital preferido" value={extras.preferredHospital} />}
        {extras?.primaryDoctorName && <PublicExtraItem tone="slate" label="Médico tratante" value={extras.primaryDoctorName} />}
        {extras?.primaryDoctorPhone && (
          <div className="rounded-[2rem] border border-emerald-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Teléfono del médico</p>
            <p className="text-sm font-bold text-slate-900">{extras.primaryDoctorPhone}</p>
            <a href={`tel:${sanitizeTelPhone(extras.primaryDoctorPhone)}`} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
              <Phone className="h-4 w-4" />
              Llamar médico
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function PublicCognitiveBlock({ profile }: { profile: EmergencyProfile }) {
  const vulnerability = profile.vulnerabilityStatus;
  const showBlock = !!(vulnerability?.hasCognitiveImpairment || vulnerability?.hasWanderingRisk);
  if (!showBlock) return null;

  return (
    <section className="bg-white border border-violet-200 rounded-[2.5rem] p-5 md:p-6 shadow-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
          <Brain className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">Deterioro cognitivo / memoria / desorientación</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Útil para Alzheimer, demencia, pérdida de memoria o riesgo de desorientación.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vulnerability?.hasCognitiveImpairment && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Deterioro cognitivo reportado</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Puede requerir orientación, frases simples y acompañamiento.</p>
          </div>
        )}
        {vulnerability?.hasWanderingRisk && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">Riesgo de desorientación</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Conviene mantener contacto visual y confirmar el entorno antes de mover a la persona.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function PublicAssistanceBlock({ profile }: { profile: EmergencyProfile }) {
  const vulnerability = profile.vulnerabilityStatus;
  const showBlock = !!(profile.isMinor || vulnerability?.isNonVerbal || vulnerability?.communicationAssistance);
  if (!showBlock) return null;

  return (
    <section className="bg-white border border-amber-200 rounded-[2.5rem] p-5 md:p-6 shadow-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">Asistencia especial / condición especial</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mt-1">Contexto útil para comunicación, apoyo y acompañamiento.</p>
        </div>
      </div>
      <SpecialAssistanceBadges profile={profile} />
      {vulnerability?.communicationAssistance && (
        <div className="rounded-[2rem] bg-violet-50 border border-violet-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-violet-700 mb-2">Comunicación asistida</p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">{vulnerability.communicationAssistance}</p>
        </div>
      )}
      {profile.isMinor && (
        <div className="rounded-[2rem] bg-blue-50 border border-blue-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-blue-700 mb-2">Menor de edad</p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">Requiere apoyo responsable y comunicación clara con su tutor o cuidador.</p>
        </div>
      )}
    </section>
  );
}

function PublicSafeReturnBlock({ profile }: { profile: EmergencyProfile }) {
  const safeReturn = profile.safeReturn;
  const showBlock = !!(safeReturn?.instructions || safeReturn?.locationName || safeReturn?.address || safeReturn?.contactName || safeReturn?.contactPhone);
  if (!showBlock) return null;

  return (
    <section className="bg-white border border-teal-200 rounded-[2.5rem] p-5 md:p-6 shadow-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
          <Footprints className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">Retorno seguro / persona perdida</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mt-1">Información para orientar, contactar y devolver con seguridad.</p>
        </div>
      </div>
      {safeReturn?.instructions && (
        <div className="rounded-[2rem] bg-teal-50 border border-teal-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-teal-700 mb-2">Instrucciones de retorno</p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">{safeReturn.instructions}</p>
        </div>
      )}
      {(safeReturn?.locationName || safeReturn?.address || safeReturn?.contactName || safeReturn?.contactPhone) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {safeReturn?.locationName && <PublicAlertCard tone="amber" title="Lugar de retorno" value={safeReturn.locationName} />}
          {safeReturn?.address && <PublicAlertCard tone="amber" title="Dirección" value={safeReturn.address} />}
          {safeReturn?.contactName && <PublicAlertCard tone="amber" title="Responsable" value={safeReturn.contactName} />}
          {safeReturn?.contactPhone && (
            <div className="rounded-2xl border border-teal-200 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Teléfono del responsable</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{safeReturn.contactPhone}</p>
              <a href={`tel:${sanitizeTelPhone(safeReturn.contactPhone)}`} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                <Phone className="h-4 w-4" />
                Llamar responsable
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PublicContactsBlock({ profile }: { profile: EmergencyProfile }) {
  const subtitle = profile.isMinor
    ? "Contactar responsable, tutor o cuidador si hace falta."
    : profile.vulnerabilityStatus?.hasCognitiveImpairment || profile.vulnerabilityStatus?.hasWanderingRisk
      ? "Contactar cuidador o responsable."
      : "Contactos de emergencia registrados.";

  if (!profile.emergencyContacts.length) {
    return (
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-5 md:p-6 shadow-lg">
        <p className="text-sm font-semibold text-slate-600">No hay contactos de rescate disponibles.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-[2.5rem] p-5 md:p-6 shadow-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Heart className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">Contactos de rescate</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-3">
        {profile.emergencyContacts.map((contact, idx) => (
          <div key={idx} className="rounded-[2rem] border border-emerald-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-[1.35rem] bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-100 flex-shrink-0">
                  {(contact.fullName?.[0] || "C").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 break-words">{contact.fullName}</p>
                    {idx === 0 && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        Contacto principal
                      </span>
                    )}
                  </div>
                  {contact.relationship && (
                    <span className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {contact.relationship}
                    </span>
                  )}
                  <p className="mt-3 text-sm font-semibold text-slate-700 break-words">{contact.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:min-w-[220px]">
                <a href={`tel:${sanitizeTelPhone(contact.phone)}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 transition-all">
                  <Phone className="h-4 w-4" />
                  Llamar
                </a>
                <a
                  href={`https://wa.me/${normalizeWhatsAppPhone(contact.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#128C7E] transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// @keep-for-future-use — SafeReturnCard remains available for special/citizen views
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function parseLatLngFromLocation(location: string | null | undefined) {
  if (!location) return null;
  const match = location.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  return { lat: match[1], lng: match[2] };
}

// @keep-for-future-use — CommunicationAssistanceCard remains available for special/citizen views
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function PublicSpecialAssistanceCard({ profile, scanLocation, whatsappUrls }: { profile: EmergencyProfile; scanLocation: string; whatsappUrls: Record<number, string> }) {
  const vulnerability = profile.vulnerabilityStatus;
  const hasVulnerability = !!(
    vulnerability?.hasCognitiveImpairment ||
    vulnerability?.hasWanderingRisk ||
    vulnerability?.isNonVerbal
  );
  const hasCommunicationInstructions = !!(vulnerability?.isNonVerbal && vulnerability.communicationAssistance);
  const hasSafeReturn = !!profile.safeReturn?.instructions;
  const shouldRender = profile.isMinor || hasVulnerability || hasSafeReturn;
  const locationCoords = parseLatLngFromLocation(scanLocation);
  const googleMapsUrl = locationCoords ? `https://maps.google.com/?q=${locationCoords.lat},${locationCoords.lng}` : null;
  const wazeUrl = locationCoords ? `https://waze.com/ul?ll=${locationCoords.lat},${locationCoords.lng}&navigate=yes` : null;

  if (!shouldRender) return null;

  return (
    <section id="special-assistance" className="bg-white border border-amber-200 rounded-[3rem] p-6 shadow-xl shadow-amber-100/50 space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-3xl bg-amber-50 flex items-center justify-center border border-amber-100">
          <Lightbulb className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Asistencia especial / Retorno seguro</h2>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-700">Accede rápidamente al protocolo y contactos prioritarios.</p>
        </div>
      </div>

      <SpecialAssistanceBadges profile={profile} />

      {hasCommunicationInstructions && (
        <div className="rounded-[2rem] bg-violet-50 border border-violet-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-violet-700 mb-2">Cómo ayudar</p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">{vulnerability.communicationAssistance}</p>
        </div>
      )}

      {hasSafeReturn && (
        <div className="rounded-[2rem] bg-teal-50 border border-teal-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-teal-700 mb-2">Retorno Seguro</p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">{profile.safeReturn?.instructions}</p>
        </div>
      )}

      {(googleMapsUrl || wazeUrl) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {googleMapsUrl && (
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-3 uppercase text-sm font-black text-white bg-slate-900 rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">Google Maps</a>
          )}
          {wazeUrl && (
            <a href={wazeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-3 uppercase text-sm font-black text-white bg-[#2C2C2C] rounded-2xl shadow-lg shadow-slate-200 hover:bg-[#111] transition-all">Waze</a>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Contactos de emergencia</p>
          <div className="space-y-3">
            {profile.emergencyContacts.map((contact, idx) => {
              const phone = sanitizeTelPhone(contact.phone);
              const whatsapp = whatsappUrls[idx] || `https://wa.me/${phone}`;
              return (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight text-slate-900">{contact.fullName}</p>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">{contact.relationship}</p>
                      <p className="text-sm font-semibold text-slate-700 mt-2">{contact.phone}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                      <a href={`tel:${phone}`} className="inline-flex items-center justify-center gap-2 px-3 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all">Llamar</a>
                      <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-3 py-3 text-xs font-black uppercase tracking-widest text-white bg-[#25D366] rounded-2xl hover:bg-[#128C7E] transition-all">WhatsApp</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Reusable profile hero card shared by citizen + paramedic views */
function PatientMedicalCard({ profile, isParamedic, showAssistanceBadges = true }: { profile: EmergencyProfile; isParamedic?: boolean; showAssistanceBadges?: boolean }) {
  const hasAllergies = profile.allergies && profile.allergies.trim() && !profile.allergies.toLowerCase().includes("no report");
  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#DA1A21] to-red-600 rounded-[3.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000" />
      <div className="relative bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white shadow-2xl flex flex-col xl:grid xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start gap-5 md:gap-8 overflow-hidden">
        {profile.photoUrl ? (
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-[4px] md:border-[6px] border-slate-50 shadow-2xl flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.photoUrl}
              alt={`Foto de ${profile.firstName}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement("div");
                  fallback.className = "w-full h-full flex items-center justify-center bg-[#DA1A21] text-white font-black text-4xl uppercase";
                  fallback.textContent = (profile.firstName?.[0] || "") + (profile.lastName?.[0] || "");
                  fallback.setAttribute("aria-label", `Foto de ${profile.firstName}`);
                  parent.appendChild(fallback);
                }
              }}
            />
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

          {/* v2: Special assistance badges — hidden in special view to avoid duplication */}
          {showAssistanceBadges && <SpecialAssistanceBadges profile={profile} />}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mt-3">
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-[#DA1A21] text-white rounded-xl md:rounded-2xl shadow-lg shadow-red-200">
              <Droplets className="h-4 w-4 md:h-5 md:w-5 fill-white" />
              <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SANGRE: {profile.bloodType}</span>
            </div>
            {profile.age !== null && (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white rounded-xl md:rounded-2xl shadow-lg shadow-slate-200">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Edad: {profile.age} años</span>
              </div>
            )}
            {profile.isMinor && (
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-200">
                <Baby className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Menor de edad</span>
              </div>
            )}
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-50 text-slate-950 rounded-xl md:rounded-2xl border border-slate-300 shadow-sm">
              <span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SEXO: {profile.sex === 'M' ? 'MASCULINO' : profile.sex === 'F' ? 'FEMENINO' : 'NO REPORTADO'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 xl:mt-0 w-full">
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/80 p-3 md:p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Alergias</p>
                <p className="mt-1 text-sm font-bold text-slate-900 break-words">{profile.allergies || "No reportado"}</p>
                {hasAllergies && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">Atención crítica</p>}
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Condiciones</p>
                <p className="mt-1 text-sm font-bold text-slate-900 break-words">{profile.chronicConditions || "No reportado"}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Medicamentos</p>
                <p className="mt-1 text-sm font-bold text-slate-900 break-words">{profile.medications || "No reportado"}</p>
              </div>
            </div>
          </div>
        </div>
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
  const [view, setView] = useState<'unknown' | 'paramedic' | 'citizen' | 'special'>('unknown');
  const [scanLocation, setScanLocation] = useState("");
  const [whatsappUrls, setWhatsappUrls] = useState<Record<number, string>>({});
  const [scanTime] = useState(new Date().toLocaleString("es-PA", { 
    timeZone: "America/Panama",
    hour: '2-digit', 
    minute: '2-digit',
    day: '2-digit',
    month: 'short'
  }));
  const isCanonicalDemo = shortCode === "DEMO-ADMIN-VIP" && searchParams.get("demo") === "true";

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
              <div className="bg-slate-50 h-20 w-20 md:h-28 md:w-28 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 border border-slate-100 shadow-xl shadow-slate-100/50">
                <ShieldCheck className="h-12 w-12 text-slate-700" />
              </div>
              <div className="space-y-4 mb-8 md:mb-12">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">PreRescatePTY / PreRescueID</p>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Este producto requiere activación</h1>
              </div>
              <div className="space-y-6">
                <div className="grid gap-3 max-w-md mx-auto text-left">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Etiqueta interna</p>
                    <p className="mt-1 text-base font-black text-slate-900 break-words">{shortCode}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</p>
                    <p className="mt-1 text-base font-black text-slate-900">Pendiente de activación</p>
                  </div>
                </div>
                <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-sm mx-auto">Este código pertenece a un producto PreRescatePTY. Para mostrar información médica o contactos de emergencia, debe activarse por su usuario final.</p>
                <p className="text-slate-400 text-sm font-semibold leading-relaxed max-w-md mx-auto">No se muestran datos personales antes de la activación.</p>
                <div className="grid grid-cols-1 gap-4">
                  <Link href="/activar" className="group relative inline-flex items-center justify-center gap-3 w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-2xl transition-all hover:bg-black active:scale-95 shadow-2xl shadow-red-200">Activar producto <ShieldCheck className="h-7 w-7" /></Link>
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

  // Derive whether this profile has special assistance / safe return data
  const vulnerability = profile.vulnerabilityStatus;
  const safeReturn = profile.safeReturn;
  const hasSpecialAssistance = !!(
    profile.isMinor ||
    vulnerability?.hasCognitiveImpairment ||
    vulnerability?.hasWanderingRisk ||
    vulnerability?.isNonVerbal ||
    vulnerability?.communicationAssistance ||
    safeReturn?.instructions ||
    safeReturn?.locationName ||
    safeReturn?.address ||
    safeReturn?.contactName ||
    safeReturn?.contactPhone ||
    safeReturn?.lat != null ||
    safeReturn?.lng != null
  );

  if (view === 'unknown') {
    return (
      <div className="min-h-screen bg-[#DA1A21] flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-white rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[5%] w-64 h-64 bg-black rounded-full blur-[120px]" />
        </div>
        <div className="max-w-xl w-full text-center space-y-10 relative z-10">
          <div className="space-y-6">
            <div className="bg-white/20 backdrop-blur-xl rounded-[2.5rem] w-28 h-28 flex items-center justify-center mx-auto border border-white/30 shadow-2xl"><Activity className="h-14 w-14 text-white animate-pulse" /></div>
            <div className="space-y-1"><h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">PRE RESCUE ID</h1></div>
          </div>
          <div className="space-y-4 px-2">
            <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">¿Qué tipo de ayuda estás prestando?</p>
            <p className="text-sm md:text-base text-white/85 font-medium leading-relaxed max-w-lg mx-auto">
              Elige primero el tipo de ayuda. Los contextos clínicos aparecen como badges informativos dentro del perfil.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <button onClick={() => setView('citizen')} className="w-full bg-white text-[#DA1A21] py-7 rounded-[2.5rem] font-black text-xl sm:text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-tighter italic flex items-center justify-center gap-3">
              Soy ciudadano
              <span className="sr-only">Abre la vista simple para ayuda rápida</span>
            </button>
            <button onClick={() => setView('paramedic')} className="group relative w-full bg-black/20 backdrop-blur-md border-2 border-white/20 text-white py-7 rounded-[2.5rem] font-black text-xl sm:text-2xl hover:bg-black/30 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3">
              Soy médico / paramédico
              <ShieldCheck className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-3">
            <PublicContextBadges profile={profile} />
            {hasSpecialAssistance && (
              <p className="text-xs text-white/70 font-semibold leading-relaxed max-w-lg mx-auto">
                Si hay asistencia especial o retorno seguro, se muestra dentro de la ficha y no como decisión principal.
              </p>
            )}
          </div>
          <div className="pt-4 flex items-center justify-center gap-10 opacity-40"><div className="h-px bg-white flex-1" /><Droplets className="h-5 w-5" /><div className="h-px bg-white flex-1" /></div>
          <p className="text-xs text-white/40 font-black uppercase tracking-[0.35em] -mt-4">PreRescate Panamá</p>
        </div>
      </div>
    );
  }

  // Corporate profile — route to IndustrialProfileView only for actual corporate profiles
  if (profile.profileType === "corporate") {
    return <IndustrialProfileView profile={profile} scanLocation={scanLocation} isParamedic={view === 'paramedic'} />;
  }

  // Special assistance dedicated view
  if (view === 'special') {
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
          <PatientMedicalCard profile={profile} isParamedic={false} showAssistanceBadges={false} />
          <PublicSpecialAssistanceCard profile={profile} scanLocation={scanLocation} whatsappUrls={whatsappUrls} />
        </main>
      </div>
    );
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
        {isCanonicalDemo && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                <Eye className="h-4 w-4 text-amber-700" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-amber-800">Perfil ficticio de demostración</p>
            </div>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
            >
              Volver a la guía de la demo
            </Link>
          </div>
        )}
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

        {/* Citizen View — basic safe info + protocol */}
        {view === 'citizen' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <PatientMedicalCard profile={profile} isParamedic={false} />
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100"><AlertTriangle className="h-7 w-7 text-amber-500" /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Información rápida para ayudar de forma segura</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Prioriza claridad, calma y comunicación</p>
                </div>
              </div>
              <div className="grid gap-4">
                <InstructionItem number="01" title="Haz una pausa segura" desc="Ubícate fuera del riesgo inmediato y deja espacio para que llegue la ayuda profesional." />
                <InstructionItem number="02" title="Revisa lo crítico" desc="Busca sangrado, inconsciencia, dificultad para respirar o peligro en el entorno." />
                <InstructionItem number="03" title="No muevas a la persona" desc="Evita mover cuello o columna a menos que exista un peligro inmediato mayor." />
                <InstructionItem number="04" title="Habla con calma" desc="Usa el nombre o alias público, da instrucciones simples y confirma si responde." />
              </div>
              <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <p className="text-sm font-black text-slate-400 uppercase">Llama y comparte la ubicación si hace falta</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => setView('unknown')} className="flex min-h-11 items-center gap-2 group text-xs font-black text-slate-700 bg-slate-100 px-6 py-3 rounded-xl hover:bg-slate-200 transition-all uppercase tracking-tighter">
                    Volver al inicio <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setView('paramedic')} className="flex min-h-11 items-center gap-2 group text-xs font-black text-[#A11218] bg-red-50 px-6 py-3 rounded-xl hover:bg-[#DA1A21] hover:text-white transition-all uppercase tracking-tighter">
                    Ver vista médica completa <ShieldCheck className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <PublicCognitiveBlock profile={profile} />
            <PublicAssistanceBlock profile={profile} />
            <PublicSafeReturnBlock profile={profile} />

            {/* Emergency contacts — citizen view */}
            <PublicContactsBlock profile={profile} />
          </div>
        )}

        {/* Medical Section (PARAMEDICS ONLY) */}
        {view === 'paramedic' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-10 duration-1000">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#DA1A21] to-red-600 rounded-[3.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000" />
              <div className="relative bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white shadow-2xl flex flex-col md:flex-row items-center gap-5 md:gap-8 overflow-hidden">
                {profile.photoUrl ? (
                  <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-[4px] md:border-[6px] border-slate-50 shadow-2xl flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.photoUrl}
                      alt={`Foto de ${profile.firstName}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = document.createElement("div");
                          fallback.className = "w-full h-full flex items-center justify-center bg-[#DA1A21] text-white font-black text-4xl uppercase";
                          fallback.textContent = (profile.firstName?.[0] || "") + (profile.lastName?.[0] || "");
                          fallback.setAttribute("aria-label", `Foto de ${profile.firstName}`);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 border-2 border-dashed border-slate-200"><User className="h-14 w-14 md:h-20 md:w-20" /></div>
                )}
                <div className="text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full mb-3 border border-red-100"><span className="text-[10px] font-black uppercase tracking-widest">Ficha de Emergencia</span></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Información médica más completa para atención de emergencia</p>
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
                    {profile.age !== null && <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white rounded-xl md:rounded-2xl shadow-lg shadow-slate-200"><Calendar className="h-4 w-4 md:h-5 md:w-5" /><span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Edad: {profile.age} años</span></div>}
                    {profile.isMinor && <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-200"><Baby className="h-4 w-4 md:h-5 md:w-5" /><span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">Menor de edad</span></div>}
                    <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-slate-50 text-slate-950 rounded-xl md:rounded-2xl border border-slate-300 shadow-sm"><span className="text-base md:text-xl font-black uppercase tracking-tighter leading-none">SEXO: {profile.sex === 'M' ? 'MASCULINO' : profile.sex === 'F' ? 'FEMENINO' : 'NO REPORTADO'}</span></div>
                  </div>
                  <div className="mt-4 space-y-2 md:hidden">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-red-700">Alergias</p><p className="text-sm font-bold text-slate-900 break-words">{profile.allergies || "No reportado"}</p>{profile.allergies && !profile.allergies.toLowerCase().includes("no report") && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">• Atención crítica</p>}</div></div></div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"><div className="flex items-start gap-2"><Activity className="mt-0.5 h-4 w-4 text-blue-600" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Condiciones</p><p className="text-sm font-bold text-slate-900 break-words">{profile.chronicConditions || "No reportado"}</p></div></div></div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"><div className="flex items-start gap-2"><Pill className="mt-0.5 h-4 w-4 text-emerald-600" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Medicamentos</p><p className="text-sm font-bold text-slate-900 break-words">{profile.medications || "No reportado"}</p></div></div></div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button onClick={() => setView('unknown')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-tighter text-slate-700 hover:bg-slate-50 transition-all">
                      Volver al inicio <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setView('citizen')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-xs font-black uppercase tracking-tighter text-[#A11218] hover:bg-[#DA1A21] hover:text-white transition-all">
                      Ver vista ciudadana <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <PublicCognitiveBlock profile={profile} />
            <PublicAssistanceBlock profile={profile} />
            <PublicSafeReturnBlock profile={profile} />
            <PublicMedicalExtrasBlock profile={profile} />
            <PublicContactsBlock profile={profile} />
          </div>
        )}


        {/* Medical extras — paramedic view (keeps original format) */}
        {view === 'paramedic' && hasExtras && (
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

const PublicExtraItem = ({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" | "blue" }) => {
  const palette = {
    slate: "border-slate-200 bg-slate-50 text-slate-500",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div className={`p-3 rounded-2xl border ${palette[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
};
