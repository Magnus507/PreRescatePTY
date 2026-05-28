"use client";

import { 
  Phone, ShieldAlert, Activity,
  User, ShieldCheck, Building2, MapPin,
  Droplets, MessageCircle, Zap, Calendar, Pill
} from "lucide-react";

interface IndustrialProfileViewProps {
  profile: any;
  scanLocation?: string;
}

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

export function IndustrialProfileView({ profile, scanLocation = "" }: IndustrialProfileViewProps) {
  const org = profile.organization;
  const personName = `${profile.firstName} ${profile.lastName}`.trim() || profile.displayName;
  const extras = profile.publicMedicalExtras;
  const ageLabel = profile.age ?? "No reportado";
  const sexLabel = profile.sex === "M" ? "Masculino" : profile.sex === "F" ? "Femenino" : "No reportado";
  const bloodLabel = profile.bloodType || "No reportado";
  const allergiesLabel = profile.allergies || "No reportado";
  const conditionsLabel = profile.chronicConditions || "No reportado";
  const medicationsLabel = profile.medications || "No reportado";
  const hasExtras = !!(
    extras?.insuranceProvider ||
    extras?.preferredHospital ||
    extras?.primaryDoctorName ||
    extras?.primaryDoctorPhone ||
    extras?.emergencyInstructions
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-100 selection:text-red-900">
      {/* Top Warning Banner */}
      <div className="bg-[#DA1A21] py-3 px-6 flex items-center justify-center gap-3">
        <ShieldAlert className="h-5 w-5 text-white" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Protocolo de Emergencia Industrial Activo</span>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Compact Hero */}
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-xl p-5 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 text-center md:text-left">
            <div className="relative">
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-[1.8rem] bg-slate-100 border-4 border-slate-200 flex items-center justify-center overflow-hidden shadow-lg">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-14 w-14 text-slate-400" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                <Building2 className="h-3 w-3" /> {org.name}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none text-slate-900">
                {profile.firstName} <br />
                <span className="text-[#DA1A21]">{profile.lastName}</span>
              </h1>
              {profile.displayName && profile.displayName !== `${profile.firstName} ${profile.lastName}` && (
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Alias: {profile.displayName}</p>
              )}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{org.location || "Sede Central"}</span>
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">{org.department || "Operaciones"}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
              <Droplets className="h-5 w-5 text-red-600" />
              <p className="text-sm font-black uppercase tracking-tight">Sangre: {bloodLabel}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl">
              <Calendar className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-black uppercase tracking-tight">Edad: {ageLabel}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl">
              <User className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-black uppercase tracking-tight">Sexo: {sexLabel}</p>
            </div>
          </div>
        </div>

        {/* Compact medical-first block */}
        <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] p-5 md:p-7 shadow-lg space-y-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Resumen médico crítico</h3>
          <div className="grid grid-cols-1 gap-3">
            <CompactMedicalRow icon={<ShieldAlert className="h-4 w-4 text-red-500" />} label="Alergias" value={allergiesLabel} tone="red" />
            <CompactMedicalRow icon={<Activity className="h-4 w-4 text-blue-500" />} label="Condiciones" value={conditionsLabel} tone="blue" />
            <CompactMedicalRow icon={<Pill className="h-4 w-4 text-emerald-500" />} label="Medicamentos" value={medicationsLabel} tone="emerald" />
          </div>
        </div>

        {hasExtras && (
          <div className="bg-slate-900 text-white border border-slate-800 rounded-[2rem] p-5 md:p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300">Información médica adicional</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {extras?.insuranceProvider && (
                <CompactItem label="Aseguradora" value={extras.insuranceProvider} />
              )}
              {extras?.preferredHospital && (
                <CompactItem label="Hospital preferido" value={extras.preferredHospital} />
              )}
              {extras?.primaryDoctorName && (
                <CompactItem label="Médico tratante" value={extras.primaryDoctorName} />
              )}
            </div>

            {extras?.primaryDoctorPhone && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-3 rounded-xl bg-slate-800 border border-slate-700">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teléfono del médico</p>
                  <p className="text-sm font-bold text-white">{extras.primaryDoctorPhone}</p>
                </div>
                <a
                  href={`tel:${sanitizeTelPhone(extras.primaryDoctorPhone)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                >
                  <Phone className="h-4 w-4" /> Llamar médico
                </a>
              </div>
            )}

            {extras?.emergencyInstructions && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">Instrucciones especiales</p>
                <p className="text-sm font-semibold text-amber-100">{extras.emergencyInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Manual Emergency Actions */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-6">Acciones Manuales de Emergencia</p>
          <div className="grid grid-cols-1 gap-3">
            <a
              href="tel:911"
              className="w-full flex items-center justify-between p-6 rounded-3xl bg-red-600 border border-red-500 hover:bg-red-700 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Phone className="h-6 w-6 fill-current" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-red-100 uppercase tracking-widest mb-1">Central de Urgencias</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">Llamar al 911</p>
                </div>
              </div>
              <Phone className="h-5 w-5 text-white/60" />
            </a>
            
            <div className="pt-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-6">Familiares / Contactos Personales</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.emergencyContacts.map((contact: any, i: number) => {
                  const contactPhone = sanitizeTelPhone(contact.phone);
                  const whatsappPhone = normalizeWhatsAppPhone(contact.phone);
                  const whatsappMessage = scanLocation
                    ? `Hola ${contact.fullName}, ${personName} tuvo un accidente. Fue escaneado en ${scanLocation}.`
                    : `Hola ${contact.fullName}, ${personName} tuvo un accidente. Fue escaneado desde su perfil de emergencia.`;
                  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;

                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-700 text-slate-400 flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                    <p className="text-sm font-black text-white uppercase leading-none mb-1">{contact.fullName || "No reportado"}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{contact.relationship || "No reportado"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${contactPhone}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                        >
                          <Phone className="h-4 w-4" /> Llamar
                        </a>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 pb-8 text-center">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">Sistema de Respuesta Industrial • Ley 81 Panamá</p>
        </div>

      </div>
    </div>
  );
}

function CompactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function CompactMedicalRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "red" | "blue" | "emerald";
}) {
  const toneClasses: Record<string, string> = {
    red: "bg-red-500/10 border-red-500/30",
    blue: "bg-blue-500/10 border-blue-500/30",
    emerald: "bg-emerald-500/10 border-emerald-500/30",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-300">{label}</p>
          <p className="text-sm font-semibold text-white break-words">{value || "No reportado"}</p>
        </div>
      </div>
    </div>
  );
}
