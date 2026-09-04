"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { Search, Loader2, Activity } from "lucide-react";
import { getLegacyAdminTabTarget } from "@/lib/admin/operations-routing";

import { useAdminManager } from "./_hooks/useAdminManager";

import { DashboardSection } from "./_components/sections/DashboardSection";
import { ChipsSection } from "./_components/sections/ChipsSection";
import { UsersSection } from "./_components/sections/UsersSection";
import { OrganizationsSection } from "./_components/sections/OrganizationsSection";
import { OperationsCenterSection } from "./_components/sections/OperationsCenterSection";
import { AdminsSection } from "./_components/sections/AdminsSection";
import { SettingsSection } from "./_components/sections/SettingsSection";

import { ChipDetailView } from "./_components/details/ChipDetail";
import { UserDetailView } from "./_components/details/UserDetail";
import { OrgDetailView } from "./_components/details/OrgDetail";

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
  const { setTab } = admin;
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isPrintRole = role === "imprenta";
  const legacyOperationsTarget = getLegacyAdminTabTarget(admin.tab);
  const isOperationsTab = admin.tab === "inventory" || legacyOperationsTarget !== null;
  const operationsInitialTab = admin.tab === "inventory"
    ? admin.operations.tab
    : legacyOperationsTarget || "commercial";

  const dynamicLabels: Record<string, { title: string; placeholder: string }> = {
    dashboard: { title: "Dashboard", placeholder: "Buscar..." },
    users: { title: "Usuarios", placeholder: "Buscar por nombre o correo..." },
    chips: { title: "Identificadores", placeholder: "Buscar por código serial..." },
    empresas: { title: "Cuentas Corporativas", placeholder: "Buscar organización..." },
    inventory: { title: "Centro de Operaciones", placeholder: "Buscar pedido, unidad o despacho..." },
    admins: { title: "Administradores", placeholder: "Buscar administradores..." },
    settings: { title: "Ajustes", placeholder: "Buscar ajuste..." },
  };

  useEffect(() => {
    if (isPrintRole && admin.tab !== "inventory") {
      setTab("inventory");
    }
  }, [isPrintRole, admin.tab, setTab]);

  const currentTabInfo = dynamicLabels[isOperationsTab ? "inventory" : admin.tab] || {
    title: "Administración",
    placeholder: "Buscar...",
  };

  const headerWrapperClassName = isOperationsTab
    ? "w-full px-6 py-5 relative z-10"
    : "max-w-7xl mx-auto px-8 py-5 relative z-10";

  const mainWrapperClassName = isOperationsTab
    ? "w-full px-6 py-8"
    : "max-w-7xl mx-auto px-6 py-8";

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
      {!isOperationsTab && (
        <div className="bg-card border-b border-border shadow-sm">
          <div className={headerWrapperClassName}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentTabInfo.title}
              </h1>
              <div className="relative w-full md:w-72">
                <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={currentTabInfo.placeholder}
                  value={admin.search.query}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-bold outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/5 dark:border-slate-700 dark:bg-slate-900"
                  onChange={(e) => admin.search.setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
