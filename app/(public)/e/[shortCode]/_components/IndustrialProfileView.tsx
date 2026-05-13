"use client";

import { 
  Phone, ShieldAlert, AlertTriangle, Activity, 
  User, ShieldCheck, Building2, MapPin, 
  Clock, HardHat, Pill, Droplets, Info,
  MessageCircle, Zap, Construction, Shield
} from "lucide-react";

interface IndustrialProfileViewProps {
  profile: any;
}

export function IndustrialProfileView({ profile }: IndustrialProfileViewProps) {
  const org = profile.organization;

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
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{org.shift || "Turno Rotativo"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{org.location || "Sede Central"}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Employee ID Badge */}
          <div className="mt-8 pt-6 border-t border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">ID Empleado</p>
              <p className="font-mono text-xl font-black text-slate-300">{org.employeeId || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Área / Dept</p>
              <p className="font-black text-sm uppercase text-slate-300">{org.department || "Operaciones"}</p>
            </div>
          </div>
        </div>

        {/* Industrial Action Grid */}
        <div className="grid grid-cols-1 gap-6">
          
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

          {/* YELLOW: RIESGO OPERACIONAL */}
          <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-[2.5rem] p-8 overflow-hidden relative group transition-all hover:bg-amber-500/20">
             <div className="absolute top-4 right-6 opacity-20 group-hover:scale-110 transition-transform">
              <Construction className="h-12 w-12 text-amber-500" />
            </div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 fill-current" /> Riesgo Operacional (HSE)
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {org.occupationalRisks && org.occupationalRisks.length > 0 ? (
                org.occupationalRisks.map((risk: string, i: number) => (
                  <span key={i} className="px-4 py-2 bg-amber-500 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    ⚠️ {risk}
                  </span>
                ))
              ) : (
                <span className="px-4 py-2 bg-slate-700 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Sin riesgos declarados
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-amber-400/80 uppercase tracking-widest leading-relaxed">
              RESTRICCIÓN: <span className="text-white">{org.medicalRestrictions || "Ninguna"}</span>
            </p>
          </div>

          {/* GREEN: PROTOCOLO DE RESPUESTA */}
          <div className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[2.5rem] p-8 overflow-hidden relative group transition-all hover:bg-emerald-500/20">
             <div className="absolute top-4 right-6 opacity-20 group-hover:scale-110 transition-transform">
              <Shield className="h-12 w-12 text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 fill-current" /> Protocolo de Respuesta
            </p>
            <p className="text-lg font-black text-white uppercase italic leading-tight">
              {org.emergencyProtocol || "En caso de accidente → activar brigada interna inmediatamente."}
            </p>
          </div>

        </div>

        {/* Corporate Emergency Buttons */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-6">Contactos de Respuesta Interna</p>
          <div className="grid grid-cols-1 gap-3">
            {org.emergencyButtons && org.emergencyButtons.map((btn: any, i: number) => (
              <a
                key={i}
                href={`tel:${btn.phone}`}
                className="w-full flex items-center justify-between p-6 rounded-3xl bg-slate-800 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-700/50 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Phone className="h-6 w-6 fill-current" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Personal Autorizado</p>
                    <p className="text-xl font-black text-white uppercase tracking-tighter">{btn.label}</p>
                  </div>
                </div>
                <div className="text-slate-500 group-hover:text-emerald-500 transition-colors">
                   <Phone className="h-5 w-5" />
                </div>
              </a>
            ))}
            
            {/* Direct Personal Contacts Toggle or List */}
            <div className="pt-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-6">Familiares / Contactos Personales</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.emergencyContacts.map((contact: any, i: number) => (
                  <a
                    key={i}
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 transition-all"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-700 text-slate-400 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase leading-none mb-1">{contact.fullName}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{contact.relationship}</p>
                    </div>
                  </a>
                ))}
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
