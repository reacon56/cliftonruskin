import { useNavigate } from "react-router-dom";
import { ChevronDown, Eye, AlertTriangle, Clock, ShieldAlert, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SAVED_VIEWS = [
  { label: "My entities", icon: <Building2 size={14} />, route: "/entities?filter=mine" },
  { label: "Tier A only", icon: <ShieldAlert size={14} />, route: "/entities?tier=A" },
  { label: "Overdue reviews", icon: <AlertTriangle size={14} />, route: "/entities?filter=overdue" },
  { label: "Due soon (30 days)", icon: <Clock size={14} />, route: "/entities?filter=due_soon" },
  { label: "High-severity alerts", icon: <AlertTriangle size={14} />, route: "/entities?filter=high_alerts" },
];

export default function SavedViewsDropdown() {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus:outline-none">
          <Eye size={13} className="text-accent" />
          Saved Views
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 z-50 bg-card border border-border shadow-lg">
        {SAVED_VIEWS.map((view) => (
          <DropdownMenuItem
            key={view.label}
            onClick={() => navigate(view.route)}
            className="flex items-center gap-2 cursor-pointer text-sm"
          >
            <span className="text-muted-foreground">{view.icon}</span>
            {view.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
