import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronLeft, ChevronRight, Moon, Sun, ArrowLeftRight, HelpCircle } from "lucide-react";
import ManagerNavGroups from "@/components/sidebar/ManagerNavGroups";
import OfficerNavSections from "@/components/sidebar/OfficerNavSections";
import ClientNavGroups from "@/components/sidebar/ClientNavGroups";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useAlertNotifications } from "@/hooks/use-alert-notifications";

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
  const isAdmin = hasRole("client_admin" as any);

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

  // Determine which nav component to render
  const showManagerGroups = activeView === "internal" && effectiveIsManager;
  const showOfficerSections = activeView === "internal" && !effectiveIsManager;
  const showClientGroups = activeView !== "internal";

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
        {showManagerGroups && <ManagerNavGroups collapsed={collapsed} />}
        {showOfficerSections && <OfficerNavSections collapsed={collapsed} />}
        {showClientGroups && (
          <ClientNavGroups
            collapsed={collapsed}
            pendingApprovals={pendingApprovals}
            alertCount={alertCount}
            isAdmin={isAdmin}
          />
        )}
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
          onClick={() => navigate("/help")}
          className="w-full justify-start gap-2 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200"
        >
          <HelpCircle size={15} />
          {!collapsed && <span className="text-[13px]">Help Centre</span>}
        </Button>
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
