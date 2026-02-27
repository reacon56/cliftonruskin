import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Trash2, Save } from "lucide-react";

const BUCKETS = [
  { value: "data_retrieval", label: "Data Retrieval & Checks" },
  { value: "analysis_writeup", label: "Analysis & Write-up" },
  { value: "partner_management", label: "Partner Management" },
  { value: "revisions", label: "Revisions" },
  { value: "qa_rework", label: "QA Rework" },
] as const;

const BUCKET_LABELS: Record<string, string> = Object.fromEntries(BUCKETS.map((b) => [b.value, b.label]));

interface TimeEntry {
  id: string;
  bucket: string;
  minutes: number;
  note: string | null;
  entry_date: string;
  officer_id: string;
  created_at: string;
}

interface Props {
  caseId: string;
  isManager: boolean;
}

export default function CaseTimeTracker({ caseId, isManager }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [bucket, setBucket] = useState("data_retrieval");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEntries(); }, [caseId]);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("analyst_time_entries" as any)
      .select("*")
      .eq("case_id", caseId)
      .order("entry_date", { ascending: false });
    setEntries((data as any[]) ?? []);
  };

  const handleAdd = async () => {
    const mins = parseInt(minutes);
    if (!mins || mins <= 0) {
      toast({ title: "Enter valid minutes", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await supabase.from("analyst_time_entries" as any).insert({
        case_id: caseId,
        officer_id: user?.id,
        org_id: profile?.org_id,
        bucket,
        minutes: mins,
        note: note.trim() || null,
      } as any);

      // Audit log
      if (user && profile) {
        await supabase.from("audit_events").insert({
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "TIME_ENTRY_ADDED",
          object_type: "case",
          object_id: caseId,
          metadata: { bucket, minutes: mins },
        });
      }

      toast({ title: `${mins} minutes logged` });
      setMinutes("");
      setNote("");
      setShowForm(false);
      loadEntries();
    } catch {
      toast({ title: "Failed to log time", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("analyst_time_entries" as any).delete().eq("id", id);
    toast({ title: "Entry removed" });
    loadEntries();
  };

  // Group by bucket for summary
  const bucketTotals = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.bucket] = (acc[e.bucket] || 0) + e.minutes;
    return acc;
  }, {});
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={14} /> Time Tracking
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{totalMinutes} min total</Badge>
          {!showForm && (
            <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setShowForm(true)}>
              <Plus size={12} /> Log Time
            </Button>
          )}
        </div>
      </div>

      {/* Bucket summary */}
      {Object.keys(bucketTotals).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUCKETS.filter((b) => bucketTotals[b.value]).map((b) => (
            <div key={b.value} className="rounded border border-border p-2">
              <span className="text-[10px] text-muted-foreground block">{b.label}</span>
              <span className="text-sm font-semibold text-foreground">{bucketTotals[b.value]} min</span>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded border border-border bg-muted/20 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select value={bucket} onValueChange={setBucket}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUCKETS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Minutes"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="text-xs h-8"
              min={1}
            />
          </div>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-xs h-8"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs gap-1 h-7" onClick={handleAdd} disabled={saving}>
              <Save size={12} /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Entry list */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[9px] py-0 shrink-0">{BUCKET_LABELS[e.bucket] || e.bucket}</Badge>
                <span className="font-medium text-foreground">{e.minutes} min</span>
                {e.note && <span className="text-muted-foreground truncate">— {e.note}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">{new Date(e.entry_date).toLocaleDateString("en-GB")}</span>
                {(e.officer_id === user?.id || isManager) && (
                  <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-[10px] text-muted-foreground italic">No time logged yet.</p>
      )}
    </div>
  );
}
