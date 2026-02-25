import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Shield, FileSearch } from "lucide-react";
import DpDeclarationStep, {
  DP_DECLARATION_INITIAL, computeDpDeclarationRisk, type DpDeclarationState,
} from "@/components/commission/DpDeclarationStep";
import { requiresApproval } from "@/lib/approval-utils";

interface Props {
  event: any; // monitoring_event with entities join
  entityRiskTier?: string;
  onCaseCreated: () => void;
}

const PRICING: Record<string, number> = {
  "Refresh Note": 950,
  "Assurance Dossier": 4500,
};

/**
 * Determines the suggested product based on event severity and entity tier.
 */
function suggestProduct(severity: string, riskTier?: string): string {
  if (severity === "high" || riskTier === "A") return "Assurance Dossier";
  return "Refresh Note";
}

export default function EventReviewButton({ event, entityRiskTier, onCaseCreated }: Props) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [dpForm, setDpForm] = useState<DpDeclarationState>({
    ...DP_DECLARATION_INITIAL,
    use_master_lia: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const suggestedProduct = suggestProduct(event.severity, entityRiskTier);
  const priceEstimate = PRICING[suggestedProduct] ?? 950;

  // Already has a case linked
  if (event.case_id) return null;

  const handleSubmit = async () => {
    if (!profile?.org_id || !user) return;
    setSubmitting(true);

    const dpRisk = computeDpDeclarationRisk(dpForm);

    // Check approval requirements
    const approvalResult = await requiresApproval({
      orgId: profile.org_id,
      entityRiskTier: entityRiskTier || "C",
      productType: suggestedProduct,
      priority: "standard",
      priceEstimate,
      dpRiskLevel: dpRisk.requiresApproval ? "high" : "low",
    });

    const needsApproval = approvalResult.required || dpRisk.requiresApproval;
    const caseStatus = needsApproval ? "submitted" : "quoted";

    // Create case
    const { data: insertedCase, error } = await supabase.from("cases").insert({
      org_id: profile.org_id,
      entity_id: event.entity_id,
      requested_by: user.id,
      product_type: suggestedProduct,
      priority: "standard",
      scope_notes: `Event-driven review: ${event.headline}\nEvent type: ${event.event_type}\nDetected: ${new Date(event.detected_at).toLocaleDateString()}${event.source_url ? `\nSource: ${event.source_url}` : ""}`,
      status: caseStatus,
      price_estimate: priceEstimate,
      sla_days: 10,
      requires_personal_data: true,
      processing_purpose: dpForm.purpose || "Incident / allegation response",
      data_categories: dpForm.data_categories,
      minimisation_confirmed: dpForm.minimisation_confirmed,
      retention_months: dpForm.retention_months,
      dp_risk_level: dpRisk.requiresApproval ? "high" : "low",
      dp_review_required: dpRisk.requiresApproval,
    } as any).select("id").single();

    if (error || !insertedCase?.id) {
      toast({ title: "Error", description: error?.message ?? "Failed to create case", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Create DP declaration
    await supabase.from("case_dp_declarations" as any).insert({
      case_id: insertedCase.id,
      org_id: profile.org_id,
      master_lia_id: dpForm.use_master_lia && dpForm.master_lia_id ? dpForm.master_lia_id : null,
      purpose: dpForm.purpose || "Incident / allegation response",
      data_categories: dpForm.data_categories,
      sensitive_criminal_offence: dpForm.sensitive_criminal_offence,
      sensitive_special_category: dpForm.sensitive_special_category,
      minimisation_confirmed: dpForm.minimisation_confirmed,
      retention_months: dpForm.retention_months,
      requires_approval: dpRisk.requiresApproval,
      approval_reasons: dpRisk.reasons,
    } as any);

    // Create DP review if needed
    if (dpRisk.requiresApproval) {
      await supabase.from("data_protection_reviews").insert({
        case_id: insertedCase.id,
        status: "pending",
      });
    }

    // Link case back to monitoring event
    await supabase.from("monitoring_events")
      .update({ case_id: insertedCase.id, status: "actioned" } as any)
      .eq("id", event.id);

    // Audit trail
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "EVENT_REVIEW_OPENED",
      object_type: "case",
      object_id: insertedCase.id,
      metadata: {
        monitoring_event_id: event.id,
        event_headline: event.headline,
        event_severity: event.severity,
        suggested_product: suggestedProduct,
        reason: "event-driven",
        approval_required: needsApproval,
        approval_reasons: [...(approvalResult.reasons ?? []), ...(dpRisk.requiresApproval ? dpRisk.reasons : [])],
      },
    });

    toast({
      title: needsApproval ? "⏳ Event review submitted for approval" : "✓ Event review case created",
      description: `${suggestedProduct} for ${event.entities?.name ?? "entity"} — ${needsApproval ? "routed to approvals queue" : "ready for processing"}.`,
    });

    setOpen(false);
    onCaseCreated();
    navigate(`/cases/${insertedCase.id}`);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-xs gap-1.5"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <FileSearch size={12} /> Open Event Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield size={18} className="text-accent" /> Open Event Review
            </DialogTitle>
          </DialogHeader>

          {/* Event summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="text-sm font-medium text-foreground">{event.headline}</div>
            <div className="text-[11px] text-muted-foreground">
              {event.entities?.name ?? "Unknown entity"} · {event.event_type.replace(/_/g, " ")} · Severity: <span className={`font-medium ${event.severity === "high" ? "text-destructive" : event.severity === "med" ? "text-warning" : "text-foreground"}`}>{event.severity}</span>
            </div>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              <div>
                <span className="font-medium text-foreground">Suggested product:</span> {suggestedProduct}
              </div>
              <div>
                <span className="font-medium text-foreground">Estimate:</span> £{priceEstimate.toLocaleString()}
              </div>
              <div>
                <span className="font-medium text-foreground">Reason:</span> Event-driven
              </div>
            </div>
          </div>

          {/* DP Declaration */}
          <div className="mt-2">
            <DpDeclarationStep
              form={dpForm}
              onChange={setDpForm}
              orgId={profile?.org_id ?? null}
            />
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !dpForm.purpose || !dpForm.minimisation_confirmed}
            >
              {submitting ? "Creating…" : "Create Event Review Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
