"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, Cpu, Users, Scan as ScanIcon, Plus, Loader2,
  Download, ChevronLeft, ExternalLink, Printer, Copy, Check,
  Search, Shield, Activity, Bell, QrCode, Smartphone, Eye,
  LogOut, ArrowLeft, Clock, MapPin, AlertTriangle, TrendingUp,
  RefreshCw, Building2, ShieldCheck, ShieldOff, User
} from "lucide-react";
import { signOut } from "next-auth/react";

// ─── Utility Components ─────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-card hover:shadow-sm transition-all">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Icon className={`h-4 w-4 ${color}`} /> {label}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground whitespace-nowrap mr-4">{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge}`}>{value}</span>
      ) : (
        <span className={`text-right font-medium ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
      )}
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChipAdmin {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: string;
  serviceStatus: string;
  serviceEndDate: string | null;
  serviceStartDate: string | null;
  activatedAt: string | null;
  lastScanAt: string | null;
  ownerUserId: string | null;
  nfcUrl: string;
  qrUrl: string;
  batchId: string | null;
  productType: string;
  nicheType: string;
  createdAt: string;
  owner: { email: string } | null;
  assignedProfile: { firstName: string; lastName: string } | null;
  claimTokens: { activationCode: string; usedAt: string | null }[];
  _count: { scanEvents: number };
}

interface ChipDetail extends ChipAdmin {
  assignedProfile: {
    firstName: string;
    lastName: string;
    bloodType: string;
    allergies: string;
    chronicConditions: string;
    medications: string;
    additionalNotes: string;
    emergencyContacts: { fullName: string; relationship: string; phone: string; email: string | null }[];
  } | null;
  scanEvents: {
    id: string;
    scannedAt: string;
    sourceType: string;
    ipAddress: string;
    city: string | null;
    country: string | null;
    notificationStatus: string;
  }[];
  _count: { scanEvents: number; notifications: number };
}

interface UserAdmin {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  accountId: string | null;
  account?: {
    id: string;
    packageId: string | null;
    maxChipsAllocated: number;
    accountType: string;
    package: { name: string } | null;
    chips?: ChipAdmin[];
  } | null;
  profile: { firstName: string; lastName: string; bloodType: string } | null;
  _count: { chips: number };
}


interface Stats {
  totalUsers: number;
  totalChips: number;
  totalProfiles: number;
  totalScans: number;
  totalNotifications: number;
  chipsByStatus: { activated: number; inventory: number; suspended: number; sold: number };
  chipsByService: { active: number; limited: number };
}

interface OrganizationAdmin {
  id: string;
  accountId: string;
  legalName: string;
  displayName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  taxId: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  _count: { members: number };
  account?: {
    maxChipsAllocated: number;
    package?: { name: string } | null;
    chips?: ChipAdmin[];
    users?: UserAdmin[];
  };
}

interface AdminAccount {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

type Tab = "dashboard" | "chips" | "users" | "empresas" | "admins" | "create" | "inventory";

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [chips, setChips] = useState<ChipAdmin[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createCount, setCreateCount] = useState(5);
  const [creating, setCreating] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<{ id: string; serialPublic: string; shortCode: string; activationCode: string; nfcUrl: string; qrUrl: string }[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChip, setSelectedChip] = useState<ChipDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState("");

  // Auth guard
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "admin" && role !== "superadmin")) {
    redirect("/login");
  }

  return <AdminDashboard session={session} />;
}

function AdminDashboard({ session }: { session: any }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [chips, setChips] = useState<ChipAdmin[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inventoryChips, setInventoryChips] = useState<ChipAdmin[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [bulkAssignCount, setBulkAssignCount] = useState(10);
  const [createCount, setCreateCount] = useState(5);
  const [creating, setCreating] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<{ id: string; serialPublic: string; shortCode: string; activationCode: string; nfcUrl: string; qrUrl: string }[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChip, setSelectedChip] = useState<ChipDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState("");
  const [reactivating, setReactivating] = useState(false);
  
  const [organizations, setOrganizations] = useState<OrganizationAdmin[]>([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrgData, setNewOrgData] = useState({ legalName: "", displayName: "", contactEmail: "", maxChips: 30, ownerEmail: "", ownerPassword: "" });
  
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);

  // Admin accounts
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ email: "", password: "", role: "admin" });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [selectedPlanPackage, setSelectedPlanPackage] = useState("");
  const [manualMaxChips, setManualMaxChips] = useState(1);
  const [packages, setPackages] = useState<any[]>([]);

  // Organization detail
  const [selectedOrg, setSelectedOrg] = useState<OrganizationAdmin | null>(null);
  const [loadingOrgDetail, setLoadingOrgDetail] = useState(false);
  const [newOrgUser, setNewOrgUser] = useState({ email: "", password: "", phone: "", role: "member" });
  const [assignShortCode, setAssignShortCode] = useState("");

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data.stats);
      setRecentScans(data.recentScans || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadChips = useCallback(async () => {
    setLoading(true);
    let url = `/api/admin/chips?limit=50`;
    if (statusFilter) url += `&status=${statusFilter}`;
    if (serviceFilter) url += `&serviceStatus=${serviceFilter}`;
    if (searchQuery) url += `&search=${searchQuery}`;
    if (accountFilter) url += `&accountId=${accountFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setChips(data.chips || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [statusFilter, serviceFilter, searchQuery, accountFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    let url = `/api/admin/users?limit=50`;
    if (searchQuery) url += `&search=${searchQuery}`;
    const res = await fetch(url);
    const data = await res.json();
    setUsers(data.users || []);
    setUsersTotal(data.total || 0);
    setLoading(false);
  }, [searchQuery]);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/organizations");
    const data = await res.json();
    setOrganizations(data.organizations || []);
    setLoading(false);
  }, []);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory?limit=200`);
    const data = await res.json();
    setInventoryChips(data.chips || []);
    setInventoryTotal(data.total || 0);
    setLoading(false);
  }, []);

  const loadData = useCallback(() => {
    if (tab === "dashboard") loadStats();
    if (tab === "chips" || tab === "create") loadChips();
    if (tab === "users") loadUsers();
    if (tab === "empresas") loadOrganizations();
    if (tab === "admins") loadAdmins();
    if (tab === "inventory") loadInventory();
  }, [tab, loadStats, loadChips, loadUsers, loadOrganizations, loadAdmins, loadInventory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function reactivateChip(chipId: string) {
    if (!confirm("¿Reactivar este chip por 2 años más? El usuario podrá editar su perfil y contactos nuevamente.")) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/admin/chips/${chipId}/reactivate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Chip reactivado exitosamente. Nuevo vencimiento: ${new Date(data.chip.serviceEndDate).toLocaleDateString("es-PA")}`);
        if (selectedChip && selectedChip.id === chipId) {
          setSelectedChip({ ...selectedChip, serviceStatus: "active", serviceEndDate: data.chip.serviceEndDate });
        }
        loadChips();
      } else {
        alert(data.error || "Error al reactivar chip");
      }
    } catch (e) {
      console.error(e);
      alert("Error al conectar con el servidor");
    } finally {
      setReactivating(false);
    }
  }

  async function loadChipDetail(chipId: string) {
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/chips/${chipId}`);
    const data = await res.json();
    setSelectedChip(data.chip);
    setLoadingDetail(false);
  }

  async function loadOrgDetail(orgId: string) {
    setLoadingOrgDetail(true);
    const res = await fetch(`/api/admin/organizations/${orgId}`);
    const data = await res.json();
    setSelectedOrg(data.organization);
    setLoadingOrgDetail(false);
  }

  const loadPackages = async () => {
    try {
      const res = await fetch("/api/admin/packages");
      const data = await res.json();
      if (res.ok) setPackages(data.packages || []);
    } catch (e) { console.error(e); }
  };

  const handleAdminAction = async (userId: string, action: string, data: any) => {
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(result.message || "Acción completada con éxito");
      
      // Refresh relevant data
      if (selectedUser) loadUsers();
      if (selectedOrg) loadOrgDetail(selectedOrg.id);
      
      return true;
    } catch (e: any) {
      alert("Error: " + e.message);
      return false;
    } finally {
      setCreating(false);
    }
  };


  async function handleCreateOrg(e: any) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrgData)
    });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ Organización creada exitosamente\n\nCredenciales del administrador:\nEmail: ${newOrgData.ownerEmail}\nContraseña: ${newOrgData.ownerPassword}`);
      setShowOrgModal(false);
      setNewOrgData({ legalName: "", displayName: "", contactEmail: "", maxChips: 30, ownerEmail: "", ownerPassword: "" });
      loadOrganizations();
    } else {
      alert(data.error || "Error al crear organización");
    }
    setCreating(false);
  }

  async function handleAddOrgUser(e: any) {
    e.preventDefault();
    if (!selectedOrg) return;
    setCreating(true);
    const res = await fetch(`/api/admin/organizations/${selectedOrg.id}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrgUser)
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ Usuario añadido exitosamente");
      setShowAddUserModal(false);
      loadOrgDetail(selectedOrg.id);
    } else {
      alert(data.error || "Error al añadir usuario");
    }
    setCreating(false);
  }

  async function handleBulkAssign(e: any) {
    e.preventDefault();
    if (!selectedOrg) return;
    if (!confirm(`¿Transferir ${bulkAssignCount} chips desde el inventario vírgen a ${selectedOrg.legalName}?`)) return;
    setCreating(true);
    const res = await fetch(`/api/admin/organizations/${selectedOrg.id}/assign-bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: parseInt(bulkAssignCount as unknown as string, 10) })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadOrgDetail(selectedOrg.id);
    } else {
      alert(data.error || "Error al transferir chips masivamente");
    }
    setCreating(false);
  }

  async function handleToggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    if (!confirm(`¿Estás seguro de ${newStatus === "active" ? "activar" : "bloquear"} a este usuario?`)) return;
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      if (selectedUser) setSelectedUser({ ...selectedUser, status: newStatus });
      if (selectedOrg) loadOrgDetail(selectedOrg.id);
      loadUsers();
    }
  }

  async function handleCreateAdmin(e: any) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAdminData)
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ Cuenta administrativa creada");
      setShowAdminModal(false);
      loadAdmins();
      setNewAdminData({ email: "", password: "", role: "admin" });
    } else {
      alert(data.error || "Error al crear administrador");
    }
    setCreating(false);
  }

  async function handleToggleAdmin(adminId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    if (!confirm(`¿${newStatus === "active" ? "Activar" : "Desactivar"} este administrador?`)) return;
    const res = await fetch(`/api/admin/admins/${adminId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      loadAdmins();
    }
  }

  async function handleToggleChipStatus(chipId: string, currentStatus: string) {
    const newStatus = currentStatus === "activated" ? "suspended" : "activated";
    if (!confirm(`¿Estás seguro de ${newStatus === "activated" ? "activar" : "suspender"} este chip?`)) return;
    const res = await fetch(`/api/admin/chips/${chipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      if (selectedChip && selectedChip.id === chipId) setSelectedChip({ ...selectedChip, status: newStatus });
      if (selectedOrg) loadOrgDetail(selectedOrg.id);
      loadChips();
    }
  }

  async function handleAssignChip(chipId: string, accountId: string | null) {
    const res = await fetch(`/api/admin/chips/${chipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId })
    });
    if (res.ok) {
      if (selectedOrg) loadOrgDetail(selectedOrg.id);
      loadChips();
    }
  }

  async function assignChipByCode(e: any) {
    e.preventDefault();
    if (!selectedOrg || !assignShortCode) return;
    setCreating(true);
    try {
      // Find chip by code first
      const sRes = await fetch(`/api/admin/chips?search=${assignShortCode}`);
      const sData = await sRes.json();
      const chip = sData.chips.find((c: any) => c.shortCode === assignShortCode || c.serialPublic === assignShortCode);
      
      if (!chip) { throw new Error("Chip no encontrado"); }
      if (chip.accountId && !confirm("Questo chip già appartiene a un'altra organizzazione. Spostarlo?")) { return; }

      const res = await fetch(`/api/admin/chips/${chip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedOrg.accountId })
      });
      if (res.ok) {
        alert("✅ Chip asignado exitosamente");
        setAssignShortCode("");
        loadOrgDetail(selectedOrg.id);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Error al asignar chip");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function createBatch(e: any) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: createCount })
    });
    const data = await res.json();
    if (res.ok) {
      setCreatedBatch(data.chips);
      loadChips();
    }
    setCreating(false);
  }

  function exportCSV() {
    if (!createdBatch) return;
    const headers = ["Serial Public", "Short Code", "Activation Code", "QR URL"];
    const rows = createdBatch.map(c => [c.serialPublic, c.shortCode, c.activationCode, c.qrUrl]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `chips_batch_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text || "");
    setCopied(text || "");
    setTimeout(() => setCopied(""), 2000);
  }

  // ─── User Detail View ───────────────────────────────────────────────────────

  if (selectedUser) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSelectedUser(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Volver a Usuarios
            </button>
            <span className="text-xs text-muted-foreground font-mono">{selectedUser.email}</span>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" /> {selectedUser.profile ? `${selectedUser.profile.firstName} ${selectedUser.profile.lastName}` : "Usuario sin Perfil Médico"}
                </h2>
                <p className="text-muted-foreground mt-1">{selectedUser.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedUser.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {selectedUser.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <InfoRow label="Añadido" value={formatDate(selectedUser.createdAt)} />
              <InfoRow label="Teléfono" value={selectedUser.phone || "—"} />
              <InfoRow label="Último Ingreso" value={selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : "Nunca"} />
              <InfoRow label="Sangre" value={selectedUser.profile?.bloodType || "Desconocido"} badge={selectedUser.profile?.bloodType ? "bg-red-100 text-red-700" : undefined} />
              <InfoRow label="Rol" value={selectedUser.role} />
              <InfoRow label="Chips Asignados" value={String(selectedUser._count.chips)} />
            </div>

            <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                        setTempPassword("");
                        setShowResetPasswordModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 transition-all border border-orange-200"
                  >
                    <ShieldCheck className="h-4 w-4" /> Reset Contraseña
                  </button>
                  
                  <button 
                    onClick={() => {
                        setSelectedPlanPackage(selectedUser.account?.packageId || "");
                        setManualMaxChips(selectedUser.account?.maxChipsAllocated || 1);
                        setShowEditPlanModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-all border border-blue-200"
                  >
                    <Activity className="h-4 w-4" /> Cambiar Plan / Tope
                  </button>

                  <button 
                    onClick={() => {
                        if (confirm("¿Estás seguro de convertir esta cuenta personal en una cuenta de Empresa?")) {
                            handleAdminAction(selectedUser.id, "convert-to-org", {});
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition-all border border-purple-200"
                  >
                    <Building2 className="h-4 w-4" /> Convertir a Empresa
                  </button>
                </div>

                <div className="pt-2">
                    <button 
                    onClick={() => loadUsers()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                    <RefreshCw className="h-4 w-4" /> Actualizar Datos
                    </button>
                </div>
          </div>

          <div className="pt-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> Chips Asignados</h3>
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
                {selectedUser.account?.chips && selectedUser.account.chips.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm shrink-0">
                            <thead className="border-b border-border text-muted-foreground bg-muted/50">
                                <tr>
                                    <th className="text-left py-2 px-3 font-medium">Serial / ShortCode</th>
                                    <th className="text-left py-2 px-3 font-medium">Estado</th>
                                    <th className="text-left py-2 px-3 font-medium">Asignado</th>
                                    <th className="text-right py-2 px-3 font-medium">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedUser.account.chips.map((chip: any) => (
                                    <tr key={chip.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                        <td className="py-2 px-3">
                                            <span className="font-mono">{chip.serialPublic}</span><br />
                                            <span className="font-bold">{chip.shortCode}</span>
                                        </td>
                                        <td className="py-2 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${chip.status === 'activated' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{chip.status}</span>
                                        </td>
                                        <td className="py-2 px-3">{formatDate(chip.assignedAt || chip.createdAt)}</td>
                                        <td className="py-2 px-3 text-right">
                                            <button onClick={() => { setSelectedUser(null); loadChipDetail(chip.id); }} className="text-primary text-xs hover:underline font-semibold">Ver detalle</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-6 italic text-sm">No tiene chips asignados actualmente.</p>
                )}
            </div>
          </div>
        </div>

        {showResetPasswordModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border border-border">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-600">
                <ShieldCheck className="h-6 w-6" /> Resetear Contraseña
              </h3>
              <p className="text-sm text-muted-foreground mb-6">Nueva contraseña en texto plano para <strong>{selectedUser.email}</strong></p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Nueva Contraseña</label>
                  <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="ContraseñaTemporal123" className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-3 focus:outline-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowResetPasswordModal(false)} className="flex-1 py-3 font-bold text-muted-foreground hover:bg-muted rounded-2xl">Cancelar</button>
                  <button onClick={async () => { if (await handleAdminAction(selectedUser.id, "reset-password", { password: tempPassword })) setShowResetPasswordModal(false); }} disabled={!tempPassword || creating} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 disabled:opacity-50">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditPlanModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border border-border">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-600">
                <Activity className="h-6 w-6" /> Modificar Plan
              </h3>
              <p className="text-sm text-muted-foreground mb-6">Modificar plan asignado a <strong>{selectedUser.email}</strong></p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Paquete Sugerido</label>
                  <select value={selectedPlanPackage} onChange={e => setSelectedPlanPackage(e.target.value)} className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-3 focus:outline-none">
                    <option value="">(Sin Paquete Específico)</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.maxChips} chips)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Tope de Chips</label>
                  <input type="number" value={manualMaxChips} onChange={e => setManualMaxChips(parseInt(e.target.value))} className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-3 focus:outline-none" />
                  <p className="text-[10px] text-muted-foreground mt-1">Límite absoluto para su contenedor.</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowEditPlanModal(false)} className="flex-1 py-3 font-bold text-muted-foreground hover:bg-muted rounded-2xl">Cancelar</button>
                  <button onClick={async () => { if (await handleAdminAction(selectedUser.id, "update-plan", { packageId: selectedPlanPackage, maxChips: manualMaxChips })) setShowEditPlanModal(false); }} disabled={creating} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Organization Detail View ────────────────────────────────────────────────

  if (selectedOrg) {
    const orgChips = selectedOrg.account?.chips || [];
    const orgUsers = selectedOrg.account?.users || [];
    const chipsActivated = orgChips.filter(c => c.status === "activated").length;
    const chipsInventory = orgChips.filter(c => c.status === "inventory").length;

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSelectedOrg(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Volver a Empresas
            </button>
            <span className="text-xs text-muted-foreground font-mono">{selectedOrg.legalName}</span>
          </div>
        </header>

        {loadingOrgDetail ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Org Details */}
              <div className="md:col-span-1 p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-primary" /> {selectedOrg.legalName}
                    </h2>
                    <p className="text-muted-foreground mt-1">{selectedOrg.displayName || selectedOrg.legalName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedOrg.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {selectedOrg.status}
                  </span>
                </div>

                <div className="space-y-4 text-sm mb-6">
                  <InfoRow label="Email Contacto" value={selectedOrg.contactEmail || "—"} />
                  <InfoRow label="Teléfono" value={selectedOrg.contactPhone || "—"} />
                  <InfoRow label="RUC / Tax ID" value={selectedOrg.taxId || "—"} />
                  <InfoRow label="Dirección" value={selectedOrg.address || "—"} />
                  <InfoRow label="Fecha Registro" value={formatDate(selectedOrg.createdAt)} />
                  <InfoRow label="Paquete" value={selectedOrg.account?.package?.name || "Sin paquete"} />
                  <InfoRow label="Chips Máximos" value={String(selectedOrg.account?.maxChipsAllocated || 0)} />
                </div>
              </div>

              {/* Org Stats */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Uso de Chips</h3>
                  <div className="space-y-4">
                    <BarRow label="Chips Utilizados" value={chipsActivated} total={orgChips.length} color="bg-primary" />
                    <BarRow label="Chips en Inventario" value={chipsInventory} total={orgChips.length} color="bg-blue-500" />
                    <div className="pt-2 flex justify-between text-xs font-bold border-t border-border mt-2">
                      <span>TOTAL ASIGNADOS:</span>
                      <span>{orgChips.length} Chips</span>
                    </div>

                    <h4 className="text-[10px] font-bold uppercase text-muted-foreground mt-4 mb-2">Asignar Nuevo Chip Individual</h4>
                    <form onSubmit={assignChipByCode} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="ShortCode o Serial" 
                        className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        value={assignShortCode}
                        onChange={(e) => setAssignShortCode(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        disabled={creating || !assignShortCode}
                        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-bold disabled:opacity-50"
                      >
                        {creating ? "..." : "Asignar"}
                      </button>
                    </form>

                    <h4 className="text-[10px] font-bold uppercase text-muted-foreground mt-4 mb-2">Asignar Lote Aleatorio Masivo</h4>
                    <form onSubmit={handleBulkAssign} className="flex gap-2">
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Cant." 
                        className="w-20 bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        value={bulkAssignCount}
                        onChange={(e) => setBulkAssignCount(Number(e.target.value))}
                      />
                      <button 
                        type="submit" 
                        disabled={creating || bulkAssignCount < 1}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-bold disabled:opacity-50"
                      >
                        {creating ? "..." : "Transferir Chips Vírgenes"}
                      </button>
                    </form>
                  </div>
                </div>
                
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Administración Interna</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Usuarios / Miembros</span>
                      <span className="font-bold">{orgUsers.length}</span>
                    </div>
                    <button 
                      onClick={() => setShowAddUserModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" /> Añadir Miembro / HR
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for chips/users in Org */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> Chips de la Organización</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-3 font-medium">Serial/Short</th>
                        <th className="text-left py-3 font-medium">Código/QR</th>
                        <th className="text-left py-3 font-medium">Estado</th>
                        <th className="text-left py-3 font-medium">Vencimiento</th>
                        <th className="text-right py-3 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgChips.length > 0 ? orgChips.map(c => (
                        <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3">
                            <span className="font-mono text-xs">{c.serialPublic}</span>
                            <div className="text-[10px] text-muted-foreground">{c.shortCode}</div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1 items-start">
                              {c.claimTokens && c.claimTokens.length > 0 ? (
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200">
                                  {c.claimTokens[0].activationCode}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Sin Código</span>
                              )}
                              <button
                                onClick={() => window.open(`/qr/${c.shortCode}`, "_blank")}
                                className="flex items-center gap-1 text-[10px] text-primary hover:underline hover:text-primary/80 mt-1"
                                title="Ver código QR"
                              >
                                <QrCode className="h-3 w-3" /> Imprimir QR
                              </button>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(c.status)}`}>{c.status}</span>
                          </td>
                          <td className="py-3">{c.serviceEndDate ? formatDate(c.serviceEndDate) : "—"}</td>
                          <td className="py-3 text-right flex justify-end gap-2">
                            <button onClick={() => loadChipDetail(c.id)} className="text-primary hover:underline text-xs font-semibold">Perfil</button>
                            <button 
                              onClick={() => handleToggleChipStatus(c.id, c.status)} 
                              className={`${c.status === "activated" ? "text-amber-600" : "text-success"} hover:underline text-xs font-semibold`}
                            >
                              {c.status === "activated" ? "Suspender" : "Activar"}
                            </button>
                            <button 
                              onClick={() => {
                                if(confirm("¿Quitar este chip de la organización? Se volverá un chip individual.")) {
                                  handleAssignChip(c.id, null);
                                }
                              }} 
                              className="text-destructive hover:underline text-xs font-semibold"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="py-8 text-center text-muted-foreground italic">No hay chips asignados a esta organización todavía.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Miembros con Acceso al Panel</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-3 font-medium">Usuario</th>
                        <th className="text-left py-3 font-medium">Rol</th>
                        <th className="text-left py-3 font-medium">Estado</th>
                        <th className="text-right py-3 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUsers.length > 0 ? orgUsers.map(u => (
                        <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-medium">{u.email}</td>
                          <td className="py-3 text-xs uppercase text-muted-foreground">{u.role}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 text-right flex justify-end gap-3">
                            <button onClick={() => handleToggleUserStatus(u.id, u.status)} className={`${u.status === "active" ? "text-destructive" : "text-success"} hover:underline font-medium`}>
                              {u.status === "active" ? "Bloquear" : "Activar"}
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground italic">No hay miembros registrados.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddUserModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border border-border">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-indigo-600">
                <Users className="h-6 w-6" /> Añadir Miembro / HR
              </h3>
              <p className="text-sm text-muted-foreground mb-6">Nuevo miembro para <strong>{selectedOrg.legalName}</strong></p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Email Nuevo Usuario</label>
                  <input 
                    type="email" 
                    value={newOrgUser.email} 
                    onChange={e => setNewOrgUser({...newOrgUser, email: e.target.value})}
                    placeholder="correo@empresa.com"
                    className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Contraseña Temporal</label>
                  <input 
                    type="text" 
                    value={newOrgUser.password} 
                    onChange={e => setNewOrgUser({...newOrgUser, password: e.target.value})}
                    placeholder="ContraseñaTemporal123"
                    className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-3 focus:outline-none"
                  />
                </div>
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Rol Corporativo</label>
                    <select 
                    value={newOrgUser.role}
                    onChange={e => setNewOrgUser({...newOrgUser, role: e.target.value})}
                    className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-3 focus:outline-none"
                    >
                        <option value="member">Miembro / Empleado</option>
                        <option value="owner">Admin de Empresa (HR)</option>
                    </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddUserModal(false)} className="flex-1 py-3 font-bold text-muted-foreground hover:bg-muted rounded-2xl">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (await handleAdminAction(selectedOrg.id, "add-member", newOrgUser)) {
                        setShowAddUserModal(false);
                      }
                    }}
                    disabled={!newOrgUser.email || !newOrgUser.password || creating}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    Invitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Chip Detail View ───────────────────────────────────────────────────────

  if (selectedChip) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSelectedChip(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Volver a Chips
            </button>
            <span className="text-xs text-muted-foreground font-mono">{selectedChip.serialPublic}</span>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-3 flex-shrink-0">
              <div className="w-48 h-48 mx-auto bg-white rounded-xl p-2 border-2 border-dashed border-gray-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedChip.qrUrl)}&bgcolor=fff&color=000&margin=8`}
                  alt={`QR ${selectedChip.shortCode}`}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-mono text-lg font-bold tracking-wider text-gray-900">{selectedChip.shortCode}</p>
            </div>

            <div className="flex-1 space-y-4">
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> Información del Chip
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Serial" value={selectedChip.serialPublic} mono />
                  <InfoRow label="Estado" value={selectedChip.status} badge={statusColor(selectedChip.status)} />
                  <InfoRow label="Servicio" value={selectedChip.serviceStatus} badge={serviceColor(selectedChip.serviceStatus)} />
                  <InfoRow label="Vencimiento" value={selectedChip.serviceEndDate ? formatDate(selectedChip.serviceEndDate) : "—"} />
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => reactivateChip(selectedChip.id)}
                  disabled={reactivating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-success text-white font-semibold hover:bg-success/90 transition-all shadow-sm disabled:opacity-50"
                >
                  {reactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Renovar / Reactivar Chip (2 Años)
                </button>
                
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Perfil Médico</h3>
                  {selectedChip.assignedProfile ? (
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Nombre:</span> {selectedChip.assignedProfile.firstName} {selectedChip.assignedProfile.lastName}</p>
                      <p><span className="text-muted-foreground">Sangre:</span> <span className="font-bold text-red-600">{selectedChip.assignedProfile.bloodType}</span></p>
                      <p><span className="text-muted-foreground">Alergias:</span> {selectedChip.assignedProfile.allergies || "—"}</p>
                      <p><span className="text-muted-foreground">Condiciones:</span> {selectedChip.assignedProfile.chronicConditions || "—"}</p>
                      <p><span className="text-muted-foreground">Medicamentos:</span> {selectedChip.assignedProfile.medications || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin perfil asignado</p>
                  )}
                </div>
                </div>
              </div>
            </div>

          {/* Emergency Contacts */}
          {selectedChip.assignedProfile?.emergencyContacts && selectedChip.assignedProfile.emergencyContacts.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-green-500" /> Contactos de Emergencia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedChip.assignedProfile.emergencyContacts.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20">
                    <p className="font-semibold text-sm">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.relationship}</p>
                    <p className="text-xs font-mono mt-1">{c.phone}</p>
                    {c.email && <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Scans */}
          {selectedChip.scanEvents && selectedChip.scanEvents.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><ScanIcon className="h-4 w-4 text-primary" /> Últimos Escaneos</h3>
              <div className="space-y-2">
                {selectedChip.scanEvents.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${scan.sourceType === "nfc" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                        {scan.sourceType}
                      </span>
                      <span>{formatDate(scan.scannedAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {scan.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {scan.city}</span>}
                      <span className="font-mono">{scan.ipAddress?.substring(0, 15)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to Public View */}
          <div className="text-center pb-8">
            <a
              href={`/e/${selectedChip.shortCode}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg"
            >
              <Eye className="h-5 w-5" /> Ver Vista Pública de Emergencia
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Admin Layout ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Admin — PreRescate PTY</span>
            <span className="sm:hidden">Admin</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{session.user?.email}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase">
              {(session.user as { role?: string })?.role}
            </span>
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground">Sitio</a>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {([
            { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
            { key: "chips" as const, label: "Chips", icon: Cpu },
            { key: "users" as const, label: "Usuarios", icon: Users },
            { key: "empresas" as const, label: "Empresas", icon: Building2 },
            { key: "inventory" as const, label: "Inventario Vírgen", icon: Activity },
            { key: "admins" as const, label: "Admins", icon: Shield },
            { key: "create" as const, label: "Crear Lote", icon: Plus },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ─── Dashboard Tab ──────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            {!stats ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Usuarios Registrados" value={stats.totalUsers} icon={Users} color="text-primary" />
                  <StatCard label="Total Chips" value={stats.totalChips} icon={Cpu} color="text-primary" />
                  <StatCard label="Chips Activados" value={stats.chipsByStatus.activated} icon={Activity} color="text-success" />
                  <StatCard label="Total Escaneos" value={stats.totalScans} icon={ScanIcon} color="text-amber-500" />
                </div>

                {/* Chip Status Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Estado de Chips</h3>
                    <div className="space-y-3">
                      <BarRow label="En Inventario" value={stats.chipsByStatus.inventory} total={stats.totalChips} color="bg-blue-500" />
                      <BarRow label="Activados" value={stats.chipsByStatus.activated} total={stats.totalChips} color="bg-emerald-500" />
                      <BarRow label="Vendidos" value={stats.chipsByStatus.sold} total={stats.totalChips} color="bg-amber-500" />
                      <BarRow label="Suspendidos" value={stats.chipsByStatus.suspended} total={stats.totalChips} color="bg-red-500" />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> Servicios Activos</h3>
                    <div className="space-y-3">
                      <BarRow label="Servicio Activo" value={stats.chipsByService.active} total={stats.chipsByStatus.activated} color="bg-emerald-500" />
                      <BarRow label="Modo Limitado" value={stats.chipsByService.limited} total={stats.chipsByStatus.activated} color="bg-orange-500" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Perfiles:</span> <span className="font-semibold">{stats.totalProfiles}</span></div>
                      <div><span className="text-muted-foreground">Notificaciones:</span> <span className="font-semibold">{stats.totalNotifications}</span></div>
                    </div>
                  </div>
                </div>

                {/* Recent Scans */}
                {recentScans.length > 0 && (
                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Últimos Escaneos (Plataforma)</h3>
                    <div className="space-y-2">
                      {recentScans.slice(0, 8).map((scan: any) => (
                        <div key={scan.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${scan.sourceType === "nfc" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                              {scan.sourceType}
                            </span>
                            <span className="font-mono text-xs">{scan.chip?.shortCode}</span>
                            <span className="text-muted-foreground">{formatDate(scan.scannedAt)}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            scan.notificationStatus === "sent" ? "bg-success/10 text-success" :
                            scan.notificationStatus === "failed" ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          }`}>{scan.notificationStatus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Chips Tab ──────────────────────────────────────────────── */}
        {tab === "chips" && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Buscar serial o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadChips()}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Estado: Todos</option>
                <option value="inventory">Inventario</option>
                <option value="sold">Vendido</option>
                <option value="activated">Activado</option>
                <option value="suspended">Suspendido</option>
              </select>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Servicio: Todos</option>
                <option value="active">Activo</option>
                <option value="limited">Limitado</option>
                <option value="suspended">Suspendido</option>
              </select>
              {accountFilter && (
                <button
                  onClick={() => setAccountFilter(null)}
                  className="px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  X Quitar Filtro Empresa
                </button>
              )}
              <span className="text-sm text-muted-foreground whitespace-nowrap">{total} chips</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Serial</th>
                      <th className="px-4 py-3 text-left font-medium">Código</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-left font-medium">Servicio</th>
                      <th className="px-4 py-3 text-left font-medium">Activación</th>
                      <th className="px-4 py-3 text-left font-medium">Dueño</th>
                      <th className="px-4 py-3 text-left font-medium">Escaneos</th>
                      <th className="px-4 py-3 text-left font-medium">Vence</th>
                      <th className="px-4 py-3 text-left font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {chips.map((chip) => (
                      <tr
                        key={chip.id}
                        onClick={() => loadChipDetail(chip.id)}
                        className="hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{chip.serialPublic}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold">{chip.shortCode}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(chip.status)}`}>
                            {chip.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${serviceColor(chip.serviceStatus)}`}>
                            {chip.serviceStatus || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {chip.claimTokens[0]?.activationCode || "—"}
                          {chip.claimTokens[0]?.usedAt && <span className="text-success ml-1">✓</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {chip.owner?.email || "—"}
                          {chip.assignedProfile && <span className="block text-muted-foreground">{chip.assignedProfile.firstName} {chip.assignedProfile.lastName}</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-center">{chip._count?.scanEvents || 0}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{chip.serviceEndDate ? formatDate(chip.serviceEndDate) : "—"}</td>
                        <td className="px-4 py-3">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Users Tab ──────────────────────────────────────────────── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Buscar email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <span className="text-sm text-muted-foreground">{usersTotal} usuarios</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Nombre</th>
                      <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                      <th className="px-4 py-3 text-left font-medium">Sangre</th>
                      <th className="px-4 py-3 text-left font-medium">Chips</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-left font-medium">Registro</th>
                      <th className="px-4 py-3 text-left font-medium">Últlogin</th>
                      <th className="px-4 py-3 text-left font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedUser(u)}>
                        <td className="px-4 py-3 text-xs">{u.email}</td>
                        <td className="px-4 py-3 text-sm font-medium">{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : "—"}</td>
                        <td className="px-4 py-3 text-xs font-mono">{u.phone || "—"}</td>
                        <td className="px-4 py-3"><span className="text-xs font-bold text-red-600">{u.profile?.bloodType || "—"}</span></td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(u.email);
                              setTab("chips");
                            }}
                            className="hover:text-primary transition-colors underline underline-offset-2"
                          >
                            {u._count.chips}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Nunca"}</td>
                        <td className="px-4 py-3 text-right">
                          <Eye className="inline-block h-4 w-4 text-muted-foreground hover:text-primary" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Create Batch Tab ───────────────────────────────────────── */}
        {tab === "create" && (
          <div className="max-w-lg">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Crear Lote de Chips</h2>
              <p className="text-sm text-muted-foreground">
                Cada chip se creará con su propio QR único, URL de emergencia, y código de activación para el cliente.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">Cantidad</label>
                <input type="number" min={1} max={100} value={createCount} onChange={(e) => setCreateCount(Number(e.target.value))} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <p className="text-xs text-muted-foreground mt-1">Máximo 100 chips por lote</p>
              </div>
              <button onClick={createBatch} disabled={creating} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? "Creando..." : "Crear Chips"}
              </button>
            </div>

            {/* Created batch result */}
            {createdBatch && (
              <div className="mt-6 p-6 rounded-2xl border border-success/30 bg-success/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-success">✓ {createdBatch.length} chips creados</h3>
                  <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-medium hover:bg-success/20 transition-colors">
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Serial</th><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Activación</th><th className="px-3 py-2 text-left">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {createdBatch.map((c) => (
                        <tr key={c.shortCode}>
                          <td className="px-3 py-2 font-mono">{c.serialPublic}</td>
                          <td className="px-3 py-2 font-mono font-bold">{c.shortCode}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-amber-600">{c.activationCode}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => loadChipDetail(c.id)}
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              <Eye className="h-3 w-3" /> Ver QR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Empresas / Organizations Tab ───────────────────────────── */}
        {tab === "empresas" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{organizations.length} empresas</span>
              <button onClick={() => setShowOrgModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Nueva Empresa
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Empresa</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Miembros</th>
                      <th className="px-4 py-3 text-left font-medium">Registro</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {organizations.map((org) => (
                      <tr 
                        key={org.id} 
                        onClick={() => loadOrgDetail(org.id)}
                        className="hover:bg-accent/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-semibold group-hover:text-primary transition-colors">{org.legalName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{org.contactEmail || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                            {org._count?.members || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(org.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setAccountFilter(org.accountId as string);
                                setTab("chips");
                              }}
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                            >
                              Ver Chips
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {organizations.length === 0 && <p className="p-6 text-center text-muted-foreground">No hay empresas registradas.</p>}
              </div>
            )}

            {/* Modal de Creación */}
            {showOrgModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col">
                  <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                    <h3 className="font-bold text-lg">Nueva Cuenta Corporativa</h3>
                    <button onClick={() => setShowOrgModal(false)} className="text-muted-foreground hover:text-foreground"><Check className="h-5 w-5 bg-transparent opacity-0 absolute" /><ChevronLeft className="h-5 w-5 rotate-180" /></button>
                  </div>
                  <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre Legal</label>
                      <input required value={newOrgData.legalName} onChange={e => setNewOrgData({...newOrgData, legalName: e.target.value})} className="w-full border border-input rounded-lg px-3 py-2 text-sm" placeholder="Ej. ACME Corp" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email de Contacto</label>
                      <input type="email" value={newOrgData.contactEmail} onChange={e => setNewOrgData({...newOrgData, contactEmail: e.target.value})} className="w-full border border-input rounded-lg px-3 py-2 text-sm" placeholder="rrhh@acme.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Límite de Chips (Paquete)</label>
                      <input type="number" required min={1} value={newOrgData.maxChips} onChange={e => setNewOrgData({...newOrgData, maxChips: Number(e.target.value)})} className="w-full border border-input rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Acceso del Administrador de la Empresa</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Email del Administrador *</label>
                          <input required type="email" value={newOrgData.ownerEmail} onChange={e => setNewOrgData({...newOrgData, ownerEmail: e.target.value})} className="w-full border border-input rounded-lg px-3 py-2 text-sm" placeholder="admin@empresa.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Contraseña *</label>
                          <input required type="password" minLength={8} value={newOrgData.ownerPassword} onChange={e => setNewOrgData({...newOrgData, ownerPassword: e.target.value})} className="w-full border border-input rounded-lg px-3 py-2 text-sm" placeholder="Mínimo 8 caracteres" />
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent">Cancelar</button>
                      <button type="submit" disabled={creating} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                        {creating ? "Creando..." : "Crear Empresa"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Admins Tab ─────────────────────────────────────────────────── */}
        {tab === "admins" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Cuentas Administrativas</h2>
                <p className="text-sm text-muted-foreground">Gestiona los accesos al panel de control</p>
              </div>
              <button 
                onClick={() => setShowAdminModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" /> Nuevo Administrador
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid gap-4">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{admin.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                            admin.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {admin.role}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                            admin.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          }`}>
                            {admin.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleAdmin(admin.id, admin.status)}
                        className={`p-2 rounded-lg transition-colors ${
                          admin.status === "active" ? "hover:bg-destructive/10 text-destructive" : "hover:bg-success/10 text-success"
                        }`}
                        title={admin.status === "active" ? "Suspender" : "Activar"}
                      >
                        {admin.status === "active" ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay otros administradores registrados</p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ─── Inventario Vírgen ─── */}
        {tab === "inventory" && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="h-6 w-6 text-primary" /> Inventario Global
                </h2>
                <p className="text-muted-foreground mt-1 text-sm bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-lg inline-block border border-blue-500/20">
                  Total de Chips Vírgenes Disponibles: <strong>{inventoryTotal}</strong>
                </p>
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Lote / Creación</th>
                      <th className="px-4 py-3 text-left font-medium">Serial</th>
                      <th className="px-4 py-3 text-left font-medium">ShortCode</th>
                      <th className="px-4 py-3 text-left font-medium">PIN (Activación)</th>
                      <th className="px-4 py-3 text-right font-medium">Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inventoryChips.map((chip) => (
                      <tr key={chip.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(chip.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{chip.serialPublic}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold">{chip.shortCode}</td>
                        <td className="px-4 py-3 font-mono text-xs bg-muted/50 rounded inline-block mt-2">
                          {chip.claimTokens?.[0]?.activationCode || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(`https://pre-rescate-pty.vercel.app/qr/${chip.shortCode}`); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors text-xs font-semibold"
                            title="Copiar link para grabar con el NFC blanco"
                          >
                            <Copy className="h-3.5 w-3.5" /> {copied === `https://pre-rescate-pty.vercel.app/qr/${chip.shortCode}` ? "Copiado!" : "NFC"}
                          </button>
                          <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https://pre-rescate-pty.vercel.app/qr/${chip.shortCode}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-xs font-semibold"
                            title="Abrir imagen QR para imprimir"
                          >
                            <Printer className="h-3.5 w-3.5" /> Ver QR
                          </a>
                        </td>
                      </tr>
                    ))}
                    {inventoryChips.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center justify-center">
                            <Activity className="h-10 w-10 opacity-20 mb-3" />
                            <p>Has agotado el inventario.<br />¡Ve a "Crear Lote" para fabricar más chips vírgenes!</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}