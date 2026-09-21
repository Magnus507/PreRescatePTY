"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Baby,
  BriefcaseBusiness,
  Cat,
  Crown,
  FileText,
  HeartHandshake,
  Info,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BLOOD_TYPES } from "@/lib/constants";
import { BirthDatePicker } from "@/components/ui/BirthDatePicker";
import {
  EMPTY_ELDER_MODULE,
  EMPTY_MINOR_MODULE,
  EMPTY_PET_MODULE,
  EMPTY_SPECIAL_NEEDS_MODULE,
  EMPTY_WORK_MODULE,
  type ElderModuleData,
  type MinorModuleData,
  type PetModuleData,
  type SpecialNeedsModuleData,
  type WorkModuleData,
} from "@/lib/profile-context-modules";

type ProfileFormValue =
  | string
  | boolean
  | MinorModuleData
  | ElderModuleData
  | SpecialNeedsModuleData
  | PetModuleData
  | WorkModuleData;

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
    address?: string;
    city?: string;

    minorModuleEnabled?: boolean;
    minorModuleData?: MinorModuleData;
    elderModuleEnabled?: boolean;
    elderModuleData?: ElderModuleData;
    specialNeedsModuleEnabled?: boolean;
    specialNeedsModuleData?: SpecialNeedsModuleData;
    petModuleEnabled?: boolean;
    petModuleData?: PetModuleData;
    workModuleEnabled?: boolean;
    workModuleData?: WorkModuleData;
  };
  onChange: (field: string, value: ProfileFormValue) => void;
  disabled?: boolean;
}

type OptionalTab = "minor" | "elder" | "special" | "pet" | "work" | "insurance";
type TabTone = "blue" | "amber" | "violet" | "teal" | "slate" | "emerald";

const OPTIONAL_TABS: Array<{
  id: OptionalTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  tone: TabTone;
}> = [
  {
    id: "minor",
    label: "Niños menores",
    shortLabel: "Menores",
    description: "Responsable, escuela, pediatra e instrucciones de entrega segura.",
    icon: Baby,
    tone: "blue",
  },
  {
    id: "elder",
    label: "Ancianos",
    shortLabel: "Ancianos",
    description: "Cuidador, movilidad, memoria y apoyo de retorno seguro.",
    icon: Crown,
    tone: "amber",
  },
  {
    id: "special",
    label: "Necesidades de apoyo",
    shortLabel: "Apoyo",
    description: "Comunicación, regulación sensorial, movilidad y apoyos de emergencia.",
    icon: HeartHandshake,
    tone: "violet",
  },
  {
    id: "pet",
    label: "Mascotas",
    shortLabel: "Mascotas",
    description: "Mascota o animal de asistencia, veterinario y cuidados importantes.",
    icon: Cat,
    tone: "teal",
  },
  {
    id: "work",
    label: "Laboral",
    shortLabel: "Laboral",
    description: "Lugar de trabajo, contacto responsable y notas de seguridad.",
    icon: BriefcaseBusiness,
    tone: "slate",
  },
  {
    id: "insurance",
    label: "Seguro privado",
    shortLabel: "Seguro",
    description: "Aseguradora, hospital preferido, médico tratante y contactos de asistencia.",
    icon: ShieldCheck,
    tone: "emerald",
  },
];

const TAB_TONE_STYLES: Record<TabTone, {
  panel: string;
  icon: string;
  eyebrow: string;
  glow: string;
}> = {
  blue: {
    panel: "border-blue-200 bg-blue-50/45",
    icon: "bg-blue-600 text-white",
    eyebrow: "text-blue-700",
    glow: "bg-blue-400/20",
  },
  amber: {
    panel: "border-amber-200 bg-amber-50/50",
    icon: "bg-amber-500 text-white",
    eyebrow: "text-amber-700",
    glow: "bg-amber-400/20",
  },
  violet: {
    panel: "border-violet-200 bg-violet-50/50",
    icon: "bg-violet-600 text-white",
    eyebrow: "text-violet-700",
    glow: "bg-violet-400/20",
  },
  teal: {
    panel: "border-teal-200 bg-teal-50/50",
    icon: "bg-teal-600 text-white",
    eyebrow: "text-teal-700",
    glow: "bg-teal-400/20",
  },
  slate: {
    panel: "border-slate-200 bg-slate-50/80",
    icon: "bg-slate-800 text-white",
    eyebrow: "text-slate-700",
    glow: "bg-slate-400/20",
  },
  emerald: {
    panel: "border-emerald-200 bg-emerald-50/50",
    icon: "bg-emerald-600 text-white",
    eyebrow: "text-emerald-700",
    glow: "bg-emerald-400/20",
  },
};

export function MedicalProfileForm({ form, onChange, disabled = false }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState<OptionalTab>("minor");
  const reduceMotion = useReducedMotion();
  const activeTabLayoutId = React.useId();

  const update = (field: string, value: ProfileFormValue) => onChange(field, value);

  const age = useMemo(() => {
    if (!form.birthDate) return null;
    const birthDate = new Date(form.birthDate);
    if (Number.isNaN(birthDate.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birthDate.getFullYear();
    const monthDelta = now.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) years -= 1;
    return years;
  }, [form.birthDate]);

  const moduleEnabled = {
    minor: form.minorModuleEnabled === true,
    elder: form.elderModuleEnabled === true,
    special: form.specialNeedsModuleEnabled === true,
    pet: form.petModuleEnabled === true,
    work: form.workModuleEnabled === true,
    insurance: form.isInsured === true,
  } satisfies Record<OptionalTab, boolean>;

  const enabledCount = Object.values(moduleEnabled).filter(Boolean).length;
  const minorData = form.minorModuleData ?? EMPTY_MINOR_MODULE;
  const elderData = form.elderModuleData ?? EMPTY_ELDER_MODULE;
  const specialNeedsData = form.specialNeedsModuleData ?? EMPTY_SPECIAL_NEEDS_MODULE;
  const petData = form.petModuleData ?? EMPTY_PET_MODULE;
  const workData = form.workModuleData ?? EMPTY_WORK_MODULE;

  const setModuleEnabled = (tab: OptionalTab, enabled: boolean) => {
    if (tab === "insurance") {
      update("isInsured", enabled);
      if (!enabled) {
        update("showInsuranceProviderPublic", false);
        update("showPreferredHospitalPublic", false);
        update("showPrimaryDoctorPublic", false);
        update("showPrimaryDoctorPhonePublic", false);
      }
      return;
    }

    const map: Record<Exclude<OptionalTab, "insurance">, string> = {
      minor: "minorModuleEnabled",
      elder: "elderModuleEnabled",
      special: "specialNeedsModuleEnabled",
      pet: "petModuleEnabled",
      work: "workModuleEnabled",
    };
    update(map[tab], enabled);

    if (tab === "elder") {
      update("showVulnerabilityStatusPublic", enabled);
      if (!enabled) {
        update("showSafeReturnPublic", false);
      } else if ((form.safeReturnInstructions || "").trim()) {
        update("showSafeReturnPublic", true);
      }
    }
    if (tab === "special") {
      update("showCommunicationStatusPublic", enabled);
    }
  };

  const updateModuleField = (
    moduleField: string,
    data: Record<string, unknown>,
    key: string,
    value: string | boolean,
  ) => {
    update(moduleField, { ...data, [key]: value } as ProfileFormValue);
  };

  return (
    <div className={`space-y-5 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <section className="overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-[0_24px_64px_-46px_rgba(15,23,42,.35)]">
        <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(218,26,33,.07),transparent_35%),linear-gradient(180deg,#fff,#fbfcfe)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 text-white shadow-[0_12px_30px_-22px_rgba(15,23,42,.6)]">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#DA1A21]">Siempre visible</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">Información básica</h2>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                Lo esencial de la ficha médica va primero. Nombre, sangre, alergias, condiciones y medicamentos deben poder leerse de un vistazo.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre *" value={form.firstName} onChange={(v) => update("firstName", v)} required placeholder="Juan" />
            <Field label="Apellido *" value={form.lastName} onChange={(v) => update("lastName", v)} required placeholder="Pérez" />
            <Field label="Alias público" value={form.displayNamePublic} onChange={(v) => update("displayNamePublic", v)} placeholder="Ej: Juan P." />
            <Field label="Teléfono de contacto" value={form.phone || ""} onChange={(v) => update("phone", v)} placeholder="+507 0000-0000" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Tipo de sangre *"
              value={form.bloodType}
              onChange={(v) => update("bloodType", v)}
              options={BLOOD_TYPES.map((value) => ({ value, label: value }))}
              required
            />
            <SelectField
              label="Sexo"
              value={form.sex}
              onChange={(v) => update("sex", v)}
              options={[
                { value: "", label: "No definido" },
                { value: "M", label: "Masculino" },
                { value: "F", label: "Femenino" },
                { value: "Otro", label: "Otro" },
              ]}
            />
          </div>

          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Fecha de nacimiento</p>
              {age !== null && (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700">
                  {age < 18 ? `${age} años · menor` : `${age} años`}
                </span>
              )}
            </div>
            <BirthDatePicker label="" value={form.birthDate} onChange={(v) => update("birthDate", v)} />
          </div>

          <Field label="Cédula / identificación" value={form.nationalId || ""} onChange={(v) => update("nationalId", v)} placeholder="Opcional" />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <TextAreaField
              icon={<Activity className="h-4 w-4" />}
              label="Alergias"
              value={form.allergies}
              onChange={(v) => update("allergies", v)}
              placeholder="Ej: Penicilina, maní..."
              tone="red"
            />
            <TextAreaField
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Condiciones"
              value={form.chronicConditions}
              onChange={(v) => update("chronicConditions", v)}
              placeholder="Ej: Diabetes, asma..."
              tone="amber"
            />
            <TextAreaField
              icon={<Pill className="h-4 w-4" />}
              label="Medicamentos"
              value={form.medications}
              onChange={(v) => update("medications", v)}
              placeholder="Ej: Insulina..."
              tone="blue"
            />
          </div>

          <TextAreaField
            icon={<FileText className="h-4 w-4" />}
            label="Notas críticas e instrucciones generales"
            value={form.additionalNotes}
            onChange={(v) => update("additionalNotes", v)}
            placeholder="Indicaciones generales que ayuden durante una emergencia."
            tone="slate"
          />
          <CompactCheck
            label="Mostrar estas notas en la ficha pública"
            checked={form.showAdditionalNotesPublic}
            onChange={(v) => update("showAdditionalNotesPublic", v)}
          />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.8rem] border border-slate-800/80 bg-[#07111f] shadow-[0_32px_90px_-46px_rgba(2,8,23,.7)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#DA1A21]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-4 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/70 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-red-400" />
                Módulos personalizados
              </div>
              <h2 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] text-white sm:text-2xl">
                Activa solo lo que aplica a este perfil
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs font-medium leading-5 text-slate-300 sm:text-sm">
                La información básica siempre permanece primero. Estos módulos aparecen únicamente cuando los activas.
              </p>
            </div>
            <div className="shrink-0 rounded-[1rem] border border-white/10 bg-white/[0.07] px-3 py-2 text-center backdrop-blur">
              <p className="text-lg font-black leading-none text-white">{enabledCount}</p>
              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">de 6 activos</p>
            </div>
          </div>

          <div role="tablist" aria-label="Módulos opcionales del perfil" className="mt-5 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {OPTIONAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              const enabled = moduleEnabled[tab.id];
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`profile-module-${tab.id}`}
                  id={`profile-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  className={`relative isolate flex min-h-12 shrink-0 items-center gap-2.5 overflow-hidden rounded-[1rem] border px-3.5 py-2.5 text-[11px] font-black transition-colors sm:px-4 sm:text-xs ${
                    selected
                      ? "border-white/20 text-slate-950"
                      : "border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId={`medical-profile-active-tab-${activeTabLayoutId}`}
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 38 }}
                      className="absolute inset-0 -z-10 rounded-[.95rem] bg-white shadow-[0_14px_30px_-18px_rgba(255,255,255,.7)]"
                    />
                  )}
                  <Icon className={`h-4 w-4 ${selected ? "text-[#DA1A21]" : "text-current"}`} />
                  <span className="whitespace-nowrap">{tab.shortLabel}</span>
                  <span className={`h-2 w-2 rounded-full transition ${
                    enabled ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.12)]" : selected ? "bg-slate-300" : "bg-white/20"
                  }`} />
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="relative bg-white">
          <AnimatePresence mode="wait" initial={false}>
            {OPTIONAL_TABS.map((tab) => {
              if (activeTab !== tab.id) return null;
              const Icon = tab.icon;
              const enabled = moduleEnabled[tab.id];
              const tone = TAB_TONE_STYLES[tab.tone];

              return (
                <motion.div
                  key={tab.id}
                  id={`profile-module-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`profile-tab-${tab.id}`}
                  tabIndex={0}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
                  className="relative p-4 outline-none sm:p-6"
                >
                  <div className={`pointer-events-none absolute right-2 top-2 h-28 w-28 rounded-full blur-3xl ${tone.glow}`} />
                  <div className={`relative overflow-hidden rounded-[1.4rem] border p-4 sm:p-5 ${enabled ? tone.panel : "border-slate-200 bg-slate-50/70"}`}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                    <div className="flex items-start gap-3">
                      <motion.div
                        animate={reduceMotion ? undefined : { scale: enabled ? [1, 1.05, 1] : 1 }}
                        transition={{ duration: 0.32 }}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] shadow-[0_12px_30px_-22px_rgba(15,23,42,.55)] ${
                          enabled ? tone.icon : "bg-white text-slate-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${enabled ? tone.eyebrow : "text-slate-400"}`}>
                              {enabled ? "Módulo activo" : "Módulo opcional"}
                            </p>
                            <h3 className="mt-1 text-base font-black tracking-[-0.02em] text-slate-950 sm:text-lg">{tab.label}</h3>
                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{tab.description}</p>
                          </div>
                          <ModuleActivation
                            label={`Activar ${tab.label}`}
                            checked={enabled}
                            onChange={(checked) => setModuleEnabled(tab.id, checked)}
                          />
                        </div>
                      </div>
                    </div>

                    {!enabled ? (
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 rounded-[1rem] border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-xs font-medium leading-5 text-slate-500"
                      >
                        Está desactivado. Actívalo para completar esta información y permitir que forme parte de la ficha cuando corresponda.
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, delay: 0.04 }}
                        className="mt-5"
                      >
                        {tab.id === "minor" && (
                          <MinorFields
                            data={minorData}
                            onChange={(key, value) => updateModuleField("minorModuleData", minorData as unknown as Record<string, unknown>, key as string, value)}
                          />
                        )}
                        {tab.id === "elder" && (
                          <ElderFields
                            data={elderData}
                            onChange={(key, value) => updateModuleField("elderModuleData", elderData as unknown as Record<string, unknown>, key as string, value)}
                            legacy={{
                              hasCognitiveImpairment: form.hasCognitiveImpairment ?? false,
                              hasWanderingRisk: form.hasWanderingRisk ?? false,
                              safeReturnInstructions: form.safeReturnInstructions || "",
                            }}
                            onLegacyChange={update}
                          />
                        )}
                        {tab.id === "special" && (
                          <SpecialNeedsFields
                            data={specialNeedsData}
                            onChange={(key, value) => updateModuleField("specialNeedsModuleData", specialNeedsData as unknown as Record<string, unknown>, key as string, value)}
                            isNonVerbal={form.isNonVerbal ?? false}
                            communicationAssistance={form.communicationAssistance || ""}
                            onLegacyChange={update}
                          />
                        )}
                        {tab.id === "pet" && (
                          <PetFields
                            data={petData}
                            onChange={(key, value) => updateModuleField("petModuleData", petData as unknown as Record<string, unknown>, key as string, value)}
                          />
                        )}
                        {tab.id === "work" && (
                          <WorkFields
                            data={workData}
                            onChange={(key, value) => updateModuleField("workModuleData", workData as unknown as Record<string, unknown>, key as string, value)}
                          />
                        )}
                        {tab.id === "insurance" && (
                          <InsuranceFields form={form} onChange={update} />
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-[1.1rem] border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium leading-5 text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Los contactos de emergencia se administran desde la tarjeta del perfil. Los módulos opcionales complementan la ficha; no reemplazan la información médica básica.</span>
      </div>
    </div>
  );
}

function MinorFields({ data, onChange }: { data: MinorModuleData; onChange: (key: keyof MinorModuleData, value: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Responsable / tutor" value={data.guardianName} onChange={(v) => onChange("guardianName", v)} placeholder="Nombre completo" />
      <Field label="Teléfono del tutor" value={data.guardianPhone} onChange={(v) => onChange("guardianPhone", v)} placeholder="+507..." />
      <Field label="Escuela / guardería" value={data.schoolName} onChange={(v) => onChange("schoolName", v)} placeholder="Opcional" />
      <Field label="Teléfono de la escuela" value={data.schoolPhone} onChange={(v) => onChange("schoolPhone", v)} placeholder="+507..." />
      <Field label="Pediatra" value={data.pediatricianName} onChange={(v) => onChange("pediatricianName", v)} placeholder="Nombre" />
      <Field label="Teléfono del pediatra" value={data.pediatricianPhone} onChange={(v) => onChange("pediatricianPhone", v)} placeholder="+507..." />
      <div className="sm:col-span-2">
        <PlainTextArea label="Entrega / recogida segura" value={data.pickupNotes} onChange={(v) => onChange("pickupNotes", v)} placeholder="Quién puede retirarlo, instrucciones especiales o punto seguro." />
      </div>
    </div>
  );
}

function ElderFields({
  data,
  onChange,
  legacy,
  onLegacyChange,
}: {
  data: ElderModuleData;
  onChange: (key: keyof ElderModuleData, value: string) => void;
  legacy: { hasCognitiveImpairment: boolean; hasWanderingRisk: boolean; safeReturnInstructions: string };
  onLegacyChange: (field: string, value: ProfileFormValue) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Cuidador principal" value={data.caregiverName} onChange={(v) => onChange("caregiverName", v)} placeholder="Nombre completo" />
        <Field label="Teléfono del cuidador" value={data.caregiverPhone} onChange={(v) => onChange("caregiverPhone", v)} placeholder="+507..." />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlainTextArea label="Apoyo de movilidad" value={data.mobilitySupport} onChange={(v) => onChange("mobilitySupport", v)} placeholder="Bastón, silla de ruedas, ayuda al caminar..." />
        <PlainTextArea label="Apoyo de memoria" value={data.memorySupport} onChange={(v) => onChange("memorySupport", v)} placeholder="Rutinas, orientación, información que ayuda a tranquilizar." />
      </div>
      <PlainTextArea label="Cuidados diarios importantes" value={data.dailyCareNotes} onChange={(v) => onChange("dailyCareNotes", v)} placeholder="Indicaciones de cuidado que pueden ser útiles en una emergencia." />

      <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50/70 p-3.5">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[.14em] text-amber-700">Apoyo cognitivo y retorno</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CompactCheck label="Deterioro cognitivo reportado" checked={legacy.hasCognitiveImpairment} onChange={(v) => onLegacyChange("hasCognitiveImpairment", v)} />
          <CompactCheck label="Riesgo de desorientación" checked={legacy.hasWanderingRisk} onChange={(v) => onLegacyChange("hasWanderingRisk", v)} />
        </div>
        <div className="mt-3">
          <PlainTextArea
            label="Instrucciones de retorno seguro"
            value={legacy.safeReturnInstructions}
            onChange={(v) => {
              onLegacyChange("safeReturnInstructions", v);
              onLegacyChange("showSafeReturnPublic", Boolean(v.trim()));
            }}
            placeholder="Qué hacer y a quién contactar si la persona se desorienta."
          />
        </div>
      </div>
    </div>
  );
}

function SpecialNeedsFields({
  data,
  onChange,
  isNonVerbal,
  communicationAssistance,
  onLegacyChange,
}: {
  data: SpecialNeedsModuleData;
  onChange: (key: keyof SpecialNeedsModuleData, value: string) => void;
  isNonVerbal: boolean;
  communicationAssistance: string;
  onLegacyChange: (field: string, value: ProfileFormValue) => void;
}) {
  return (
    <div className="space-y-4">
      <PlainTextArea label="Condición / necesidad de apoyo" value={data.conditionSummary} onChange={(v) => onChange("conditionSummary", v)} placeholder="Describe solo lo necesario para ayudar correctamente." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlainTextArea label="Método de comunicación" value={data.communicationMethod} onChange={(v) => onChange("communicationMethod", v)} placeholder="Pictogramas, gestos, frases cortas..." />
        <PlainTextArea label="Sensibilidades o desencadenantes" value={data.sensoryTriggers} onChange={(v) => onChange("sensoryTriggers", v)} placeholder="Ruido, luces, contacto físico..." />
        <PlainTextArea label="Estrategias para calmar" value={data.calmingStrategies} onChange={(v) => onChange("calmingStrategies", v)} placeholder="Qué suele ayudar." />
        <PlainTextArea label="Apoyo de movilidad" value={data.mobilitySupport} onChange={(v) => onChange("mobilitySupport", v)} placeholder="Si aplica." />
      </div>
      <PlainTextArea label="Notas de emergencia" value={data.emergencyNotes} onChange={(v) => onChange("emergencyNotes", v)} placeholder="Indicaciones concretas para quien preste ayuda." />

      <div className="rounded-[1.1rem] border border-violet-200 bg-violet-50/65 p-3.5">
        <CompactCheck label="Persona no verbal / comunicación asistida" checked={isNonVerbal} onChange={(v) => onLegacyChange("isNonVerbal", v)} />
        <div className="mt-3">
          <PlainTextArea
            label="Cómo comunicarse"
            value={communicationAssistance}
            onChange={(v) => {
              onLegacyChange("communicationAssistance", v);
              onLegacyChange("showCommunicationStatusPublic", Boolean(v.trim()) || isNonVerbal);
            }}
            placeholder="Ej: hablar despacio, usar pictogramas, evitar contacto inesperado."
          />
        </div>
      </div>
    </div>
  );
}

function PetFields({ data, onChange }: { data: PetModuleData; onChange: (key: keyof PetModuleData, value: string | boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre de la mascota" value={data.petName} onChange={(v) => onChange("petName", v)} placeholder="Ej: Luna" />
        <Field label="Especie" value={data.species} onChange={(v) => onChange("species", v)} placeholder="Perro, gato..." />
        <Field label="Raza" value={data.breed} onChange={(v) => onChange("breed", v)} placeholder="Opcional" />
        <Field label="Color / identificación" value={data.color} onChange={(v) => onChange("color", v)} placeholder="Opcional" />
        <Field label="Veterinario" value={data.veterinarianName} onChange={(v) => onChange("veterinarianName", v)} placeholder="Nombre o clínica" />
        <Field label="Teléfono veterinario" value={data.veterinarianPhone} onChange={(v) => onChange("veterinarianPhone", v)} placeholder="+507..." />
      </div>
      <CompactCheck label="Es animal de asistencia / servicio" checked={data.isServiceAnimal} onChange={(v) => onChange("isServiceAnimal", v)} />
      <PlainTextArea label="Cuidados importantes" value={data.careNotes} onChange={(v) => onChange("careNotes", v)} placeholder="Medicamentos, alimentación o instrucciones de cuidado." />
    </div>
  );
}

function WorkFields({ data, onChange }: { data: WorkModuleData; onChange: (key: keyof WorkModuleData, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Empresa / empleador" value={data.employerName} onChange={(v) => onChange("employerName", v)} placeholder="Nombre" />
        <Field label="Cargo / función" value={data.role} onChange={(v) => onChange("role", v)} placeholder="Opcional" />
        <Field label="Lugar de trabajo" value={data.workSite} onChange={(v) => onChange("workSite", v)} placeholder="Sede, planta o área" />
        <Field label="Responsable / supervisor" value={data.supervisorName} onChange={(v) => onChange("supervisorName", v)} placeholder="Nombre" />
        <Field label="Teléfono laboral de emergencia" value={data.supervisorPhone} onChange={(v) => onChange("supervisorPhone", v)} placeholder="+507..." />
      </div>
      <PlainTextArea label="Notas de seguridad laboral" value={data.safetyNotes} onChange={(v) => onChange("safetyNotes", v)} placeholder="Riesgos, EPP, procedimientos o información útil en caso de emergencia." />
    </div>
  );
}

function InsuranceFields({
  form,
  onChange,
}: {
  form: ProfileFormProps["form"];
  onChange: (field: string, value: ProfileFormValue) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Aseguradora" value={form.insuranceProvider || ""} onChange={(v) => onChange("insuranceProvider", v)} placeholder="Ej: ASSA, MAPFRE, Blue Cross" />
        <Field label="Número de póliza" value={form.insurancePolicyNumber || ""} onChange={(v) => onChange("insurancePolicyNumber", v)} placeholder="Dato privado" />
        <Field label="Hospital preferido" value={form.preferredHospital || ""} onChange={(v) => onChange("preferredHospital", v)} placeholder="Ej: Hospital Nacional" />
        <Field label="Teléfono de asistencia del seguro" value={form.insuranceEmergencyPhone || ""} onChange={(v) => onChange("insuranceEmergencyPhone", v)} placeholder="+507..." />
        <Field label="Médico tratante" value={form.primaryDoctorName || ""} onChange={(v) => onChange("primaryDoctorName", v)} placeholder="Opcional" />
        <Field label="Teléfono del médico" value={form.primaryDoctorPhone || ""} onChange={(v) => onChange("primaryDoctorPhone", v)} placeholder="+507..." />
      </div>

      <div className="rounded-[1.1rem] border border-emerald-200 bg-white/80 p-3.5">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">Qué puede aparecer en la ficha pública</p>
            <p className="mt-0.5 text-[11px] font-medium leading-5 text-slate-500">
              Tú eliges qué mostrar. El número de póliza permanece privado y no se publica.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CompactCheck label="Mostrar aseguradora" checked={form.showInsuranceProviderPublic} onChange={(v) => onChange("showInsuranceProviderPublic", v)} />
          <CompactCheck label="Mostrar hospital preferido" checked={form.showPreferredHospitalPublic} onChange={(v) => onChange("showPreferredHospitalPublic", v)} />
          <CompactCheck label="Mostrar médico tratante" checked={form.showPrimaryDoctorPublic} onChange={(v) => onChange("showPrimaryDoctorPublic", v)} />
          <CompactCheck label="Mostrar teléfono del médico" checked={form.showPrimaryDoctorPhonePublic} onChange={(v) => onChange("showPrimaryDoctorPhonePublic", v)} />
        </div>
      </div>
    </div>
  );
}

function ModuleActivation({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = React.useId();
  const reduceMotion = useReducedMotion();

  return (
    <label
      htmlFor={id}
      className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-full border px-3 py-2 shadow-sm transition-colors ${
        checked
          ? "border-emerald-300 bg-emerald-600 text-white shadow-emerald-500/20"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-[.09em]">{checked ? "Activado" : "Activar"}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-white/25" : "bg-slate-200"}`}>
        <motion.span
          aria-hidden="true"
          animate={{ x: checked ? 21 : 3 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 32 }}
          className={`absolute top-1 h-4 w-4 rounded-full shadow-[0_3px_10px_rgba(15,23,42,.22)] ${
            checked ? "bg-white" : "bg-slate-500"
          }`}
        />
      </span>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </label>
  );
}

function CompactCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5">
      <span className="text-xs font-bold leading-5 text-slate-700">{label}</span>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#DA1A21]" />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="ml-1 text-[10px] font-black uppercase tracking-[.11em] text-slate-500">{label}</label>
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70 sm:text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="ml-1 text-[10px] font-black uppercase tracking-[.11em] text-slate-500">{label}</label>
      <select
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5 text-base font-bold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70 sm:text-sm"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function PlainTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="ml-1 text-[10px] font-black uppercase tracking-[.11em] text-slate-500">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="min-h-24 w-full resize-y rounded-[1rem] border border-slate-200 bg-white px-3.5 py-3 text-base font-medium leading-6 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70 sm:text-sm"
      />
    </div>
  );
}

function TextAreaField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  tone: "red" | "amber" | "blue" | "slate";
}) {
  const palette = {
    red: "text-red-700 bg-red-50 border-red-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    slate: "text-slate-700 bg-slate-50 border-slate-200",
  }[tone];
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      <div className="ml-1 flex items-center gap-2">
        <span className={palette.split(" ")[0]}>{icon}</span>
        <label htmlFor={id} className={`text-[10px] font-black uppercase tracking-[.11em] ${palette.split(" ")[0]}`}>{label}</label>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className={`min-h-24 w-full resize-y rounded-[1rem] border px-3.5 py-3 text-base font-medium leading-6 text-slate-900 outline-none transition focus:ring-4 focus:ring-blue-100/70 sm:text-sm ${palette}`}
      />
    </div>
  );
}
