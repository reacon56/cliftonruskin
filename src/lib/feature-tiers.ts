/**
 * Shared constants for organisation feature tiers (Plans).
 *
 * IMPORTANT: "Plan" = org-level feature tier (controls platform modules).
 *            "Risk Tier" = entity-level risk classification (controls review policy).
 *            These are independent concepts. Do NOT conflate them in UI.
 */

export const PLAN_TOOLTIP = "Plan controls platform modules. Risk Tier controls review policy.";

/** Human-readable plan names keyed by feature_tier DB value */
export const PLAN_LABELS: Record<string, string> = {
  A: "Plan: Premium",
  B: "Plan: Standard",
  C: "Plan: Essential",
  custom: "Plan: Bespoke",
};

/** Short plan names for compact UI (buttons, selectors) */
export const PLAN_SHORT_LABELS: Record<string, string> = {
  A: "Premium",
  B: "Standard",
  C: "Essential",
  custom: "Bespoke",
};

export const PLAN_STYLES: Record<string, string> = {
  A: "bg-primary/10 text-primary border-primary/30",
  B: "bg-accent/10 text-accent border-accent/30",
  C: "bg-muted text-muted-foreground border-border",
  custom: "bg-secondary/10 text-secondary-foreground border-secondary/30",
};

/** Tier hierarchy: A includes everything B includes, B includes everything C includes */
export const PLAN_RANK: Record<string, number> = { A: 3, B: 2, C: 1 };

export const FEATURE_DEFS = [
  { key: "ownership_structure_intelligence", label: "Ownership & Structure Intelligence", tierDefault: "A" },
  { key: "monitoring_module", label: "Monitoring Module", tierDefault: "A" },
  { key: "jurisdiction_benchmark", label: "Jurisdiction Benchmark", tierDefault: "A" },
  { key: "advanced_risk_alerts", label: "Advanced Risk Alerts", tierDefault: "B" },
  { key: "provenance_view", label: "Provenance View", tierDefault: "A" },
  { key: "export_pdf_advanced", label: "Export to PDF (Advanced)", tierDefault: "B" },
] as const;

export function getPlanDefaults(plan: string): Record<string, boolean> {
  const rank = PLAN_RANK[plan] ?? 0;
  const defaults: Record<string, boolean> = {};
  FEATURE_DEFS.forEach(({ key, tierDefault }) => {
    const featureRank = PLAN_RANK[tierDefault] ?? 0;
    defaults[key] = rank >= featureRank;
  });
  return defaults;
}

/** Map DB tier letter to plan short label for buttons like "Switch to Premium" */
export function planShortLabel(tier: string): string {
  return PLAN_SHORT_LABELS[tier] || tier;
}
