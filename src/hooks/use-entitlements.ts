import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Package definitions — what each package level grants by default.
 * Actual entitlements come from the DB and can be overridden per-org.
 */
const PACKAGE_DEFAULTS: Record<string, PackageEntitlements> = {
  core: {
    package: "core",
    source_tier_access: "core",
    allowed_report_tiers: ["basic", "standard"],
    partner_escalation_enabled: false,
    ai_brief_export_enabled: false,
    dashboard_modules: ["plan_utilisation", "active_cases", "actions_required"],
    addon_entitlements: {},
  },
  enhanced: {
    package: "enhanced",
    source_tier_access: "pro",
    allowed_report_tiers: ["basic", "standard", "enhanced"],
    partner_escalation_enabled: true,
    ai_brief_export_enabled: false,
    dashboard_modules: ["plan_utilisation", "active_cases", "actions_required", "risk_distribution", "what_changed", "approvals_summary"],
    addon_entitlements: { commercial_posture: true },
  },
  premium: {
    package: "premium",
    source_tier_access: "bank_grade",
    allowed_report_tiers: ["basic", "standard", "enhanced"],
    partner_escalation_enabled: true,
    ai_brief_export_enabled: true,
    dashboard_modules: [
      "plan_utilisation", "active_cases", "actions_required",
      "risk_distribution", "what_changed", "approvals_summary",
      "enhancement_coverage", "lia_summary", "programme_health",
    ],
    addon_entitlements: { commercial_posture: true, jurisdiction_benchmark: true },
  },
};

export interface PackageEntitlements {
  package: string;
  source_tier_access: string;
  allowed_report_tiers: string[];
  partner_escalation_enabled: boolean;
  ai_brief_export_enabled: boolean;
  dashboard_modules: string[];
  addon_entitlements: Record<string, boolean>;
}

export function useEntitlements() {
  const { profile, isInternal } = useAuth();
  const [entitlements, setEntitlements] = useState<PackageEntitlements>(PACKAGE_DEFAULTS.core);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("package_entitlements")
        .select("*")
        .eq("org_id", profile.org_id!)
        .maybeSingle();

      if (data) {
        setEntitlements({
          package: (data as any).package ?? "core",
          source_tier_access: (data as any).source_tier_access ?? "core",
          allowed_report_tiers: (data as any).allowed_report_tiers ?? ["basic", "standard"],
          partner_escalation_enabled: (data as any).partner_escalation_enabled ?? false,
          ai_brief_export_enabled: (data as any).ai_brief_export_enabled ?? false,
          dashboard_modules: (data as any).dashboard_modules ?? [],
          addon_entitlements: (data as any).addon_entitlements ?? {},
        });
      } else {
        // Fall back to org feature_tier to determine defaults
        const { data: org } = await supabase
          .from("organisations")
          .select("feature_tier")
          .eq("id", profile.org_id!)
          .single();

        const tier = org?.feature_tier ?? "C";
        const pkg = tier === "A" ? "premium" : tier === "B" ? "enhanced" : "core";
        setEntitlements(PACKAGE_DEFAULTS[pkg] ?? PACKAGE_DEFAULTS.core);
      }
      setLoading(false);
    };

    load();
  }, [profile?.org_id]);

  // Internal users bypass entitlement restrictions
  const canAccessReportTier = (tier: string) =>
    isInternal || entitlements.allowed_report_tiers.includes(tier);

  const canUsePartnerEscalation = isInternal || entitlements.partner_escalation_enabled;
  const canExportAiBrief = isInternal || entitlements.ai_brief_export_enabled;

  const canUseAddon = (key: string) =>
    isInternal || (entitlements.addon_entitlements[key] ?? false);

  const canViewDashboardModule = (key: string) =>
    isInternal || entitlements.dashboard_modules.includes(key);

  return {
    entitlements,
    loading,
    canAccessReportTier,
    canUsePartnerEscalation,
    canExportAiBrief,
    canUseAddon,
    canViewDashboardModule,
    PACKAGE_DEFAULTS,
  };
}
