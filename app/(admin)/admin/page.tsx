"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { Search, Loader2, Activity } from "lucide-react";
import { getLegacyAdminTabTarget } from "@/lib/admin/operations-routing";

// Domain & Hooks
import { useAdminManager } from "./_hooks/useAdminManager";

// Sections
import { DashboardSection } from "./_components/sections/DashboardSection";
import { ChipsSection } from "./_components/sections/ChipsSection";
import { UsersSection } from "./_components/sections/UsersSection";
import { OrganizationsSection } from "./_components/sections/OrganizationsSection";
import { OperationsCenterSection } from "./_components/sections/OperationsCenterSection";
import { AdminsSection } from "./_components/sections/AdminsSection";
import { SettingsSection } from "./_components/sections/SettingsSection";

// Details
import { ChipDetailView } from "./_components/details/ChipDetail";
import { UserDetailView } from "./_components/details/UserDetail";
import { OrgDetailView } from "./_components/details/OrgDetail";

// Modals
import { OrgCreateModal } from "./_components/modals/OrgCreateModal";
import { ComboSelectorModal } from "./_components/modals/ComboSelectorModal";

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

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();

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
  const isPrintRole = role === "imprenta";
  const legacyOperationsTarget = getLegacyAdminTabTarget(admin.tab);
  const isOperationsTab = admin.tab === "inventory" || legacyOperationsTarget !== null;
  const operationsInitialTab = admin.tab === "inventory"
    ? admin.operations.tab
    : legacyOperationsTarget || "commercial";

  const dynamicLabels: Record<string, { title: string; subtitle: string; placeholder: string }> = {
    dashboard: {
      title: "Dashboard de Control",
      subtitle: "Métricas críticas y monitoreo de salud del ecosistema",
      placeholder: "Analizar métricas...",
    },
    users: {
      title: "Usuarios & Perfiles",
      subtitle: "Gestión de perfiles vitales y cuentas de usuario",
      placeholder: "Buscar por nombre o correo...",
    },
    chips: {
      title: "Identificadores (Chips)",
      subtitle: "Control maestro de chips digitales y estado de servicio",
      placeholder: "Buscar por código serial...",
    },
    empresas: {
      title: "Cuentas Corporativas",
      subtitle: "Administración de entidades, colegios y flotas",
      placeholder: "Buscar organización...",
    },
    inventory: {
      title: "Centro de Operaciones",
      subtitle: "Pedidos, producción, inventario y despachos",
      placeholder: "Buscar pedido, unidad o despacho...",
    },
    admins: {
      title: "Administradores",
      subtitle: "Control de acceso y auditoría administrativa",
      placeholder: "Buscar administradores...",
    },
    settings: {
      title: "Ajustes del Sistema",
      subtitle: "Configuración global de la plataforma, pagos y comunicaciones",
      placeholder: "Buscar ajuste...",
    },
  };

  useEffect(() => {
    if (isPrintRole && admin.tab !== "inventory") {
      admin.setTab("inventory");
    }
  }, [isPrintRole, admin.tab, admin.setTab]);

  const currentTabInfo = dynamicLabels[isOperationsTab ? "inventory" : admin.tab] || {
    title: "Módulo en Gestión",
    subtitle: "Infraestructura PreRescatePTY v3.1",
    placeholder: "Buscar...",
  };

  const headerWrapperClassName = isOperationsTab
    ? "w-full px-6 py-10 relative z-10"
    : "max-w-7xl mx-auto px-8 py-10 relative z-10";

  const mainWrapperClassName = isOperationsTab
    ? "w-full px-6 py-10"
    : "max-w-7xl mx-auto px-6 py-10";

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);

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
        onAddUser={() => {}}
        onDeleteOrg={admin.orgs.deleteOrg}
        onDeleteMember={(userId: string) => admin.users.handleAdminAction(userId, "delete-user", {})}
        onLoadChip={admin.chips.loadChipDetail}
        onUpdateOrg={admin.orgs.updateOrganization}
        formatDate={formatDate}
        statusColor={statusColor}
      />
    );
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    const ok = confirm(`¿Estás seguro de eliminar permanentemente a ${email}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    return admin.users.handleAdminAction(userId, "delete-user", { email });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Activity className="h-64 w-64 animate-pulse" />
        </div>

        <div className={headerWrapperClassName}>
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

      <div className={mainWrapperClassName}>
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
              loading={admin.orgs.loading}
              setShowOrgModal={setShowOrgModal}
              loadOrgDetail={admin.orgs.loadOrgDetail}
              setAccountFilter={admin.filters.setAccount}
              setTab={admin.setTab}
              handleDeleteOrg={admin.orgs.deleteOrg}
            />
          )}

          {isOperationsTab && (
            <OperationsCenterSection
              role={role}
              initialTab={operationsInitialTab}
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

          {admin.tab === "settings" && <SettingsSection />}

          {!["dashboard", "chips", "users", "empresas", "inventory", "admins", "pedidos", "tienda", "settings"].includes(admin.tab) && (
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
