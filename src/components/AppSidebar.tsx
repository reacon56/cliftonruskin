import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, FileCheck, FolderOpen, Activity,
  Shield, Users, ClipboardList, HeadphonesIcon, ListTodo,
  Settings, FileText, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function AppSidebar() {
  const { hasRole, isClient, isInternal, signOut, profile } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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

  const navItems = isInternal ? internalNav : clientNav;

  return (
    <aside
      className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <div>
            <div className="font-display text-base font-semibold text-sidebar-foreground tracking-tight">
              Far View &amp; Chase
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-sidebar-primary mt-0.5">
              Assurance Portal
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User / Sign Out */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <div className="text-xs font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate">
              {profile.email}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </div>
    </aside>
  );
}
