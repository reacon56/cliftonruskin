import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Network, Activity, Globe, AlertTriangle, Eye, FileText, Building2, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrgFlags {
  org_id: string;
  org_name: string;
  flags: Record<string, boolean>;
}

const FEATURE_DEFS = [
  { key: "ownership_structure_intelligence", label: "Ownership & Structure Intelligence", icon: Network, tier: "A" },
  { key: "monitoring_module", label: "Monitoring Module", icon: Activity, tier: "A" },
  { key: "jurisdiction_benchmark", label: "Jurisdiction Benchmark", icon: Globe, tier: "A" },
  { key: "advanced_risk_alerts", label: "Advanced Risk Alerts", icon: AlertTriangle, tier: "A" },
  { key: "provenance_view", label: "Provenance View", icon: Eye, tier: "A" },
  { key: "export_pdf_advanced", label: "Export to PDF (Advanced)", icon: FileText, tier: "A" },
];

export default function FeatureControlsPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    const { data: orgData } = await supabase
      .from("organisations")
      .select("id, name")
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
        flags: flagMap.get(o.id) || {},
      }))
    );
    setLoading(false);
  };

  const toggleFlag = async (orgId: string, featureKey: string, newValue: boolean) => {
    const key = `${orgId}-${featureKey}`;
    setSaving(key);

    // Get current value for audit
    const org = orgs.find((o) => o.org_id === orgId);
    const previousValue = org?.flags[featureKey] ?? false;

    // Upsert feature flag
    const { error } = await supabase
      .from("org_feature_flags" as any)
      .upsert(
        {
          org_id: orgId,
          feature_key: featureKey,
          enabled: newValue,
          overridden_by: profile?.user_id,
          overridden_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "org_id,feature_key" }
      );

    if (!error) {
      // Log activation change
      await supabase.from("feature_activation_log" as any).insert({
        org_id: orgId,
        feature_key: featureKey,
        action: newValue ? "enabled" : "disabled",
        changed_by: profile?.user_id,
        previous_value: previousValue,
        new_value: newValue,
      } as any);

      // Update local state
      setOrgs((prev) =>
        prev.map((o) =>
          o.org_id === orgId
            ? { ...o, flags: { ...o.flags, [featureKey]: newValue } }
            : o
        )
      );
      toast({ title: `${featureKey.replace(/_/g, " ")} ${newValue ? "enabled" : "disabled"}` });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }

    setSaving(null);
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">Loading feature controls…</div>
    );
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

      {orgs.map((org) => (
        <div key={org.org_id} className="fvc-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">{org.org_name}</h3>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                {Object.values(org.flags).filter(Boolean).length} of {FEATURE_DEFS.length} features active
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {Object.values(org.flags).filter(Boolean).length === FEATURE_DEFS.length
                ? "Full Access"
                : Object.values(org.flags).filter(Boolean).length === 0
                ? "Basic"
                : "Partial"}
            </Badge>
          </div>

          <div className="space-y-3">
            {FEATURE_DEFS.map(({ key, label, icon: Icon, tier }) => {
              const isEnabled = org.flags[key] ?? false;
              const isSaving = saving === `${org.org_id}-${key}`;

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
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                        Default: Tier {tier}+
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    disabled={isSaving}
                    onCheckedChange={(v) => toggleFlag(org.org_id, key, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
