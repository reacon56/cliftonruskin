import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, ListTodo, BarChart3, Eye, Layers, Globe, Shield,
  Newspaper, Database, Server, Scale, BookOpen, Building2, Briefcase,
  Settings, TrendingUp, Package, Wallet, Receipt, ClipboardList,
  ArrowUpCircle, ChevronRight, ChevronDown,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  key: string;
  label: string;
  defaultExpanded: boolean;
  items: NavItem[];
}

const MANAGER_GROUPS: NavGroup[] = [
  {
    key: "operations",
    label: "Operations",
    defaultExpanded: true,
    items: [
      { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "All Cases", path: "/cases", icon: <ListTodo size={18} /> },
      { label: "Workload View", path: "/workload", icon: <BarChart3 size={18} /> },
      { label: "Reports QA Queue", path: "/qa-queue", icon: <Eye size={18} /> },
    ],
  },
  {
    key: "intelligence",
    label: "Intelligence",
    defaultExpanded: true,
    items: [
      { label: "Master Entities", path: "/master-entities", icon: <Layers size={18} /> },
      { label: "Jurisdiction Library", path: "/jurisdiction-library", icon: <Globe size={18} /> },
      { label: "Jurisdictions", path: "/jurisdictions", icon: <Globe size={18} /> },
      { label: "Sanctions Regimes", path: "/admin/sanctions-regimes", icon: <Shield size={18} /> },
      { label: "Regulatory Intelligence", path: "/admin/market-lessons", icon: <Newspaper size={18} /> },
      { label: "Source Registry", path: "/source-registry", icon: <Database size={18} /> },
      { label: "Ingestion Sources", path: "/ingestion-sources", icon: <Server size={18} /> },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    defaultExpanded: false,
    items: [
      { label: "LIA Management", path: "/lia-library", icon: <Scale size={18} /> },
      { label: "Risk Model", path: "/risk-model", icon: <Shield size={18} /> },
      { label: "Tier Matrix", path: "/tier-matrix", icon: <Shield size={18} /> },
      { label: "Methodology Editor", path: "/admin/methodology", icon: <BookOpen size={18} /> },
    ],
  },
  {
    key: "programme",
    label: "Programme",
    defaultExpanded: false,
    items: [
      { label: "Clients", path: "/clients", icon: <Building2 size={18} /> },
      { label: "Partner Directory", path: "/partner-directory", icon: <Briefcase size={18} /> },
      { label: "Programme Settings", path: "/programme-settings", icon: <Settings size={18} /> },
    ],
  },
  {
    key: "commercial",
    label: "Commercial",
    defaultExpanded: false,
    items: [
      { label: "Commercial Dashboard", path: "/commercial-dashboard", icon: <TrendingUp size={18} /> },
      { label: "Product Catalogue", path: "/product-catalogue", icon: <Package size={18} /> },
      { label: "Budget Controls", path: "/budget-controls", icon: <Wallet size={18} /> },
      { label: "Billing Handoff", path: "/billing-handoff", icon: <Receipt size={18} /> },
      { label: "Unit Economics", path: "/unit-economics", icon: <BarChart3 size={18} /> },
      { label: "Entitlements", path: "/entitlement-settings", icon: <Package size={18} /> },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    defaultExpanded: false,
    items: [
      { label: "Audit Log", path: "/audit-log", icon: <ClipboardList size={18} /> },
      { label: "Feature Controls", path: "/feature-controls", icon: <Shield size={18} /> },
      { label: "Upgrade Requests", path: "/upgrade-requests", icon: <ArrowUpCircle size={18} /> },
      { label: "Admin: Sources", path: "/admin/sources", icon: <Server size={18} /> },
      { label: "Admin: Runs", path: "/admin/ingestion-runs", icon: <Server size={18} /> },
    ],
  },
];

const STORAGE_KEY = "cr-manager-nav-sections";

function getInitialState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return Object.fromEntries(MANAGER_GROUPS.map((g) => [g.key, g.defaultExpanded]));
}

function isItemActive(pathname: string, itemPath: string) {
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}

interface ManagerNavGroupsProps {
  collapsed: boolean;
}

export default function ManagerNavGroups({ collapsed }: ManagerNavGroupsProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(getInitialState);

  // Auto-expand the section containing the active route
  useEffect(() => {
    const activeGroup = MANAGER_GROUPS.find((g) =>
      g.items.some((item) => isItemActive(location.pathname, item.path))
    );
    if (activeGroup && !expanded[activeGroup.key]) {
      setExpanded((prev) => {
        const next = { ...prev, [activeGroup.key]: true };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [location.pathname]);

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <>
      {MANAGER_GROUPS.map((group) => {
        const isOpen = expanded[group.key] ?? group.defaultExpanded;

        return (
          <div key={group.key} className="mb-1">
            {/* Section header */}
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors duration-200"
              >
                <span>{group.label}</span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <div className="h-px mx-2 my-1.5 bg-sidebar-border" />
            )}

            {/* Items */}
            {(collapsed || isOpen) && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(location.pathname, item.path);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all duration-200 relative ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-sidebar-primary" />
                      )}
                      <span className={`transition-transform duration-200 ${active ? "" : "group-hover:translate-x-0.5"}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="font-medium flex-1">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
