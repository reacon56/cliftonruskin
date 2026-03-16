import { NavLink, useLocation } from "react-router-dom";
import {
  ListTodo, ClipboardList, Eye, Search, FlaskConical,
  BookOpen, Globe, Send,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const OFFICER_SECTIONS: NavSection[] = [
  {
    label: "My Work",
    items: [
      { label: "My Cases", path: "/cases", icon: <ListTodo size={18} /> },
      { label: "My Tasks", path: "/my-tasks", icon: <ClipboardList size={18} /> },
      { label: "Submitted to QA", path: "/qa-queue", icon: <Eye size={18} /> },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Entity Lookup", path: "/entities", icon: <Search size={18} /> },
      { label: "Research Console", path: "/research-console", icon: <FlaskConical size={18} /> },
      { label: "Knowledge Base", path: "/knowledge-base", icon: <BookOpen size={18} /> },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Jurisdiction Library", path: "/jurisdiction-library", icon: <Globe size={18} /> },
      { label: "Jurisdictions", path: "/jurisdictions", icon: <Globe size={18} /> },
      { label: "Partner Requests", path: "/partner-requests", icon: <Send size={18} /> },
    ],
  },
];

interface OfficerNavSectionsProps {
  collapsed: boolean;
}

export default function OfficerNavSections({ collapsed }: OfficerNavSectionsProps) {
  const location = useLocation();

  return (
    <>
      {OFFICER_SECTIONS.map((section, idx) => (
        <div key={section.label} className={idx > 0 ? "mt-4" : ""}>
          {/* Divider + section label */}
          {!collapsed ? (
            <>
              {idx > 0 && <div className="h-px mx-2 mb-2 bg-sidebar-border" />}
              <div className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold text-sidebar-foreground/40">
                {section.label}
              </div>
            </>
          ) : (
            idx > 0 && <div className="h-px mx-2 mb-1.5 bg-sidebar-border" />
          )}

          {/* Items */}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
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
                  <span
                    className={`transition-transform duration-200 ${
                      active ? "" : "group-hover:translate-x-0.5"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="font-medium flex-1">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
