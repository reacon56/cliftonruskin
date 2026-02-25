import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";

interface OrgForm {
  allow_pre_approval_start: boolean;
  approval_price_threshold: string;
}

const DEFAULTS: OrgForm = {
  allow_pre_approval_start: false,
  approval_price_threshold: "",
};

export default function OrgSettingsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<OrgForm>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.org_id) return;
    supabase
      .from("organisations")
      .select("allow_pre_approval_start, approval_price_threshold")
      .eq("id", profile.org_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            allow_pre_approval_start: data.allow_pre_approval_start,
            approval_price_threshold: data.approval_price_threshold?.toString() ?? "",
          });
        }
        setLoading(false);
      });
  }, [profile?.org_id]);

  const handleSave = async () => {
    if (!profile?.org_id) return;
    setSaving(true);

    const { error } = await supabase
      .from("organisations")
      .update({
        allow_pre_approval_start: form.allow_pre_approval_start,
        approval_price_threshold: form.approval_price_threshold
          ? Number(form.approval_price_threshold)
          : null,
      })
      .eq("id", profile.org_id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Organisation settings updated." });
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-muted-foreground text-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="fvc-heading-1 text-foreground mb-1 flex items-center gap-2">
        <Building2 size={20} /> Organisation Settings
      </h1>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-8">
        Configure organisation-wide approval behaviour and thresholds.
      </p>

      <div className="fvc-card space-y-6">
        {/* Pre-approval start toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">
              Allow pre-approval start
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, FV&C analysts can begin work on a case before client approval is granted.
            </p>
          </div>
          <Switch
            checked={form.allow_pre_approval_start}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, allow_pre_approval_start: checked }))
            }
          />
        </div>

        <div className="fvc-divider" />

        {/* Approval price threshold */}
        <div>
          <Label className="text-sm font-medium">Approval price threshold</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Cases with estimates above this amount will always require client admin approval.
            Leave blank to use auto-approval rules only.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">£</span>
            <Input
              type="number"
              value={form.approval_price_threshold}
              onChange={(e) =>
                setForm({ ...form, approval_price_threshold: e.target.value })
              }
              placeholder="e.g. 5000"
              className="w-40"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
          <Save size={14} className="mr-1.5" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
