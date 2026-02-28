import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Send, CheckCircle2, ShieldCheck, Stamp,
  Clock, User, AlertTriangle, Lock, Hash,
} from "lucide-react";

interface Props {
  caseId: string;
  draftId: string;
  orgId: string;
  reportVersion: number;
  reportStatus: string;
  qaApprovalStatus: string;
  structuredDataLocked: boolean;
  onStatusChange: () => void;
}

interface ApprovalRow {
  id: string;
  report_version: number;
  requested_by: string;
  reviewer_user_id: string | null;
  status: string;
  reviewer_notes: string | null;
  content_hash: string | null;
  created_at: string;
  decided_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  in_review: { label: "In Review", color: "bg-warning/10 text-warning", icon: Send },
  approved: { label: "Approved", color: "bg-success/10 text-success", icon: CheckCircle2 },
  issued: { label: "Issued", color: "bg-primary/10 text-primary", icon: Stamp },
};

export default function ReportAssuranceWorkflow({
  caseId, draftId, orgId, reportVersion, reportStatus,
  qaApprovalStatus, structuredDataLocked, onStatusChange,
}: Props) {
  const { user, profile, canQc, isInternal } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const loadApprovals = useCallback(async () => {
    const { data } = await supabase
      .from("report_approval")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setApprovals((data as any[]) ?? []);
  }, [caseId]);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const pendingApproval = approvals.find((a) => a.status === "pending");
  const currentConfig = STATUS_CONFIG[reportStatus] ?? STATUS_CONFIG.draft;
  const StatusIcon = currentConfig.icon;

  const computeHash = (content: any): string => {
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  };

  const logAudit = async (action: string, metadata?: Record<string, any>) => {
    if (!user || !profile) return;
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: action,
      object_type: "report_draft",
      object_id: draftId,
      metadata: { case_id: caseId, report_version: reportVersion, ...metadata },
    });
  };

  /* ── Request Review ── */
  const requestReview = async () => {
    if (!user || !profile) return;
    setLoading(true);
    // Create approval record
    await supabase.from("report_approval").insert({
      report_draft_id: draftId,
      case_id: caseId,
      org_id: orgId,
      report_version: reportVersion,
      requested_by: user.id,
    } as any);
    // Update draft status
    await supabase.from("report_drafts").update({
      report_status: "in_review",
    } as any).eq("id", draftId);
    await logAudit("REPORT_REVIEW_REQUESTED");
    toast({ title: "Review requested — report is now locked for review" });
    setLoading(false);
    loadApprovals();
    onStatusChange();
  };

  /* ── Approve ── */
  const approveReport = async () => {
    if (!pendingApproval || !user) return;
    setLoading(true);
    const hash = computeHash({ draftId, reportVersion, decidedAt: new Date().toISOString() });
    await supabase.from("report_approval").update({
      status: "approved",
      reviewer_user_id: user.id,
      reviewer_notes: reviewerNotes || null,
      content_hash: hash,
      decided_at: new Date().toISOString(),
    } as any).eq("id", pendingApproval.id);
    await supabase.from("report_drafts").update({
      report_status: "approved",
      reviewer_user_id: user.id,
      content_hash: hash,
    } as any).eq("id", draftId);
    await logAudit("REPORT_ASSURANCE_APPROVED", { reviewer_notes: reviewerNotes, content_hash: hash });
    toast({ title: "Report approved" });
    setReviewerNotes("");
    setLoading(false);
    loadApprovals();
    onStatusChange();
  };

  /* ── Reject ── */
  const rejectReport = async () => {
    if (!pendingApproval || !user) return;
    setLoading(true);
    await supabase.from("report_approval").update({
      status: "rejected",
      reviewer_user_id: user.id,
      reviewer_notes: reviewerNotes || null,
      decided_at: new Date().toISOString(),
    } as any).eq("id", pendingApproval.id);
    await supabase.from("report_drafts").update({
      report_status: "draft",
    } as any).eq("id", draftId);
    await logAudit("REPORT_ASSURANCE_REJECTED", { reviewer_notes: reviewerNotes });
    toast({ title: "Report returned to draft", variant: "destructive" });
    setReviewerNotes("");
    setLoading(false);
    loadApprovals();
    onStatusChange();
  };

  /* ── Issue ── */
  const issueReport = async () => {
    if (!user) return;
    setLoading(true);
    const hash = computeHash({ draftId, reportVersion, issuedAt: new Date().toISOString() });
    await supabase.from("report_drafts").update({
      report_status: "issued",
      issued_at: new Date().toISOString(),
      content_hash: hash,
    } as any).eq("id", draftId);
    await logAudit("REPORT_ISSUED", { content_hash: hash });
    toast({ title: "Report issued — content hash stamped for audit" });
    setLoading(false);
    onStatusChange();
  };

  /* ── Workflow Steps ── */
  const steps = [
    { key: "draft", label: "Draft", done: reportStatus !== "draft" || reportStatus === "draft" },
    { key: "in_review", label: "In Review", done: ["in_review", "approved", "issued"].includes(reportStatus) },
    { key: "approved", label: "Approved", done: ["approved", "issued"].includes(reportStatus) },
    { key: "issued", label: "Issued", done: reportStatus === "issued" },
  ];

  const canRequestReview = reportStatus === "draft" && qaApprovalStatus === "approved" && structuredDataLocked;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck size={14} /> Assurance Workflow
        </h4>
        <Badge className={`text-[10px] ${currentConfig.color}`}>
          <StatusIcon size={10} className="mr-1" />
          {currentConfig.label}
        </Badge>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isCurrent = step.key === reportStatus;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all text-[10px] font-bold ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                    : step.done && !isCurrent
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step.done && !isCurrent ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span className={`text-[9px] whitespace-nowrap font-medium ${isCurrent ? "text-foreground" : step.done ? "text-success" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px mx-0.5 mt-[-14px] ${step.done && !isCurrent ? "bg-success/50" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {reportStatus === "draft" && (
        <div className="space-y-2">
          {!canRequestReview && (
            <div className="p-2 rounded border border-warning/30 bg-warning/5 text-[11px] text-warning flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {qaApprovalStatus !== "approved"
                ? "QA approval required before requesting assurance review."
                : !structuredDataLocked
                ? "Structured data must be locked before requesting review."
                : "Complete all prerequisites to request review."}
            </div>
          )}
          <Button
            size="sm"
            className="w-full text-xs gap-1.5"
            disabled={!canRequestReview || loading}
            onClick={requestReview}
          >
            <Send size={12} /> Request Assurance Review
          </Button>
        </div>
      )}

      {reportStatus === "in_review" && canQc && pendingApproval && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Reviewer notes (optional)…"
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 text-xs gap-1 bg-success hover:bg-success/90"
              disabled={loading}
              onClick={approveReport}
            >
              <CheckCircle2 size={12} /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 text-xs gap-1"
              disabled={loading}
              onClick={rejectReport}
            >
              <AlertTriangle size={12} /> Reject
            </Button>
          </div>
        </div>
      )}

      {reportStatus === "in_review" && !canQc && (
        <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
          <Clock size={12} /> Awaiting reviewer sign-off…
        </p>
      )}

      {reportStatus === "approved" && isInternal && (
        <Button
          size="sm"
          className="w-full text-xs gap-1.5"
          disabled={loading}
          onClick={issueReport}
        >
          <Stamp size={12} /> Issue Report
        </Button>
      )}

      {reportStatus === "issued" && (
        <div className="p-2 rounded border border-primary/30 bg-primary/5 text-[11px] text-primary flex items-center gap-1.5">
          <Lock size={12} /> Report issued and locked.
        </div>
      )}

      {/* Audit timeline */}
      {approvals.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground">Approval History</h5>
          {approvals.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                a.status === "approved" ? "bg-success/20 text-success"
                : a.status === "rejected" ? "bg-destructive/20 text-destructive"
                : "bg-warning/20 text-warning"
              }`}>
                {a.status === "approved" ? <CheckCircle2 size={10} />
                : a.status === "rejected" ? <AlertTriangle size={10} />
                : <Clock size={10} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] capitalize">{a.status}</Badge>
                  <span className="text-muted-foreground">v{a.report_version}</span>
                  {a.content_hash && (
                    <span className="text-muted-foreground flex items-center gap-0.5">
                      <Hash size={8} /> {a.content_hash.slice(0, 8)}
                    </span>
                  )}
                </div>
                {a.reviewer_notes && (
                  <p className="text-muted-foreground mt-0.5 truncate">{a.reviewer_notes}</p>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(a.decided_at ?? a.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
