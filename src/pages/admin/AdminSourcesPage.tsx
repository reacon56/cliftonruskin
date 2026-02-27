import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Server, Clock, AlertCircle, CheckCircle2, Play, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";

const SOURCE_TYPES = ["HTTP_DOWNLOAD", "HTML_PARSE", "API"] as const;
const EXPECTED_FORMATS = ["CSV", "XML", "HTML", "PDF"] as const;
const REFRESH_CADENCES = ["daily", "weekly", "monthly", "plenary"] as const;

type DataSource = {
  id: string;
  name: string;
  base_url: string | null;
  description: string | null;
  is_active: boolean;
  source_type: string;
  urls: string[];
  expected_format: string;
  refresh_cadence: string;
  last_run_at: string | null;
  last_run_status: string | null;
  created_at: string;
};

const emptyForm = {
  name: "", base_url: "", description: "", is_active: true,
  source_type: "HTTP_DOWNLOAD", urls: "", expected_format: "CSV", refresh_cadence: "monthly",
};

export default function AdminSourcesPage() {
  const { canQuote } = useAuth();
  const qc = useQueryClient();
  const isManager = canQuote;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [testParseDialog, setTestParseDialog] = useState(false);
  const [testParseResult, setTestParseResult] = useState<any>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["admin-data-sources"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("data_source") as any).select("*").order("name");
      if (error) throw error;
      return data as DataSource[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        base_url: form.base_url || null,
        description: form.description || null,
        is_active: form.is_active,
        source_type: form.source_type,
        urls: form.urls.split("\n").map((u) => u.trim()).filter(Boolean),
        expected_format: form.expected_format,
        refresh_cadence: form.refresh_cadence,
      };
      if (editId) {
        const { error } = await (supabase.from("data_source") as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("data_source") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-data-sources"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? "Source updated" : "Source added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("data_source") as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-data-sources"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const triggerRun = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke("ingestion-runner", {
        body: { source_id: sourceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-data-sources"] });
      toast.success(`Run completed: ${data?.records_processed ?? 0} processed, ${data?.records_changed ?? 0} changed`);
    },
    onError: (e: any) => toast.error(`Run failed: ${e.message}`),
  });

  const testParse = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fatf-ingest", {
        body: { dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTestParseResult(data);
      setTestParseDialog(true);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isFatfSource = (name: string) => name.toLowerCase().includes("fatf");

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: DataSource) => {
    setEditId(s.id);
    setForm({
      name: s.name, base_url: s.base_url || "", description: s.description || "",
      is_active: s.is_active, source_type: s.source_type,
      urls: (s.urls || []).join("\n"), expected_format: s.expected_format,
      refresh_cadence: s.refresh_cadence,
    });
    setDialogOpen(true);
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
      case "failed": return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      case "running": return <Clock className="h-3.5 w-3.5 text-accent-foreground animate-pulse" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const cadenceBadge = (c: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (c) { case "daily": return "destructive"; case "weekly": return "default"; case "monthly": return "secondary"; default: return "outline"; }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" /> Data Sources
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage ingestion source configurations</p>
        </div>
        {isManager && (
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Source</Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>URLs</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Active</TableHead>
              {isManager && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : sources.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sources configured</TableCell></TableRow>
            ) : sources.map((s) => (
              <TableRow key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="font-medium text-sm">{s.name}</div>
                  {s.description && <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{s.description}</div>}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{s.source_type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.expected_format}</TableCell>
                <TableCell><Badge variant={cadenceBadge(s.refresh_cadence)} className="text-[10px]">{s.refresh_cadence}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.urls?.length || 0}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(s.last_run_status)}
                    <span className="text-[11px] text-muted-foreground">
                      {s.last_run_at ? format(new Date(s.last_run_at), "dd MMM HH:mm") : "Never"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {isManager ? (
                    <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })} />
                  ) : (
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">{s.is_active ? "On" : "Off"}</Badge>
                  )}
                </TableCell>
                {isManager && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => triggerRun.mutate(s.id)}
                        disabled={triggerRun.isPending}
                        title="Run Now"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      {isFatfSource(s.name) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testParse.mutate()}
                          disabled={testParse.isPending}
                          title="Test Parse"
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Source" : "Add Source"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Source Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. FATF Grey List" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source Type</Label>
                <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Format</Label>
                <Select value={form.expected_format} onValueChange={(v) => setForm({ ...form, expected_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPECTED_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Refresh Cadence</Label>
              <Select value={form.refresh_cadence} onValueChange={(v) => setForm({ ...form, refresh_cadence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REFRESH_CADENCES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base URL</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <Label>Source URLs (one per line)</Label>
              <Textarea value={form.urls} onChange={(e) => setForm({ ...form, urls: e.target.value })} rows={3} placeholder="https://example.com/data.csv" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Enabled</Label>
            </div>
            <Button onClick={() => upsert.mutate()} disabled={!form.name.trim() || upsert.isPending} className="w-full">
              {upsert.isPending ? "Saving…" : editId ? "Update Source" : "Add Source"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
