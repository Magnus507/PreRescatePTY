import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAdminStats } from "./useAdminStats";
import { useAdminChips } from "./useAdminChips";
import { useAdminUsers } from "./useAdminUsers";
import { useAdminOrgs } from "./useAdminOrgs";
import { useDebounce } from "./useDebounce";

export type AdminTab = "dashboard" | "chips" | "users" | "empresas" | "admins" | "create" | "inventory" | "pedidos" | "tienda" | "governance" | "roadmap" | "settings" | "showcase";

export function useAdminManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as AdminTab) || "dashboard";
  const globalQuery = searchParams.get("q") || "";

  // UI States (Search & Filters)
  const [searchQuery, setSearchQuery] = useState(globalQuery);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Sync internal search with global URL query if it changes from layout
  useEffect(() => {
    if (globalQuery && globalQuery !== searchQuery) {
      setSearchQuery(globalQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalQuery]);

  const setTab = useCallback((newTab: AdminTab) => {
    if (newTab !== "chips") {
        setAccountFilter(null);
    }
    // Maintain query when switching if relevant, or clear it
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.push(`/admin?${params.toString()}`);
  }, [router, searchParams]);

  // Specialized Hooks
  const statsDomain = useAdminStats();
  const chipsDomain = useAdminChips();
  const usersDomain = useAdminUsers();
  const orgsDomain = useAdminOrgs();

  // Extract stable function references to avoid re-render loops.
  // The hook objects (statsDomain, chipsDomain, etc.) are new on every render,
  // but the individual useCallback functions inside them are stable.
  const { loadStats } = statsDomain;
  const { loadChips } = chipsDomain;
  const { loadUsers } = usersDomain;
  const { loadOrganizations, loadPackages } = orgsDomain;
  const { loadAdminAccounts } = usersDomain;

  // Use a ref to track the latest filter values without causing re-renders
  const filtersRef = useRef({ debouncedSearch, statusFilter, serviceFilter, accountFilter });
  filtersRef.current = { debouncedSearch, statusFilter, serviceFilter, accountFilter };

  // Stable load function that reads current filters from ref
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
            accountId: account || undefined
        }); 
        break;
      case "users": loadUsers({ search }); break;
      case "empresas": loadOrganizations(); break;
      case "admins": loadAdminAccounts(); break;
      case "inventory": loadChips({ status: "inventory", search }); break;
    }
  }, [tab, loadStats, loadChips, loadUsers, loadOrganizations, loadAdminAccounts]);

  // Load data on tab change
  useEffect(() => {
    loadCurrentData();
  }, [loadCurrentData]);

  // Reload when filters change (debounced search, status, service, account)
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
    
    // UI Controls
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
    
    // Domains
    stats: statsDomain,
    chips: chipsDomain,
    users: usersDomain,
    orgs: orgsDomain,
    
    refresh: loadCurrentData
  };
}
