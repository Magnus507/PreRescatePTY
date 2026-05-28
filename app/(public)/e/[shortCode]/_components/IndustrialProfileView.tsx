"use client";

import { 
  Phone, ShieldAlert, Activity, 
  User, ShieldCheck, Building2, MapPin, 
  Droplets, MessageCircle, Zap
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
  const hasExtras = !!(
    extras?.insuranceProvider ||
    extras?.preferredHospital ||
    extras?.primaryDoctorName ||
    extras?.primaryDoctorPhone ||
    extras?.emergencyInstructions
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Warning Banner */}
      <div className="bg-[#DA1A21] py-3 px-6 flex items-center justify-center gap-3 animate-pulse">
        <ShieldAlert className="h-5 w-5 text-white" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Protocolo de Emergencia Industrial Activo</span>
      </div>

      <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Corporate Header Card */}
        <div className="bg-slate-800 rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
            <div className="relative">
              <div className="h-32 w-32 rounded-[2rem] bg-slate-700 border-4 border-slate-600 flex items-center justify-center overflow-hidden shadow-2xl">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-16 w-16 text-slate-500" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-slate-800">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <Building2 className="h-3 w-3" /> {org.name}
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                {profile.firstName} <br />
                <span className="text-emerald-400">{profile.lastName}</span>
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{org.location || "Sede Central"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Área / Dept</p>
            <p className="font-black text-sm uppercase text-slate-300">{org.department || "Operaciones"}</p>
          </div>
        </div>

        {/* Industrial Action Grid */}
        <div className="space-y-4">
          <div className="md:hidden bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-white mb-3">Resumen Médico Crítico</h3>
            <div className="space-y-2.5">
              <CompactMedicalRow
                icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
                label="Alergias"
                value={profile.allergies || "No reportado"}
                tone="red"
              />
              <CompactMedicalRow
                icon={<Activity className="h-4 w-4 text-blue-400" />}
                label="Condiciones"
                value={profile.chronicConditions || "No reportado"}
                tone="blue"
              />
              <CompactMedicalRow
                icon={<Zap className="h-4 w-4 text-emerald-400" />}
                label="Medicamentos"
                value={profile.medications || "No reportado"}
                tone="emerald"
              />
            </div>
          </div>

          <div className="hidden md:grid grid-cols-1 gap-6">
            {/* RED: ALERGIAS CRÍTICAS */}
            <div className="bg-red-500/10 border-2 border-red-500/20 rounded-[2.5rem] p-8 overflow-hidden relative group transition-all hover:bg-red-500/20">
              <div className="absolute top-4 right-6 opacity-20 group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-12 w-12 text-red-500" />
              </div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Zap className="h-3 w-3 fill-current" /> Alergias Críticas
              </p>
              <p className="text-2xl font-black text-white leading-tight uppercase">
                {profile.allergies || "Ninguna Reportada"}
              </p>
            </div>

            {/* BLUE: CONDICIONES MÉDICAS */}
            <div className="bg-blue-500/10 border-2 border-blue-500/20 rounded-[2.5rem] p-8 overflow-hidden relative group transition-all hover:bg-blue-500/20">
              <div className="absolute top-4 right-6 opacity-20 group-hover:scale-110 transition-transform">
                <Activity className="h-12 w-12 text-blue-500" />
              </div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Droplets className="h-3 w-3 fill-current" /> Condiciones / Sangre
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 opacity-60">TIPO SANGRE</p>
                  <p className="text-3xl font-black text-white">{profile.bloodType}</p>
                </div>
                <div className="h-12 w-[1px] bg-blue-500/30" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 opacity-60">DIAGNÓSTICO</p>
                  <p className="text-xl font-black text-white uppercase">{profile.chronicConditions || "Estable"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasExtras && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-[2rem] p-5 md:p-6 space-y-4">
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
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
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
                          <p className="text-sm font-black text-white uppercase leading-none mb-1">{contact.fullName}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{contact.relationship}</p>
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
