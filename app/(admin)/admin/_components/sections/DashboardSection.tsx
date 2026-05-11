import { Activity, Clock, Cpu, LayoutDashboard, Loader2, QrCode, RefreshCw, Scan as ScanIcon, Smartphone, Users, Zap, ShieldCheck, ExternalLink, ChevronRight, Building2, AlertCircle, TrendingUp, HelpCircle, Package, ShoppingCart } from "lucide-react";
import { ScanEvent, UserAdmin, OrganizationAdmin, AdminStats } from "../../_types/admin";
import { toast } from "sonner";
import { AdminTab } from "../../_hooks/useAdminManager";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="p-6 rounded-[2rem] border border-border bg-card hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex items-center justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {trend && (
           <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg">
              +{trend} HOY
           </span>
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{label}</p>
        <p className={`text-4xl font-black tracking-tighter ${color}`}>{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold mb-1.5 px-0.5">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-black text-slate-900 dark:text-white">{value} <span className="text-slate-400 opacity-60 font-medium">({pct}%)</span></span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
        <div className={`h-full rounded-full transition-all duration-1000 shadow-sm ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

interface DashboardSectionProps {
  stats: AdminStats | null;
  recentScans: ScanEvent[];
  recentUsers: UserAdmin[];
  recentOrgs: OrganizationAdmin[];
  loading: boolean;
  loadData: () => void;
  loadChipDetail: (id: string) => void;
  setSelectedUser: (u: UserAdmin | null) => void;
  setSelectedOrg: (o: OrganizationAdmin | null) => void;
  loadUsers: () => void;
  loadOrgDetail: (id: string) => void;
  setTab: (t: AdminTab) => void;
}

export function DashboardSection({ 
  stats, 
  recentScans, 
  recentUsers, 
  recentOrgs, 
  loading, 
  loadData, 
  loadChipDetail,
  setSelectedUser,
  setSelectedOrg,
  loadUsers,
  loadOrgDetail,
  setTab
}: DashboardSectionProps) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Analizando Inteligencia...</p>
      </div>
    );
  }

  const p = stats.productivity || { pendingOrders: 0, usersWithoutChips: 0, newUsersToday: 0, inactiveActivatedChips: 0 };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Storage Alert Banner */}
      {stats.storageUsage && stats.storageUsage.percentage >= 80 && (
        <div className="p-6 rounded-[2rem] bg-red-600 text-white flex items-center justify-between shadow-xl shadow-red-200 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tighter italic">Alerta de Almacenamiento Crítica</p>
              <p className="text-xs font-bold text-red-100 italic">El sistema ha alcanzado el {stats.storageUsage.percentage}% de su capacidad de archivos en Supabase.</p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-2xl font-black">{stats.storageUsage.percentage}%</p>
             <p className="text-[10px] uppercase font-black tracking-widest text-red-100">Plan Gratuito Limite</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-6">
        <StatCard label="Usuarios Totales" value={stats.totalUsers} icon={Users} color="text-indigo-600" trend={p.newUsersToday > 0 ? p.newUsersToday.toString() : undefined} />
        <StatCard label="Chips Activos (En Red)" value={stats.chipsByStatus.activated} icon={Cpu} color="text-emerald-500" />
      </div>

      {/* Hardware Distribution Bar */}
      <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="w-full md:w-1/3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Distribución de Hardware</p>
            <p className="text-2xl font-black tracking-tighter">{stats.totalChips.toLocaleString()} <span className="text-sm font-bold text-slate-400">Chips Totales</span></p>
         </div>
         <div className="w-full md:w-2/3 flex flex-col gap-3">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
               <div className="bg-emerald-500 h-full" style={{ width: `${(stats.chipsByStatus.activated / stats.totalChips) * 100}%` }} title="Activos" />
               <div className="bg-amber-500 h-full" style={{ width: `${(stats.chipsByStatus.sold / stats.totalChips) * 100}%` }} title="Vendidos" />
               <div className="bg-blue-500 h-full" style={{ width: `${(stats.chipsByStatus.inventory / stats.totalChips) * 100}%` }} title="Inventario" />
               <div className="bg-destructive h-full" style={{ width: `${(stats.chipsByStatus.suspended / stats.totalChips) * 100}%` }} title="Suspendidos" />
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-emerald-700">{stats.chipsByStatus.activated} Activos</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> <span className="text-amber-700">{stats.chipsByStatus.sold} Vendidos</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"/> <span className="text-blue-700">{stats.chipsByStatus.inventory} Inventario</span></div>
            </div>
         </div>
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Productivity & Pending Tasks (Center/Left) */}
        <div className="space-y-10">
          {/* TASKS CARD */}
          <div className="p-10 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
             <h3 className="text-xl font-black uppercase tracking-tighter italic mb-8 flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-primary" /> Pendientes Críticos
             </h3>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setTab("pedidos")}>
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                         <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-widest text-slate-300">Pagos por Validar</p>
                         <p className="text-[10px] text-slate-500 font-bold">Órdenes CHIPS+ esperando aprobación</p>
                      </div>
                   </div>
                   <span className="text-3xl font-black text-primary italic">{p.pendingOrders}</span>
                </div>

                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                         <Activity className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-widest text-slate-300">Chips Sin Perfil</p>
                         <p className="text-[10px] text-slate-500 font-bold">Activamos, pero no han llenado datos</p>
                      </div>
                   </div>
                   <span className="text-3xl font-black text-amber-500 italic">{p.inactiveActivatedChips}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Sidebar: Quick Stats & New Users */}
        <div className="space-y-10">
          
          {/* USERS LIST CARD */}
          <div className="p-8 rounded-[3rem] border border-border bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative">
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 px-2 flex items-center justify-between">
                <span>Nuevos Miembros</span>
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
             </h3>
             <div className="space-y-4">
               {recentUsers?.map((u) => (
                 <div key={u.id} onClick={() => { setSelectedUser(u); loadUsers(); }} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center font-black text-xs text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black truncate w-32">{u.email}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{formatDate(u.createdAt)}</p>
                      </div>
                   </div>
                   <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-all" />
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
