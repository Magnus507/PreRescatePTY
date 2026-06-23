"use client";

import { useEffect, useState } from "react";
import { BLOOD_TYPES } from "@/lib/constants";
import {
  User, Activity, Heart, ShieldAlert, Pill, FileText,
  Shield, Stethoscope, ChevronLeft, ChevronRight,
  Eye, AlertCircle, Info, Brain, Footprints, MessageCircle,
} from "lucide-react";
import { BirthDatePicker } from "@/components/ui/BirthDatePicker";
import React from "react";

interface ProfileFormProps {
  form: {
    firstName: string;
    lastName: string;
    displayNamePublic: string;
    birthDate: string;
    sex: string;
    bloodType: string;
    allergies: string;
    chronicConditions: string;
    medications: string;
    additionalNotes: string;
    phone: string;
    nationalId: string;
    isInsured: boolean;
    insuranceProvider: string;
    insurancePolicyNumber: string;
    preferredHospital: string;
    insuranceEmergencyPhone: string;
    primaryDoctorName: string;
    primaryDoctorPhone: string;
    showInsuranceProviderPublic: boolean;
    showPreferredHospitalPublic: boolean;
    showPrimaryDoctorPublic: boolean;
    showPrimaryDoctorPhonePublic: boolean;
    showAdditionalNotesPublic: boolean;
    // top-level toggles to reveal conditional assistance fields
    enableSpecialAssistance?: boolean;
    enableSafeReturn?: boolean;
    // v2 special assistance
    hasCognitiveImpairment?: boolean;
    hasWanderingRisk?: boolean;
    isNonVerbal?: boolean;
    communicationAssistance?: string;
    safeReturnInstructions?: string;
    safeReturnLocationName?: string;
    safeReturnAddress?: string;
    safeReturnLat?: string | number | null;
    safeReturnLng?: string | number | null;
    safeReturnContactName?: string;
    safeReturnContactPhone?: string;
    showVulnerabilityStatusPublic?: boolean;
    showCommunicationStatusPublic?: boolean;
    showSafeReturnPublic?: boolean;
    showSafeReturnLocationPublic?: boolean;
    // Reusable address fields (no lat/lng currently in schema)
    address?: string;
    city?: string;
  };
  onChange: (field: string, value: string | boolean) => void;
  disabled?: boolean;
  variant?: "grid" | "wizard" | "auto";
}

// ──────────────────────────────────────────────
// STEP DEFINITION
// ──────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Identidad", description: "Tu nombre y datos de contacto", icon: User },
  { id: 2, title: "Alerta médica", description: "Información crítica para emergencias", icon: Heart },
  { id: 3, title: "Seguro y médico", description: "Información adicional para tu protección", icon: Shield },
  { id: 4, title: "Asistencia", description: "Información de vulnerabilidad y comunicación", icon: Brain },
  { id: 5, title: "Privacidad", description: "Controla qué ven al escanear tu chip", icon: Eye },
] as const;

// ──────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────

export function MedicalProfileForm({ form, onChange, disabled = false, variant = "auto" }: ProfileFormProps) {
  const update = (field: string, value: string | boolean) => onChange(field, value);

  // ── Responsive detection ──
  const [isMobile, setIsMobile] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedVariant = variant === "auto" ? (isMobile ? "wizard" : "grid") : variant;
  const isWizard = resolvedVariant === "wizard";

  // ── Wizard state ──
  const [step, setStep] = useState(1);
  const totalSteps = STEPS.length;
  const canGoNext = step < totalSteps;
  const canGoPrev = step > 1;
  const progressPercent = (step / totalSteps) * 100;

  const goNext = () => {
    if (canGoNext) setStep((s) => s + 1);
  };
  const goPrev = () => {
    if (canGoPrev) setStep((s) => s - 1);
  };

  // Reset step when switching to wizard mode
  useEffect(() => {
    if (isWizard) setStep(1);
  }, [isWizard]);

  // ── Field-set renderers ──

  const renderAgeBadge = () => {
    if (!form.birthDate) return null;
    const birthDate = new Date(form.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    // If minor, display a protective badge instead of exact age
    if (age < 18) {
      return (
        <div className="px-3 py-1 bg-blue-100 rounded-lg text-[10px] font-black text-blue-700 border border-blue-200">
          Menor de edad
        </div>
      );
    }

    return (
      <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">
        EDAD: {age} AÑOS
      </div>
    );
  };

  const renderIdentityFields = (showRequiredHint = false) => (
    <div className="space-y-3">
      {showRequiredHint && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Los campos marcados con * son obligatorios.</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nombre *" value={form.firstName} onChange={(v: string) => update("firstName", v)} required placeholder="Juan" />
        <Field label="Apellido *" value={form.lastName} onChange={(v: string) => update("lastName", v)} required placeholder="Pérez" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Alias Público" value={form.displayNamePublic} onChange={(v: string) => update("displayNamePublic", v)} placeholder="Ej: Juan P." />
        <Field label="Teléfono de Contacto" value={form.phone || ""} onChange={(v: string) => update("phone", v)} placeholder="+507 0000-0000" />
      </div>
      <Field label="Cédula / Identificación" value={form.nationalId || ""} onChange={(v: string) => update("nationalId", v)} placeholder="Opcional" />
      <div className="space-y-2">
        <label htmlFor="sex-select" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground ml-1">Sexo</label>
        <select
          id="sex-select"
          value={form.sex}
          onChange={(e) => update("sex", e.target.value)}
          className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-bold appearance-none shadow-sm input-premium outline-none"
        >
          <option value="">No Definido</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      </div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground ml-1">Fecha de Nacimiento</label>
        {renderAgeBadge()}
      </div>
      <BirthDatePicker
        label=""
        value={form.birthDate}
        onChange={(v: string) => update("birthDate", v)}
      />
    </div>
  );

  const renderMedicalAlertFields = (showRequiredHint = false) => (
    <div className="space-y-3">
      {showRequiredHint && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>El tipo de sangre es obligatorio para activar tu perfil.</span>
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="blood-type-select" className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground ml-1">Tipo de Sangre *</label>
        <select
          id="blood-type-select"
          required
          value={form.bloodType}
          onChange={(e) => update("bloodType", e.target.value)}
          className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-black appearance-none text-primary shadow-sm input-premium outline-none"
        >
          {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
        </select>
      </div>
      <TextAreaField icon={<Activity className="h-4 w-4" />} label="Alergias" value={form.allergies} onChange={(v: string) => update("allergies", v)} placeholder="Ej: Penicilina..." color="text-red-700" />
      <TextAreaField icon={<ShieldAlert className="h-4 w-4" />} label="Condiciones" value={form.chronicConditions} onChange={(v: string) => update("chronicConditions", v)} placeholder="Ej: Diabetes..." color="text-amber-700" />
      <TextAreaField icon={<Pill className="h-4 w-4" />} label="Medicamentos" value={form.medications} onChange={(v: string) => update("medications", v)} placeholder="Ej: Insulina..." color="text-blue-600" />
    </div>
  );

  const renderInsuranceFields = () => (
    <div className="space-y-3">
      <ToggleField
        label="¿Cuenta con seguro médico?"
        checked={form.isInsured}
        onChange={(v) => update("isInsured", v)}
      />
      {form.isInsured && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Aseguradora" value={form.insuranceProvider || ""} onChange={(v: string) => update("insuranceProvider", v)} placeholder="Ej: ASSA" />
          <Field label="Número de Póliza" value={form.insurancePolicyNumber || ""} onChange={(v: string) => update("insurancePolicyNumber", v)} placeholder="Privado" />
          <Field label="Hospital Preferido" value={form.preferredHospital || ""} onChange={(v: string) => update("preferredHospital", v)} placeholder="Ej: Punta Pacífica" />
          <Field label="Teléfono emergencia del seguro" value={form.insuranceEmergencyPhone || ""} onChange={(v: string) => update("insuranceEmergencyPhone", v)} placeholder="Privado" />
          <p className="sm:col-span-2 text-xs text-muted-foreground bg-slate-100/80 dark:bg-slate-900/60 border border-border rounded-xl px-3 py-2">
            La póliza y el teléfono del seguro no se mostrarán públicamente.
          </p>
        </div>
      )}
    </div>
  );

  const renderDoctorFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Nombre del médico" value={form.primaryDoctorName || ""} onChange={(v: string) => update("primaryDoctorName", v)} placeholder="Opcional" />
      <Field label="Teléfono del médico" value={form.primaryDoctorPhone || ""} onChange={(v: string) => update("primaryDoctorPhone", v)} placeholder="Opcional" />
    </div>
  );

  const renderAdditionalNotesField = () => (
    <TextAreaField icon={<FileText className="h-4 w-4" />} label="Notas adicionales" value={form.additionalNotes} onChange={(v: string) => update("additionalNotes", v)} placeholder="Ej: alergias severas, indicaciones de rescate..." color="text-slate-600" />
  );

  const renderSpecialAssistanceFields = () => {
    const hasChildData = (form.hasCognitiveImpairment === true) || (form.hasWanderingRisk === true) || (form.isNonVerbal === true) || Boolean(form.communicationAssistance?.trim());
    const isActive = form.enableSpecialAssistance ?? hasChildData;

    return (
      <div className="space-y-3">
        <ToggleField label="Necesidades especiales" checked={isActive} onChange={(v) => { update("enableSpecialAssistance", v); if (v) { update("showVulnerabilityStatusPublic", true); update("showCommunicationStatusPublic", true); } }} />

        {!isActive && hasChildData && (
          <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠️ Esta sección tiene información guardada. Activa el toggle para revisarla.
          </p>
        )}

        {isActive && (
          <div className="space-y-3">
            <ToggleField label="Deterioro cognitivo / Alzheimer / demencia" checked={form.hasCognitiveImpairment ?? false} onChange={(v) => update("hasCognitiveImpairment", v)} />
            <ToggleField label="Riesgo de desorientación o extravío" checked={form.hasWanderingRisk ?? false} onChange={(v) => update("hasWanderingRisk", v)} />
            <ToggleField label="Persona no verbal o con comunicación asistida" checked={form.isNonVerbal ?? false} onChange={(v) => update("isNonVerbal", v)} />
            {form.isNonVerbal && (
              <TextAreaField
                icon={<MessageCircle className="h-4 w-4" />}
                label="Instrucciones de comunicación"
                value={form.communicationAssistance || ""}
                onChange={(v: string) => update("communicationAssistance", v)}
                placeholder="Ej. Usa pictogramas, entiende frases cortas, comunicarse con calma..."
                color="text-violet-600"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSafeReturnFields = () => {
    const hasChildData = Boolean(form.safeReturnInstructions?.trim()) || Boolean(form.safeReturnLocationName?.trim()) || Boolean(form.safeReturnAddress?.trim()) || Boolean(form.safeReturnContactName?.trim()) || Boolean(form.safeReturnContactPhone?.trim()) || form.safeReturnLat != null || form.safeReturnLng != null;
    const isActive = form.enableSafeReturn ?? hasChildData;

    return (
      <div className="space-y-3">
        <ToggleField label="Persona perdida / retorno a casa" checked={isActive} onChange={(v) => {
          update("enableSafeReturn", v);
          if (v) {
            // auto-enable public visibility for safe return when user activates the feature
            update("showSafeReturnPublic", true);
            update("showSafeReturnLocationPublic", true);
          }
        }} />

        {!isActive && hasChildData && (
          <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠️ Esta sección tiene información guardada. Activa el toggle para revisarla.
          </p>
        )}

        {isActive && (
          <div className="p-3 md:p-4 rounded-2xl border border-border bg-muted/20">
            <h4 className="font-black text-sm text-teal-700">Ubicación de Retorno Seguro</h4>
            <p className="text-xs text-muted-foreground mt-1">Esta es la ubicación donde debe ser llevada la persona en caso de encontrarse extraviada.</p>

            <div className="mt-3 space-y-3">
              {/* Sección A: Nombre del lugar + Dirección */}
              <div>
                <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">Sección A</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nombre del lugar" value={form.safeReturnLocationName || ""} onChange={(v: string) => update("safeReturnLocationName", v)} placeholder="Ej: Casa de tía María" />
                  <Field label="Dirección" value={form.safeReturnAddress || ""} onChange={(v: string) => update("safeReturnAddress", v)} placeholder="Calle, número, referencia" />
                </div>
              </div>

              {/* Sección B: Coordenadas */}
              <div>
                <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">Sección B</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Latitud" value={String(form.safeReturnLat ?? "")} onChange={(v: string) => update("safeReturnLat", v)} placeholder="Ej: 8.9833" />
                  <Field label="Longitud" value={String(form.safeReturnLng ?? "")} onChange={(v: string) => update("safeReturnLng", v)} placeholder="Ej: -79.5167" />
                </div>
                {(!form.safeReturnLat && !form.safeReturnLng) && (
                  <div className="mt-2 text-xs text-muted-foreground bg-slate-100/80 dark:bg-slate-900/60 border border-border rounded-xl px-3 py-2">
                    <Info className="inline-block mr-2 align-text-top" /> Los mapas Google Maps y Waze no estarán disponibles sin coordenadas.
                  </div>
                )}
              </div>

              {/* Sección C: Responsable */}
              <div>
                <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">Sección C</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Responsable del lugar" value={form.safeReturnContactName || ""} onChange={(v: string) => update("safeReturnContactName", v)} placeholder="Ej: Tía María García" />
                  <Field label="Teléfono del responsable" value={form.safeReturnContactPhone || ""} onChange={(v: string) => update("safeReturnContactPhone", v)} placeholder="+507 6612-3456" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrivacyToggles = () => (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-[11px] font-semibold text-muted-foreground bg-slate-100/80 dark:bg-slate-900/60 border border-border rounded-xl px-3 py-2.5 mb-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Estos controles determinan qué información personal puede ver cualquier persona que escanee tu chip en una emergencia.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ToggleField label="Mostrar aseguradora" checked={form.showInsuranceProviderPublic} onChange={(v) => update("showInsuranceProviderPublic", v)} />
        <ToggleField label="Mostrar hospital preferido" checked={form.showPreferredHospitalPublic} onChange={(v) => update("showPreferredHospitalPublic", v)} />
        <ToggleField label="Mostrar médico tratante" checked={form.showPrimaryDoctorPublic} onChange={(v) => update("showPrimaryDoctorPublic", v)} />
        <ToggleField label="Mostrar teléfono del médico" checked={form.showPrimaryDoctorPhonePublic} onChange={(v) => update("showPrimaryDoctorPhonePublic", v)} />
        <ToggleField label="Mostrar notas adicionales" checked={form.showAdditionalNotesPublic} onChange={(v) => update("showAdditionalNotesPublic", v)} />
      </div>

      <div className="flex items-start gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 mt-4">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Estos datos pueden ser sensibles. Solo actívalos si deseas que aparezcan cuando alguien escanee el QR/NFC.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ToggleField label="Mostrar alerta de persona vulnerable en la ficha pública" checked={form.showVulnerabilityStatusPublic ?? false} onChange={(v) => update("showVulnerabilityStatusPublic", v)} />
        <ToggleField label="Mostrar información de comunicación asistida en la ficha pública" checked={form.showCommunicationStatusPublic ?? false} onChange={(v) => update("showCommunicationStatusPublic", v)} />
        <ToggleField label="Mostrar instrucciones de retorno seguro en la ficha pública" checked={form.showSafeReturnPublic ?? false} onChange={(v) => update("showSafeReturnPublic", v)} />
      </div>
    </div>
  );

  // ── Section header renderer (for grid mode sections) ──

  const SectionHeader = ({
    icon,
    iconBg,
    title,
    description,
  }: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
  }) => (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h3 className="font-black text-base md:text-lg tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  // ── WIZARD MODE ──

  const renderWizard = () => (
    <div className={`space-y-5 ${disabled ? "opacity-60 pointer-events-none" : ""}`} data-wizard-active={isWizard ? "true" : undefined}>
      {isWizard && <style>{`
        [data-wizard-active="true"] + div.flex.gap-6 {
          display: none !important;
        }
      `}</style>}

      {/* Step indicator + progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                    step === s.id
                      ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                      : step > s.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground/40"
                  }`}
                >
                  {step > s.id ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block transition-colors ${
                    step === s.id ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: step > s.id ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Progress bar (numeric) */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Paso {step} de {totalSteps}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground/60 w-8 text-right">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* Step header */}
      {(() => {
        const currentStep = STEPS[step - 1];
        const StepIcon = currentStep.icon;
        return (
          <div className="flex items-center gap-3 px-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <StepIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base tracking-tight">{currentStep.title}</h3>
              <p className="text-xs text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>
        );
      })()}

      {/* Info banner (shown on steps 1-4) */}
      {step <= 4 && (
        <div className="flex items-start gap-2 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3 py-2.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Para activar tu perfil solo necesitas nombre, apellido y tipo de sangre. Los demás datos son opcionales, pero ayudan en una emergencia.
          </span>
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[240px] transition-all duration-300">
        {step === 1 && (
          <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
            <SectionHeader
              icon={<User className="h-5 w-5" />}
              iconBg="bg-primary/10 text-primary"
              title="Identidad"
              description="Datos base para identificar a la persona."
            />
            {renderIdentityFields(true)}
          </div>
        )}

        {step === 2 && (
          <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
            <SectionHeader
              icon={<Heart className="h-5 w-5" />}
              iconBg="bg-red-500/10 text-red-600"
              title="Alerta médica"
              description="Información crítica para primera respuesta."
            />
            {renderMedicalAlertFields(true)}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
              <SectionHeader
                icon={<Shield className="h-5 w-5" />}
                iconBg="bg-blue-500/10 text-blue-600"
                title="Seguro médico"
                description="Completa estos datos solo si cuentas con seguro."
              />
              {renderInsuranceFields()}
            </div>
            <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
              <SectionHeader
                icon={<Stethoscope className="h-5 w-5" />}
                iconBg="bg-emerald-500/10 text-emerald-600"
                title="Médico tratante"
                description="Solo se mostrará públicamente si lo autorizas en privacidad."
              />
              {renderDoctorFields()}
            </div>
            <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
              <SectionHeader
                icon={<FileText className="h-5 w-5" />}
                iconBg="bg-slate-500/10 text-slate-600"
                title="Instrucciones especiales"
                description="Detalles útiles para actuar más rápido en emergencia."
              />
              {renderAdditionalNotesField()}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
              <SectionHeader
                icon={<Brain className="h-5 w-5" />}
                iconBg="bg-violet-500/10 text-violet-600"
                title="Asistencia especial"
                description="Información opcional para ayudar en situaciones de desorientación, vulnerabilidad o comunicación asistida."
              />
              {renderSpecialAssistanceFields()}
            </div>
            <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
              <SectionHeader
                icon={<Footprints className="h-5 w-5" />}
                iconBg="bg-teal-500/10 text-teal-600"
                title="Retorno seguro"
                description="Instrucciones para situaciones de desorientación."
              />
              {renderSafeReturnFields()}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="p-0 md:p-6 rounded-none md:rounded-3xl md:border md:border-border md:bg-muted/20 space-y-4 md:shadow-inner">
            <SectionHeader
              icon={<Eye className="h-5 w-5" />}
              iconBg="bg-slate-500/10 text-slate-600"
              title="Privacidad y visibilidad"
              description="Qué puede ver quien escanee tu chip."
            />
            {renderPrivacyToggles()}
          </div>
        )}
      </div>

      {/* Prevent Enter key from submitting the parent form during wizard navigation */}
      <div onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>
        {/* Wizard navigation buttons */}
        <div className="flex gap-3 pt-2">
          {canGoPrev ? (
            <button
              type="button"
              onClick={goPrev}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-border font-black text-sm hover:bg-accent active:scale-[0.98] transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {canGoNext ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                const form = (e.target as HTMLElement).closest("form");
                if (form) form.requestSubmit();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Guardar Perfil Médico
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── GRID MODE ──

  const renderGrid = () => (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>

      {/* Identity Section */}
      <div className="space-y-4">
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-base md:text-lg tracking-tight">Identidad</h3>
              <p className="text-xs text-muted-foreground">Datos base para identificar a la persona.</p>
            </div>
            <div className="shrink-0">
              {renderAgeBadge()}
            </div>
          </div>
          {renderIdentityFields()}
        </div>
      </div>

      {/* Medical Section */}
      <div className="space-y-4">
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight text-red-600">Alerta médica</h3>
              <p className="text-xs text-muted-foreground">Información crítica para primera respuesta.</p>
            </div>
          </div>
          {renderMedicalAlertFields()}
        </div>

        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight text-blue-700">Seguro médico</h3>
              <p className="text-xs text-muted-foreground">Completa estos datos solo si cuentas con seguro.</p>
            </div>
          </div>
          {renderInsuranceFields()}
        </div>

        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight text-emerald-700">Médico tratante</h3>
              <p className="text-xs text-muted-foreground">Solo se mostrará públicamente si lo autorizas en privacidad.</p>
            </div>
          </div>
          {renderDoctorFields()}
        </div>

        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight">Instrucciones especiales</h3>
              <p className="text-xs text-muted-foreground">Detalles útiles para actuar más rápido en emergencia.</p>
            </div>
          </div>
          {renderAdditionalNotesField()}
        </div>

        {/* Special Assistance Section */}
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight text-violet-700">Asistencia especial</h3>
              <p className="text-xs text-muted-foreground">Información opcional para vulnerabilidad o comunicación asistida.</p>
            </div>
          </div>
          {renderSpecialAssistanceFields()}
        </div>

        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Footprints className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight text-teal-700">Retorno seguro</h3>
              <p className="text-xs text-muted-foreground">Instrucciones para situaciones de desorientación.</p>
            </div>
          </div>
          {renderSafeReturnFields()}
        </div>

        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-black text-base tracking-tight">Privacidad y visibilidad</h3>
              <p className="text-xs text-muted-foreground font-medium">Qué puede ver quien escanee tu chip.</p>
            </div>
            <div className="ml-4">
              <button type="button" onClick={() => setShowPrivacy((s) => !s)} className="text-sm font-bold text-primary px-3 py-2 rounded-xl border border-primary/10 bg-primary/5">
                {showPrivacy ? 'Ocultar opciones' : 'Mostrar opciones'}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium">Estos datos podrán ser vistos por cualquier persona que escanee tu chip en una emergencia.</p>
          {showPrivacy ? (
            renderPrivacyToggles()
          ) : (
            <div className="text-sm text-muted-foreground italic">Opciones de privacidad ocultas. Pulsa &quot;Mostrar opciones&quot; para editar.</div>
          )}
        </div>
      </div>

    </div>
  );

  // ── RENDER ──

  return isWizard ? renderWizard() : renderGrid();
}

// ──────────────────────────────────────────────
// INTERNAL COMPONENTS
// ──────────────────────────────────────────────

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (val: boolean) => void }) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-xs font-medium leading-snug">{label}</span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
}

function Field({ label, value, onChange, required, placeholder }: FieldProps) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ml-1">{label}</label>
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-input bg-background px-3.5 py-2.5 text-sm md:text-base font-semibold shadow-sm input-premium outline-none"
      />
    </div>
  );
}

interface TextAreaFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  color: string;
}

function TextAreaField({ icon, label, value, onChange, placeholder, color }: TextAreaFieldProps) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 ml-1">
        <span className={color}>{icon}</span>
        <label htmlFor={id} className={`text-[11px] font-semibold uppercase tracking-wide ${color}`}>{label}</label>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-xl border-2 border-input bg-card/50 px-3.5 py-2.5 text-sm font-medium resize-y min-h-[84px] shadow-sm italic hover:bg-background input-premium outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}
