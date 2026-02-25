import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Shield, Sparkles, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PoliciesPage() {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [orgSettings, setOrgSettings] = useState({ auto_suggest_benchmark: true, auto_suggest_posture: true });

  const isAdmin = hasRole("client_admin");

  useEffect(() => {
    if (profile?.org_id) {
      loadPolicies();
      loadOrgSettings();
    }
  }, [profile?.org_id]);

  const loadOrgSettings = async () => {
    const { data } = await supabase
      .from("organisations")
      .select("auto_suggest_benchmark, auto_suggest_posture")
      .eq("id", profile!.org_id!)
      .single();
    if (data) {
      setOrgSettings({
        auto_suggest_benchmark: (data as any).auto_suggest_benchmark ?? true,
        auto_suggest_posture: (data as any).auto_suggest_posture ?? true,
      });
    }
  };

  const updateOrgSetting = async (key: string, value: boolean) => {
    setOrgSettings((prev) => ({ ...prev, [key]: value }));
    await supabase.from("organisations").update({ [key]: value } as any).eq("id", profile!.org_id!);
    toast({ title: "Setting updated" });
  };

  const loadPolicies = async () => {
    const { data } = await supabase
      .from("policies")
      .select("*")
      .eq("org_id", profile!.org_id!)
      .order("created_at");
    setPolicies(data ?? []);
    if (data?.length && !selectedPolicy) {
      selectPolicy(data[0]);
    }
  };

  const selectPolicy = async (policy: any) => {
    setSelectedPolicy(policy);
    const { data } = await supabase
      .from("policy_rules")
      .select("*")
      .eq("policy_id", policy.id)
      .order("risk_tier");
    setRules(data ?? []);
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return;
    const { data, error } = await supabase
      .from("policies")
      .insert({ org_id: profile.org_id, name: form.name, description: form.description })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDialogOpen(false);
      setForm({ name: "", description: "" });
      loadPolicies();
      if (data) selectPolicy(data);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="fvc-heading-1 text-foreground">Policies & Review Cycles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure review frequencies and monitoring levels by risk tier</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" />New Policy</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Policy</DialogTitle></DialogHeader>
              <form onSubmit={handleCreatePolicy} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Policy name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {policies.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Shield size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No policies configured. Create one to define your review cycles.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {policies.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPolicy(p)}
                className={`w-full text-left fvc-card transition-all ${
                  selectedPolicy?.id === p.id ? "ring-2 ring-accent" : "hover:shadow-md"
                }`}
              >
                <div className="text-sm font-medium text-foreground">{p.name}</div>
                {p.is_default && <Badge className="fvc-status-badge bg-accent/10 text-accent mt-1">Default</Badge>}
                {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedPolicy && (
              <div className="fvc-card">
                <h2 className="fvc-heading-3 text-foreground mb-4">{selectedPolicy.name} — Rules</h2>
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rules configured for this policy. Rules define review frequencies per risk tier.</p>
                ) : (
                  <div className="space-y-4">
                    {rules.map((r) => (
                      <div key={r.id} className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={`fvc-status-badge ${r.risk_tier === "A" ? "bg-destructive/10 text-destructive" : r.risk_tier === "B" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                            Tier {r.risk_tier}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Review every</span> <span className="font-medium text-foreground">{r.review_frequency_months} months</span></div>
                          <div><span className="text-muted-foreground">Monitoring</span> <span className="capitalize font-medium text-foreground">{r.monitoring_level}</span></div>
                          <div><span className="text-muted-foreground">Default product</span> <span className="font-medium text-foreground">{r.default_product}</span></div>
                          <div><span className="text-muted-foreground">Approval required</span> <span className="font-medium text-foreground">{r.approval_required ? "Yes" : "No"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhancement Suggestions Settings */}
      {isAdmin && (
        <div className="mt-10">
          <h2 className="fvc-heading-2 text-foreground mb-2">Enhancement Suggestions</h2>
          <div className="fvc-gold-rule mt-2 mb-4" />
          <p className="text-sm text-muted-foreground mb-6">
            Configure intelligent suggestions shown when onboarding entities or commissioning checks.
          </p>
          <div className="fvc-card space-y-5 max-w-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-accent" />
                <div>
                  <div className="text-sm font-medium text-foreground">Auto-suggest Benchmark on onboarding</div>
                  <div className="text-[11px] text-muted-foreground">
                    Suggest Jurisdiction & Sector Benchmark when entity operates in a non-home jurisdiction, is Tier A, or has high data access
                  </div>
                </div>
              </div>
              <Switch
                checked={orgSettings.auto_suggest_benchmark}
                onCheckedChange={(v) => updateOrgSetting("auto_suggest_benchmark", v)}
              />
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-accent" />
                <div>
                  <div className="text-sm font-medium text-foreground">Auto-suggest Posture Note for Tier A</div>
                  <div className="text-[11px] text-muted-foreground">
                    Suggest Commercial Posture Note when onboarding or commissioning for Tier A entities
                  </div>
                </div>
              </div>
              <Switch
                checked={orgSettings.auto_suggest_posture}
                onCheckedChange={(v) => updateOrgSetting("auto_suggest_posture", v)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
