"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, Cpu, Users, Scan as ScanIcon, Plus, Loader2,
  Download, ChevronLeft, ExternalLink, Printer, Copy, Check,
  Search, Shield, Activity, Bell, QrCode, Smartphone, Eye,
  LogOut, ArrowLeft, Clock, MapPin, AlertTriangle, TrendingUp,
  RefreshCw, Building2,
} from "lucide-react";
import { signOut } from "next-auth/react";

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
  legalName: string;
  contactEmail: string | null;
  status: string;
  createdAt: string;
  _count: { members: number };
}

type Tab = "dashboard" | "chips" | "users" | "empresas" | "create";

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
  const [newOrgData, setNewOrgData] = useState({ legalName: "", displayName: "", contactEmail: "", maxChips: 30 });

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
    const res = await fetch(url);
    const data = await res.json();
    setChips(data.chips || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [statusFilter, serviceFilter, searchQuery]);

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

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/organizations", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newOrgData)
    });
    setCreating(false);
    if (res.ok) {
      setShowOrgModal(false);
      setNewOrgData({ legalName: "", displayName: "", contactEmail: "", maxChips: 30 });
      loadOrganizations();
    }
  }

  useEffect(() => {
    if (tab === "dashboard") loadStats();
    if (tab === "chips" || tab === "create") loadChips();
    if (tab === "users") loadUsers();
    if (tab === "empresas") loadOrganizations();
  }, [tab, loadStats, loadChips, loadUsers, loadOrganizations]);

  async function loadChipDetail(chipId: string) {
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/chips/${chipId}`);
    const data = await res.json();
    setSelectedChip(data.chip);
    setLoadingDetail(false);
  }

  async function createBatch() {
    setCreating(true);
    const res = await fetch("/api/admin/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: createCount }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setCreatedBatch(data.chips);
      loadChips();
    }
  }

  function exportCSV() {
    if (!createdBatch) return;
    const header = "Serial,ShortCode,ActivationCode,QR_URL,NFC_URL\n";
    const rows = createdBatch.map((c) => `${c.serialPublic},${c.shortCode},${c.activationCode},${c.qrUrl || ""},${c.nfcUrl}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chips_batch_${Date.now()}.csv`;
    a.click();
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  async function reactivateChip(chipId: string) {
    if (!confirm("¿Reactivar este chip por 2 años más? El usuario podrá editar su perfil y contactos nuevamente.")) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/admin/chips/${chipId}/reactivate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Chip reactivado exitosamente. Nuevo vencimiento: ${new Date(data.chip.serviceEndDate).toLocaleDateString("es-PA")}`);
        // Reload chip detail
        await loadChipDetail(chipId);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setReactivating(false);
    }
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
          {/* Chip Header */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* QR Code Section */}
            <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-3 flex-shrink-0">
              <div className="w-48 h-48 mx-auto bg-white rounded-xl p-2 border-2 border-dashed border-gray-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedChip.qrUrl)}&bgcolor=fff&color=000&margin=8`}
                  alt={`QR ${selectedChip.shortCode}`}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-mono text-lg font-bold tracking-wider text-gray-900">{selectedChip.shortCode}</p>
              <p className="text-xs text-gray-500">{selectedChip.serialPublic}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html><head><title>QR - ${selectedChip.shortCode}</title>
                        <style>
                          body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: monospace; margin: 0; }
                          img { width: 300px; height: 300px; }
                          .code { font-size: 28px; font-weight: bold; letter-spacing: 4px; margin-top: 16px; }
                          .serial { font-size: 12px; color: #888; margin-top: 4px; }
                          .brand { font-size: 10px; color: #aaa; margin-top: 12px; }
                        </style></head><body>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedChip.qrUrl)}&bgcolor=fff&color=000&margin=10" />
                        <div class="code">${selectedChip.shortCode}</div>
                        <div class="serial">${selectedChip.serialPublic}</div>
                        <div class="brand">PreRescate PTY — Panamá</div>
                        </body></html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Imprimir QR
                </button>
                <button
                  onClick={() => copyToClipboard(selectedChip.qrUrl, "qr")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                >
                  {copied === "qr" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  URL
                </button>
              </div>
            </div>

            {/* Chip Info */}
            <div className="flex-1 space-y-4">
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> Información del Chip
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Serial" value={selectedChip.serialPublic} mono />
                  <InfoRow label="ShortCode" value={selectedChip.shortCode} mono />
                  <InfoRow label="Estado" value={selectedChip.status} badge={statusColor(selectedChip.status)} />
                  <InfoRow label="Servicio" value={selectedChip.serviceStatus} badge={serviceColor(selectedChip.serviceStatus)} />
                  <InfoRow label="Tipo" value={selectedChip.productType} />
                  <InfoRow label="Nicho" value={selectedChip.nicheType} />
                  <InfoRow label="Lote" value={selectedChip.batchId || "—"} />
                  <InfoRow label="Creado" value={formatDate(selectedChip.createdAt)} />
                  <InfoRow label="Activado" value={selectedChip.activatedAt ? formatDate(selectedChip.activatedAt) : "—"} />
                  <InfoRow label="Vencimiento" value={selectedChip.serviceEndDate ? formatDate(selectedChip.serviceEndDate) : "—"} />
                  <InfoRow label="Último escaneo" value={selectedChip.lastScanAt ? formatDate(selectedChip.lastScanAt) : "—"} />
                  <InfoRow label="Total escaneos" value={String(selectedChip._count?.scanEvents || 0)} />
                </div>

                {/* Reactivation Button */}
                {selectedChip.status === "activated" && (selectedChip.serviceStatus === "limited" || selectedChip.serviceStatus === "suspended") && (
                  <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Servicio {selectedChip.serviceStatus === "limited" ? "Expirado — Modo Lectura" : "Suspendido"}</p>
                        <p className="text-xs text-orange-600/80 dark:text-orange-400/70 mt-1">
                          El sticker sigue funcionando y mostrando la info médica al escanearlo, pero el usuario no puede editar datos ni contactos.
                          Reactivar otorgará 2 años adicionales de servicio completo.
                        </p>
                        <button
                          onClick={() => reactivateChip(selectedChip.id)}
                          disabled={reactivating}
                          className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md"
                        >
                          {reactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          {reactivating ? "Reactivando..." : "Reactivar Servicio (+2 años)"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Activation Code */}
              {selectedChip.claimTokens?.[0] && (
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-500" /> Código de Activación
                  </h3>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-bold font-mono tracking-widest bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
                      {selectedChip.claimTokens[0].activationCode}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedChip.claimTokens[0].activationCode, "code")}
                      className="p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      {copied === "code" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </button>
                    {selectedChip.claimTokens[0].usedAt && (
                      <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">✓ Usado</span>
                    )}
                  </div>
                </div>
              )}

              {/* URLs */}
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" /> URLs
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">QR:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{selectedChip.qrUrl}</code>
                      <button onClick={() => copyToClipboard(selectedChip.qrUrl, "qrUrl")} className="p-1 hover:bg-accent rounded">
                        {copied === "qrUrl" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">NFC:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{selectedChip.nfcUrl}</code>
                      <button onClick={() => copyToClipboard(selectedChip.nfcUrl, "nfcUrl")} className="p-1 hover:bg-accent rounded">
                        {copied === "nfcUrl" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Owner / Profile Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Dueño</h3>
              {selectedChip.owner ? (
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Email:</span> {selectedChip.owner.email}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin dueño asignado</p>
              )}
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-red-500" /> Perfil Médico</h3>
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
                      <th className="px-4 py-3 text-left font-medium">Último Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-xs">{u.email}</td>
                        <td className="px-4 py-3 text-sm font-medium">{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : "—"}</td>
                        <td className="px-4 py-3 text-xs font-mono">{u.phone || "—"}</td>
                        <td className="px-4 py-3"><span className="text-xs font-bold text-red-600">{u.profile?.bloodType || "—"}</span></td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">
                          <button 
                            onClick={() => {
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
                      <th className="px-4 py-3 text-left font-medium">Usuarios Asignados</th>
                      <th className="px-4 py-3 text-left font-medium">Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 font-semibold">{org.legalName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{org.contactEmail || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                            {org._count?.members || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(org.createdAt)}</td>
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
      </div>
    </div>
  );
}

// ─── Utility Components ─────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Cpu; color: string }) {
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
      <span className="text-muted-foreground">{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>{value}</span>
      ) : (
        <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
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
