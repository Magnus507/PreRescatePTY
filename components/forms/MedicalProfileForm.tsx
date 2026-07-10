"use client";

import { useEffect } from "react";
import { BLOOD_TYPES } from "@/lib/constants";
import {
  Activity, ShieldAlert, Pill, FileText,
  AlertCircle, Info, Brain, Footprints, MessageCircle, Baby, Crown,
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
}

// ──────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────

export function MedicalProfileForm({ form, onChange, disabled = false }: ProfileFormProps) {
  const update = (field: string, value: string | boolean) => onChange(field, value);

  // ── Auto-sync toggles — activate when data field has content and toggle is off ──
  // Never deactivates a toggle (only false→true, never true→false)
  useEffect(() => {
    if (form.insuranceProvider?.trim() && !form.showInsuranceProviderPublic) {
      update("showInsuranceProviderPublic", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.insuranceProvider]);
  useEffect(() => {
    if (form.preferredHospital?.trim() && !form.showPreferredHospitalPublic) {
      update("showPreferredHospitalPublic", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.preferredHospital]);
  useEffect(() => {
    if (form.primaryDoctorName?.trim() && !form.showPrimaryDoctorPublic) {
      update("showPrimaryDoctorPublic", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.primaryDoctorName]);
  useEffect(() => {
    if (form.primaryDoctorPhone?.trim() && !form.showPrimaryDoctorPhonePublic) {
      update("showPrimaryDoctorPhonePublic", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.primaryDoctorPhone]);
  useEffect(() => {
    if (form.additionalNotes?.trim() && !form.showAdditionalNotesPublic) {
      update("showAdditionalNotesPublic", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.additionalNotes]);

  // ── Field-set renderers ──

  const renderAgeBadge = () => {
    const age = getCalculatedAge();
    if (age === null) return null;
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

  const getCalculatedAge = () => {
    if (!form.birthDate) return null;
    const birthDate = new Date(form.birthDate);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const isOlderAdult = (() => {
    const age = getCalculatedAge();
    return age !== null && age >= 60;
  })();

  const renderPrivateContextBadges = () => {
    const badges: { label: string; color: string; icon: React.ReactNode }[] = [];
    const age = getCalculatedAge();
    if (age !== null && age < 18) {
      badges.push({ label: "Menor de edad", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Baby className="h-3.5 w-3.5" /> });
    } else if (isOlderAdult) {
      badges.push({ label: "Adulto mayor", color: "bg-slate-100 text-slate-700 border-slate-200", icon: <Crown className="h-3.5 w-3.5" /> });
    }
    if ((form.allergies || "").trim()) {
      badges.push({ label: "Alergias declaradas", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="h-3.5 w-3.5" /> });
    }
    if ((form.medications || "").trim()) {
      badges.push({ label: "Medicación declarada", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Pill className="h-3.5 w-3.5" /> });
    }
    if (form.hasCognitiveImpairment) {
      badges.push({ label: "Requiere asistencia", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Brain className="h-3.5 w-3.5" /> });
    }
    if (form.hasWanderingRisk) {
      badges.push({ label: "Riesgo de desorientación", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <Footprints className="h-3.5 w-3.5" /> });
    }
    if (form.isNonVerbal || form.communicationAssistance?.trim()) {
      badges.push({ label: "Comunicación asistida", color: "bg-violet-100 text-violet-700 border-violet-200", icon: <MessageCircle className="h-3.5 w-3.5" /> });
    }
    if (form.safeReturnInstructions?.trim()) {
      badges.push({ label: "Retorno seguro", color: "bg-teal-100 text-teal-700 border-teal-200", icon: <Footprints className="h-3.5 w-3.5" /> });
    }

    if (badges.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {badges.map((b, i) => (
          <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest ${b.color}`}>
            {b.icon}
            {b.label}
          </span>
        ))}
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
      {renderAdditionalNotesField()}
    </div>
  );

  const renderContactsGuidance = () => (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-[11px] font-semibold text-muted-foreground bg-slate-100/80 dark:bg-slate-900/60 border border-border rounded-xl px-3 py-2.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Los contactos de emergencia se administran desde el bloque de contactos del perfil. Aquí resumimos quién debe responder y por qué es importante mantenerlos actualizados.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contacto principal</p>
          <p className="text-sm font-semibold mt-1">Usa tu contacto de mayor prioridad para emergencias inmediatas.</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contacto secundario</p>
          <p className="text-sm font-semibold mt-1">Añade un respaldo familiar o cuidador si existe.</p>
        </div>
      </div>
    </div>
  );

  const renderAdditionalNotesField = () => (
    <TextAreaField icon={<FileText className="h-4 w-4" />} label="Notas críticas e instrucciones generales" value={form.additionalNotes} onChange={(v: string) => { update("additionalNotes", v); }} placeholder="Ej: alergias severas, indicaciones de rescate..." color="text-slate-600" />
  );

  const renderModuleHeader = () => (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">Perfil médico</p>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">Perfil médico</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Completa solo la información que aplique. Puedes abrir cada módulo y controlar qué se mostrará públicamente.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {renderPrivateContextBadges()}
      </div>
    </div>
  );

  const renderModuleShell = (title: string, description: string, children: React.ReactNode, summary?: React.ReactNode, openDefault = false) => (
    <details open={openDefault} className="rounded-3xl border border-border bg-muted/20 shadow-inner group">
      <summary className="list-none cursor-pointer p-4 md:p-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-black text-base md:text-lg tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          {summary}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary group-open:rotate-180 transition-transform">Abrir</div>
      </summary>
      <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-4">
        {children}
      </div>
    </details>
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
          <Field label="Aseguradora" value={form.insuranceProvider || ""} onChange={(v: string) => { update("insuranceProvider", v); }} placeholder="Ej: ASSA" />
          <Field label="Número de Póliza" value={form.insurancePolicyNumber || ""} onChange={(v: string) => update("insurancePolicyNumber", v)} placeholder="Privado" />
          <Field label="Hospital Preferido" value={form.preferredHospital || ""} onChange={(v: string) => { update("preferredHospital", v); }} placeholder="Ej: Punta Pacífica" />
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
      <Field label="Nombre del médico" value={form.primaryDoctorName || ""} onChange={(v: string) => { update("primaryDoctorName", v); }} placeholder="Opcional" />
      <Field label="Teléfono del médico" value={form.primaryDoctorPhone || ""} onChange={(v: string) => { update("primaryDoctorPhone", v); }} placeholder="Opcional" />
    </div>
  );

  // ── MODULAR MODE ──

  const renderIdentityModule = () => renderModuleShell(
    "Identidad básica",
    "Datos base para identificar a la persona.",
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3 py-2.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Para activar tu perfil solo necesitas nombre, apellido y tipo de sangre. Lo demás ayuda a afinar la atención.
        </span>
      </div>
      {renderIdentityFields(true)}
    </div>,
    <div className="mt-2 text-xs text-muted-foreground">{renderAgeBadge()}</div>,
    true,
  );

  const renderMedicalModule = () => renderModuleShell(
    "Información médica esencial",
    "Datos clínicos que deben verse primero en una emergencia.",
    <div className="space-y-4">
      {renderMedicalAlertFields(true)}
      <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black tracking-tight">Notas críticas y visibilidad</h4>
            <p className="text-xs text-muted-foreground">Las notas críticas pueden mostrarse públicamente si así lo decides.</p>
          </div>
          <ToggleField label="Mostrar notas adicionales" checked={form.showAdditionalNotesPublic} onChange={(v) => update("showAdditionalNotesPublic", v)} />
        </div>
      </div>
    </div>,
    <div className="mt-2 text-xs text-muted-foreground">Alergias, condiciones, medicamentos y notas críticas.</div>,
    true,
  );

  const renderContactsModule = () => renderModuleShell(
    "Contactos de emergencia",
    "Personas que deben responder si hay una urgencia.",
    renderContactsGuidance(),
    null,
    false,
  );

  const renderMinorModule = () => {
    const age = getCalculatedAge();
    const minorSummary = age !== null && age < 18
      ? `Menor de edad detectado por fecha de nacimiento.`
      : "Si el perfil pertenece a un menor, usa la fecha de nacimiento para que la vista pública lo identifique con claridad.";

    return renderModuleShell(
      "Niño / menor de edad",
      "Contexto de protección para perfiles pediátricos o dependientes.",
      <div className="space-y-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-3 text-sm text-blue-800 dark:text-blue-200">
          {minorSummary}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Badge activo</p>
            <p className="text-sm font-semibold mt-1">Menor de edad</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Uso</p>
            <p className="text-sm font-semibold mt-1">Sirve como contexto visual, no como un flujo aparte.</p>
          </div>
        </div>
      </div>,
      null,
      false,
    );
  };

  const renderAssistanceModule = () => {
    const hasChildData = (form.hasCognitiveImpairment === true) || (form.hasWanderingRisk === true) || (form.isNonVerbal === true) || Boolean(form.communicationAssistance?.trim());
    const isActive = form.enableSpecialAssistance ?? hasChildData;

    return renderModuleShell(
      "Asistencia especial / condición especial",
      "Comunicación, acompañamiento y señales de apoyo visibles para quien atiende.",
      <div className="space-y-4">
        <ToggleField
          label="Habilitar asistencia especial"
          checked={isActive}
          onChange={(v) => {
            update("enableSpecialAssistance", v);
            if (v) {
              update("showVulnerabilityStatusPublic", true);
              update("showCommunicationStatusPublic", true);
            }
          }}
        />

        {!isActive && hasChildData && (
          <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Esta sección tiene información guardada. Activa el módulo para revisarla.
          </p>
        )}

        {isActive && (
          <div className="space-y-3">
            <ToggleField label="Persona no verbal o con comunicación asistida" checked={form.isNonVerbal ?? false} onChange={(v) => update("isNonVerbal", v)} />
            {form.isNonVerbal && (
              <TextAreaField
                icon={<MessageCircle className="h-4 w-4" />}
                label="Instrucciones de comunicación"
                value={form.communicationAssistance || ""}
                onChange={(v: string) => update("communicationAssistance", v)}
                placeholder="Ej. Usa pictogramas, frases cortas, tono calmado..."
                color="text-violet-600"
              />
            )}
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <ToggleField
                label="Mostrar contexto de asistencia especial"
                checked={form.showCommunicationStatusPublic ?? false}
                onChange={(v) => update("showCommunicationStatusPublic", v)}
              />
            </div>
          </div>
        )}
      </div>,
      null,
      false,
    );
  };

  const renderCognitiveModule = () => {
    const hasCognitiveData = (form.hasCognitiveImpairment === true) || (form.hasWanderingRisk === true);

    return renderModuleShell(
      "Deterioro cognitivo / Alzheimer / demencia",
      "Bloque prudente para reportar vulnerabilidad cognitiva o riesgo de desorientación.",
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleField label="Deterioro cognitivo reportado" checked={form.hasCognitiveImpairment ?? false} onChange={(v) => update("hasCognitiveImpairment", v)} />
          <ToggleField label="Riesgo de desorientación" checked={form.hasWanderingRisk ?? false} onChange={(v) => update("hasWanderingRisk", v)} />
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Usa este módulo para notas prudentes como “deterioro cognitivo reportado” o “riesgo de desorientación”.
          </p>
          <ToggleField
            label="Mostrar vulnerabilidad en vista pública"
            checked={form.showVulnerabilityStatusPublic ?? false}
            onChange={(v) => update("showVulnerabilityStatusPublic", v)}
          />
        </div>

        {!hasCognitiveData && (
          <p className="text-[10px] text-muted-foreground bg-slate-100/70 border border-border rounded-xl px-3 py-2">
            Si no aplica, deja este módulo cerrado. La vista pública no mostrará nada adicional.
          </p>
        )}
      </div>,
      null,
      false,
    );
  };

  const renderSafeReturnModule = () => {
    const hasChildData = Boolean(form.safeReturnInstructions?.trim()) || Boolean(form.safeReturnLocationName?.trim()) || Boolean(form.safeReturnAddress?.trim()) || Boolean(form.safeReturnContactName?.trim()) || Boolean(form.safeReturnContactPhone?.trim()) || form.safeReturnLat != null || form.safeReturnLng != null;
    const isActive = form.enableSafeReturn ?? hasChildData;

    return renderModuleShell(
      "Retorno seguro / persona perdida",
      "Un bloque separado para emergencias de extravío, retorno a casa o acompañamiento seguro.",
      <div className="space-y-4">
        <ToggleField
          label="Habilitar retorno seguro"
          checked={isActive}
          onChange={(v) => {
            update("enableSafeReturn", v);
            if (v) {
              update("showSafeReturnPublic", true);
              update("showSafeReturnLocationPublic", true);
            }
          }}
        />

        {!isActive && hasChildData && (
          <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Esta sección tiene información guardada. Activa el módulo para revisarla.
          </p>
        )}

        {isActive && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
              <h4 className="font-black text-sm text-teal-700">Ubicación de retorno seguro</h4>
              <p className="text-xs text-muted-foreground">Define adónde deben llevar a la persona si se extravía.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre del lugar" value={form.safeReturnLocationName || ""} onChange={(v: string) => update("safeReturnLocationName", v)} placeholder="Ej: Casa de tía María" />
                <Field label="Dirección" value={form.safeReturnAddress || ""} onChange={(v: string) => update("safeReturnAddress", v)} placeholder="Calle, número, referencia" />
                <Field label="Latitud" value={String(form.safeReturnLat ?? "")} onChange={(v: string) => update("safeReturnLat", v)} placeholder="Ej: 8.9833" />
                <Field label="Longitud" value={String(form.safeReturnLng ?? "")} onChange={(v: string) => update("safeReturnLng", v)} placeholder="Ej: -79.5167" />
              </div>
              {(!form.safeReturnLat && !form.safeReturnLng) && (
                <div className="text-xs text-muted-foreground bg-slate-100/80 dark:bg-slate-900/60 border border-border rounded-xl px-3 py-2">
                  <Info className="inline-block mr-2 align-text-top" /> Los mapas no estarán disponibles sin coordenadas.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Responsable del lugar" value={form.safeReturnContactName || ""} onChange={(v: string) => update("safeReturnContactName", v)} placeholder="Ej: Tía María García" />
                <Field label="Teléfono del responsable" value={form.safeReturnContactPhone || ""} onChange={(v: string) => update("safeReturnContactPhone", v)} placeholder="+507 6612-3456" />
              </div>
              <TextAreaField
                icon={<Footprints className="h-4 w-4" />}
                label="Instrucciones de retorno seguro"
                value={form.safeReturnInstructions || ""}
                onChange={(v: string) => update("safeReturnInstructions", v)}
                placeholder="Cómo ayudar, a dónde llevarlo y qué hacer si se extravía."
                color="text-teal-700"
              />
              <ToggleField
                label="Mostrar retorno seguro públicamente"
                checked={form.showSafeReturnPublic ?? false}
                onChange={(v) => update("showSafeReturnPublic", v)}
              />
              <ToggleField
                label="Mostrar ubicación de retorno seguro"
                checked={form.showSafeReturnLocationPublic ?? false}
                onChange={(v) => update("showSafeReturnLocationPublic", v)}
              />
            </div>
          </div>
        )}
      </div>,
      null,
      false,
    );
  };

  const renderInsuranceModule = () => renderModuleShell(
    "Seguro y médico tratante",
    "Cubre aseguradora, póliza, hospital y médico de referencia.",
    <div className="space-y-4">
      {renderInsuranceFields()}
      <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
        <h4 className="font-black text-sm">Médico tratante</h4>
        {renderDoctorFields()}
      </div>
      <div className="rounded-2xl border border-border bg-background/60 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleField label="Mostrar aseguradora" checked={form.showInsuranceProviderPublic} onChange={(v) => update("showInsuranceProviderPublic", v)} />
          <ToggleField label="Mostrar hospital preferido" checked={form.showPreferredHospitalPublic} onChange={(v) => update("showPreferredHospitalPublic", v)} />
          <ToggleField label="Mostrar médico tratante" checked={form.showPrimaryDoctorPublic} onChange={(v) => update("showPrimaryDoctorPublic", v)} />
          <ToggleField label="Mostrar teléfono del médico" checked={form.showPrimaryDoctorPhonePublic} onChange={(v) => update("showPrimaryDoctorPhonePublic", v)} />
        </div>
      </div>
    </div>,
    <div className="mt-2 text-xs text-muted-foreground">Seguro, póliza, hospital preferido y médico de referencia.</div>,
    false,
  );

  const renderFormModules = () => (
    <div className={`space-y-4 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="rounded-3xl border border-border bg-muted/20 p-4 md:p-6 shadow-inner">
        {renderModuleHeader()}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4">
          {renderIdentityModule()}
          {renderContactsModule()}
          {renderMinorModule()}
        </div>
        <div className="space-y-4">
          {renderMedicalModule()}
          {renderAssistanceModule()}
          {renderCognitiveModule()}
          {renderSafeReturnModule()}
          {renderInsuranceModule()}
        </div>
      </div>
    </div>
  );

  return renderFormModules();
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
