import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAdminStats } from "./useAdminStats";
import { useAdminChips } from "./useAdminChips";
import { useAdminUsers } from "./useAdminUsers";
import { useAdminOrgs } from "./useAdminOrgs";
import { useDebounce } from "./useDebounce";
import {
  buildAdminOperationsUrl,
  getLegacyAdminTabTarget,
  parseOperationsTab,
  type OperationsTab,
} from "@/lib/admin/operations-routing";

export type AdminTab = "dashboard" | "chips" | "users" | "empresas" | "admins" | "create" | "inventory" | "pedidos" | "tienda" | "governance" | "roadmap" | "settings" | "showcase";

const ADMIN_TABS = new Set<AdminTab>([
  "dashboard",
  "chips",
  "users",
  "empresas",
  "admins",
  "create",
  "inventory",
  "pedidos",
  "tienda",
  "governance",
  "roadmap",
  "settings",
  "showcase",
]);

function parseAdminTab(value: string | null): AdminTab {
  return value && ADMIN_TABS.has(value as AdminTab) ? (value as AdminTab) : "dashboard";
}

export function useAdminManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = parseAdminTab(searchParams.get("tab"));
  const operationsTab = parseOperationsTab(searchParams.get("op"));
  const globalQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(globalQuery);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (globalQuery && globalQuery !== searchQuery) {
      setSearchQuery(globalQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalQuery]);

  // Old internal URLs are accepted only as compatibility entry points. They are
  // immediately replaced with the official Operations Center URL so the app
  // never keeps generating or sharing legacy routes.
  useEffect(() => {
    const legacyTarget = getLegacyAdminTabTarget(tab);
    if (legacyTarget) {
      router.replace(buildAdminOperationsUrl(legacyTarget, globalQuery));
      return;
    }

    if (tab === "inventory" && !searchParams.has("op")) {
      router.replace(buildAdminOperationsUrl(operationsTab, globalQuery));
    }
  }, [globalQuery, operationsTab, router, searchParams, tab]);

  const setTab = useCallback((newTab: AdminTab) => {
    if (newTab !== "chips") {
      setAccountFilter(null);
    }

    if (newTab === "inventory") {
      router.push(buildAdminOperationsUrl("commercial", globalQuery));
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    params.delete("op");
    router.push(`/admin?${params.toString()}`);
  }, [globalQuery, router, searchParams]);

  const setOperationsTab = useCallback((newTab: OperationsTab) => {
    router.push(buildAdminOperationsUrl(newTab, globalQuery));
  }, [globalQuery, router]);

  const statsDomain = useAdminStats();
  const chipsDomain = useAdminChips();
  const usersDomain = useAdminUsers();
  const orgsDomain = useAdminOrgs();

  const { loadStats } = statsDomain;
  const { loadChips } = chipsDomain;
  const { loadUsers } = usersDomain;
  const { loadOrganizations, loadPackages } = orgsDomain;
  const { loadAdminAccounts } = usersDomain;

  const filtersRef = useRef({ debouncedSearch, statusFilter, serviceFilter, accountFilter });
  filtersRef.current = { debouncedSearch, statusFilter, serviceFilter, accountFilter };

  const loadCurrentData = useCallback(() => {
    const { debouncedSearch: search, statusFilter: status, serviceFilter: service, accountFilter: account } = filtersRef.current;

    switch (tab) {
      case "dashboard":
      case "governance":
        loadStats();
        break;
      case "chips":
        loadChips({
          search,
          status: status || undefined,
          excludeStatus: !status ? "inventory" : undefined,
          serviceStatus: service,
          accountId: account || undefined,
        });
        break;
      case "users":
        loadUsers({ search });
        break;
      case "empresas":
        loadOrganizations();
        break;
      case "admins":
        loadAdminAccounts();
        break;
      case "inventory":
        break;
    }
  }, [tab, loadStats, loadChips, loadUsers, loadOrganizations, loadAdminAccounts]);

  useEffect(() => {
    loadCurrentData();
  }, [loadCurrentData]);

  useEffect(() => {
    loadCurrentData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, serviceFilter, accountFilter]);

  useEffect(() => {
    if (tab === "empresas") {
      loadPackages();
    }
  }, [tab, loadPackages]);

  return {
    tab,
    setTab,
    operations: {
      tab: operationsTab,
      setTab: setOperationsTab,
    },
    search: {
      query: searchQuery,
      setQuery: setSearchQuery,
    },
    filters: {
      status: statusFilter,
      setStatus: setStatusFilter,
      service: serviceFilter,
      setService: setServiceFilter,
      account: accountFilter,
      setAccount: setAccountFilter,
    },
    stats: statsDomain,
    chips: chipsDomain,
    users: usersDomain,
    orgs: orgsDomain,
    refresh: loadCurrentData,
  };
}
