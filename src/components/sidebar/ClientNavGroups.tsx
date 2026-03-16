import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, Building2, FileCheck, FolderOpen, Activity,
  Shield, CheckCircle2, Scale, BookOpen, ClipboardList,
  Bell, Newspaper, Users, Settings, Wallet, Receipt,
  Sparkles, ChevronRight, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertNotifications } from "@/hooks/use-alert-notifications";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badgeKey?: string;
}

interface NavGroup {
  key: string;
  label: string;
  defaultExpanded: boolean;
  items: NavItem[];
}

const STORAGE_KEY = "cr-client-nav-sections";

function isItemActive(pathname: string, itemPath: string) {
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}

interface ClientNavGroupsProps {
  collapsed: boolean;
  pendingApprovals: number;
  alertCount: number;
  isAdmin: boolean;
}

export default function ClientNavGroups({ collapsed, pendingApprovals, alertCount, isAdmin }: ClientNavGroupsProps) {
  const location = useLocation();

  // Build groups dynamically based on role
  const programmeItems: NavItem[] = [
    { label: "Entities", path: "/entities", icon: <Building2 size={18} /> },
    { label: "Commission", path: "/commission", icon: <FileCheck size={18} /> },
  ];
  if (isAdmin) {
    programmeItems.push({ label: "Approvals", path: "/approvals", icon: <CheckCircle2 size={18} />, badgeKey: "approvals" });
  }
  programmeItems.push({ label: "Deliverables", path: "/deliverables", icon: <FolderOpen size={18} /> });

  const monitoringItems: NavItem[] = [
    { label: "Monitoring", path: "/monitoring", icon: <Activity size={18} /> },
    { label: "Jurisdiction Alerts", path: "/client/alerts", icon: <Bell size={18} />, badgeKey: "alerts" },
    { label: "Regulatory Briefings", path: "/regulatory-briefings", icon: <Newspaper size={18} /> },
    { label: "Policies", path: "/policies", icon: <Shield size={18} /> },
    { label: "Policy Mapping", path: "/client/policy", icon: <Shield size={18} /> },
  ];

  const complianceItems: NavItem[] = [
    { label: "Master LIA Templates", path: "/lia-library", icon: <Scale size={18} /> },
    { label: "Risk Methodology", path: "/methodology", icon: <BookOpen size={18} /> },
    { label: "Audit Log", path: "/audit-log", icon: <ClipboardList size={18} /> },
  ];

  const settingsItems: NavItem[] = isAdmin ? [
    { label: "Organisation Settings", path: "/org-settings", icon: <Building2 size={18} /> },
    { label: "Users & Roles", path: "/users", icon: <Users size={18} /> },
    { label: "Approval Settings", path: "/approval-settings", icon: <Settings size={18} /> },
    { label: "Budget & Spend", path: "/budget-controls", icon: <Wallet size={18} /> },
    { label: "Work Orders", path: "/work-orders", icon: <Receipt size={18} /> },
    { label: "Onboarding Wizard", path: "/client/onboarding", icon: <Sparkles size={18} /> },
  ] : [];

  const groups: NavGroup[] = [
    { key: "programme", label: "Programme", defaultExpanded: true, items: programmeItems },
    { key: "monitoring", label: "Monitoring", defaultExpanded: false, items: monitoringItems },
    { key: "compliance", label: "Compliance", defaultExpanded: false, items: complianceItems },
  ];
  if (settingsItems.length > 0) {
    groups.push({ key: "settings", label: "Settings", defaultExpanded: false, items: settingsItems });
  }

  function getInitialState(): Record<string, boolean> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return Object.fromEntries(groups.map((g) => [g.key, g.defaultExpanded]));
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(getInitialState);

  // Auto-expand the section containing the active route
  useEffect(() => {
    const activeGroup = groups.find((g) =>
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

  const renderBadge = (item: NavItem) => {
    if (item.badgeKey === "approvals" && pendingApprovals > 0) {
      if (collapsed) {
        return (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[8px] font-bold px-0.5">
            {pendingApprovals}
          </span>
        );
      }
      return (
        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-semibold px-1">
          {pendingApprovals}
        </span>
      );
    }
    if (item.badgeKey === "alerts" && alertCount > 0) {
      if (collapsed) {
        return (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5">
            {alertCount}
          </span>
        );
      }
      return (
        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1">
          {alertCount}
        </span>
      );
    }
    return null;
  };

  return (
    <>
      {/* Dashboard — always visible, outside groups */}
      {(() => {
        const active = isItemActive(location.pathname, "/dashboard");
        return (
          <NavLink
            to="/dashboard"
            className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all duration-200 relative mb-1 ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            }`}
            title={collapsed ? "Dashboard" : undefined}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-sidebar-primary" />
            )}
            <span className={`transition-transform duration-200 ${active ? "" : "group-hover:translate-x-0.5"}`}>
              <LayoutDashboard size={18} />
            </span>
            {!collapsed && <span className="font-medium flex-1">Dashboard</span>}
          </NavLink>
        );
      })()}

      {/* Grouped sections */}
      {groups.map((group) => {
        const isOpen = expanded[group.key] ?? group.defaultExpanded;

        return (
          <div key={group.key} className="mb-1">
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
                      {renderBadge(item)}
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
