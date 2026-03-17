import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, ListTodo, HelpCircle } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function PartnerLayout() {
  const { signOut, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Minimal sidebar */}
      <aside className="w-60 flex flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="font-display text-[15px] font-semibold text-sidebar-foreground tracking-tight leading-tight">
            Clifton Ruskin
          </div>
          <div className="text-[9px] uppercase tracking-[0.25em] text-sidebar-primary mt-1 font-medium">
            Partner Portal
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          <button
            onClick={() => navigate("/partner/tasks")}
            className="group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] w-full text-left text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all duration-200"
          >
            <ListTodo size={18} />
            <span className="font-medium">My Tasks</span>
          </button>
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-2">
          <Button
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-2 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors duration-200"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            <span className="text-[13px]">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </Button>
          {profile && (
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
            <span className="text-[13px]">Sign out</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
