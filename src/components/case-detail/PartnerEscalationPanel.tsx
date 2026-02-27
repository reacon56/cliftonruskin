import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, Clock, DollarSign, Globe,
  Plus, Send, ShieldCheck, RefreshCcw, ChevronDown, ChevronUp,
} from "lucide-react";

interface Props {
  caseId: string;
  entityId?: string;
  entityCountry?: string;
  isManager: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_approval: { label: "Pending Approval", color: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  brief_sent: { label: "Brief Sent", color: "bg-accent/10 text-accent", icon: Send },
  scope_received: { label: "Scope Received", color: "bg-accent/10 text-accent", icon: Globe },
  partner_selected: { label: "Partner Selected", color: "bg-primary/10 text-primary", icon: ShieldCheck },
  in_progress: { label: "In Progress", color: "bg-primary/10 text-primary", icon: RefreshCcw },
  completed: { label: "Completed", color: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export default function PartnerEscalationPanel({ caseId, entityId, entityCountry, isManager }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create form
  const [brief, setBrief] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [triggerSource, setTriggerSource] = useState<"officer" | "ai">("officer");
  const [submitting, setSubmitting] = useState(false);

  // Approval form
  const [approvedCost, setApprovedCost] = useState("");

  useEffect(() => {
    loadEscalations();
  }, [caseId]);

  const loadEscalations = async () => {
    const { data } = await supabase
      .from("partner_escalations" as any)
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setEscalations((data as any[]) ?? []);
    setLoading(false);
  };

  const logAudit = async (action: string, escalationId: string, metadata?: Record<string, any>) => {
    if (!user || !profile) return;
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: action,
      object_type: "partner_escalation",
      object_id: escalationId,
      metadata: { case_id: caseId, ...metadata },
    });
  };

  const handleCreate = async () => {
    if (!brief.trim()) {
      toast({ title: "Brief required", description: "Please describe the escalation scope.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.from("partner_escalations" as any).insert({
      case_id: caseId,
      entity_id: entityId || null,
      brief: brief.trim(),
      estimated_cost: estimatedCost ? Number(estimatedCost) : null,
      trigger_source: triggerSource,
      status: "pending_approval",
      created_by: user!.id,
    } as any).select("id").single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await logAudit("ESCALATION_CREATED", (data as any).id, { trigger_source: triggerSource });
    toast({ title: "Escalation created", description: "Awaiting manager approval." });
    setBrief("");
    setEstimatedCost("");
    setShowCreate(false);
    setSubmitting(false);
    loadEscalations();
  };

  const handleApprove = async (esc: any) => {
    const cost = approvedCost ? Number(approvedCost) : esc.estimated_cost;
    await supabase.from("partner_escalations" as any)
      .update({
        status: "approved",
        approved_by: user!.id,
        approved_at: new Date().toISOString(),
        approved_cost: cost,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", esc.id);

    await logAudit("ESCALATION_APPROVED", esc.id, { approved_cost: cost });
    toast({ title: "Escalation approved" });
    setApprovedCost("");
    loadEscalations();
  };

  const handleReject = async (esc: any) => {
    await supabase.from("partner_escalations" as any)
      .update({ status: "rejected", updated_at: new Date().toISOString() } as any)
      .eq("id", esc.id);

    await logAudit("ESCALATION_REJECTED", esc.id);
    toast({ title: "Escalation rejected" });
    loadEscalations();
  };

  const handleAdvanceStatus = async (esc: any, newStatus: string) => {
    const payload: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "completed") payload.completed_at = new Date().toISOString();

    await supabase.from("partner_escalations" as any).update(payload).eq("id", esc.id);
    await logAudit(`ESCALATION_${newStatus.toUpperCase()}`, esc.id);
    toast({ title: `Status → ${STATUS_CONFIG[newStatus]?.label || newStatus}` });
    loadEscalations();
  };

  const handleMarkRiskRecalculated = async (esc: any) => {
    await supabase.from("partner_escalations" as any)
      .update({ risk_recalculated: true, updated_at: new Date().toISOString() } as any)
      .eq("id", esc.id);

    await logAudit("ESCALATION_RISK_RECALCULATED", esc.id);
    toast({ title: "Risk recalculation confirmed" });
    loadEscalations();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading escalations…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Partner Escalations
        </h4>
        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3" /> Escalate
        </Button>
      </div>

      {/* ── Create Form ── */}
      {showCreate && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Flag this case for enhanced partner investigation. A manager must approve the budget before the task is activated.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant={triggerSource === "officer" ? "default" : "outline"} className="text-xs h-7"
              onClick={() => setTriggerSource("officer")}>Officer Request</Button>
            <Button size="sm" variant={triggerSource === "ai" ? "default" : "outline"} className="text-xs h-7"
              onClick={() => setTriggerSource("ai")}>AI Flagged</Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Investigation Brief *</Label>
            <Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe what further investigation is required and why…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estimated Cost (£)</Label>
            <Input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="e.g., 2500" className="max-w-[200px]" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={submitting || !brief.trim()}>
              {submitting ? "Creating…" : "Submit for Approval"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Escalation List ── */}
      {escalations.length === 0 && !showCreate ? (
        <p className="text-sm text-muted-foreground">No escalations for this case.</p>
      ) : (
        <div className="space-y-2">
          {escalations.map((esc: any) => {
            const cfg = STATUS_CONFIG[esc.status] || STATUS_CONFIG.pending_approval;
            const Icon = cfg.icon;
            const isExpanded = expanded === esc.id;

            return (
              <div key={esc.id} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : esc.id)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {esc.trigger_source === "ai" ? "AI-Flagged" : "Officer"} Escalation
                    </span>
                    <Badge className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {esc.estimated_cost && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" /> £{Number(esc.estimated_cost).toLocaleString()}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-3 space-y-3">
                    <div className="text-sm text-foreground whitespace-pre-wrap">{esc.brief}</div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Created</span>
                        <div className="text-foreground">{new Date(esc.created_at).toLocaleString()}</div>
                      </div>
                      {esc.approved_at && (
                        <div>
                          <span className="text-muted-foreground">Approved</span>
                          <div className="text-foreground">{new Date(esc.approved_at).toLocaleString()}</div>
                        </div>
                      )}
                      {esc.approved_cost != null && (
                        <div>
                          <span className="text-muted-foreground">Approved Budget</span>
                          <div className="text-foreground font-medium">£{Number(esc.approved_cost).toLocaleString()}</div>
                        </div>
                      )}
                      {esc.scope_confirmation && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Scope Confirmation</span>
                          <div className="text-foreground">{esc.scope_confirmation}</div>
                        </div>
                      )}
                    </div>

                    {/* ── Manager Approval Actions ── */}
                    {esc.status === "pending_approval" && isManager && (
                      <div className="rounded border border-primary/20 bg-primary/5 p-3 space-y-2">
                        <p className="text-xs font-medium text-foreground">Manager Approval Required</p>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Approved Budget (£)</Label>
                          <Input type="number" value={approvedCost} onChange={(e) => setApprovedCost(e.target.value)}
                            placeholder={esc.estimated_cost ? `${esc.estimated_cost}` : "Enter amount"}
                            className="max-w-[200px]" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs h-7" onClick={() => handleApprove(esc)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleReject(esc)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── Status Progression ── */}
                    {esc.status === "approved" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdvanceStatus(esc, "brief_sent")}>
                        <Send className="h-3 w-3 mr-1" /> Mark Brief Sent
                      </Button>
                    )}
                    {esc.status === "brief_sent" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdvanceStatus(esc, "scope_received")}>
                        Mark Scope Received
                      </Button>
                    )}
                    {esc.status === "scope_received" && isManager && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdvanceStatus(esc, "partner_selected")}>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Confirm Partner Selection
                      </Button>
                    )}
                    {esc.status === "partner_selected" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdvanceStatus(esc, "in_progress")}>
                        Mark In Progress
                      </Button>
                    )}
                    {esc.status === "in_progress" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdvanceStatus(esc, "completed")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Completed
                      </Button>
                    )}

                    {/* ── Risk Recalculation ── */}
                    {esc.status === "completed" && !esc.risk_recalculated && (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-warning/30 text-warning hover:bg-warning/10" onClick={() => handleMarkRiskRecalculated(esc)}>
                        <RefreshCcw className="h-3 w-3 mr-1" /> Confirm Risk Recalculated
                      </Button>
                    )}
                    {esc.risk_recalculated && (
                      <Badge className="text-[10px] bg-success/10 text-success">Risk Recalculated ✓</Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
