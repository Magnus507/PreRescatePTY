"use client";

import { BLOOD_TYPES } from "@/lib/constants";
import { User, Activity, Heart, ShieldAlert, Pill, FileText } from "lucide-react";
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
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export function MedicalProfileForm({ form, onChange, disabled = false }: ProfileFormProps) {
  const update = (field: string, value: string) => onChange(field, value);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      
      {/* Identity Section */}
      <div className="space-y-6">
        <div className="p-10 rounded-[3rem] border border-border bg-muted/20 space-y-8 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-black text-lg tracking-tight">Identidad</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre *" value={form.firstName} onChange={(v: string) => update("firstName", v)} required placeholder="Juan" />
              <Field label="Apellido *" value={form.lastName} onChange={(v: string) => update("lastName", v)} required placeholder="Pérez" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <Field label="Alias Público" value={form.displayNamePublic} onChange={(v: string) => update("displayNamePublic", v)} placeholder="Ej: Juan P." />
               <Field label="Teléfono de Contacto" value={form.phone || ""} onChange={(v: string) => update("phone", v)} placeholder="+507 0000-0000" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="sex-select" className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">Sexo</label>
              <select 
                id="sex-select"
                value={form.sex} 
                onChange={(e) => update("sex", e.target.value)} 
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm transition-all"
              >
                <option value="">No Definido</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">Fecha de Nacimiento</label>
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
      <div className="space-y-6">
        <div className="p-10 rounded-[3rem] border border-border bg-muted/20 space-y-8 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="font-black text-lg tracking-tight text-red-600">Alerta Médica</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="blood-type-select" className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">Tipo de Sangre *</label>
              <select 
                id="blood-type-select"
                required 
                value={form.bloodType} 
                onChange={(e) => update("bloodType", e.target.value)} 
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-black focus:ring-2 focus:ring-primary/20 appearance-none text-primary shadow-sm transition-all"
              >
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>

            <TextAreaField icon={<Activity className="h-4 w-4" />} label="Alergias" value={form.allergies} onChange={(v: string) => update("allergies", v)} placeholder="Ej: Penicilina..." color="text-red-700" />
            <TextAreaField icon={<ShieldAlert className="h-4 w-4" />} label="Condiciones" value={form.chronicConditions} onChange={(v: string) => update("chronicConditions", v)} placeholder="Ej: Diabetes..." color="text-amber-700" />
            <TextAreaField icon={<Pill className="h-4 w-4" />} label="Medicamentos" value={form.medications} onChange={(v: string) => update("medications", v)} placeholder="Ej: Insulina..." color="text-blue-600" />
            <TextAreaField icon={<FileText className="h-4 w-4" />} label="Instrucciones" value={form.additionalNotes} onChange={(v: string) => update("additionalNotes", v)} placeholder="..." color="text-slate-600" />
          </div>
        </div>
      </div>

    </div>
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
      <label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">{label}</label>
      <input 
        id={id}
        type="text" 
        required={required} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="w-full rounded-2xl border border-input bg-background px-5 py-4 text-base font-bold focus:ring-4 focus:ring-primary/10 shadow-sm transition-all outline-none" 
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
        <label htmlFor={id} className={`text-[10px] font-black uppercase tracking-[0.1em] ${color}`}>{label}</label>
      </div>
      <textarea 
        id={id}
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        rows={1} 
        className="w-full rounded-2xl border border-input bg-card/50 px-5 py-4 text-sm font-semibold focus:ring-4 focus:ring-primary/10 resize-none shadow-sm italic hover:bg-background transition-all outline-none" 
        placeholder={placeholder} 
      />
    </div>
  );
}
