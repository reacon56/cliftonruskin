import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SCHEDULED_REASONS, EVENT_REASONS, useTriggerReviewFlow } from "./TriggerReviewFlow";

interface Props {
  entity: any;
  cases: any[];
  policyRule: any | null;
  canEdit: boolean;
  onRefresh: () => void;
  userId: string;
}

export default function ReviewCycleTab({ entity, cases, policyRule, canEdit, onRefresh, userId }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nextDate, setNextDate] = useState(entity.next_review_date || "");
  const [saving, setSaving] = useState(false);
  const { handleReasonSelect, modals } = useTriggerReviewFlow(entity.id);

  const completedCases = cases
    .filter((c) => c.status === "delivered" || c.status === "closed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const cadence = policyRule?.review_frequency_months
    ? `Every ${policyRule.review_frequency_months} months`
    : "Not configured";

  const handleSaveDate = async () => {
    if (!nextDate) return;
    setSaving(true);
    const { error } = await supabase.from("entities").update({ next_review_date: nextDate }).eq("id", entity.id);
    if (!error) {
      await supabase.from("audit_events").insert({
        object_type: "entity", object_id: entity.id, action_type: "next_review_date_updated",
        user_id: userId, org_id: entity.org_id,
        metadata: { next_review_date: nextDate },
      });
      toast({ title: "Next review date updated" });
      onRefresh();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 fvc-stagger">
      {/* Current cycle info */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Review Cycle</h3>
        <div className="grid md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
          <div>
            <span className="fvc-label block mb-1">Last Review</span>
            <span className="text-foreground">{entity.last_review_date ? new Date(entity.last_review_date).toLocaleDateString() : "Never"}</span>
          </div>
          <div>
            <span className="fvc-label block mb-1">Next Review</span>
            <span className="text-foreground">{entity.next_review_date ? new Date(entity.next_review_date).toLocaleDateString() : "Not set"}</span>
          </div>
          <div>
            <span className="fvc-label block mb-1">Cadence (Policy)</span>
            <span className="text-foreground">{cadence}</span>
          </div>
        </div>
      </div>

      {/* Review Cycle Manager */}
      {canEdit && (
        <div className="fvc-card border-accent/20">
          <h3 className="fvc-heading-3 text-foreground mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-accent" /> Review Cycle Manager
          </h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Next Review Date</Label>
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="w-48" />
            </div>
            <Button size="sm" onClick={handleSaveDate} disabled={saving || !nextDate}>
              Save Date
            </Button>
          </div>
        </div>
      )}

      {/* Trigger Review (Out of Cycle) */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-3 flex items-center gap-2">
          <RefreshCw size={16} className="text-accent" /> Trigger Review (Out of Cycle)
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Select a reason to trigger an out-of-cycle review.</p>

        {/* Scheduled review group */}
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Scheduled review</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SCHEDULED_REASONS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant="outline"
              onClick={() => handleReasonSelect(r)}
            >
              {r}
            </Button>
          ))}
        </div>

        {/* Event-triggered review group */}
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Event-triggered review</p>
        <div className="flex flex-wrap gap-2">
          {EVENT_REASONS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant="outline"
              onClick={() => handleReasonSelect(r)}
            >
              {r}
            </Button>
          ))}
        </div>

        {policyRule?.approval_required && (
          <p className="text-[10px] text-warning mt-3">
            ⚠ This tier requires approval — refreshes will enter the approvals flow.
          </p>
        )}
      </div>

      {/* Review History */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Review History</h3>
        {completedCases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed reviews.</p>
        ) : (
          <div className="space-y-0">
            {completedCases.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{c.product_type}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <Badge className="fvc-status-badge bg-success/10 text-success">Complete</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {modals}
    </div>
  );
}
