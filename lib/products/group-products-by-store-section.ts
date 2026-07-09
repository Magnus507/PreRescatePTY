import {
  getStoreSectionLabel,
  isStoreSection,
  type StoreSection,
} from "@/lib/products/product-operational-mapping";

type OperationalMappingLike = {
  storeSection?: string | null;
  sortOrder?: number | null;
  isPublished?: boolean;
  badgeLabel?: string | null;
  badgeColor?: string | null;
  deviceType?: string | null;
  purchaseFlow?: string | null;
  activationFlow?: string | null;
  requiresCompanyContext?: boolean;
  requiresApproval?: boolean;
  requiresPersonalization?: boolean;
  productCode?: string | null;
  finishedGoodId?: string | null;
  finishedGood?: {
    id: string;
    code: string;
    name: string;
    productType: string;
    status: string;
  } | null;
};

export type StoreProductLike = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock?: number;
  availableStock?: number;
  reservedStock?: number;
  image?: string | null;
  imageUrl?: string | null;
  productType: string;
  estimatedProductionTime: string | null;
  requiresPersonalization: boolean;
  isActive?: boolean;
  operationalMapping?: OperationalMappingLike | null;
  operationalMappingMeta?: OperationalMappingLike | null;
  operationalStock?: {
    productCode: string;
    productName: string;
    productType: string;
    storeVisible: boolean;
    availableCount: number;
    reservedCount: number;
    qaPendingCount: number;
    qaFailedCount: number;
    dispatchedCount: number;
    deliveredCount: number;
    activatedCount: number;
    totalUnits: number;
    lastUpdatedAt: string | null;
  } | null;
};

export const STORE_SECTION_ORDER: StoreSection[] = [
  "personal_devices",
  "business_devices",
  "pet_devices",
  "custom_products",
  "future",
];

export const STORE_SECTION_DESCRIPTIONS: Record<StoreSection, string> = {
  personal_devices: "Productos directos para uso personal y familiar.",
  business_devices: "Productos orientados a empresa, solicitud o aprobación.",
  pet_devices: "Categoría preparada para mascotas y futuras extensiones.",
  custom_products: "Productos personalizados con reglas específicas.",
  future: "Elementos reservados para próximas líneas de tienda.",
};

export type GroupedStoreSection = {
  section: StoreSection | "unmapped";
  title: string;
  description: string;
  products: StoreProductLike[];
};

function getStoreSection(product: StoreProductLike): StoreSection | "unmapped" {
  const mapping = product.operationalMappingMeta || product.operationalMapping || null;
  if (!mapping?.storeSection || !isStoreSection(mapping.storeSection)) return "unmapped";
  return mapping.storeSection;
}

function getSortOrder(product: StoreProductLike) {
  const mapping = product.operationalMappingMeta || product.operationalMapping || null;
  return typeof mapping?.sortOrder === "number" ? mapping.sortOrder : 999;
}

export function getStoreSectionTitle(section: StoreSection | "unmapped") {
  if (section === "unmapped") return "Sin mapeo operativo";
  return getStoreSectionLabel(section);
}

export function groupProductsByStoreSection(
  products: StoreProductLike[],
  mode: "admin" | "public" = "public",
) {
  const filtered = mode === "public"
    ? products.filter((product) => {
        const mapping = product.operationalMappingMeta || product.operationalMapping || null;
        return Boolean(mapping?.isPublished) && getStoreSection(product) !== "unmapped";
      })
    : products;

  const buckets = new Map<StoreSection | "unmapped", StoreProductLike[]>();
  for (const section of STORE_SECTION_ORDER) buckets.set(section, []);
  buckets.set("unmapped", []);

  for (const product of filtered) {
    const section = getStoreSection(product);
    buckets.get(section)?.push(product);
  }

  const groups: GroupedStoreSection[] = [
    ...STORE_SECTION_ORDER.map((section) => ({
      section,
      title: getStoreSectionTitle(section),
      description: STORE_SECTION_DESCRIPTIONS[section],
      products: (buckets.get(section) || []).sort((a, b) => getSortOrder(a) - getSortOrder(b) || a.name.localeCompare(b.name, "es")),
    })),
    {
      section: "unmapped",
      title: getStoreSectionTitle("unmapped"),
      description: "Productos sin relación operativa canónica.",
      products: (buckets.get("unmapped") || []).sort((a, b) => getSortOrder(a) - getSortOrder(b) || a.name.localeCompare(b.name, "es")),
    },
  ];

  return groups.filter((group) => mode === "admin" || group.products.length > 0);
}
