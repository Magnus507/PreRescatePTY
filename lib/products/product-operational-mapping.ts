export const DEVICE_TYPES = [
  "personal",
  "business",
  "pet",
  "custom_personal",
  "custom_business",
  "future",
] as const;

export const STORE_SECTIONS = [
  "personal_devices",
  "business_devices",
  "pet_devices",
  "custom_products",
  "future",
] as const;

export const PURCHASE_FLOWS = [
  "direct_purchase",
  "company_request",
  "approval_required",
  "coming_soon",
] as const;

export const ACTIVATION_FLOWS = [
  "personal_profile",
  "business_profile",
  "pet_profile",
  "custom_flow",
  "none",
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];
export type StoreSection = (typeof STORE_SECTIONS)[number];
export type PurchaseFlow = (typeof PURCHASE_FLOWS)[number];
export type ActivationFlow = (typeof ACTIVATION_FLOWS)[number];

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  personal: "Personal",
  business: "Empresarial",
  pet: "Mascotas",
  custom_personal: "Personalizado personal",
  custom_business: "Personalizado empresarial",
  future: "Futuro",
};

export const STORE_SECTION_LABELS: Record<StoreSection, string> = {
  personal_devices: "Dispositivos personales",
  business_devices: "Dispositivos empresariales",
  pet_devices: "Mascotas",
  custom_products: "Personalizados",
  future: "Futuros",
};

export const PURCHASE_FLOW_LABELS: Record<PurchaseFlow, string> = {
  direct_purchase: "Compra directa",
  company_request: "Solicitud empresarial",
  approval_required: "Requiere aprobación",
  coming_soon: "Próximamente",
};

export const ACTIVATION_FLOW_LABELS: Record<ActivationFlow, string> = {
  personal_profile: "Activación personal",
  business_profile: "Activación empresarial",
  pet_profile: "Activación mascotas",
  custom_flow: "Flujo personalizado",
  none: "Sin activación",
};

export const DEVICE_TYPE_BADGE_CLASSES: Record<DeviceType, string> = {
  personal: "bg-sky-100 text-sky-700",
  business: "bg-indigo-100 text-indigo-700",
  pet: "bg-emerald-100 text-emerald-700",
  custom_personal: "bg-violet-100 text-violet-700",
  custom_business: "bg-fuchsia-100 text-fuchsia-700",
  future: "bg-slate-100 text-slate-700",
};

export function isDeviceType(value: string): value is DeviceType {
  return (DEVICE_TYPES as readonly string[]).includes(value);
}

export function isStoreSection(value: string): value is StoreSection {
  return (STORE_SECTIONS as readonly string[]).includes(value);
}

export function isPurchaseFlow(value: string): value is PurchaseFlow {
  return (PURCHASE_FLOWS as readonly string[]).includes(value);
}

export function isActivationFlow(value: string): value is ActivationFlow {
  return (ACTIVATION_FLOWS as readonly string[]).includes(value);
}

export function getDeviceTypeLabel(value?: string | null): string {
  if (!value || !isDeviceType(value)) return value || "Sin tipo";
  return DEVICE_TYPE_LABELS[value];
}

export function getStoreSectionLabel(value?: string | null): string {
  if (!value || !isStoreSection(value)) return value || "Sin sección";
  return STORE_SECTION_LABELS[value];
}

export function getPurchaseFlowLabel(value?: string | null): string {
  if (!value || !isPurchaseFlow(value)) return value || "Sin flujo";
  return PURCHASE_FLOW_LABELS[value];
}

export function getActivationFlowLabel(value?: string | null): string {
  if (!value || !isActivationFlow(value)) return value || "Sin activación";
  return ACTIVATION_FLOW_LABELS[value];
}

export function getDeviceTypeBadgeClass(value?: string | null): string {
  if (!value || !isDeviceType(value)) return DEVICE_TYPE_BADGE_CLASSES.future;
  return DEVICE_TYPE_BADGE_CLASSES[value];
}
