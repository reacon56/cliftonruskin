import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, FileCheck, FolderOpen, Activity,
  Shield, Users, ClipboardList, HeadphonesIcon, ListTodo,
  Settings, FileText, LogOut, ChevronLeft, ChevronRight, Moon, Sun,
  ArrowLeftRight,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function AppSidebar() {
  const { hasRole, isClient, isInternal, signOut, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const hasBothRoles = isClient && isInternal;
  const [viewAs, setViewAs] = useState<"client" | "internal">(isInternal ? "internal" : "client");

  const clientNav: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Entities", path: "/entities", icon: <Building2 size={18} /> },
    { label: "Commission", path: "/commission", icon: <FileCheck size={18} /> },
    { label: "Deliverables", path: "/deliverables", icon: <FolderOpen size={18} /> },
    { label: "Monitoring", path: "/monitoring", icon: <Activity size={18} /> },
    { label: "Policies", path: "/policies", icon: <Shield size={18} /> },
  ];

  if (hasRole("client_admin")) {
    clientNav.push({ label: "Users & Roles", path: "/users", icon: <Users size={18} /> });
  }

  clientNav.push(
    { label: "Audit Log", path: "/audit-log", icon: <ClipboardList size={18} /> },
    { label: "Support", path: "/support", icon: <HeadphonesIcon size={18} /> }
  );

  const internalNav: NavItem[] = [
    { label: "Case Queue", path: "/cases", icon: <ListTodo size={18} /> },
    { label: "Clients", path: "/clients", icon: <Building2 size={18} /> },
    { label: "Templates", path: "/templates", icon: <FileText size={18} /> },
    { label: "Monitoring", path: "/monitoring-rules", icon: <Activity size={18} /> },
    { label: "Admin", path: "/admin", icon: <Settings size={18} /> },
    { label: "Audit Log", path: "/audit-log", icon: <ClipboardList size={18} /> },
  ];

  const activeView = hasBothRoles ? viewAs : (isInternal ? "internal" : "client");
  const navItems = activeView === "internal" ? internalNav : clientNav;

  const toggleView = () => {
    const next = viewAs === "internal" ? "client" : "internal";
    setViewAs(next);
    navigate(next === "internal" ? "/cases" : "/dashboard");
  };

  return (
    <aside
      className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <div className="animate-fade-in">
            <div className="font-display text-[15px] font-semibold text-sidebar-foreground tracking-tight leading-tight">
              Far View &amp; Chase
            </div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-sidebar-primary mt-1 font-medium">
              Assurance Portal
            </div>
          </div>
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
                <span className="font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme Toggle & User / Sign Out */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {hasBothRoles && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleView}
            className="w-full justify-start gap-2 text-sidebar-primary hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200 border border-sidebar-border/50"
            title={collapsed ? `Switch to ${activeView === "internal" ? "Client" : "Analyst"}` : undefined}
          >
            <ArrowLeftRight size={15} />
            {!collapsed && (
              <span className="text-[13px]">
                {activeView === "internal" ? "Switch to Client" : "Switch to Analyst"}
              </span>
            )}
          </Button>
        )}
        <Button
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-2 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {!collapsed && <span className="text-[13px]">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </Button>
        {!collapsed && profile && (
          <div className="px-1">
            <div className="text-xs font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </div>
            <div className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">
              {profile.email}
            </div>
          </div>
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
