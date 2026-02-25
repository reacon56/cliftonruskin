import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

interface RulesForm {
  auto_approve_refresh_up_to: string;
  always_require_tier_a: boolean;
  always_require_rush: boolean;
  always_require_dossier: boolean;
  always_require_dp_high: boolean;
  always_require_partner_spend: boolean;
}

const DEFAULTS: RulesForm = {
  auto_approve_refresh_up_to: "",
  always_require_tier_a: true,
  always_require_rush: true,
  always_require_dossier: true,
  always_require_dp_high: true,
  always_require_partner_spend: true,
};

export default function AutoApprovalSettingsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<RulesForm>(DEFAULTS);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.org_id) return;
    supabase
      .from("auto_approval_rules" as any)
      .select("*")
      .eq("org_id", profile.org_id)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            auto_approve_refresh_up_to: data.auto_approve_refresh_up_to?.toString() ?? "",
            always_require_tier_a: data.always_require_tier_a,
            always_require_rush: data.always_require_rush,
            always_require_dossier: data.always_require_dossier,
            always_require_dp_high: data.always_require_dp_high,
            always_require_partner_spend: data.always_require_partner_spend,
          });
        }
      });
  }, [profile?.org_id]);

  const handleSave = async () => {
    if (!profile?.org_id) return;
    setSaving(true);

    const payload: any = {
      org_id: profile.org_id,
      auto_approve_refresh_up_to: form.auto_approve_refresh_up_to ? Number(form.auto_approve_refresh_up_to) : null,
      always_require_tier_a: form.always_require_tier_a,
      always_require_rush: form.always_require_rush,
      always_require_dossier: form.always_require_dossier,
      always_require_dp_high: form.always_require_dp_high,
      always_require_partner_spend: form.always_require_partner_spend,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("auto_approval_rules" as any).update(payload).eq("id", existingId));
    } else {
      const res = await supabase.from("auto_approval_rules" as any).insert(payload).select("id").single();
      error = res.error;
      if (res.data) setExistingId((res.data as any).id);
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Auto-approval rules updated." });
    }
  };

  const toggleField = (field: keyof RulesForm) =>
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="fvc-heading-1 text-foreground mb-1 flex items-center gap-2">
        <Settings size={20} /> Approval Settings
      </h1>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-8">
        Configure which commissions require manual approval and which are auto-approved.
      </p>

      <div className="fvc-card space-y-6">
        <div>
          <Label className="text-sm font-medium">Auto-approve Refresh Notes up to</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Refresh Notes at or below this amount will be auto-approved. Leave blank to always require approval.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">£</span>
            <Input
              type="number"
              value={form.auto_approve_refresh_up_to}
              onChange={(e) => setForm({ ...form, auto_approve_refresh_up_to: e.target.value })}
              placeholder="e.g. 1500"
              className="w-40"
            />
          </div>
        </div>

        <div className="fvc-divider" />

        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Always require approval for:</p>

          {([
            ["always_require_tier_a", "Tier A (high risk) entities"],
            ["always_require_rush", "Rush priority commissions"],
            ["always_require_dossier", "Assurance Dossier product type"],
            ["always_require_dp_high", "High data protection risk"],
            ["always_require_partner_spend", "Any case with partner (in-country) spend"],
          ] as const).map(([field, label]) => (
            <div key={field} className="flex items-center justify-between">
              <Label className="text-sm text-foreground">{label}</Label>
              <Switch
                checked={form[field] as boolean}
                onCheckedChange={() => toggleField(field)}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
          <Save size={14} className="mr-1.5" />
          {saving ? "Saving…" : "Save Rules"}
        </Button>
      </div>
    </div>
  );
}
