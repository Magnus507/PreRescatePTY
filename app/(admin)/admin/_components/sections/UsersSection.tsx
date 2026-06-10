"use client";

import { useState } from "react";
import { Loader2, Search, Trash2, User } from "lucide-react";

import { UserAdmin } from "../../_types/admin";
import { AdminTab } from "../../_hooks/useAdminManager";

interface UsersSectionProps {
  users: UserAdmin[];
  total: number;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  loadUsers: () => void;
  setSelectedUser: (u: UserAdmin | null) => void;
  handleDeleteUser: (userId: string, email: string) => void;
  setTab: (val: AdminTab) => void;
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return "••••" + digits.slice(-4);
}

function statusLabel(status: string) {
  switch (status) {
    case "active": return { text: "Activa", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "blocked": return { text: "Bloqueada", className: "bg-red-500/10 text-red-600 border-red-500/20" };
    case "suspended": return { text: "Suspendida", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "pending": return { text: "Pendiente", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    default: return { text: status || "Desconocido", className: "bg-slate-100 text-slate-400 border-slate-200" };
  }
}

export function UsersSection({
  users,
  total,
  loading,
  searchQuery,
  setSearchQuery,
  loadUsers,
  setSelectedUser,
  handleDeleteUser
}: UsersSectionProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredUsers = users.filter(u => {
    if (activeTab === 'active') return u._count.chips > 0;
    if (activeTab === 'inactive') return u._count.chips === 0;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-border shadow-sm">
        <div className="relative w-full lg:max-w-md">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <input
             placeholder="Buscar usuario por email, nombre o teléfono..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             onKeyDown={(e) => e.key === "Enter" && loadUsers()}
             className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
           />
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-4">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'active', label: 'Activos' },
                { id: 'inactive', label: 'Sin Chip' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab.label}
                </button>
              ))}
           </div>
           <div className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
             Total: {total} usuarios
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="text-xs font-black uppercase tracking-widest opacity-40">Accediendo al directorio...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                <tr>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Usuario</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Perfil Médico</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activaciones</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u: UserAdmin) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group" onClick={() => setSelectedUser(u)}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-100 dark:border-indigo-500/20 shadow-sm transition-transform group-hover:scale-105">
                          {u.email[0]}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{u.email}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Unido: {formatDate(u.createdAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-tight">
                          {(u.profile?.firstName || u.profile?.lastName) 
                            ? `${u.profile.firstName} ${u.profile.lastName}`.trim() 
                            : <span className="text-slate-400 font-bold italic">Nombre no configurado</span>}
                        </p>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-400">{maskPhone(u.phone)}</span>
                           {u.profile?.bloodType && (
                             <span className="px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 text-[9px] font-black rounded-lg border border-red-100 dark:border-red-500/20">
                               {u.profile.bloodType}
                             </span>
                           )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex flex-col items-center justify-center min-w-[36px] px-3 py-1.5 ${u._count.chips > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-400'} border rounded-xl`}>
                        <span className="text-sm font-black">{u._count.chips}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const s = statusLabel(u.status);
                        return (
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${s.className}`}>
                            {s.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-200 dark:border-slate-700 transition-all shadow-sm hover:scale-110"
                        >
                          <Search className="h-4.5 w-4.5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(u.id, u.email);
                          }}
                          className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-400 hover:text-red-600 border border-red-100 dark:border-red-500/20 transition-all shadow-sm hover:scale-110"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                 <div className="p-6 rounded-full bg-slate-50 dark:bg-slate-800">
                    <User className="h-10 w-10 opacity-10" />
                 </div>
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">No se encontraron usuarios.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
