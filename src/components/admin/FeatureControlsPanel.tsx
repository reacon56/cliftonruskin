import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Network, Activity, Globe, AlertTriangle, Eye, FileText, Building2,
  RefreshCw, Lock, Undo2,
} from "lucide-react";

/* ── Tier template definitions ── */

const FEATURE_DEFS = [
  { key: "ownership_structure_intelligence", label: "Ownership & Structure Intelligence", icon: Network, tierDefault: "A" },
  { key: "monitoring_module", label: "Monitoring Module", icon: Activity, tierDefault: "A" },
  { key: "jurisdiction_benchmark", label: "Jurisdiction Benchmark", icon: Globe, tierDefault: "A" },
  { key: "advanced_risk_alerts", label: "Advanced Risk Alerts", icon: AlertTriangle, tierDefault: "B" },
  { key: "provenance_view", label: "Provenance View", icon: Eye, tierDefault: "A" },
  { key: "export_pdf_advanced", label: "Export to PDF (Advanced)", icon: FileText, tierDefault: "B" },
] as const;

/** Tier hierarchy: A includes everything B includes, B includes everything C includes */
const TIER_RANK: Record<string, number> = { A: 3, B: 2, C: 1 };

function getTierDefaults(tier: string): Record<string, boolean> {
  const rank = TIER_RANK[tier] ?? 0;
  const defaults: Record<string, boolean> = {};
  FEATURE_DEFS.forEach(({ key, tierDefault }) => {
    const featureRank = TIER_RANK[tierDefault] ?? 0;
    defaults[key] = rank >= featureRank;
  });
  return defaults;
}

const TIER_LABELS: Record<string, string> = {
  A: "Tier A — Premium",
  B: "Tier B — Standard",
  C: "Tier C — Essential",
  custom: "Custom",
};

const TIER_STYLES: Record<string, string> = {
  A: "bg-primary/10 text-primary border-primary/30",
  B: "bg-accent/10 text-accent border-accent/30",
  C: "bg-muted text-muted-foreground border-border",
  custom: "bg-secondary/10 text-secondary-foreground border-secondary/30",
};

/* ── Types ── */

interface OrgFlags {
  org_id: string;
  org_name: string;
  feature_tier: string;
  flags: Record<string, boolean>;
}

/* ── Component ── */

export default function FeatureControlsPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Confirmation dialogs
  const [applyDialog, setApplyDialog] = useState<{ orgId: string; orgName: string; tier: string } | null>(null);
  const [customDialog, setCustomDialog] = useState<{ orgId: string; orgName: string } | null>(null);
  const [revertDialog, setRevertDialog] = useState<{ orgId: string; orgName: string; tier: string } | null>(null);

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    setLoading(true);
    const { data: orgData } = await supabase
      .from("organisations")
      .select("id, name, feature_tier")
      .order("name");

    if (!orgData) { setLoading(false); return; }

    const { data: flagData } = await supabase
      .from("org_feature_flags" as any)
      .select("org_id, feature_key, enabled");

    const flagMap = new Map<string, Record<string, boolean>>();
    ((flagData ?? []) as any[]).forEach((f: any) => {
      if (!flagMap.has(f.org_id)) flagMap.set(f.org_id, {});
      flagMap.get(f.org_id)![f.feature_key] = f.enabled;
    });

    setOrgs(
      orgData.map((o: any) => ({
        org_id: o.id,
        org_name: o.name,
        feature_tier: o.feature_tier || "C",
        flags: flagMap.get(o.id) || {},
      }))
    );
    setLoading(false);
  };

  /* ── Toggle individual flag ── */

  const toggleFlag = async (orgId: string, featureKey: string, newValue: boolean) => {
    const key = `${orgId}-${featureKey}`;
    setSaving(key);

    const org = orgs.find((o) => o.org_id === orgId);
    const previousValue = org?.flags[featureKey] ?? false;

    const { error } = await supabase
      .from("org_feature_flags" as any)
      .upsert({
        org_id: orgId,
        feature_key: featureKey,
        enabled: newValue,
        overridden_by: profile?.user_id,
        overridden_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "org_id,feature_key" });

    if (!error) {
      await supabase.from("feature_activation_log" as any).insert({
        org_id: orgId,
        feature_key: featureKey,
        action: newValue ? "enabled" : "disabled",
        changed_by: profile?.user_id,
        previous_value: previousValue,
        new_value: newValue,
      } as any);

      // If org is on a named tier and flags now differ, auto-promote to custom
      if (org && org.feature_tier !== "custom") {
        const tierDefaults = getTierDefaults(org.feature_tier);
        const updatedFlags = { ...org.flags, [featureKey]: newValue };
        const drifted = FEATURE_DEFS.some(({ key }) => (updatedFlags[key] ?? false) !== (tierDefaults[key] ?? false));
        if (drifted) {
          await supabase.from("organisations").update({ feature_tier: "custom" } as any).eq("id", orgId);
          setOrgs((prev) => prev.map((o) => o.org_id === orgId ? { ...o, feature_tier: "custom", flags: updatedFlags } : o));
          toast({ title: `${featureKey.replace(/_/g, " ")} ${newValue ? "enabled" : "disabled"}`, description: "Tier changed to Custom (bespoke configuration)." });
          setSaving(null);
          return;
        }
      }

      setOrgs((prev) =>
        prev.map((o) =>
          o.org_id === orgId ? { ...o, flags: { ...o.flags, [featureKey]: newValue } } : o
        )
      );
      toast({ title: `${featureKey.replace(/_/g, " ")} ${newValue ? "enabled" : "disabled"}` });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(null);
  };

  /* ── Apply Tier Defaults ── */

  const handleApplyTierDefaults = async (orgId: string, tier: string) => {
    setSaving(`apply-${orgId}`);
    const defaults = getTierDefaults(tier);
    const org = orgs.find((o) => o.org_id === orgId);
    const previousFlags = { ...org?.flags };

    // Upsert all flags to tier defaults
    const upserts = FEATURE_DEFS.map(({ key }) => ({
      org_id: orgId,
      feature_key: key,
      enabled: defaults[key],
      overridden_by: profile?.user_id,
      overridden_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("org_feature_flags" as any)
      .upsert(upserts as any[], { onConflict: "org_id,feature_key" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(null);
      return;
    }

    // Update tier on org
    await supabase.from("organisations").update({ feature_tier: tier } as any).eq("id", orgId);

    // Audit log entry for each changed flag
    const logEntries = FEATURE_DEFS
      .filter(({ key }) => (previousFlags[key] ?? false) !== defaults[key])
      .map(({ key }) => ({
        org_id: orgId,
        feature_key: key,
        action: `tier_default_applied_${tier}`,
        changed_by: profile?.user_id,
        previous_value: previousFlags[key] ?? false,
        new_value: defaults[key],
      }));

    if (logEntries.length > 0) {
      await supabase.from("feature_activation_log" as any).insert(logEntries as any[]);
    }

    // Also log the tier change itself
    await supabase.from("audit_events").insert({
      object_type: "organisation",
      object_id: orgId,
      action_type: "tier_defaults_applied",
      user_id: profile?.user_id,
      org_id: orgId,
      metadata: { tier, previous_tier: org?.feature_tier, changes: logEntries.length },
    });

    setOrgs((prev) =>
      prev.map((o) => o.org_id === orgId ? { ...o, feature_tier: tier, flags: defaults } : o)
    );

    toast({
      title: `Tier ${tier} defaults applied`,
      description: `${logEntries.length} feature${logEntries.length !== 1 ? "s" : ""} updated for ${org?.org_name}.`,
    });
    setApplyDialog(null);
    setSaving(null);
  };

  /* ── Convert to Custom ── */

  const handleConvertToCustom = async (orgId: string) => {
    setSaving(`custom-${orgId}`);
    const org = orgs.find((o) => o.org_id === orgId);

    await supabase.from("organisations").update({ feature_tier: "custom" } as any).eq("id", orgId);

    await supabase.from("audit_events").insert({
      object_type: "organisation",
      object_id: orgId,
      action_type: "tier_converted_to_custom",
      user_id: profile?.user_id,
      org_id: orgId,
      metadata: { previous_tier: org?.feature_tier },
    });

    setOrgs((prev) =>
      prev.map((o) => o.org_id === orgId ? { ...o, feature_tier: "custom" } : o)
    );

    toast({
      title: "Converted to Custom",
      description: `${org?.org_name} now has bespoke feature configuration. Tier defaults will not auto-apply.`,
    });
    setCustomDialog(null);
    setSaving(null);
  };

  /* ── Revert Custom to Tier ── */

  const handleRevertToTier = (orgId: string, orgName: string) => {
    // Open the apply dialog with a suggested tier based on current flags
    setRevertDialog({ orgId, orgName, tier: "B" });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading feature controls…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="fvc-heading-2 flex items-center gap-2">
          <Building2 size={18} /> Client Feature Controls
        </h2>
        <div className="fvc-gold-rule mt-3 mb-2" />
        <p className="text-sm text-muted-foreground">
          Manage premium feature availability per client organisation. Changes take effect immediately.
        </p>
      </div>

      {orgs.map((org) => {
        const isCustom = org.feature_tier === "custom";
        const tierStyle = TIER_STYLES[org.feature_tier] || TIER_STYLES.custom;
        const tierLabel = TIER_LABELS[org.feature_tier] || org.feature_tier;
        const tierDefaults = isCustom ? null : getTierDefaults(org.feature_tier);
        const flagsDriftedFromTier = !isCustom && tierDefaults && FEATURE_DEFS.some(
          ({ key }) => (org.flags[key] ?? false) !== (tierDefaults[key] ?? false)
        );

        return (
          <div key={org.org_id} className="fvc-card">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">{org.org_name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                  {Object.values(org.flags).filter(Boolean).length} of {FEATURE_DEFS.length} features active
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider px-2.5 py-1 ${tierStyle}`}>
                {isCustom && <Lock className="h-3 w-3 mr-1" />}
                {tierLabel}
              </Badge>
            </div>

            {/* Tier actions bar */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/50">
              {!isCustom ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={!!saving}
                    onClick={() => setApplyDialog({ orgId: org.org_id, orgName: org.org_name, tier: org.feature_tier })}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {flagsDriftedFromTier ? "Re-apply Tier Defaults" : "Apply Tier Defaults"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={!!saving}
                    onClick={() => setCustomDialog({ orgId: org.org_id, orgName: org.org_name })}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Convert to Custom
                  </Button>
                  {/* Quick tier switch */}
                  {(["A", "B", "C"] as const).filter((t) => t !== org.feature_tier).map((t) => (
                    <Button
                      key={t}
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      disabled={!!saving}
                      onClick={() => setApplyDialog({ orgId: org.org_id, orgName: org.org_name, tier: t })}
                    >
                      Switch to {t}
                    </Button>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Custom configuration — tier defaults will not auto-apply</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs ml-auto"
                    disabled={!!saving}
                    onClick={() => handleRevertToTier(org.org_id, org.org_name)}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Revert to Tier
                  </Button>
                </>
              )}
            </div>

            {/* Feature toggles */}
            <div className="space-y-3">
              {FEATURE_DEFS.map(({ key, label, icon: Icon, tierDefault }) => {
                const isEnabled = org.flags[key] ?? false;
                const isSaving = saving === `${org.org_id}-${key}`;
                const matchesTier = !isCustom && tierDefaults && isEnabled === tierDefaults[key];

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 px-3 rounded-md border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded flex items-center justify-center bg-muted/50">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-foreground cursor-pointer">{label}</Label>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                            Default: Tier {tierDefault}+
                          </p>
                          {!isCustom && !matchesTier && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 tracking-wider text-accent border-accent/40">
                              OVERRIDDEN
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={isSaving || saving?.startsWith("apply-")}
                      onCheckedChange={(v) => toggleFlag(org.org_id, key, v)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Apply Tier Defaults Confirmation ── */}
      <Dialog open={!!applyDialog} onOpenChange={() => setApplyDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Apply Tier {applyDialog?.tier} Defaults</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will set <strong>{applyDialog?.orgName}</strong>'s feature flags to the standard Tier {applyDialog?.tier} template.
              Any bespoke overrides will be replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Tier {applyDialog?.tier} enables:
            </p>
            {applyDialog && FEATURE_DEFS.map(({ key, label }) => {
              const enabled = getTierDefaults(applyDialog.tier)[key];
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <span className={enabled ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            This action is logged and can be reversed by re-applying a different tier or converting to Custom.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setApplyDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!!saving}
              onClick={() => applyDialog && handleApplyTierDefaults(applyDialog.orgId, applyDialog.tier)}
            >
              {saving?.startsWith("apply-") ? "Applying…" : `Apply Tier ${applyDialog?.tier} Defaults`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert to Custom Confirmation ── */}
      <Dialog open={!!customDialog} onOpenChange={() => setCustomDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Convert to Custom</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will freeze <strong>{customDialog?.orgName}</strong>'s current feature flags as a bespoke configuration.
              Tier defaults will no longer auto-apply to this organisation.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground my-2">
            You can revert to a standard tier at any time by clicking "Revert to Tier."
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCustomDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!!saving}
              onClick={() => customDialog && handleConvertToCustom(customDialog.orgId)}
            >
              {saving?.startsWith("custom-") ? "Converting…" : "Convert to Custom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revert to Tier (pick tier, then applies defaults) ── */}
      <Dialog open={!!revertDialog} onOpenChange={() => setRevertDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Revert to Standard Tier</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose a tier to apply to <strong>{revertDialog?.orgName}</strong>. This will overwrite the current custom settings with the selected tier's defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 my-4">
            {(["A", "B", "C"] as const).map((t) => (
              <button
                key={t}
                className={`rounded-md border-2 py-3 px-2 text-center transition-all ${
                  revertDialog?.tier === t
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setRevertDialog((prev) => prev ? { ...prev, tier: t } : null)}
              >
                <p className="font-display text-sm font-semibold text-foreground">Tier {t}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {Object.values(getTierDefaults(t)).filter(Boolean).length} features
                </p>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRevertDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!!saving}
              onClick={() => revertDialog && handleApplyTierDefaults(revertDialog.orgId, revertDialog.tier).then(() => setRevertDialog(null))}
            >
              {saving?.startsWith("apply-") ? "Applying…" : `Apply Tier ${revertDialog?.tier}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
