"use client";


import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Building2, Users, Cpu, Plus, Key, Link2,
  Search, ShieldCheck, Mail, Phone, AlertCircle,
  MoreVertical, Calendar, UserCheck, UserX,
  CreditCard, LayoutDashboard, Loader2,
  Trash2, Edit2, CheckCircle2, MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Components
export default function OrganizationDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [dataLoadedAt, setDataLoadedAt] = useState<number | null>(null);
  const [tab, setTab] = useState<"members" | "chips" | "settings">("members");

  // Check if data is stale (5 minutes)
  const isDataStale = (maxAgeMs = 300000) => !dataLoadedAt || Date.now() - dataLoadedAt > maxAgeMs;

  // Modals
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignChip, setShowAssignChip] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Forms
  const [formData, setFormData] = useState({
    email: "",
    password: "PR" + Math.floor(Math.random() * 900000 + 100000), // Random temp password
    firstName: "",
    lastName: "",
    position: "",
    department: ""
  });
  const [newPass, setNewPass] = useState("");
  const [assignChipId, setAssignChipId] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations/current");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
      setDataLoadedAt(Date.now()); // Track when data was loaded
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, actionData: any) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/organizations/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data: actionData })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast(result.message || "Operación exitosa");

      // Cleanup & Refresh
      setShowAddMember(false);
      setShowAssignChip(false);
      setShowResetPassword(false);
      loadData();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Cargando panel corporativo...</p>
      </div>
    );
  }

  if (!data?.organization) {
    return (
      <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Cuenta Personal</h2>
        <p className="text-muted-foreground">Esta sección es para organizaciones. Si desea migrar a una cuenta corporativa, contáctenos.</p>
      </div>
    );
  }

  const { organization, members, chips, stats } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              {organization.organizationType === "company" ? "🏢 Empresa" : "🎓 Colegio"}
            </span>
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Cuenta Verificada
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">{organization.legalName}</h1>
          <p className="text-muted-foreground text-lg mt-1">{organization.displayName || "Panel de Gestión Corporativa"}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5" /> Añadir Personal
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OrgStatCard label="Total Plantilla" value={stats.totalMembers} icon={Users} trend="Activos" />
        <OrgStatCard label="Chips Asignados" value={stats.chipsActivated} icon={Cpu} color="text-green-500" />
        <OrgStatCard label="Disponibles" value={stats.chipsInventory} icon={CreditCard} color="text-blue-500" />
        <OrgStatCard label="Plan Vigente" value={organization.account?.package?.name || "Básico"} icon={Building2} isLabel />
      </div>

      {/* Main Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-8 overflow-x-auto">
          <TabButton active={tab === "members"} onClick={() => setTab("members")} label="Personal / Miembros" icon={Users} />
          <TabButton active={tab === "chips"} onClick={() => setTab("chips")} label="Gestión de Stickers" icon={Cpu} />
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")} label="Configuración" icon={Building2} />
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === "members" && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between bg-card/50">
                <h3 className="font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Miembros de la Organización
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    className="pl-10 pr-4 py-2 bg-muted/50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none min-w-[250px]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Nombre / Perfil</th>
                      <th className="px-6 py-4">Email / Departamento</th>
                      <th className="px-6 py-4">Stickers</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {members.map((member: any) => (
                      <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                              <span className="font-black text-primary text-xs">{(member.profile?.firstName?.[0] || member.email[0]).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-bold">{member.profile?.firstName} {member.profile?.lastName}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-muted-foreground">{member.email}</p>
                          <p className="text-[11px] font-medium">{member.department || "General"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {member.profile?.assignedChips?.length > 0 ? (
                              member.profile.assignedChips.map((c: any) => (
                                <span key={c.id} className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 text-[10px] font-black border border-green-200">
                                  {c.shortCode}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Ninguno</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${member.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            {member.status === 'active' ? 'Activo' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(member);
                                setAssignChipId("");
                                setShowAssignChip(true);
                              }}
                              className="p-2 rounded-lg hover:bg-muted text-primary transition-colors" title="Asignar Sticker"
                            >
                              <Link2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(member);
                                setShowResetPassword(true);
                              }}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Contraseña Temporal"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "chips" && (
          <motion.div
            key="chips"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {chips.map((chip: any) => {
              const assignedTo = members.find((m: any) => m.profile?.id === chip.assignedProfileId);
              return (
                <div key={chip.id} className="group p-6 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 -mr-12 -mt-12 transition-colors ${chip.status === 'activated' ? 'bg-green-500' : 'bg-blue-500'}`} />

                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-muted/50 border border-border group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                      <Cpu className="h-6 w-6 text-primary" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${chip.status === 'activated' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {chip.status === 'activated' ? 'En Uso' : 'Disponible'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xl font-black tracking-widest font-mono">{chip.shortCode}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono">{chip.serialPublic}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/50">
                    {assignedTo ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-[10px] font-bold text-green-600">
                          {assignedTo.profile.firstName[0]}
                        </div>
                        <div className="text-sm">
                          <p className="font-bold">{assignedTo.profile.firstName} {assignedTo.profile.lastName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{assignedTo.department || "Personal"}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground italic">Sin asignar</p>
                        <button
                          onClick={() => {
                            // Find first user without chip or just open assign
                            setShowAssignChip(true);
                            setSelectedUser(null);
                          }}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Asignar Ahora
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}

      {/* 1. Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-[2rem] overflow-hidden"
          >
            <div className="p-8 border-b border-border bg-muted/30">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Plus className="h-6 w-6 text-primary" /> Nuevo Miembro
              </h2>
              <p className="text-muted-foreground text-sm">Crea una cuenta para un empleado o miembro de la organización.</p>
            </div>

            <form className="p-8 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              handleAction("add-member", formData);
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre</label>
                  <input
                    required
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej. Juan"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Apellido</label>
                  <input
                    required
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej. Pérez"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Corporativo</label>
                <input
                  required
                  type="email"
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                  placeholder="email@miempresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">cargo / posición</label>
                  <input
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej. Gerente"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Departamento</label>
                  <input
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej. Ventas"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900 uppercase">Contraseña Temporal</span>
                </div>
                <p className="text-xs text-amber-800/80 mb-2">Entregue esta clave al miembro. Deberá cambiarla al primer inicio de sesión.</p>
                <div className="bg-white/50 rounded-lg p-2 text-center border border-amber-500/30 font-mono font-bold text-amber-900 tracking-widest uppercase">
                  {formData.password}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-[2] px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserCheck className="h-5 w-5" />}
                  Confirmar Registro
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Assign Chip Modal */}
      {showAssignChip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-[2rem] p-8">
            <h2 className="text-2xl font-black mb-1">Asignar Sticker</h2>
            <p className="text-muted-foreground text-sm mb-6">Vincule un chip libre a un perfil de miembro.</p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Seleccionar Miembro</label>
                <select
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                  value={selectedUser?.id || ""}
                  onChange={(e) => setSelectedUser(members.find((m: any) => m.id === e.target.value))}
                >
                  <option value="">— Seleccione habitualmente —</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.profile?.firstName} {m.profile?.lastName} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Seleccionar Sticker Libre</label>
                <select
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                  value={assignChipId}
                  onChange={(e) => setAssignChipId(e.target.value)}
                >
                  <option value="">— Seleccione habitualmente —</option>
                  {chips.filter((c: any) => c.status === "inventory").map((c: any) => (
                    <option key={c.id} value={c.id}>{c.shortCode} - {c.serialPublic}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-6">
                <button onClick={() => setShowAssignChip(false)} className="flex-1 py-3 font-bold hover:underline">Cancelar</button>
                <button
                  onClick={() => handleAction("assign-chip", { chipId: assignChipId, memberId: selectedUser.id })}
                  disabled={!assignChipId || !selectedUser || processing}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reset Password Modal */}
      {showResetPassword && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-[2rem] p-8">
            <h2 className="text-xl font-bold mb-4">Resetear Contraseña</h2>
            <p className="text-sm text-muted-foreground mb-6">Establezca una nueva clave temporal para <strong>{selectedUser.email}</strong>.</p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nueva clave temporal"
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowResetPassword(false)} className="flex-1 py-3 font-bold">Atrás</button>
                <button
                  onClick={() => handleAction("reset-password", { userId: selectedUser.id, newPassword: newPass })}
                  disabled={!newPass || processing}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgStatCard({ label, value, icon: Icon, trend, color = "text-primary", isLabel = false }: any) {
  return (
    <div className="p-6 rounded-3xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-muted/50 ${color}/10 border border-border`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {!isLabel && <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{trend}</span>}
      </div>
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-black ${isLabel ? 'text-lg' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pb-4 pt-2 border-b-2 transition-all text-sm font-bold whitespace-nowrap ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
