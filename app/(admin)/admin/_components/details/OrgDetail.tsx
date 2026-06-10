import React, { useState } from 'react';
import { 
  ChevronLeft, Building2, Users, Cpu, Plus, Eye, Trash2, 
  Activity, Zap, Info, Shield, Mail, Globe, MapPin, Phone, Calendar
} from 'lucide-react';
import { OrganizationAdmin, ChipAdmin, UserAdmin } from '../../_types/admin';
import { OrgEditModal } from '../modals/OrgEditModal';

interface OrgDetailProps {
  org: OrganizationAdmin;
  onBack: () => void;
  onAction: (userId: string, action: string, data: any) => void;
  onAddUser: () => void;
  onCreateBatch: () => void;
  onDeleteOrg: (id: string, name: string) => void;
  onDeleteMember: (id: string, email: string) => void;
  onLoadChip: (id: string) => void;
  onAssignChip: (e: any) => void;
  assignShortCode: string;
  setAssignShortCode: (v: string) => void;
  bulkAssignCount: number;
  setBulkAssignCount: (v: number) => void;
  onBulkAssign: (e: any) => void;
  onUpdateOrg: (orgId: string, data: any) => Promise<boolean>;
  formatDate: (d: string) => string;
  statusColor: (s: string) => string;
}

export const OrgDetailView: React.FC<OrgDetailProps> = ({ 
  org, onBack, onAction, onAddUser, onCreateBatch, onDeleteOrg, onDeleteMember,
  onLoadChip, onAssignChip, assignShortCode, setAssignShortCode,
  bulkAssignCount, setBulkAssignCount, onBulkAssign, onUpdateOrg,
  formatDate, statusColor
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const handleUpdateOrg = async (data: any) => {
    setEditLoading(true);
    try {
      return await onUpdateOrg(org.id, data);
    } finally {
      setEditLoading(false);
    }
  };
  // Safe Access Patterns
  const chips = org.account?.chips || [];
  const members = org.account?.users || [];
  const maxChips = org.account?.maxChipsAllocated || 0;
  const currentChips = chips.length;
  
  const initials = org.legalName?.[0] || "?";

  return (
    <div className="min-h-screen bg-slate-50/30 animate-in slide-in-from-right duration-500">
      <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Directorio de Organizaciones
          </button>
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">{org.taxId || "Persona Natural"}</span>
             <h2 className="text-sm font-black text-slate-900 border-l border-slate-200 pl-3">{org.legalName}</h2>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Org Header Card */}
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[80px]" />
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex gap-6">
                 <div className="h-24 w-24 rounded-[2rem] bg-white text-slate-900 flex items-center justify-center text-3xl font-black shadow-xl shrink-0">
                    {initials}
                 </div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">{org.legalName}</h1>
                    <div className="flex flex-wrap gap-3">
                       <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest capitalize">{org.organizationType}</span>
                       <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Registrada el {formatDate(org.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-6">
                       <p className="text-xs text-slate-400 flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {org.contactEmail || "Email no registrado"}</p>
                       <p className="text-xs text-slate-400 flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {org.contactPhone || "Teléfono no registrado"}</p>
                       <p className="text-xs text-slate-400 flex items-center gap-2 col-span-full"><MapPin className="h-4 w-4 text-primary" /> {org.address || "Dirección no definida"}</p>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                 <button 
                 onClick={() => setShowEditModal(true)}
                 className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-95"
               >Editar Información</button>
                 <button 
                   onClick={() => onDeleteOrg(org.id, org.legalName)}
                   className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/10 active:scale-95"
                 >Dar de Baja Entidad</button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Section: Stats & Quick Actions */}
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                 <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-indigo-500" /> Cuotas de Hardware
                 </h3>
                 <div className="space-y-4">
                    <div className="flex items-end justify-between">
                       <div>
                          <p className="text-4xl font-black text-slate-900">{currentChips}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chips Asignados</p>
                       </div>
                       <div className="text-right">
                          <p className="text-2xl font-black text-slate-300">/ {maxChips}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacidad Total</p>
                       </div>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                       <div 
                         className={`h-full bg-indigo-600 rounded-full transition-all duration-1000 ${currentChips > maxChips ? 'bg-red-500' : ''}`} 
                         style={{ width: `${Math.min(100, (currentChips / (maxChips || 1)) * 100)}%` }} 
                       />
                    </div>
                 </div>

                  {/* Activation Info Notice */}
                  <div className="mt-8 pt-8 border-t border-slate-50">
                     <div className="p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 shadow-inner">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-800 mb-2">Activación Automática</p>
                        <p className="text-[11px] font-medium text-indigo-700/70 leading-relaxed">
                           Los chips se vinculan automáticamente cuando el usuario activa su código.
                        </p>
                     </div>
                  </div>
              </div>
           </div>

           {/* Section: List of Members */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                 <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <div>
                       <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Equipo de Trabajo</h3>
                       <p className="text-xs text-slate-400 mt-0.5">{members.length} Miembros Registrados</p>
                    </div>
                      <div className="flex items-center gap-2">
                        {false && (
                          <button onClick={onCreateBatch} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95">
                             <Plus className="h-3.5 w-3.5" /> Crear Lote
                          </button>
                        )}
                        {false && (
                          <button onClick={onAddUser} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2 shadow-lg shadow-slate-200 active:scale-95">
                             <Plus className="h-3.5 w-3.5" /> Invitar Miembro
                          </button>
                        )}
                      </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <tr>
                             <th className="text-left px-8 py-4 font-black">Información Personal</th>
                             <th className="text-left py-4 font-black">Nivel Acceso</th>
                             <th className="text-right px-8 py-4 font-black">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {members.map((member: UserAdmin) => (
                             <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-4">
                                   <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 uppercase">{member.email[0]}</div>
                                      <div>
                                         <p className="font-bold text-slate-900">{member.email}</p>
                                         <p className="text-[10px] text-slate-400 tracking-widest font-bold uppercase">{member.profile ? `${member.profile.firstName} ${member.profile.lastName}` : "Perfil pendiente"}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="py-4">
                                   <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {member.role === 'owner' ? '★ Admin Corporativo' : 'Miembro'}
                                   </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   <button 
                                     onClick={() => onDeleteMember(member.id, member.email)} 
                                     className="p-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-all hover:shadow-inner active:scale-90"
                                     title="Eliminar de la organización"
                                   >
                                      <Trash2 className="h-4 w-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {members.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-20 text-center">
                                <Users className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-300">No hay miembros registrados todavía.</p>
                              </td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Section: List of Chips */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                 <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Parque Tecnológico (Chips)</h3>
                 </div>
                 <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {chips.map((chip: ChipAdmin) => (
                          <div 
                            key={chip.id} 
                            onClick={() => onLoadChip(chip.id)}
                            className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 cursor-pointer transition-all group active:scale-95"
                          >
                             <div className="flex items-center justify-between mb-4">
                                <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:bg-primary transition-colors"><Cpu className="h-4 w-4" /></div>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${statusColor(chip.status)}`}>{chip.status}</span>
                             </div>
                             <p className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">{chip.serialPublic}</p>
                             <p className="text-lg font-black text-slate-900 mt-1">{chip.shortCode}</p>
                             <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                                   {chip.assignedProfile ? chip.assignedProfile.firstName : "Sin Propietario"}
                                </span>
                                <Eye className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />
                             </div>
                          </div>
                       ))}
                       {chips.length === 0 && (
                         <div className="col-span-full py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-300">
                           <Cpu className="h-8 w-8 opacity-20 mb-2" />
                           <p className="text-[10px] font-black uppercase">Sin inventario asignado</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      <OrgEditModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateOrg}
        loading={editLoading}
        org={org}
      />
    </div>
  );
};
