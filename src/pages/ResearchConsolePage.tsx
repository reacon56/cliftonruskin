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
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, PlayCircle, ArrowUpFromLine, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PURPOSES = ["Routine", "Interim", "Escalation"];
const OUTCOMES = ["No Match", "Match", "Partial", "Error"];

export default function ResearchConsolePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Selection state
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("Routine");
  const [queryText, setQueryText] = useState("");

  // Result entry
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Record<string, { outcome: string; notes: string }>>({});

  // Promote dialog
  const [promoteLog, setPromoteLog] = useState<any>(null);

  // Fetch cases (internal sees all)
  const { data: cases = [] } = useQuery({
    queryKey: ["research-cases"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, entity_id, status, entities(name)").in("status", ["assigned", "in_progress", "with_partner"]).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  // Derive entity from selected case
  const selectedCase = cases.find((c: any) => c.id === selectedCaseId);

  // Fetch enabled sources
  const { data: sources = [] } = useQuery({
    queryKey: ["enabled-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("research_sources").select("*").eq("enabled", true).order("source_name");
      return data || [];
    },
  });

  // Fetch retrieval logs for selected case
  const { data: logs = [] } = useQuery({
    queryKey: ["retrieval-logs", selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("retrieval_logs")
        .select("*, research_sources(source_name, category)")
        .eq("case_id", selectedCaseId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const runCheck = () => {
    if (!selectedCaseId || selectedSourceIds.length === 0) {
      toast.error("Select a case and at least one source");
      return;
    }
    const initial: Record<string, { outcome: string; notes: string }> = {};
    selectedSourceIds.forEach((id) => { initial[id] = { outcome: "No Match", notes: "" }; });
    setResults(initial);
    setShowResults(true);
  };

  const submitResults = useMutation({
    mutationFn: async () => {
      const entityId = selectedCase?.entity_id;
      if (!entityId || !user) throw new Error("Missing context");
      const rows = Object.entries(results).map(([sourceId, r]) => ({
        case_id: selectedCaseId,
        entity_id: entityId,
        source_id: sourceId,
        officer_id: user.id,
        purpose_of_search: purpose,
        query_text: queryText || null,
        outcome_status: r.outcome,
        notes_internal: r.notes || null,
      }));
      const { error } = await supabase.from("retrieval_logs").insert(rows);
      if (error) throw error;
      // Audit entry
      await supabase.from("audit_events").insert({
        object_type: "retrieval_log",
        action_type: "research_check",
        user_id: user.id,
        metadata: { case_id: selectedCaseId, source_count: rows.length, purpose },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retrieval-logs", selectedCaseId] });
      setShowResults(false);
      setSelectedSourceIds([]);
      setQueryText("");
      toast.success("Retrieval logged successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const promoteFinding = useMutation({
    mutationFn: async ({ logId, target }: { logId: string; target: string }) => {
      const { error } = await supabase.from("retrieval_logs").update({ promoted_to: target }).eq("id", logId);
      if (error) throw error;
      await supabase.from("audit_events").insert({
        object_type: "retrieval_log",
        action_type: "promote_finding",
        object_id: logId,
        user_id: user!.id,
        metadata: { promoted_to: target, case_id: selectedCaseId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retrieval-logs", selectedCaseId] });
      setPromoteLog(null);
      toast.success("Finding promoted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const outcomeColor = (o: string) => {
    if (o === "Match") return "destructive";
    if (o === "Partial") return "default";
    if (o === "Error") return "outline";
    return "secondary";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" /> Research Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Run governed research checks against approved sources</p>
      </div>

      {/* ── Step 1: Select Case ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Select Case & Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Case</Label>
              <Select value={selectedCaseId} onValueChange={(v) => { setSelectedCaseId(v); setSelectedSourceIds([]); setShowResults(false); }}>
                <SelectTrigger><SelectValue placeholder="Select a case…" /></SelectTrigger>
                <SelectContent>
                  {cases.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.entities as any)?.name || "Entity"} — {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity</Label>
              <Input readOnly value={(selectedCase?.entities as any)?.name || "—"} className="bg-muted" />
            </div>
            <div>
              <Label>Purpose of Search</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Query Text (optional)</Label>
            <Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Free-text query description…" />
          </div>
        </CardContent>
      </Card>

      {/* ── Step 2: Select Sources ── */}
      {selectedCaseId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Select Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sources.map((s: any) => (
                <label key={s.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedSourceIds.includes(s.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  <Checkbox checked={selectedSourceIds.includes(s.id)} onCheckedChange={() => toggleSource(s.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.source_name}</div>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{s.tier}</Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {sources.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No enabled sources. Ask a Manager to add sources to the registry.</p>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={runCheck} disabled={selectedSourceIds.length === 0}>
                <PlayCircle className="h-4 w-4 mr-1.5" /> Run Check ({selectedSourceIds.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Log Results ── */}
      {showResults && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Log Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSourceIds.map((sid) => {
              const src = sources.find((s: any) => s.id === sid);
              const r = results[sid];
              return (
                <div key={sid} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{src?.source_name || sid}</span>
                    <Select value={r.outcome} onValueChange={(v) => setResults({ ...results, [sid]: { ...r, outcome: v } })}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={r.notes}
                    onChange={(e) => setResults({ ...results, [sid]: { ...r, notes: e.target.value } })}
                    placeholder="Internal notes…"
                    rows={2}
                    className="text-xs"
                  />
                </div>
              );
            })}
            <Button onClick={() => submitResults.mutate()} disabled={submitResults.isPending} className="w-full">
              {submitResults.isPending ? "Logging…" : "Submit Retrieval Log"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Retrieval History ── */}
      {selectedCaseId && logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Retrieval History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Promoted</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                    <TableCell className="text-sm font-medium">{(log.research_sources as any)?.source_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{log.purpose_of_search}</Badge></TableCell>
                    <TableCell><Badge variant={outcomeColor(log.outcome_status)} className="text-xs">{log.outcome_status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.notes_internal || "—"}</TableCell>
                    <TableCell>
                      {log.promoted_to ? (
                        <Badge variant="default" className="text-xs">{log.promoted_to}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {!log.promoted_to && (log.outcome_status === "Match" || log.outcome_status === "Partial") && (
                        <Button variant="ghost" size="icon" title="Promote Finding" onClick={() => setPromoteLog(log)}>
                          <ArrowUpFromLine className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Promote Dialog ── */}
      <Dialog open={!!promoteLog} onOpenChange={() => setPromoteLog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Promote Finding</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Where should this finding be promoted?</p>
          <div className="space-y-2 mt-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => promoteFinding.mutate({ logId: promoteLog?.id, target: "Internal Case Notes" })}>
              <FileText className="h-4 w-4" /> Internal Case Notes
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => promoteFinding.mutate({ logId: promoteLog?.id, target: "Client-Safe Summary" })}>
              <Shield className="h-4 w-4" /> Client-Safe Findings Summary
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
