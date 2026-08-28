export const OPERATIONS_TABS = [
  "commercial",
  "production",
  "inventory",
  "dispatch",
  "postsales",
  "history",
] as const;

export type OperationsTab = (typeof OPERATIONS_TABS)[number];

const OPERATIONS_TAB_SET = new Set<string>(OPERATIONS_TABS);

export const DEFAULT_OPERATIONS_TAB: OperationsTab = "commercial";

export function parseOperationsTab(value: string | null | undefined): OperationsTab {
  return value && OPERATIONS_TAB_SET.has(value)
    ? (value as OperationsTab)
    : DEFAULT_OPERATIONS_TAB;
}

export function buildAdminOperationsUrl(tab: OperationsTab, query?: string | null) {
  const params = new URLSearchParams();
  params.set("tab", "inventory");
  params.set("op", tab);
  if (query?.trim()) params.set("q", query.trim());
  return `/admin?${params.toString()}`;
}

export function getLegacyAdminTabTarget(tab: string | null | undefined): OperationsTab | null {
  if (tab === "pedidos") return "commercial";
  if (tab === "tienda") return "inventory";
  return null;
}
