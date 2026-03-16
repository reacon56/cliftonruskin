import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, FileCheck, FolderOpen, Activity,
  Shield, Users, ClipboardList, HeadphonesIcon, ListTodo,
  LogOut, ChevronLeft, ChevronRight, Moon, Sun,
  ArrowLeftRight, CheckCircle2, Scale, ArrowUpCircle,
  Briefcase, Eye, BookOpen, BarChart3, Search,
  Send, FlaskConical, Globe, Wallet, Receipt,
  DollarSign, Bell, Sparkles, Settings,
} from "lucide-react";
import ManagerNavGroups from "@/components/sidebar/ManagerNavGroups";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useAlertNotifications } from "@/hooks/use-alert-notifications";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function AppSidebar() {
  const { hasRole, isClient, isInternal, signOut, profile, canQuote, canWork } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { activeView, canToggle, toggle: toggleView, setView: setViewAs } = useViewMode();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const { unreadCount: alertCount } = useAlertNotifications();

  const isManager = hasRole("fvc_assurance_manager" as any) || hasRole("fvc_ops_admin" as any);
  const isOfficer = hasRole("fvc_assurance_officer" as any) || hasRole("fvc_analyst" as any);

  // Dev-mode: allow switching between manager and officer views
  const [devRoleOverride, setDevRoleOverride] = useState<"manager" | "officer" | null>(null);
  const effectiveIsManager = devRoleOverride === "manager" ? true : devRoleOverride === "officer" ? false : isManager;

  useEffect(() => {
    if (!profile?.org_id || !hasRole("client_admin")) return;
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("org_id", profile.org_id)
      .in("status", ["submitted", "quoted"])
      .then(({ count }) => setPendingApprovals(count ?? 0));
  }, [profile?.org_id]);

  const clientNav: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Entities", path: "/entities", icon: <Building2 size={18} /> },
    { label: "Commission", path: "/commission", icon: <FileCheck size={18} /> },
    { label: "Service Request", path: "/service-request", icon: <Briefcase size={18} /> },
    { label: "Deliverables", path: "/deliverables", icon: <FolderOpen size={18} /> },
    { label: "Monitoring", path: "/monitoring", icon: <Activity size={18} /> },
    { label: "Policies", path: "/policies", icon: <Shield size={18} /> },
    { label: "Master LIA Templates", path: "/lia-library", icon: <Scale size={18} /> },
  ];

  if (hasRole("client_admin")) {
    clientNav.splice(4, 0, { label: "Approvals", path: "/approvals", icon: <CheckCircle2 size={18} /> });
  }

  if (hasRole("client_admin")) {
    clientNav.push({ label: "Onboarding Wizard", path: "/client/onboarding", icon: <Sparkles size={18} /> });
    clientNav.push({ label: "Users & Roles", path: "/users", icon: <Users size={18} /> });
    clientNav.push({ label: "Organisation Settings", path: "/org-settings", icon: <Building2 size={18} /> });
    clientNav.push({ label: "Approval Settings", path: "/approval-settings", icon: <Settings size={18} /> });
    clientNav.push({ label: "Budget & Spend", path: "/budget-controls", icon: <Wallet size={18} /> });
    clientNav.push({ label: "Work Orders", path: "/work-orders", icon: <Receipt size={18} /> });
    clientNav.push({ label: "Spend Summary", path: "/spend-summary", icon: <DollarSign size={18} /> });
  }

  clientNav.push(
    { label: "Risk Methodology", path: "/methodology", icon: <BookOpen size={18} /> },
    { label: "Jurisdiction Alerts", path: "/client/alerts", icon: <Bell size={18} /> },
    { label: "Policy Mapping", path: "/client/policy", icon: <Shield size={18} /> },
    { label: "Audit Log", path: "/audit-log", icon: <ClipboardList size={18} /> },
    { label: "Support", path: "/support", icon: <HeadphonesIcon size={18} /> }
  );

  // ── Manager nav: full visibility ──
  const managerNav: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "All Cases", path: "/cases", icon: <ListTodo size={18} /> },
    { label: "Workload View", path: "/workload", icon: <BarChart3 size={18} /> },
    { label: "Master Entities", path: "/master-entities", icon: <Layers size={18} /> },
    { label: "Programme Settings", path: "/programme-settings", icon: <Settings size={18} /> },
    { label: "LIA Management", path: "/lia-library", icon: <Scale size={18} /> },
    { label: "Partner Directory", path: "/partner-directory", icon: <Briefcase size={18} /> },
    
    { label: "Risk Model", path: "/risk-model", icon: <Shield size={18} /> },
    { label: "Tier Matrix", path: "/tier-matrix", icon: <Shield size={18} /> },
    { label: "Reports QA Queue", path: "/qa-queue", icon: <Eye size={18} /> },
    { label: "Clients", path: "/clients", icon: <Building2 size={18} /> },
    { label: "Feature Controls", path: "/feature-controls", icon: <Shield size={18} /> },
    { label: "Upgrade Requests", path: "/upgrade-requests", icon: <ArrowUpCircle size={18} /> },
    { label: "Market Lessons", path: "/admin/market-lessons", icon: <Newspaper size={18} /> },
    { label: "Source Registry", path: "/source-registry", icon: <Database size={18} /> },
    { label: "Ingestion Sources", path: "/ingestion-sources", icon: <Server size={18} /> },
    { label: "Admin: Sources", path: "/admin/sources", icon: <Server size={18} /> },
    { label: "Admin: Runs", path: "/admin/ingestion-runs", icon: <Server size={18} /> },
    { label: "Sanctions Regimes", path: "/admin/sanctions-regimes", icon: <Shield size={18} /> },
    { label: "Methodology Editor", path: "/admin/methodology", icon: <BookOpen size={18} /> },
    { label: "Jurisdiction Library", path: "/jurisdiction-library", icon: <Globe size={18} /> },
    { label: "Jurisdictions", path: "/jurisdictions", icon: <Globe size={18} /> },
    { label: "Unit Economics", path: "/unit-economics", icon: <BarChart3 size={18} /> },
    { label: "Commercial Dashboard", path: "/commercial-dashboard", icon: <TrendingUp size={18} /> },
    { label: "Product Catalogue", path: "/product-catalogue", icon: <Package size={18} /> },
    { label: "Budget Controls", path: "/budget-controls", icon: <Wallet size={18} /> },
    { label: "Billing Handoff", path: "/billing-handoff", icon: <Receipt size={18} /> },
    { label: "Entitlements", path: "/entitlement-settings", icon: <Package size={18} /> },
    { label: "Audit Log", path: "/audit-log", icon: <ClipboardList size={18} /> },
  ];

  // ── Officer nav: scoped visibility ──
  const officerNav: NavItem[] = [
    { label: "My Cases", path: "/cases", icon: <ListTodo size={18} /> },
    { label: "My Tasks", path: "/my-tasks", icon: <ClipboardList size={18} /> },
    { label: "Entity Lookup", path: "/entities", icon: <Search size={18} /> },
    { label: "Partner Requests", path: "/partner-requests", icon: <Send size={18} /> },
    { label: "Knowledge Base", path: "/knowledge-base", icon: <BookOpen size={18} /> },
    { label: "Research Console", path: "/research-console", icon: <FlaskConical size={18} /> },
    { label: "Jurisdiction Library", path: "/jurisdiction-library", icon: <Globe size={18} /> },
    { label: "Jurisdictions", path: "/jurisdictions", icon: <Globe size={18} /> },
    { label: "Submitted to QA", path: "/qa-queue", icon: <Eye size={18} /> },
  ];

  // Determine which internal nav to show
  const internalNav: NavItem[] = effectiveIsManager ? managerNav : officerNav;

  const navItems = activeView === "internal" ? internalNav : clientNav;

  const handleToggleView = () => {
    toggleView();
    navigate(activeView === "internal" ? "/dashboard" : "/cases");
  };

  return (
    <aside
      className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="animate-fade-in flex items-center gap-2.5">
            <img src="/images/clifton-ruskin-logo.png" alt="CR" className="w-8 h-8 rounded-full" />
            <div>
              <div className="font-display text-[15px] font-semibold text-sidebar-foreground tracking-tight leading-tight">
                Clifton Ruskin
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-sidebar-primary mt-1 font-medium">
                Assurance Portal
              </div>
            </div>
          </div>
        ) : (
          <img src="/images/clifton-ruskin-logo.png" alt="CR" className="w-8 h-8 rounded-full mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors duration-200"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all duration-200 relative ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-sidebar-primary" />
              )}
              <span className={`transition-transform duration-200 ${isActive ? "" : "group-hover:translate-x-0.5"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="font-medium flex-1">{item.label}</span>
              )}
              {!collapsed && item.label === "Approvals" && pendingApprovals > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-semibold px-1">
                  {pendingApprovals}
                </span>
              )}
              {collapsed && item.label === "Approvals" && pendingApprovals > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[8px] font-bold px-0.5">
                  {pendingApprovals}
                </span>
              )}
              {!collapsed && item.label === "Jurisdiction Alerts" && alertCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1">
                  {alertCount}
                </span>
              )}
              {collapsed && item.label === "Jurisdiction Alerts" && alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5">
                  {alertCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme Toggle & User / Sign Out */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Dev-mode internal role switcher */}
        {isInternal && activeView === "internal" && (
          <div className={`flex ${collapsed ? "flex-col" : ""} gap-1`}>
            <Button
              variant={effectiveIsManager ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setDevRoleOverride("manager");
                navigate("/cases");
              }}
              className={`flex-1 text-[11px] ${collapsed ? "px-1" : ""} ${effectiveIsManager ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/50"}`}
              title="View as Manager"
            >
              {collapsed ? "M" : "Manager"}
            </Button>
            <Button
              variant={!effectiveIsManager ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setDevRoleOverride("officer");
                navigate("/cases");
              }}
              className={`flex-1 text-[11px] ${collapsed ? "px-1" : ""} ${!effectiveIsManager ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/50"}`}
              title="View as Officer"
            >
              {collapsed ? "O" : "Officer"}
            </Button>
          </div>
        )}
        {canToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleView}
            className="w-full justify-start gap-2 text-sidebar-primary hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200 border border-sidebar-border/50"
            title={collapsed ? `Switch to ${activeView === "internal" ? "Client" : "CR Internal"}` : undefined}
          >
            <ArrowLeftRight size={15} />
            {!collapsed && (
              <span className="text-[13px]">
                {activeView === "internal" ? "Switch to Client" : "Switch to CR Internal"}
              </span>
            )}
          </Button>
        )}
        {!collapsed && profile && (
          <div className="px-1 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-sidebar-foreground truncate">
                {profile.full_name || profile.email}
              </div>
              <div className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">
                {profile.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-7 w-7 p-0 shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          </div>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-center p-0 h-8 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200"
        >
          <LogOut size={15} />
          {!collapsed && <span className="text-[13px]">Sign out</span>}
        </Button>
      </div>
    </aside>
  );
}
