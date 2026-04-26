/**
 * Canonical Domain Taxonomy for PreRescatePTY
 */

export const ACCOUNT_TYPES = {
  PERSONAL: 'personal',
  FAMILY: 'family',
  COMPANY: 'company',
  SCHOOL: 'school',
} as const;

export const ORGANIZATION_TYPES = {
  COMPANY: 'company',
} as const;

export const USER_ROLES = {
  OWNER: 'owner',     // Account creator/admin
  MEMBER: 'member',   // Person under an account (family member or employee)
  ADMIN: 'admin',     // Platform administrator
  SUPERADMIN: 'superadmin',
} as const;

export const BUSINESS_RULES = {
  EXTRA_CHIP_PRICE: 25.00,
  CURRENCY: 'USD',
  DEFAULT_SERVICE_DURATION_MONTHS: 24,
};

export interface PackageStyle {
  color: string;
  border: string;
  buttonColor: string;
  text: string;
  bg: string;
}

export interface PackageTheme {
  key: string;
  label: string;
  icon: string;
  color: string;
  styles: PackageStyle;
}

export const PACKAGE_THEMES: Record<string, PackageTheme> = {
  standard: {
    key: "standard",
    label: "Estándar",
    icon: "🛡️",
    color: "slate",
    styles: {
      color: "bg-slate-50 dark:bg-slate-900/40",
      border: "border-slate-200 dark:border-slate-800",
      buttonColor: "bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-[1.02]",
      text: "text-slate-500",
      bg: "bg-slate-500/5",
    }
  },
  duo: {
    key: "duo",
    label: "Duo",
    icon: "👥",
    color: "orange",
    styles: {
      color: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/10",
      border: "border-orange-200 dark:border-orange-900/50",
      buttonColor: "bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-[1.02]",
      text: "text-blue-500",
      bg: "bg-blue-500/5",
    }
  },
  family: {
    key: "family",
    label: "Familiar",
    icon: "👨‍👩‍👧‍👦",
    color: "indigo",
    styles: {
      color: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-indigo-950/40 dark:to-blue-900/20",
      border: "border-indigo-200 dark:border-indigo-500/30",
      buttonColor: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none",
      text: "text-red-500",
      bg: "bg-red-500/5",
    }
  },
  hogar: {
    key: "hogar",
    label: "Hogar",
    icon: "🏠",
    color: "rose",
    styles: {
      color: "bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-900/10",
      border: "border-rose-200 dark:border-rose-900/40",
      buttonColor: "bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-[1.02]",
      text: "text-emerald-500",
      bg: "bg-emerald-500/5",
    }
  },
  empresa: {
    key: "empresa",
    label: "Empresa",
    icon: "🏢",
    color: "indigo",
    styles: {
      color: "bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/30",
      border: "border-indigo-100 dark:border-indigo-900/50",
      buttonColor: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none",
      text: "text-indigo-600",
      bg: "bg-indigo-500/5",
    }
  },
  corporativo: {
    key: "corporativo",
    label: "Corporativo",
    icon: "🚀",
    color: "slate",
    styles: {
      color: "bg-slate-950 text-white dark:bg-black border-slate-800",
      border: "border-slate-700 dark:border-zinc-800",
      buttonColor: "bg-white text-black hover:bg-slate-200 transition-all",
      text: "text-slate-400",
      bg: "bg-white/5",
    }
  }
};
