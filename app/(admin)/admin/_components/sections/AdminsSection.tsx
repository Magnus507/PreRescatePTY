import React, { useState } from 'react';
import { Shield, ShieldCheck, User, Mail, Trash2, Plus, X, Loader2, Key, ShieldAlert, Crown } from 'lucide-react';
import { AdminAccount } from '../../_types/admin';
import type { AdminCreatePayload, AdminUpdatePayload } from '../../_services/domains/users.service';

type AdminRole = 'admin' | 'superadmin' | 'imprenta';

interface AdminsSectionProps {
  admins: AdminAccount[];
  loading: boolean;
  creating: boolean;
  loadAdmins?: () => void;
  onUpdateAdmin: (id: string, data: AdminUpdatePayload) => Promise<boolean>;
  onDeleteAdmin: (id: string, email: string) => Promise<boolean | void>;
  onCreateAdmin: (data: AdminCreatePayload) => Promise<boolean>;
}

export const AdminsSection: React.FC<AdminsSectionProps> = ({ 
  admins, loading, creating, loadAdmins, onUpdateAdmin, onDeleteAdmin, onCreateAdmin 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState<AdminCreatePayload>({ email: '', password: '', role: 'admin' });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Consultando alto mando...</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateAdmin(newAdmin);
    setShowAddModal(false);
    setNewAdmin({ email: '', password: '', role: 'admin' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" /> Gobernanza Superior
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">Gestión de privilegios y operadores de infraestructura.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {loadAdmins && (
            <button 
              onClick={loadAdmins}
              className="px-6 py-3 bg-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              Refrescar
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo Operador
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((admin) => {
          const isMaster = admin.email === "admin@prerescatepty.com";
          return (
          <div key={admin.id} className={`p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border ${isMaster ? 'border-amber-400 shadow-amber-200/50 dark:shadow-amber-500/10 shadow-2xl' : 'border-slate-200 dark:border-slate-800 shadow-sm'} transition-all group overflow-hidden relative`}>
            {isMaster ? (
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 dark:bg-amber-900/10 rounded-bl-[5rem] -mr-8 -mt-8" />
            ) : (
               <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-bl-[5rem] -mr-8 -mt-8 transition-colors group-hover:bg-primary/5" />
            )}
            
            <div className="flex items-center gap-5 mb-8 relative z-10">
              <div className={`h-14 w-14 rounded-2xl ${isMaster ? 'bg-amber-500 text-white' : 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white'} flex items-center justify-center shadow-xl transition-transform group-hover:scale-110`}>
                {isMaster ? <Crown className="h-8 w-8" /> : <User className="h-7 w-7" />}
              </div>
              <div className="overflow-hidden">
                <p className={`font-black truncate text-lg tracking-tight ${isMaster ? 'text-amber-600 dark:text-amber-500' : 'text-slate-900 dark:text-white group-hover:text-primary'} transition-colors`}>{admin.email}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                     isMaster ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                     admin.role === 'superadmin' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 
                     admin.role === 'imprenta' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 
                     'bg-primary/10 text-primary'
                   }`}>
                     {isMaster ? 'Fundador' : admin.role === 'superadmin' ? 'Soberano' : admin.role === 'imprenta' ? 'GESTOR PTY' : 'Operador Admin'}
                   </span>
                   {!isMaster && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ID: {admin.id.slice(-6)}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-tight">
                <Mail className="h-4 w-4 opacity-50" /> {admin.email}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-tight">
                <ShieldCheck className="h-4 w-4 opacity-50" /> Estado: <span className="text-emerald-500">VITALICIO</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-tight">
                <ShieldAlert className="h-4 w-4 opacity-50" /> Nivel: <span className={`font-black ${isMaster ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                  {isMaster ? 'SISTEMA RAIZ' : admin.role === 'superadmin' ? 'SUPER ADMIN' : admin.role === 'imprenta' ? 'GESTOR PTY' : 'ADMINISTRADOR'}
                </span>
              </div>
            </div>

            <div className="mt-8 flex gap-3 relative z-10">
               {isMaster ? (
                 <div className="flex-1 py-4 bg-amber-50 dark:bg-amber-500/5 text-amber-600 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-center border border-amber-100 dark:border-amber-500/10">
                    Acceso de Fundador Protegido
                 </div>
               ) : (
                 <>
                  <div className="flex-1 relative">
                      <select 
                        value={admin.role}
                        onChange={(e) => onUpdateAdmin(admin.id, { role: e.target.value as AdminRole })}
                        className="w-full py-4 pl-6 pr-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all appearance-none cursor-pointer border-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="admin">Administrador</option>
                        <option value="superadmin">Super Admin</option>
                        <option value="imprenta">Imprenta</option>
                      </select>
                      <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button 
                      onClick={() => onDeleteAdmin(admin.id, admin.email)}
                      className="px-5 py-4 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 rounded-2xl transition-all group/del shadow-sm hover:shadow-lg hover:shadow-rose-500/20"
                  >
                      <Trash2 className="h-5 w-5" />
                  </button>
                 </>
               )}
            </div>
          </div>
        )})}

        {admins.length === 0 && (
          <div className="lg:col-span-3 py-32 text-center flex flex-col items-center gap-6 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem]">
            <Shield className="h-16 w-16 opacity-5 text-slate-300" />
            <div className="space-y-2">
              <p className="text-xl font-black uppercase tracking-[0.2em] text-slate-300">Nivel de Seguridad Máximo</p>
              <p className="text-xs font-bold text-slate-400">No se han registrado operadores secundarios.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-8 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all"
            >
              Inicializar Operador
            </button>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border border-white/20 p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
               <Shield className="h-40 w-40 animate-pulse text-primary" />
            </div>
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <h3 className="text-2xl font-black tracking-tighter">Nuevo Operador</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-all text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6 relative z-10">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Email Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      required
                      type="email" 
                      placeholder="admin@prerescatepty.com"
                      value={newAdmin.email}
                      onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                      className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Contraseña de Acceso</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      required
                      type="password" 
                      placeholder="••••••••"
                      value={newAdmin.password}
                      onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                      className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Rango de Acceso</label>
                  <select 
                    value={newAdmin.role}
                    onChange={e => setNewAdmin({...newAdmin, role: e.target.value as AdminRole})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 font-bold text-sm appearance-none cursor-pointer"
                  >
                    <option value="admin">Operador Estándar</option>
                    <option value="superadmin">Soberano (Super Admin)</option>
                    <option value="imprenta">Operador de Imprenta</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Habilitar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
