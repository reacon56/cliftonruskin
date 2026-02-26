import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2, Link, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
const STATUS_LABELS: Record<string, string> = { todo: "To Do", in_progress: "In Progress", blocked: "Blocked", done: "Done" };
const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  blocked: "bg-destructive/10 text-destructive",
  done: "bg-accent/10 text-accent-foreground",
};

interface CaseTaskBoardProps {
  caseId: string;
  isManager: boolean;
}

export default function CaseTaskBoard({ caseId, isManager }: CaseTaskBoardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "todo", due_date: "" });
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["case-tasks", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_tasks")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const upsertTask = useMutation({
    mutationFn: async () => {
      const payload = {
        case_id: caseId,
        title: form.title,
        description: form.description || null,
        status: form.status,
        due_date: form.due_date || null,
        owner_id: user?.id,
      };
      if (editingTask) {
        const { error } = await supabase.from("case_tasks").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("case_tasks").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-tasks", caseId] });
      setDialogOpen(false);
      setEditingTask(null);
      toast.success(editingTask ? "Task updated" : "Task created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("case_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case-tasks", caseId] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("case_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-tasks", caseId] });
      toast.success("Task deleted");
    },
  });

  const openNew = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", status: "todo", due_date: "" });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingTask(t);
    setForm({ title: t.title, description: t.description || "", status: t.status, due_date: t.due_date || "" });
    setDialogOpen(true);
  };

  const completedCount = tasks.filter((t: any) => t.status === "done").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completedCount}/{tasks.length} done</span>
          <div className="flex border rounded-md overflow-hidden">
            <button onClick={() => setViewMode("list")} className={`px-2.5 py-1 text-xs ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>List</button>
            <button onClick={() => setViewMode("kanban")} className={`px-2.5 py-1 text-xs ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Board</button>
          </div>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Add Task</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No tasks yet — add one to begin.</p>
      ) : viewMode === "list" ? (
        <div className="space-y-1.5">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
              <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(t)}>
                <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                {t.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</div>}
              </div>
              {t.due_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Calendar className="h-3 w-3" /> {format(new Date(t.due_date), "dd MMM")}
                </span>
              )}
              {t.linked_retrieval_logs?.length > 0 && (
                <Badge variant="outline" className="text-[10px] shrink-0"><Link className="h-3 w-3 mr-0.5" /> {t.linked_retrieval_logs.length}</Badge>
              )}
              {isManager && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteTask.mutate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Kanban view */
        <div className="grid grid-cols-4 gap-3">
          {TASK_STATUSES.map((status) => (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Badge className={`text-[10px] ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</Badge>
                <span className="text-[10px] text-muted-foreground">{tasks.filter((t: any) => t.status === status).length}</span>
              </div>
              <div className="space-y-1.5 min-h-[60px]">
                {tasks.filter((t: any) => t.status === status).map((t: any) => (
                  <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(t)}>
                    <CardContent className="p-2.5">
                      <div className="text-xs font-medium text-foreground">{t.title}</div>
                      {t.due_date && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" /> {format(new Date(t.due_date), "dd MMM")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title…" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Details…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => upsertTask.mutate()} disabled={!form.title.trim() || upsertTask.isPending} className="w-full">
              {upsertTask.isPending ? "Saving…" : editingTask ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
