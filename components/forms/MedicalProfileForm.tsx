"use client";

import { BLOOD_TYPES } from "@/lib/constants";
import { User, Activity, Heart, ShieldAlert, Pill, FileText, Shield, Stethoscope } from "lucide-react";
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
  };
  onChange: (field: string, value: string | boolean) => void;
  disabled?: boolean;
}

export function MedicalProfileForm({ form, onChange, disabled = false }: ProfileFormProps) {
  const update = (field: string, value: string | boolean) => onChange(field, value);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      
      {/* Identity Section */}
      <div className="space-y-4">
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg tracking-tight">Identidad</h3>
              <p className="text-xs text-muted-foreground">Datos base para identificar a la persona.</p>
            </div>
          </div>

          <div className="space-y-3">
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
              {(() => {
                if (!form.birthDate) return null;
                const birthDate = new Date(form.birthDate);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return (
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">
                    EDAD: {age} AÑOS
                  </div>
                );
              })()}
            </div>
            <BirthDatePicker 
              label="" 
              value={form.birthDate} 
              onChange={(v: string) => update("birthDate", v)} 
            />
          </div>
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

          <div className="space-y-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del médico" value={form.primaryDoctorName || ""} onChange={(v: string) => update("primaryDoctorName", v)} placeholder="Opcional" />
            <Field label="Teléfono del médico" value={form.primaryDoctorPhone || ""} onChange={(v: string) => update("primaryDoctorPhone", v)} placeholder="Opcional" />
          </div>
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
          <TextAreaField icon={<FileText className="h-4 w-4" />} label="Notas adicionales" value={form.additionalNotes} onChange={(v: string) => update("additionalNotes", v)} placeholder="Ej: alergias severas, indicaciones de rescate..." color="text-slate-600" />
        </div>

        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border bg-muted/20 space-y-4 shadow-inner">
          <h3 className="font-black text-base tracking-tight">Privacidad y visibilidad</h3>
          <p className="text-xs text-muted-foreground font-medium">
            Qué puede ver quien escanee tu chip.
          </p>
          <p className="text-xs text-muted-foreground font-medium">
            Estos datos podrán ser vistos por cualquier persona que escanee tu chip en una emergencia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleField label="Mostrar aseguradora" checked={form.showInsuranceProviderPublic} onChange={(v) => update("showInsuranceProviderPublic", v)} />
            <ToggleField label="Mostrar hospital preferido" checked={form.showPreferredHospitalPublic} onChange={(v) => update("showPreferredHospitalPublic", v)} />
            <ToggleField label="Mostrar médico tratante" checked={form.showPrimaryDoctorPublic} onChange={(v) => update("showPrimaryDoctorPublic", v)} />
            <ToggleField label="Mostrar teléfono del médico" checked={form.showPrimaryDoctorPhonePublic} onChange={(v) => update("showPrimaryDoctorPhonePublic", v)} />
            <ToggleField label="Mostrar notas adicionales" checked={form.showAdditionalNotesPublic} onChange={(v) => update("showAdditionalNotesPublic", v)} />
          </div>
        </div>
      </div>

    </div>
  );
}

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
