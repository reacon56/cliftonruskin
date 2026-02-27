import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, CheckCircle2, XCircle, Shield,
  ChevronDown, ChevronUp, Send, Clock,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface DeviationOverride {
  id: string;
  case_id: string;
  requirement_label: string;
  requirement_rule_key: string;
  matrix_version_id: string | null;
  reason_for_deviation: string;
  supporting_notes: string | null;
  officer_id: string;
  status: string;
  reviewer_id: string | null;
  reviewer_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Props {
  caseId: string;
  matrixVersionId: string | null;
  isManager: boolean;
  onDeviationChange?: () => void;
}

export default function TierDeviationPanel({ caseId, matrixVersionId, isManager, onDeviationChange }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<DeviationOverride[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadOverrides(); }, [caseId]);

  const loadOverrides = async () => {
    const { data } = await supabase
      .from("tier_deviation_overrides" as any)
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setOverrides((data as any[]) ?? []);
  };

  const handleReview = async () => {
    if (!reviewingId || !reviewAction || !reviewReason.trim() || !user || !profile) return;
    setSubmitting(true);
    try {
      await supabase
        .from("tier_deviation_overrides" as any)
        .update({
          status: reviewAction,
          reviewer_id: user.id,
          reviewer_reason: reviewReason.trim(),
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", reviewingId);

      const actionType = reviewAction === "approved"
        ? "OVERRIDE_APPROVED"
        : "OVERRIDE_REJECTED";

      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: actionType,
        object_type: "tier_deviation_override",
        object_id: reviewingId,
        metadata: {
          case_id: caseId,
          action: reviewAction,
          reason: reviewReason.trim(),
        },
      });

      toast({ title: `Override ${reviewAction}` });
      setReviewingId(null);
      setReviewAction(null);
      setReviewReason("");
      loadOverrides();
      onDeviationChange?.();
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = overrides.filter((o) => o.status === "pending").length;
  const approvedCount = overrides.filter((o) => o.status === "approved").length;

  if (overrides.length === 0) return null;

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle2 size={12} className="text-success shrink-0" />;
    if (s === "rejected") return <XCircle size={12} className="text-destructive shrink-0" />;
    return <Clock size={12} className="text-warning shrink-0" />;
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-success/10 text-success";
    if (s === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <AlertTriangle size={14} className="text-warning" />
          <h3 className="font-display text-sm font-semibold text-foreground flex-1">
            Active Deviations
          </h3>
          {pendingCount > 0 && (
            <Badge className="bg-warning/10 text-warning text-[10px]">{pendingCount} pending</Badge>
          )}
          {approvedCount > 0 && (
            <Badge className="bg-success/10 text-success text-[10px]">{approvedCount} waived</Badge>
          )}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {expanded && (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div key={o.id} className="border rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  {statusIcon(o.status)}
                  <span className="text-sm font-medium text-foreground flex-1">{o.requirement_label}</span>
                  <Badge className={`text-[10px] capitalize ${statusColor(o.status)}`}>
                    {o.status === "approved" ? "Waived by Manager" : o.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{o.reason_for_deviation}</p>
                {o.supporting_notes && (
                  <p className="text-[10px] text-muted-foreground italic">{o.supporting_notes}</p>
                )}
                {o.reviewer_reason && (
                  <p className="text-[10px] text-foreground border-t border-border pt-1 mt-1">
                    <span className="font-medium">Manager:</span> {o.reviewer_reason}
                  </p>
                )}
                <div className="text-[9px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-GB")}
                </div>

                {/* Manager review actions */}
                {isManager && o.status === "pending" && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1 text-success border-success/30"
                      onClick={() => { setReviewingId(o.id); setReviewAction("approved"); }}
                    >
                      <CheckCircle2 size={10} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1 text-destructive border-destructive/30"
                      onClick={() => { setReviewingId(o.id); setReviewAction("rejected"); }}
                    >
                      <XCircle size={10} /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewingId && !!reviewAction} onOpenChange={() => { setReviewingId(null); setReviewAction(null); setReviewReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-display">
              {reviewAction === "approved" ? "Approve Override" : "Reject Override"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reviewAction === "approved"
                ? "This will waive the tier requirement for this case. Provide a reason."
                : "The officer must complete the requirement. Provide a reason."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason for decision…"
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            className="text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setReviewingId(null); setReviewAction(null); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1"
              disabled={!reviewReason.trim() || submitting}
              onClick={handleReview}
            >
              <Send size={12} /> {submitting ? "Submitting…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Standalone function for requesting a deviation override from TierRequirementsPanel */
export async function requestDeviationOverride(params: {
  caseId: string;
  requirementLabel: string;
  requirementRuleKey: string;
  matrixVersionId: string | null;
  reason: string;
  supportingNotes: string;
  userId: string;
  orgId: string | null;
}): Promise<boolean> {
  const { error } = await supabase
    .from("tier_deviation_overrides" as any)
    .insert({
      case_id: params.caseId,
      requirement_label: params.requirementLabel,
      requirement_rule_key: params.requirementRuleKey,
      matrix_version_id: params.matrixVersionId,
      reason_for_deviation: params.reason,
      supporting_notes: params.supportingNotes || null,
      officer_id: params.userId,
    } as any);

  if (error) return false;

  // Audit log
  await supabase.from("audit_events").insert({
    user_id: params.userId,
    org_id: params.orgId,
    action_type: "OVERRIDE_REQUEST_CREATED",
    object_type: "tier_deviation_override",
    object_id: params.caseId,
    metadata: {
      requirement_label: params.requirementLabel,
      requirement_rule_key: params.requirementRuleKey,
    },
  });

  return true;
}
