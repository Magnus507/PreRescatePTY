import { Activity, Clock, Cpu, RefreshCw, Users, Zap, ShieldCheck, ChevronRight, Building2, AlertCircle, Package, ShoppingCart, CheckCircle2, Eye, ArrowRight, TrendingUp } from "lucide-react";
import { UserAdmin, AdminStats, ScanEvent, OrganizationAdmin } from "../../_types/admin";
import { AdminTab } from "../../_hooks/useAdminManager";

// ─── Reusable Components ────────────────────────────────────────────────────

function AlertCard({ label, value, icon: Icon, color, bgColor, tab, ctaLabel, subtitle, setTab }: {
  label: string; value: number; icon: React.ElementType; color: string; bgColor: string; tab: AdminTab; ctaLabel: string; subtitle?: string; setTab: (t: AdminTab) => void;
}) {
  const hasAlert = value > 0;
  return (
    <div
      onClick={() => setTab(tab)}
      className={`relative p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer group overflow-hidden ${
        hasAlert
          ? `border-${color.replace("text-", "")}/20 bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl`
          : "border-emerald-200/50 bg-emerald-50/50 dark:bg-emerald-950/20"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-12 w-12 rounded-2xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        {hasAlert && (
          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${bgColor} ${color}`}>
            Requiere atención
          </span>
        )}
        {!hasAlert && (
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-3 w-3 inline mr-1" />Todo al día
          </span>
        )}
      </div>
      <div className="mb-3">
        <p className={`text-5xl font-black tracking-tighter ${hasAlert ? color : "text-emerald-600"}`}>
          {value}
        </p>
        <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
        {subtitle && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {hasAlert && (
        <button
          onClick={(e) => { e.stopPropagation(); setTab(tab); }}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
        >
          {ctaLabel} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bgColor, sublabel }: {
  label: string; value: number; icon: React.ElementType; color: string; bgColor: string; sublabel?: string;
}) {
  return (
    <div className="p-5 rounded-[1.5rem] border border-border bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-8 w-8 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className={`text-3xl font-black tracking-tighter ${color}`}>{value.toLocaleString()}</p>
      {sublabel && <p className="text-[10px] font-medium text-slate-400 mt-1">{sublabel}</p>}
    </div>
  );
}

function HardwareBar({ totalChips, activated, inventory, sold, suspended }: {
  totalChips: number; activated: number; inventory: number; sold: number; suspended: number;
}) {
  const safeTotal = totalChips || 1;
  return (
    <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Distribución de Hardware</p>
          <p className="text-3xl font-black tracking-tighter">{totalChips.toLocaleString()} <span className="text-sm font-bold text-slate-400">Chips Totales</span></p>
        </div>
      </div>
      <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden mb-4">
        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(activated / safeTotal) * 100}%` }} title={`Activos: ${activated}`} />
        <div className="bg-amber-500 h-full transition-all" style={{ width: `${(sold / safeTotal) * 100}%` }} title={`Vendidos: ${sold}`} />
        <div className="bg-blue-500 h-full transition-all" style={{ width: `${(inventory / safeTotal) * 100}%` }} title={`Inventario: ${inventory}`} />
        <div className="bg-red-500 h-full transition-all" style={{ width: `${(suspended / safeTotal) * 100}%` }} title={`Suspendidos: ${suspended}`} />
      </div>
      <div className="flex flex-wrap items-center gap-5 text-[10px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="text-emerald-700">{activated} Activos</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"/><span className="text-amber-700">{sold} Vendidos</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"/><span className="text-blue-700">{inventory} Inventario</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"/><span className="text-red-700">{suspended} Suspendidos</span></div>
      </div>
    </div>
  );
}

function QuickLink({ label, icon: Icon, tab, setTab }: { label: string; icon: React.ElementType; tab: AdminTab; setTab: (t: AdminTab) => void }) {
  return (
    <button
      onClick={() => setTab(tab)}
      className="flex items-center gap-3 p-4 rounded-[1.5rem] border border-border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </button>
  );
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface DashboardSectionProps {
  stats: AdminStats | null;
  recentScans?: ScanEvent[];
  recentUsers: UserAdmin[];
  recentOrgs?: OrganizationAdmin[];
  loading: boolean;
  loadData: () => void;
  setSelectedUser: (u: UserAdmin | null) => void;
  setSelectedOrg?: (org: OrganizationAdmin | null) => void;
  loadUsers: () => void;
  loadChipDetail?: (id: string) => void;
  loadOrgDetail?: (id: string) => void;
  setTab: (t: AdminTab) => void;
}

export function DashboardSection({ 
  stats, 
  recentUsers, 
  loading, 
  loadData, 
  setSelectedUser,
  loadUsers,
  setTab
}: DashboardSectionProps) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="h-10 w-10 rounded-full border-4 border-brand/20 border-b-brand animate-spin-slow absolute top-3 left-3" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Procesando Inteligencia...</p>
      </div>
    );
  }

  const eco = stats.ecosystem;
  const comm = stats.commerce;
  const corp = stats.corporate;
  const mov = stats.movement;
  const p = stats.productivity;

  // Combined attention count: payments under review + pending corporate requests
  const pendingAttention = comm.paymentsUnderReview + corp.pendingRequests;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">
            <span className="text-[#dc2626]">Pre</span>{" "}
            <span className="text-slate-900">Rescue</span>{" "}
            <span className="text-[#dc2626]">ID</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Métricas críticas y monitoreo de salud del ecosistema</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Operativo</span>
          </span>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-border text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* ─── A. Centro de Alertas ────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Centro de Alertas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <AlertCard
            label="Pagos por revisar"
            value={pendingAttention}
            icon={ShoppingCart}
            color="text-amber-600"
            bgColor="bg-amber-50"
            tab="pedidos"
            ctaLabel="Ir a Pedidos"
            subtitle="Pagos y solicitudes pendientes"
            setTab={setTab}
          />
          <AlertCard
            label="Pedidos en producción"
            value={comm.ordersProcessing}
            icon={Package}
            color="text-violet-600"
            bgColor="bg-violet-50"
            tab="pedidos"
            ctaLabel="Ir a Pedidos"
            setTab={setTab}
          />
          <AlertCard
            label="Chips disponibles"
            value={stats.chipsByStatus.inventory}
            icon={Cpu}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
            tab="inventory"
            ctaLabel="Ir a Inventario"
            setTab={setTab}
          />
        </div>
      </div>

      {/* ─── B. Salud del Ecosistema ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
          <Users className="h-4 w-4" /> Salud del Ecosistema
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard label="Usuarios totales" value={stats.totalUsers} icon={Users} color="text-indigo-600" bgColor="bg-indigo-50"
            sublabel={`${eco.usersActive} activos / ${eco.usersBlocked} bloqueados`} />
          <KpiCard label="Perfiles registrados" value={stats.totalProfiles} icon={ShieldCheck} color="text-purple-600" bgColor="bg-purple-50"
            sublabel={`${eco.profilesCorporate} corporativos`} />
          <KpiCard label="Chips activos" value={stats.chipsByStatus.activated} icon={Cpu} color="text-emerald-600" bgColor="bg-emerald-50"
            sublabel={`${eco.profilesWithoutChip} perfiles sin chip`} />
          <KpiCard label="Empresas registradas" value={eco.organizationsTotal} icon={Building2} color="text-blue-600" bgColor="bg-blue-50"
            sublabel={`${corp.organizationsActive} activas`} />
        </div>
      </div>

      {/* ─── C. Hardware ─────────────────────────────────────────────── */}
      <HardwareBar
        totalChips={stats.totalChips}
        activated={stats.chipsByStatus.activated}
        inventory={stats.chipsByStatus.inventory}
        sold={stats.chipsByStatus.sold}
        suspended={stats.chipsByStatus.suspended}
      />

      {/* ─── D. Operación Comercial ──────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Operación Comercial
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
          <KpiCard label="Pendientes" value={p.pendingOrders} icon={Clock} color="text-amber-600" bgColor="bg-amber-50" />
          <KpiCard label="En revisión" value={comm.paymentsUnderReview} icon={Eye} color="text-blue-600" bgColor="bg-blue-50" />
          <KpiCard label="En producción" value={comm.ordersProcessing} icon={Package} color="text-violet-600" bgColor="bg-violet-50" />
          <KpiCard label="Enviados" value={comm.ordersShipped} icon={Zap} color="text-cyan-600" bgColor="bg-cyan-50" />
          <KpiCard label="Completados" value={comm.ordersCompleted} icon={CheckCircle2} color="text-emerald-600" bgColor="bg-emerald-50" />
        </div>
      </div>

      {/* ─── E. Corporativo ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Corporativo
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard label="Empresas registradas" value={corp.organizationsTotal} icon={Building2} color="text-blue-600" bgColor="bg-blue-50" />
          <KpiCard label="Empresas activas" value={corp.organizationsActive} icon={CheckCircle2} color="text-emerald-600" bgColor="bg-emerald-50" />
          <KpiCard label="Solicitudes pendientes" value={corp.pendingRequests} icon={AlertCircle} color="text-amber-600" bgColor="bg-amber-50" />
          <KpiCard label="Colaboradores activos" value={corp.activeMembers} icon={Users} color="text-violet-600" bgColor="bg-violet-50" />
        </div>
      </div>

      {/* ─── F. Movimiento ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Movimiento
          <span className="text-[9px] font-medium text-slate-300 ml-2">(sin monetización aún — FASE 2)</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard label="Pedidos hoy" value={comm.ordersToday} icon={ShoppingCart} color="text-indigo-600" bgColor="bg-indigo-50" />
          <KpiCard label="Pedidos este mes" value={comm.ordersThisMonth} icon={Package} color="text-purple-600" bgColor="bg-purple-50" />
          <KpiCard label="Usuarios nuevos hoy" value={mov.newUsersToday} icon={Users} color="text-emerald-600" bgColor="bg-emerald-50" />
          <KpiCard label="Activaciones este mes" value={mov.activationsThisMonth} icon={Zap} color="text-amber-600" bgColor="bg-amber-50" />
        </div>
      </div>

      {/* ─── G. Accesos Directos ─────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">Accesos Directos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickLink label="Pedidos" icon={ShoppingCart} tab="pedidos" setTab={setTab} />
          <QuickLink label="Inventario" icon={Package} tab="inventory" setTab={setTab} />
          <QuickLink label="Empresas" icon={Building2} tab="empresas" setTab={setTab} />
          <QuickLink label="Productos" icon={Zap} tab="tienda" setTab={setTab} />
          <QuickLink label="Usuarios" icon={Users} tab="users" setTab={setTab} />
        </div>
      </div>

      {/* ─── H. Nuevos Miembros Recientes ────────────────────────────── */}
      {recentUsers && recentUsers.length > 0 && (
        <div className="p-8 rounded-[2.5rem] border border-border bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
            <span>Nuevos Miembros</span>
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {recentUsers.map((u) => (
              <div key={u.id} onClick={() => { setSelectedUser(u); loadUsers(); }} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/30 transition-all cursor-pointer group flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center font-black text-xs text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                  {u.email[0].toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-black truncate">{u.email}</p>
                  <p className="text-[10px] font-medium text-slate-400">{formatDate(u.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}