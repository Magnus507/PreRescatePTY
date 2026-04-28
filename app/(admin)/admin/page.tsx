"use client";

import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Activity, Store, Rocket, Sparkles, Smartphone, Wallet, Zap, Fingerprint } from "lucide-react";

// Domain & Hooks
import { useAdminManager } from "./_hooks/useAdminManager";

// Sections
import { DashboardSection } from "./_components/sections/DashboardSection";
import { ChipsSection } from "./_components/sections/ChipsSection";
import { UsersSection } from "./_components/sections/UsersSection";
import { OrganizationsSection } from "./_components/sections/OrganizationsSection";
import { InventorySection } from "./_components/sections/InventorySection";
import { AdminsSection } from "./_components/sections/AdminsSection";
import { PedidosSection } from "./_components/sections/PedidosSection";
import { TiendaSection } from "./_components/sections/TiendaSection";
import { GovernanceSection } from "./_components/sections/GovernanceSection";
import { SettingsSection } from "./_components/sections/SettingsSection";
import { ShowcaseProfileSection } from "./_components/sections/ShowcaseProfileSection";

// Details
import { ChipDetailView } from "./_components/details/ChipDetail";
import { UserDetailView } from "./_components/details/UserDetail";
import { OrgDetailView } from "./_components/details/OrgDetail";

// Modals
import { OrgCreateModal } from "./_components/modals/OrgCreateModal";
import { ComboSelectorModal } from "./_components/modals/ComboSelectorModal";

// Types & Utils
import { ChipAdmin } from "./_types/admin";
import { exportToCSV } from "./_utils/export";

// ─── Utility Helpers ─────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(s: string) {
  switch (s) {
    case "activated": return "bg-success/10 text-success";
    case "inventory": return "bg-blue-500/10 text-blue-600";
    case "sold": return "bg-amber-500/10 text-amber-600";
    case "suspended": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

function serviceColor(s: string) {
  switch (s) {
    case "active": return "bg-success/10 text-success";
    case "limited": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "suspended": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

// ─── Main Page Entry ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Redirection is handled by middleware and AdminLayout

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const role = session?.user?.role;
  if (!session || (role !== "admin" && role !== "superadmin" && role !== "imprenta")) {
    return null;
  }

  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AdminDashboard />
    </Suspense>
  );
}


function AdminDashboard() {
  const admin = useAdminManager();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isPrintRole = role === 'imprenta';
  const isFounder = session?.user?.email === "admin@prerescatepty.com";

  const dynamicLabels: Record<string, { title: string; subtitle: string; placeholder: string }> = {
    dashboard: { 
      title: "Dashboard de Control", 
      subtitle: "Métricas críticas y monitoreo de salud del ecosistema",
      placeholder: "Analizar métricas..." 
    },
    users: { 
      title: "Usuarios & Perfiles", 
      subtitle: "Gestión de perfiles vitales y cuentas de usuario",
      placeholder: "Buscar por nombre o correo..." 
    },
    chips: { 
      title: "Identificadores (Chips)", 
      subtitle: "Control maestro de chips digitales y estado de servicio",
      placeholder: "Buscar por código serial..." 
    },
    empresas: { 
      title: "Cuentas Corporativas", 
      subtitle: "Administración de entidades, colegios y flotas",
      placeholder: "Buscar organización..." 
    },
    inventory: { 
      title: "Stock & Fábrica", 
      subtitle: "Logística de hardware, stock físico y producción industrial",
      placeholder: "Buscar en stock..." 
    },
    admins: { 
      title: "Administradores", 
      subtitle: "Control de acceso y auditoría administrativa",
      placeholder: "Buscar administradores..." 
    },
    pedidos: {
      title: "Ventas & Pedidos",
      subtitle: "Gestión de compras, chips+ y validaciones de pago",
      placeholder: "Buscar pedidos..."
    },
    tienda: {
      title: "Tienda PTY Management",
      subtitle: "Gestión de productos adicionales, stock y ventas de la tienda",
      placeholder: "Buscar productos..."
    },
    governance: {
      title: "Auditoría & Salud",
      subtitle: "Centro de control de integridad, alertas críticas y salud operativa",
      placeholder: "Analizar infraestructura..."
    },
    roadmap: {
      title: "Labs / Roadmap",
      subtitle: "Próximas actualizaciones y experimentos en desarrollo (PreRescate v4.0)",
      placeholder: "Explorar planes..."
    },
    settings: {
      title: "Ajustes del Sistema",
      subtitle: "Configuración global de la plataforma, pagos y comunicaciones",
      placeholder: "Buscar ajuste..."
    },
    showcase: {
      title: "Perfil VIP Showcase",
      subtitle: "Gestión de la identidad médica pública que sirve de ejemplo al mundo",
      placeholder: "Buscar en demo..."
    }
  };

  useEffect(() => {
    if (isPrintRole && admin.tab !== 'inventory') {
      admin.setTab('inventory');
    }
  }, [isPrintRole, admin.tab, admin]);

  const currentTabInfo = dynamicLabels[admin.tab] || { 
    title: "Módulo en Gestión", 
    subtitle: "Infraestructura PreRescatePTY v3.1",
    placeholder: "Buscar..." 
  };

  // -- UI States --
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  
  // -- Assign States (Domain Specific Action State) --
  const [assignShortCode, setAssignShortCode] = useState("");
  const [bulkAssignCount, setBulkAssignCount] = useState(10);
  const [createCount, setCreateCount] = useState(5);
  const [createdBatch, setCreatedBatch] = useState<ChipAdmin[] | null>(null);

  // -- Master Detail Selection --
  if (admin.chips.selectedChip) {
    return (
      <ChipDetailView 
        chip={admin.chips.selectedChip}
        loading={admin.chips.loading}
        reactivating={admin.chips.creating}
        onBack={() => admin.chips.setSelectedChip(null)}
        onReactivate={admin.chips.reactivateChip}
        formatDate={formatDate}
        statusColor={statusColor}
        serviceColor={serviceColor}
      />
    );
  }

  if (admin.users.selectedUser) {
    return (
      <>
        <UserDetailView 
          user={admin.users.selectedUser}
          onBack={() => admin.users.setSelectedUser(null)}
          onAction={admin.users.handleAdminAction}
          onRefresh={() => admin.users.reloadSelectedUser()}
          formatDate={formatDate}
          onViewInventory={(accId) => {
              admin.filters.setAccount(accId);
              admin.setTab("chips");
              admin.users.setSelectedUser(null);
          }}
          onOpenComboSelector={() => setShowComboModal(true)}
        />
        <ComboSelectorModal 
          isOpen={showComboModal}
          onClose={() => setShowComboModal(false)}
          loading={admin.users.loading}
          currentCapacity={admin.users.selectedUser.account?.maxChipsAllocated || 0}
          onSubmit={(data) => {
            admin.users.handleAdminAction(admin.users.selectedUser!.id, "update-plan", data)
              .then(() => setShowComboModal(false));
          }}
        />
      </>
    );
  }

  if (admin.orgs.selectedOrg) {
    const org = admin.orgs.selectedOrg;
    return (
      <OrgDetailView 
        org={org}
        onBack={() => admin.orgs.setSelectedOrg(null)}
        onAction={admin.users.handleAdminAction}
        onAddUser={() => {}} // Placeholder for future refined modal
        onDeleteOrg={admin.orgs.deleteOrg}
        onDeleteMember={(userId: string) => admin.users.handleAdminAction(userId, "delete-user", {})}
        onLoadChip={admin.chips.loadChipDetail}
        onAssignChip={(e) => { e.preventDefault(); admin.orgs.assignChipByShortCode(org.id, assignShortCode); }}
        assignShortCode={assignShortCode}
        setAssignShortCode={setAssignShortCode}
        bulkAssignCount={bulkAssignCount}
        setBulkAssignCount={setBulkAssignCount}
        onBulkAssign={(e) => { e.preventDefault(); admin.orgs.assignBulkChips(org.id, bulkAssignCount); }}
        formatDate={formatDate}
        statusColor={statusColor}
      />
    );
  }

  // ─── Actions ───────────────────────────────────────────────────────────────
  
  const handleExportCSV = () => {
    if (admin.tab === "chips" || admin.tab === "inventory") {
        exportToCSV(admin.chips.chips, `chips_export_${admin.tab}`, ["id", "serialPublic", "shortCode", "status", "productType", "createdAt"]);
        toast.success(`Lote de chips (${admin.tab}) exportado con éxito`);
    } else if (admin.tab === "users") {
        exportToCSV(admin.users.users, "users_export", ["id", "email", "role", "status", "createdAt"]);
        toast.success("Listado de usuarios exportado con éxito");
    } else {
        toast.error("Exportación no disponible para este módulo");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const ok = confirm(`¿Estás seguro de eliminar permanentemente a ${email}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    return admin.users.handleAdminAction(userId, "delete-user", { email });
  };

  // ─── Main Tabs View ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header Info */}
      <div className="bg-card border-b border-border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <Activity className="h-64 w-64 animate-pulse" />
        </div>

        <div className="max-w-7xl mx-auto px-8 py-10 relative z-10">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="h-1.5 w-8 bg-primary rounded-full" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary antialiased">Módulo Activo</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                   {currentTabInfo.title}
                </h1>
                <p className="text-sm font-bold text-muted-foreground mt-2 max-w-xl leading-relaxed">
                   {currentTabInfo.subtitle}
                </p>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <div className="relative group flex-1 md:flex-none">
                    <Search className="h-4 w-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      placeholder={currentTabInfo.placeholder}
                      value={admin.search.query}
                      className="bg-muted/30 border-2 border-transparent focus:border-primary/10 rounded-3xl pl-12 pr-8 py-4 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all w-full md:w-72 font-black uppercase tracking-widest placeholder:opacity-50"
                      onChange={(e) => admin.search.setQuery(e.target.value)}
                    />
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="min-h-[60vh]">
          {admin.tab === "dashboard" && (
            <DashboardSection 
              stats={admin.stats.stats}
              recentScans={admin.stats.recentScans}
              recentUsers={admin.stats.recentUsers}
              recentOrgs={admin.stats.recentOrgs}
              loading={admin.stats.loading}
              loadData={admin.stats.loadStats}
              loadChipDetail={admin.chips.loadChipDetail}
              setSelectedUser={admin.users.setSelectedUser}
              setSelectedOrg={admin.orgs.setSelectedOrg}
              loadUsers={admin.users.loadUsers}
              loadOrgDetail={admin.orgs.loadOrgDetail}
              setTab={admin.setTab}
            />
          )}

          {admin.tab === "chips" && (
            <ChipsSection 
              chips={admin.chips.chips}
              total={admin.chips.total}
              loading={admin.chips.loading}
              searchQuery={admin.search.query}
              setSearchQuery={admin.search.setQuery}
              statusFilter={admin.filters.status}
              setStatusFilter={admin.filters.setStatus}
              serviceFilter={admin.filters.service}
              setServiceFilter={admin.filters.setService}
              accountFilter={admin.filters.account}
              setAccountFilter={admin.filters.setAccount}
              loadChips={() => admin.chips.loadChips()}
              loadChipDetail={admin.chips.loadChipDetail}
              handleDeleteChip={admin.chips.deleteChip}
            />
          )}

          {admin.tab === "users" && (
            <UsersSection 
              users={admin.users.users}
              total={admin.users.total}
              loading={admin.users.loading}
              searchQuery={admin.search.query}
              setSearchQuery={admin.search.setQuery}
              loadUsers={() => admin.users.loadUsers()}
              setSelectedUser={admin.users.setSelectedUser}
              handleDeleteUser={handleDeleteUser}
              setTab={admin.setTab}
            />
          )}

          {admin.tab === "empresas" && (
            <OrganizationsSection 
              organizations={admin.orgs.organizations}
              tab={admin.tab}
              loading={admin.orgs.loading}
              setShowOrgModal={setShowOrgModal}
              loadOrgDetail={admin.orgs.loadOrgDetail}
              setAccountFilter={admin.filters.setAccount}
              setTab={admin.setTab}
              handleDeleteOrg={admin.orgs.deleteOrg}
            />
          )}

          {admin.tab === "inventory" && (
            <InventorySection 
              chips={admin.chips.chips}
              loading={admin.chips.loading}
              loadChips={() => admin.chips.loadChips({ status: "inventory" })}
              loadChipDetail={admin.chips.loadChipDetail}
              createCount={createCount}
              setCreateCount={setCreateCount}
              createBatch={(labelBase, labelStart) => {
                 admin.chips.createBatch(createCount, labelBase, labelStart).then(res => {
                    setCreatedBatch(res);
                    admin.chips.loadChips({ status: "inventory" });
                 });
              }}
              creating={admin.chips.creating}
              createdBatch={createdBatch}
              exportCSV={handleExportCSV}
              role={role}
            />
          )}

          {admin.tab === "governance" && (
            <GovernanceSection 
               stats={admin.stats.stats}
               loading={admin.stats.loading}
               loadStats={admin.stats.loadStats}
            />
          )}

          {admin.tab === "admins" && (
            <AdminsSection 
               admins={admin.users.adminUsers}
               loading={admin.users.loading}
               creating={admin.users.creating}
               loadAdmins={() => admin.users.loadAdminAccounts()}
               onCreateAdmin={admin.users.createAdmin}
               onUpdateAdmin={admin.users.updateAdmin}
               onDeleteAdmin={admin.users.deleteAdmin}
            />
          )}

          {admin.tab === "pedidos" && (
            <PedidosSection />
          )}

          {admin.tab === "tienda" && (
            <TiendaSection />
          )}

          {admin.tab === "settings" && (
            <SettingsSection />
          )}

          {admin.tab === "showcase" && (
            <ShowcaseProfileSection />
          )}

          {admin.tab === "roadmap" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Apple Wallet Card */}
                  <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet className="h-24 w-24" />
                     </div>
                     <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-6">
                        <Smartphone className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-xl font-black tracking-tighter mb-2">Apple & Google Wallet</h3>
                     <p className="text-xs text-muted-foreground font-bold leading-relaxed mb-6">
                        Integración nativa para descargar el Carnet Médico Digital como un pase de abordar. Acceso vital sin internet.
                     </p>
                     <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full">Cimientos Listos</span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">Sorpresa v4.0</span>
                     </div>
                  </div>

                  {/* PWA Card */}
                  <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="h-24 w-24" />
                     </div>
                     <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-6">
                        <Rocket className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-xl font-black tracking-tighter mb-2">PWA Offline (App Lite)</h3>
                     <p className="text-xs text-muted-foreground font-bold leading-relaxed mb-6">
                        Convertir la web en una App instalable que funcione en zonas remotas de Panamá sin señal de datos estable.
                     </p>
                     <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">Design Ready</span>
                     </div>
                  </div>

                  {/* Local Payments Card */}
                  <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Store className="h-24 w-24" />
                     </div>
                     <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6">
                        <Activity className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-xl font-black tracking-tighter mb-2">Yappy & ACH Local</h3>
                     <p className="text-xs text-muted-foreground font-bold leading-relaxed mb-6">
                        Módulo de carga de comprobantes y validación manual optimizada para el mercado Panameño.
                     </p>
                      <div className="flex items-center gap-2">
                         <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">Integrado</span>
                      </div>
                   </div>

                   {/* Authentication / Google Auth */}
                  <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Fingerprint className="h-24 w-24 text-blue-500" />
                     </div>
                     <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-6">
                        <Fingerprint className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-xl font-black tracking-tighter mb-2">Google Sign-In & Biometría</h3>
                     <p className="text-xs text-muted-foreground font-bold leading-relaxed mb-6">
                        Fricción cero. Implementación de NextAuth JWT para delegar el ingreso a Google sin dañar la integridad de facturación comercial actual.
                     </p>
                     <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">Investigado</span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">Próximamente</span>
                     </div>
                  </div>
                </div>

               <div className="bg-primary/5 rounded-[3rem] p-12 border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5">
                     <Sparkles className="h-32 w-32" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter mb-4 text-primary">PreRescate Labs</h2>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                     Estas funcionalidades están siendo construidas en paralelo a la estabilidad del núcleo actual. No están habilitadas para el público todavía para asegurar un lanzamiento impecable, pero el código base ya está preparado.
                  </p>
               </div>
            </div>
          )}

          {!["dashboard", "chips", "users", "empresas", "inventory", "admins", "pedidos", "tienda", "governance", "settings", "showcase"].includes(admin.tab) && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
               <Activity className="h-10 w-10 opacity-20 mb-4" />
               <p className="text-xs font-black uppercase tracking-widest">Módulo en mantenimiento.</p>
            </div>
          )}
        </div>
      </div>

      <OrgCreateModal 
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        onSubmit={admin.orgs.createOrg}
        loading={admin.orgs.creating}
      />
    </div>
  );
}
