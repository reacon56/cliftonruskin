import { supabase } from "@/integrations/supabase/client";

interface ApprovalCheckParams {
  orgId: string;
  entityRiskTier: string;
  productType: string;
  priority: string;
  priceEstimate: number;
  hasEnhancements?: boolean;
}

/**
 * Determines whether a commission requires approval based on:
 * 1. policy_rules.approval_required for the entity's risk tier
 * 2. Rush priority
 * 3. Emergency Note product type
 * 4. Price exceeds org threshold
 * 5. EDD+ enhancements selected
 */
export async function requiresApproval(params: ApprovalCheckParams): Promise<{
  required: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];

  // 1. Check policy_rules for this org + tier
  const { data: org } = await supabase
    .from("organisations")
    .select("risk_policy_default_id, approval_price_threshold")
    .eq("id", params.orgId)
    .single();

  if (org?.risk_policy_default_id) {
    const { data: rule } = await supabase
      .from("policy_rules")
      .select("approval_required")
      .eq("policy_id", org.risk_policy_default_id)
      .eq("risk_tier", params.entityRiskTier)
      .single();

    if (rule?.approval_required) {
      reasons.push(`Policy requires approval for Tier ${params.entityRiskTier} entities`);
    }
  }

  // 2. Rush priority always requires approval
  if (params.priority === "rush") {
    reasons.push("Rush priority requires approval");
  }

  // 3. Emergency Note always requires approval
  if (params.productType === "Emergency Note") {
    reasons.push("Emergency Notes require approval");
  }

  // 4. EDD+ enhancements require approval
  if (params.hasEnhancements) {
    reasons.push("EDD+ enhancements selected — approval required");
  }

  // 5. Price threshold
  if (org?.approval_price_threshold && params.priceEstimate > Number(org.approval_price_threshold)) {
    reasons.push(`Estimate exceeds org threshold of £${Number(org.approval_price_threshold).toLocaleString()}`);
  }

  return { required: reasons.length > 0, reasons };
}
