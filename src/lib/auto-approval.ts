import { supabase } from "@/integrations/supabase/client";

interface AutoApprovalParams {
  orgId: string;
  entityRiskTier: string;
  productType: string;
  priority: string;
  priceEstimate: number;
  hasEnhancements?: boolean;
  hasPartnerSpend?: boolean;
  dpRiskLevel?: string;
}

/**
 * Evaluates auto-approval rules for a case.
 * Returns { autoApproved: true } if the case can skip manual approval,
 * or { autoApproved: false, reasons } listing why manual approval is needed.
 */
export async function evaluateAutoApproval(params: AutoApprovalParams): Promise<{
  autoApproved: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];

  // Fetch org auto-approval rules
  const { data: rules } = await supabase
    .from("auto_approval_rules" as any)
    .select("*")
    .eq("org_id", params.orgId)
    .single();

  if (!rules) {
    // No rules configured — fall back to requiring approval
    reasons.push("No auto-approval rules configured — manual approval required");
    return { autoApproved: false, reasons };
  }

  const r = rules as any;

  // Check each always-require gate
  if (r.always_require_tier_a && params.entityRiskTier === "A") {
    reasons.push("Tier A entities always require approval");
  }

  if (r.always_require_rush && params.priority === "rush") {
    reasons.push("Rush priority always requires approval");
  }

  if (r.always_require_dossier && params.productType === "Assurance Dossier") {
    reasons.push("Assurance Dossiers always require approval");
  }

  if (r.always_require_dp_high && params.dpRiskLevel === "high") {
    reasons.push("High data protection risk requires approval");
  }

  if (r.always_require_partner_spend && params.hasPartnerSpend) {
    reasons.push("Cases with partner spend require approval");
  }

  // Auto-approve Refresh Notes up to threshold
  if (
    reasons.length === 0 &&
    params.productType === "Refresh Note" &&
    r.auto_approve_refresh_up_to !== null &&
    params.priceEstimate <= Number(r.auto_approve_refresh_up_to)
  ) {
    return { autoApproved: true, reasons: [] };
  }

  // If no blocking reasons and not a special auto-approve path, still require approval
  if (reasons.length === 0) {
    // Check legacy org threshold
    const { data: org } = await supabase
      .from("organisations")
      .select("approval_price_threshold")
      .eq("id", params.orgId)
      .single();

    if (org?.approval_price_threshold && params.priceEstimate > Number(org.approval_price_threshold)) {
      reasons.push(`Estimate exceeds org threshold of £${Number(org.approval_price_threshold).toLocaleString()}`);
    }
  }

  return { autoApproved: reasons.length === 0, reasons };
}
