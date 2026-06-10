// ─── Shared Base Types ───────────────────────────────────────────────────────

export interface Profile {
  firstName: string;
  lastName: string;
  bloodType?: string;
  phone?: string | null;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
  additionalNotes?: string;
  nationalId?: string | null;
  emergencyContacts?: EmergencyContact[];
}

export interface EmergencyContact {
  fullName: string;
  relationship: string;
  phone: string;
  email: string | null;
}

// ─── Chip Domain ───────────────────────────────────────────────────────────

export type ChipStatus = "activated" | "inventory" | "sold" | "suspended" | "pending";
export type ServiceStatus = "active" | "limited" | "suspended" | "expired";

export interface ChipAdmin {
  id: string;
  serialPublic: string;
  shortCode: string;
  status: ChipStatus;
  serviceStatus: ServiceStatus;
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
  internalLabel?: string | null;
  createdAt: string;
  isPhysical: boolean;
  owner?: { email: string } | null;
  assignedProfile?: Profile | null;
  account?: {
    organizations: {
      legalName: string;
    }[];
  } | null;
  claimTokens: { activationCode: string; usedAt: string | null }[];
  _count: { scanEvents: number };
  activationCode?: string; // Flat field for batch creation results
}

export interface ScanEvent {
  id: string;
  scannedAt: string;
  sourceType: "qr" | "nfc" | "manual";
  ipAddress: string;
  city: string | null;
  country: string | null;
  notificationStatus: string;
  chipId?: string;
  chip?: {
    shortCode: string;
    serialPublic: string;
    chipAlias?: string | null;
  };
}

export interface ChipDetail extends ChipAdmin {
  scanEvents: ScanEvent[];
  _count: { scanEvents: number; notifications: number };
}

// ─── User Domain ────────────────────────────────────────────────────────────

export interface UserAdmin {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  status: "active" | "blocked" | "pending";
  createdAt: string;
  lastLoginAt: string | null;
  accountId: string | null;
  account?: {
    id: string;
    packageId: string | null;
    maxChipsAllocated: number;
    accountType: string;
    package: { name: string } | null;
  } | null;
  chips?: ChipAdmin[];
  profile: Profile | null;
  consent?: { revokedAt: string | null }[];
  _count: { chips: number };
}

// ─── Organization Domain ─────────────────────────────────────────────────────

export interface OrganizationAdmin {
  id: string;
  accountId: string;
  legalName: string;
  displayName: string | null;
  companyCode?: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  taxId: string | null;
  address: string | null;
  organizationType: "company" | "school" | "other";
  status: string;
  createdAt: string;
  _count: { members: number };
  account?: {
    packageId: string | null;
    maxChipsAllocated: number;
    package?: { name: string } | null;
    chips?: ChipAdmin[];
    users?: UserAdmin[];
  };
}

// ─── Stats Domain ────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalChips: number;
  totalProfiles: number;
  totalScans: number;
  totalNotifications: number;
  chipsByStatus: { activated: number; inventory: number; suspended: number; sold: number };
  chipsByService: { active: number; limited: number };
  productivity: {
    pendingOrders: number;
    usersWithoutChips: number;
    newUsersToday: number;
    inactiveActivatedChips: number;
  };
  storageUsage?: {
    usedBytes: number;
    totalBytes: number;
    percentage: number;
  };
  alerts: SystemAlert[];
  // ─── Dashboard v2: Centro de Control Ejecutivo ─────────────────────────
  ecosystem: {
    usersActive: number;
    usersBlocked: number;
    profilesCorporate: number;
    profilesWithoutChip: number;
    organizationsTotal: number;
  };
  commerce: {
    paymentsUnderReview: number;
    ordersProcessing: number;
    ordersShipped: number;
    ordersCompleted: number;
    ordersToday: number;
    ordersThisMonth: number;
  };
  corporate: {
    organizationsTotal: number;
    organizationsActive: number;
    pendingRequests: number;
    activeMembers: number;
  };
  movement: {
    newUsersToday: number;
    activationsThisMonth: number;
  };
}

export interface SystemAlert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  category: "storage" | "security" | "orders" | "hardware" | "system";
  actionUrl?: string;
  actionLabel?: string;
}

export interface DashboardStats {
  stats: AdminStats;
  recentScans: ScanEvent[];
  recentUsers: UserAdmin[];
  recentOrgs: OrganizationAdmin[];
}

// ─── Admin Users ─────────────────────────────────────────────────────────────

export interface AdminAccount {
  id: string;
  email: string;
  role: "admin" | "superadmin" | "imprenta";
  status: string;
  createdAt: string;
}
