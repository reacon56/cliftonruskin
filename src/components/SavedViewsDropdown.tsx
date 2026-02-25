import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Eye, ChevronDown, Plus, Trash2, Users, User, Building2,
  ShieldAlert, AlertTriangle, Clock, Inbox,
} from "lucide-react";

export type PageType = "entities" | "cases" | "monitoring";

export interface FilterState {
  [key: string]: string;
}

interface DefaultView {
  label: string;
  icon: React.ReactNode;
  filters: FilterState;
}

const DEFAULT_VIEWS: Record<PageType, DefaultView[]> = {
  entities: [
    { label: "My Entities", icon: <User size={14} />, filters: { status: "mine" } },
    { label: "Tier A Only", icon: <ShieldAlert size={14} />, filters: { tier: "A" } },
    { label: "Overdue Reviews", icon: <AlertTriangle size={14} />, filters: { status: "overdue" } },
    { label: "Due Within 30 Days", icon: <Clock size={14} />, filters: { status: "due_soon" } },
  ],
  cases: [
    { label: "Awaiting My Input", icon: <Inbox size={14} />, filters: { status: "awaiting_client" } },
    { label: "Submitted", icon: <Clock size={14} />, filters: { status: "submitted" } },
    { label: "In Progress", icon: <Building2 size={14} />, filters: { status: "in_progress" } },
  ],
  monitoring: [
    { label: "High Severity (New)", icon: <AlertTriangle size={14} />, filters: { severity: "high", eventStatus: "new" } },
    { label: "All High Severity", icon: <ShieldAlert size={14} />, filters: { severity: "high" } },
    { label: "New Alerts", icon: <Clock size={14} />, filters: { eventStatus: "new" } },
  ],
};

interface SavedView {
  id: string;
  name: string;
  user_id: string | null;
  filter_json: FilterState;
}

interface Props {
  pageType: PageType;
  currentFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  activeViewName?: string;
}

export default function SavedViewsDropdown({ pageType, currentFilters, onApplyFilters, activeViewName }: Props) {
  const { profile, user, hasRole } = useAuth();
  const { toast } = useToast();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole("client_admin");

  useEffect(() => {
    if (profile?.org_id) loadViews();
  }, [profile?.org_id, pageType]);

  const loadViews = async () => {
    const { data } = await supabase
      .from("saved_views")
      .select("id, name, user_id, filter_json")
      .eq("page_type", pageType)
      .order("created_at");
    setSavedViews((data as SavedView[] | null) ?? []);
  };

  const handleSave = async () => {
    if (!newName.trim() || !profile?.org_id || !user) return;
    setSaving(true);

    const { error } = await supabase.from("saved_views").insert({
      org_id: profile.org_id,
      user_id: isShared ? null : user.id,
      name: newName.trim(),
      page_type: pageType,
      filter_json: currentFilters,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "View saved", description: `"${newName.trim()}" has been saved.` });
      setCreateOpen(false);
      setNewName("");
      setIsShared(false);
      loadViews();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    await supabase.from("saved_views").delete().eq("id", id);
    toast({ title: "View deleted", description: `"${name}" has been removed.` });
    loadViews();
  };

  const defaults = DEFAULT_VIEWS[pageType];
  const personalViews = savedViews.filter((v) => v.user_id !== null);
  const sharedViews = savedViews.filter((v) => v.user_id === null);

  const hasFilters = Object.values(currentFilters).some((v) => v && v !== "all");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus:outline-none">
            <Eye size={13} className="text-accent" />
            {activeViewName || "Saved Views"}
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-50 bg-card border border-border shadow-lg">
          {/* Default views */}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Default Views
          </DropdownMenuLabel>
          {defaults.map((view) => (
            <DropdownMenuItem
              key={view.label}
              onClick={() => onApplyFilters(view.filters)}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <span className="text-muted-foreground">{view.icon}</span>
              {view.label}
            </DropdownMenuItem>
          ))}

          {/* Shared views */}
          {sharedViews.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                <Users size={10} /> Shared Views
              </DropdownMenuLabel>
              {sharedViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-center justify-between cursor-pointer text-sm group"
                  onClick={() => onApplyFilters(view.filter_json)}
                >
                  <span>{view.name}</span>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(view.id, view.name); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Personal views */}
          {personalViews.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                <User size={10} /> My Views
              </DropdownMenuLabel>
              {personalViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-center justify-between cursor-pointer text-sm group"
                  onClick={() => onApplyFilters(view.filter_json)}
                >
                  <span>{view.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(view.id, view.name); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Save current */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            disabled={!hasFilters}
            className="flex items-center gap-2 cursor-pointer text-sm text-accent"
          >
            <Plus size={14} />
            Save Current View
          </DropdownMenuItem>

          {/* Clear filters */}
          {hasFilters && (
            <DropdownMenuItem
              onClick={() => onApplyFilters({})}
              className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground"
            >
              Clear Filters
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save view dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>View name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. High-risk UK entities"
                maxLength={60}
              />
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Share with organisation</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Visible to all team members
                  </p>
                </div>
                <Switch checked={isShared} onCheckedChange={setIsShared} />
              </div>
            )}
            <div className="rounded-md bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Active Filters</p>
              <div className="space-y-1">
                {Object.entries(currentFilters)
                  .filter(([, v]) => v && v !== "all")
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="text-foreground font-medium capitalize">{v.replace(/_/g, " ")}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!newName.trim() || saving}>
              {saving ? "Saving…" : "Save View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
