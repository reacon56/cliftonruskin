import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListTodo, Search, Calendar, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
const STATUS_LABELS: Record<string, string> = { todo: "To Do", in_progress: "In Progress", blocked: "Blocked", done: "Done" };
const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  blocked: "bg-destructive/10 text-destructive",
  done: "bg-accent/10 text-accent-foreground",
};

export default function MyTasksPage() {
  const { user, canQuote } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isManager = canQuote;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">(isManager ? "kanban" : "list");

  // Fetch all tasks (manager sees all, officer sees own)
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["all-case-tasks", isManager],
    queryFn: async () => {
      let query = supabase.from("case_tasks").select("*, cases(id, status, entity_id, org_id, priority, entities(name), organisations(name))").order("created_at", { ascending: false });
      if (!isManager && user) {
        query = query.eq("owner_id", user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("case_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-case-tasks"] }),
  });

  // Derived filters
  const clientNames = [...new Set(tasks.map((t: any) => (t.cases as any)?.organisations?.name).filter(Boolean))].sort();

  const filtered = tasks.filter((t: any) => {
    const entityName = (t.cases as any)?.entities?.name || "";
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || entityName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesClient = filterClient === "all" || (t.cases as any)?.organisations?.name === filterClient;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-primary" /> {isManager ? "Task Board" : "My Tasks"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isManager ? "Cross-case task overview with filters" : "Tasks assigned to you across all cases"}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary">{filtered.length} tasks</Badge>
        <Badge variant="outline">{filtered.filter((t: any) => t.status === "done").length} done</Badge>
        {filtered.filter((t: any) => t.status === "blocked").length > 0 && (
          <Badge variant="destructive">{filtered.filter((t: any) => t.status === "blocked").length} blocked</Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks or entities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clientNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex border rounded-md overflow-hidden">
          <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-xs ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>List</button>
          <button onClick={() => setViewMode("kanban")} className={`px-3 py-1.5 text-xs ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Board</button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading tasks…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ListTodo className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tasks match your filters</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-1.5">
          {filtered.map((t: any) => {
            const entityName = (t.cases as any)?.entities?.name || "Entity";
            const orgName = (t.cases as any)?.organisations?.name || "";
            const isOverdue = t.due_date && t.due_date < todayStr && t.status !== "done";
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                  <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/cases/${(t.cases as any)?.id}`)}>
                  <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Building2 className="h-3 w-3" /> {entityName}</span>
                    {orgName && <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {orgName}</span>}
                  </div>
                </div>
                {t.due_date && (
                  <span className={`text-[10px] flex items-center gap-0.5 shrink-0 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    <Calendar className="h-3 w-3" /> {format(new Date(t.due_date), "dd MMM")}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{(t.cases as any)?.priority || "standard"}</Badge>
              </div>
            );
          })}
        </div>
      ) : (
        /* Kanban */
        <div className="grid grid-cols-4 gap-4">
          {STATUSES.map((status) => {
            const column = filtered.filter((t: any) => t.status === status);
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <Badge className={`text-xs ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-xs text-muted-foreground">{column.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {column.map((t: any) => {
                    const entityName = (t.cases as any)?.entities?.name || "Entity";
                    const isOverdue = t.due_date && t.due_date < todayStr && t.status !== "done";
                    return (
                      <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/cases/${(t.cases as any)?.id}`)}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="text-xs font-medium text-foreground">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Building2 className="h-2.5 w-2.5" /> {entityName}</div>
                          <div className="flex items-center justify-between">
                            {t.due_date && (
                              <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                <Calendar className="h-2.5 w-2.5" /> {format(new Date(t.due_date), "dd MMM")}
                              </span>
                            )}
                            <Badge variant="outline" className="text-[9px] capitalize">{(t.cases as any)?.priority || "standard"}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
