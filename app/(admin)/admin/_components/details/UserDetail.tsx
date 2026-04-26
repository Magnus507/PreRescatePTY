import React from 'react';
import { 
  ChevronLeft, Shield, Activity, ShieldCheck, ShieldOff, 
  RotateCcw, RefreshCw, Zap, Building2, ChevronRight, Mail, Phone,
  Calendar, Briefcase, GraduationCap, HeartPulse
} from 'lucide-react';
import { UserAdmin } from '../../_types/admin';

interface UserDetailProps {
  user: UserAdmin;
  onBack: () => void;
  onAction: (userId: string, action: string, data: any) => void;
  onRefresh: () => void;
  onViewInventory: (accountId: string) => void; // Added
  onOpenComboSelector: () => void; // Added
  formatDate: (d: string) => string;
}

export const UserDetailView: React.FC<UserDetailProps> = ({ 
  user, onBack, onAction, onRefresh, onViewInventory, onOpenComboSelector, formatDate 
}) => {
  // Safe Access
  const profile = user.profile;
  const account = user.account;
  const chipsCount = user.chips?.length || user._count?.chips || 0;
  const maxChips = account?.maxChipsAllocated || 0;
  
  const firstName = profile?.firstName || "";
  const lastName = profile?.lastName || "";
  const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : user.email;
  const initials = (firstName?.[0] || user.email?.[0] || "?").toUpperCase();

  // Status is Active if they have chips allocated.
  const isAccountActive = chipsCount > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 animate-in slide-in-from-right duration-500">
      <header className="border-b border-white bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Panel Usuarios
          </button>
          <div className="flex items-center gap-3">
             <div className={`h-2 w-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
             <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{user.email}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: User Profile */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
               <div className="flex flex-col md:flex-row gap-10 relative z-10">
                  <div className="relative">
                     <div className="h-32 w-32 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-2xl group-hover:rotate-3 transition-transform">
                        {initials}
                     </div>
                     <div className={`absolute -bottom-2 -right-2 h-10 w-10 ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'} rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg`}>
                        {user.status === 'active' ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                     </div>
                  </div>
                  <div className="flex-1 space-y-4">
                     <div>
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900">{fullName}</h2>
                        <div className="flex items-center gap-3 mt-2">
                           <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                             account?.accountType === 'company' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                             'bg-slate-50 text-slate-600 border-slate-100'
                           }`}>
                             {account?.accountType === 'company' ? <><Briefcase className="h-3 w-3 inline mr-1" /> Empresarial</> : 
                              "Individual / Familiar"}
                           </span>
                           <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Miembro desde {formatDate(user.createdAt)}</span>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Email Oficial</p>
                           <p className="font-bold text-slate-900 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-300" /> {user.email}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Teléfono</p>
                           <p className="font-bold text-slate-900 flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-300" /> {user.phone || profile?.phone || "No registrado"}
                           </p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Cédula / ID / DNI</p>
                           <p className="font-bold text-slate-900 flex items-center gap-2">
                              <HeartPulse className="h-4 w-4 text-slate-300" /> {profile?.nationalId || "No registrada"}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* LEGAL GOVERNANCE: Consent Check */}
            {user.consent?.some(c => c.revokedAt) && (
               <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 flex items-center gap-6 animate-pulse mb-6">
                  <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                     <ShieldOff className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Peligro Legal / Cumplimiento</p>
                     <p className="text-sm font-black text-red-900">CONSENTIMIENTO REVOCADO</p>
                  </div>
                  <p className="text-[10px] font-bold text-red-400 italic hidden md:block">Ley 81/ANTAI: Tratar con cuidado</p>
               </div>
            )}

            {/* Account Details & Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                       <Zap className="h-4 w-4 text-indigo-500" /> Capacidad de Cuenta
                    </h3>
                    <div className="space-y-4">
                       <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estado de Cuentas</p>
                          <p className="text-xl font-black text-slate-900">{isAccountActive ? 'Cuenta Activa' : 'Cuenta Inactiva (0 Chips)'}</p>
                          <div className="mt-4 flex items-center justify-between">
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Capacidad Total</p>
                                <p className="font-black text-indigo-600 text-2xl tracking-tighter">{maxChips} Chips</p>
                             </div>
                             <div className={`h-12 w-12 ${isAccountActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'} rounded-2xl flex items-center justify-center shadow-lg transition-colors`}>
                                <Shield className="h-6 w-6" />
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50">
                    <button 
                      onClick={onOpenComboSelector}
                      className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:underline group"
                    >
                      Añadir Combos / Chips <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm flex flex-col justify-between h-full">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                     <Activity className="h-4 w-4 text-emerald-500" /> Uso de Hardware
                  </h3>
                  <div className="flex items-center justify-center gap-10 py-4">
                     <div className="text-center">
                        <p className="text-4xl font-black text-slate-900">{chipsCount}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vinculados</p>
                     </div>
                     <div className="h-12 w-px bg-slate-100" />
                     <div className="text-center">
                        <p className={`text-4xl font-black ${maxChips - chipsCount < 0 ? "text-red-500" : "text-slate-300"}`}>
                          {Math.max(0, maxChips - chipsCount)}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Libres</p>
                     </div>
                  </div>
                  <div className="mt-8">
                     <button 
                        onClick={() => user.accountId && onViewInventory(user.accountId)}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                     >
                       Ver Inventario del Usuario
                     </button>
                  </div>
               </div>
            </div>

          </div>

          {/* Right Column: Controls */}
          <div className="space-y-6">
             <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-400 mb-8 flex items-center gap-2 relative z-10">
                   <Shield className="h-4 w-4" /> Governance Console
                </h3>
                
                <div className="space-y-3 relative z-10">
                   <button 
                     onClick={() => {
                        const newPass = prompt(`Introduce la nueva contraseña para ${user.email}:`);
                        if (newPass) {
                           onAction(user.id, "reset-password", { password: newPass });
                        }
                     }}
                     className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group active:scale-95"
                   >
                      <span className="text-[10px] font-black uppercase tracking-widest">Resetear Password</span>
                      <RotateCcw className="h-4 w-4 opacity-40 group-hover:rotate-180 transition-transform duration-500" />
                   </button>

                   {account?.accountType !== 'company' && (
                       <button 
                         onClick={() => {
                            const legalName = prompt(`Introduce el Nombre Legal de la Empresa para ${user.email}:`);
                            if (legalName) {
                               onAction(user.id, "convert-to-org", { legalName });
                            }
                         }}
                         className="w-full flex items-center justify-between p-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl border border-indigo-400/30 transition-all shadow-lg active:scale-95"
                       >
                          <span className="text-[10px] font-black uppercase tracking-widest">Convertir a Empresa</span>
                          <Building2 className="h-4 w-4 opacity-60" />
                       </button>
                   )}

                    <div className="pt-6 mt-6 border-t border-white/5 space-y-3">
                        <button 
                         onClick={() => {
                            const capacity = prompt(`⚙️ AJUSTE DE GOBERNANZA: Vas a resetear chips a inventario y ajustar capacidad para ${user.email}.\n\n* Si pones 0, la cuenta se marcará como INACTIVA.\n* Los perfiles y datos médicos NO se borrarán.\n\nIntroduce capacidad total:`, "1");
                            if (capacity !== null) {
                               onAction(user.id, "emergency-reset", { capacity: parseInt(capacity) });
                            }
                         }}
                         className="w-full flex items-center justify-between p-4 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-2xl border border-amber-500/20 transition-all group active:scale-95"
                       >
                          <span className="text-[10px] font-black uppercase tracking-widest">Ajuste de Cuenta (Fix)</span>
                          <RotateCcw className="h-4 w-4 opacity-40 group-hover:rotate-180 transition-transform duration-500" />
                       </button>

                       <button 
                         onClick={() => {
                            if (confirm(`🛑 PELIGRO: Vas a borrar PERMANENTEMENTE la cuenta de ${user.email}. Se eliminarán sus chips, fichas médicas y registros. Esta acción es irreversible. ¿Confirmar?`)) {
                               onAction(user.id, "delete-user", {});
                            }
                         }}
                         className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                       >
                          <ShieldOff className="h-4 w-4" /> Borrar Cuenta Definitivamente
                       </button>
                    </div>
                </div>
             </div>

             <button 
                onClick={onRefresh}
                className="w-full py-4 bg-white border border-slate-200 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 group"
             >
                <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-700" /> Sincronizar Datos
             </button>

             <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">Estado de Autenticación</p>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase inline-block ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                   {user.status}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
