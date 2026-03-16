import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, History, Shield, Save, Clock, BarChart3 } from "lucide-react";
import ProgrammeProfilePanel from "@/components/programme/ProgrammeProfilePanel";
import { format } from "date-fns";

const CADENCE_OPTIONS = [
  { value: "3", label: "Quarterly (3 months)" },
  { value: "6", label: "Semi-Annual (6 months)" },
  { value: "12", label: "Annual (12 months)" },
  { value: "24", label: "Biennial (24 months)" },
  { value: "36", label: "Triennial (36 months)" },
];

const REPORT_TIER_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "enhanced", label: "Enhanced" },
];

const DEFAULT_ADDONS = [
  { key: "commercial_posture", label: "Commercial Posture Module" },
  { key: "jurisdiction_benchmark", label: "Jurisdiction Benchmark Module" },
  { key: "ownership_structure", label: "Ownership & Structure Analysis" },
  { key: "monitoring_continuous", label: "Continuous Monitoring" },
  { key: "data_protection_review", label: "Data Protection Review" },
  { key: "partner_verification", label: "Partner Field Verification" },
];

interface ProgrammeSettings {
  id: string;
  org_id: string;
  cadence_tier_a: number;
  cadence_tier_b: number;
  cadence_tier_c: number;
  report_tier_a: string;
  report_tier_b: string;
  report_tier_c: string;
  addons: Record<string, boolean>;
}

interface AuditEntry {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  created_at: string;
}

interface OrgOption {
  id: string;
  name: string;
}

const FIELD_LABELS: Record<string, string> = {
  cadence_tier_a: "Review Cadence — Tier A",
  cadence_tier_b: "Review Cadence — Tier B",
  cadence_tier_c: "Review Cadence — Tier C",
  report_tier_a: "Default Report Tier — Tier A",
  report_tier_b: "Default Report Tier — Tier B",
  report_tier_c: "Default Report Tier — Tier C",
  ...Object.fromEntries(DEFAULT_ADDONS.map(a => [`addon_${a.key}`, `Add-on: ${a.label}`])),
};

export default function ProgrammeSettingsPage() {
  const { isInternal, canQuote, profile } = useAuth();
  const isManager = canQuote; // managers can edit
  const canEdit = isInternal && isManager;

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [settings, setSettings] = useState<ProgrammeSettings | null>(null);
  const [draft, setDraft] = useState<ProgrammeSettings | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);

  // Load orgs (internal sees all, client sees own)
  useEffect(() => {
    const loadOrgs = async () => {
      if (isInternal) {
        const { data } = await supabase.from("organisations").select("id, name").order("name");
        setOrgs(data ?? []);
        if (data?.length && !selectedOrgId) setSelectedOrgId(data[0].id);
      } else if (profile?.org_id) {
        const { data } = await supabase.from("organisations").select("id, name").eq("id", profile.org_id).single();
        if (data) {
          setOrgs([data]);
          setSelectedOrgId(data.id);
        }
      }
    };
    loadOrgs();
  }, [isInternal, profile?.org_id]);

  // Load settings for selected org
  useEffect(() => {
    if (!selectedOrgId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("programme_settings")
        .select("*")
        .eq("org_id", selectedOrgId)
        .maybeSingle();

      if (data) {
        const s = data as unknown as ProgrammeSettings;
        setSettings(s);
        setDraft({ ...s });
      } else {
        // Create default settings for this org
        const defaults: any = {
          org_id: selectedOrgId,
          cadence_tier_a: 6,
          cadence_tier_b: 12,
          cadence_tier_c: 24,
          report_tier_a: "enhanced",
          report_tier_b: "standard",
          report_tier_c: "basic",
          addons: {},
        };
        if (canEdit) {
          const { data: created } = await supabase.from("programme_settings").insert(defaults).select().single();
          if (created) {
            const s = created as unknown as ProgrammeSettings;
            setSettings(s);
            setDraft({ ...s });
          }
        } else {
          const s = { id: "", ...defaults } as ProgrammeSettings;
          setSettings(s);
          setDraft({ ...s });
        }
      }

      // Load audit log
      const { data: logs } = await supabase
        .from("programme_audit_log")
        .select("*")
        .eq("org_id", selectedOrgId)
        .order("created_at", { ascending: false })
        .limit(100);
      setAuditLog((logs as unknown as AuditEntry[]) ?? []);

      // Load retention days
      const { data: planData } = await supabase
        .from("organisation_plan")
        .select("report_retention_days")
        .eq("org_id", selectedOrgId)
        .maybeSingle();
      if (planData && (planData as any).report_retention_days) {
        setRetentionDays((planData as any).report_retention_days);
      } else {
        setRetentionDays(90);
      }

      setLoading(false);
    };
    load();
  }, [selectedOrgId]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = async () => {
    if (!draft || !settings || !canEdit) return;
    setSaving(true);

    // Determine what changed and log each change
    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    const tierFields = ["cadence_tier_a", "cadence_tier_b", "cadence_tier_c", "report_tier_a", "report_tier_b", "report_tier_c"] as const;
    for (const f of tierFields) {
      if (String(draft[f]) !== String(settings[f])) {
        changes.push({ field: f, oldVal: String(settings[f]), newVal: String(draft[f]) });
      }
    }
    // Check addons
    for (const addon of DEFAULT_ADDONS) {
      const oldVal = settings.addons?.[addon.key] ?? false;
      const newVal = draft.addons?.[addon.key] ?? false;
      if (oldVal !== newVal) {
        changes.push({ field: `addon_${addon.key}`, oldVal: String(oldVal), newVal: String(newVal) });
      }
    }

    // Update settings
    const { error } = await supabase
      .from("programme_settings")
      .update({
        cadence_tier_a: draft.cadence_tier_a,
        cadence_tier_b: draft.cadence_tier_b,
        cadence_tier_c: draft.cadence_tier_c,
        report_tier_a: draft.report_tier_a,
        report_tier_b: draft.report_tier_b,
        report_tier_c: draft.report_tier_c,
        addons: draft.addons,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("org_id", selectedOrgId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Insert audit log entries
    if (changes.length > 0) {
      const entries = changes.map(c => ({
        org_id: selectedOrgId,
        changed_by: profile?.user_id ?? "",
        field_changed: c.field,
        old_value: c.oldVal,
        new_value: c.newVal,
      }));
      await supabase.from("programme_audit_log").insert(entries as any);
    }

    setSettings({ ...draft });
    toast({ title: "Settings saved", description: `${changes.length} change(s) applied. Active cases are not affected.` });

    // Refresh audit log
    const { data: logs } = await supabase
      .from("programme_audit_log")
      .select("*")
      .eq("org_id", selectedOrgId)
      .order("created_at", { ascending: false })
      .limit(100);
    setAuditLog((logs as unknown as AuditEntry[]) ?? []);
    setSaving(false);
  };

  const updateDraft = (field: string, value: any) => {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  };

  const toggleAddon = (key: string) => {
    if (!draft) return;
    const addons = { ...draft.addons, [key]: !(draft.addons?.[key] ?? false) };
    setDraft({ ...draft, addons });
  };

  const formatFieldLabel = (field: string) => FIELD_LABELS[field] || field;

  const formatValue = (field: string, value: string | null) => {
    if (!value) return "—";
    if (field.startsWith("cadence_")) {
      const opt = CADENCE_OPTIONS.find(c => c.value === value);
      return opt?.label ?? `${value} months`;
    }
    if (field.startsWith("report_tier_")) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    if (field.startsWith("addon_")) {
      return value === "true" ? "Enabled" : "Disabled";
    }
    return value;
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading programme settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Programme Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure review cadence, default report tiers, and add-on modules per client programme.
            Changes apply to future case scheduling only.
          </p>
        </div>
        {canEdit && hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Org selector (internal only) */}
      {isInternal && orgs.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Client:</span>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orgs.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Programme Profile
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Programme Audit Log
            {auditLog.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{auditLog.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-4">
          {/* Cadence settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Cadence</CardTitle>
              <CardDescription>
                Set the default review frequency per entity risk tier. This determines when the next review is scheduled after a case completes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(["a", "b", "c"] as const).map(tier => {
                  const field = `cadence_tier_${tier}` as keyof ProgrammeSettings;
                  return (
                    <div key={tier} className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Badge variant={tier === "a" ? "destructive" : tier === "b" ? "default" : "secondary"} className="text-[10px] px-1.5">
                          Tier {tier.toUpperCase()}
                        </Badge>
                        {tier === "a" ? "High Risk" : tier === "b" ? "Medium Risk" : "Low Risk"}
                      </label>
                      <Select
                        value={String(draft?.[field] ?? "")}
                        onValueChange={v => updateDraft(field, parseInt(v))}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CADENCE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Default report tiers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Report Tier</CardTitle>
              <CardDescription>
                The default report tier assigned to new cases based on the entity's risk tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(["a", "b", "c"] as const).map(tier => {
                  const field = `report_tier_${tier}` as keyof ProgrammeSettings;
                  return (
                    <div key={tier} className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Badge variant={tier === "a" ? "destructive" : tier === "b" ? "default" : "secondary"} className="text-[10px] px-1.5">
                          Tier {tier.toUpperCase()}
                        </Badge>
                        Default Report
                      </label>
                      <Select
                        value={String(draft?.[field] ?? "")}
                        onValueChange={v => updateDraft(field, v)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_TIER_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Add-on toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add-on Modules</CardTitle>
              <CardDescription>
                Enable or disable optional modules for this client's programme. Enabled modules will be suggested when commissioning new cases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEFAULT_ADDONS.map(addon => (
                  <div key={addon.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium">{addon.label}</div>
                    </div>
                    <Switch
                      checked={draft?.addons?.[addon.key] ?? false}
                      onCheckedChange={() => toggleAddon(addon.key)}
                      disabled={!canEdit}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Report Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" /> Report Retention
              </CardTitle>
              <CardDescription>
                How long deliverables remain available for client download after delivery. After this window, reports may be expunged.
                Clients are responsible for retaining downloaded reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="space-y-1.5 w-48">
                  <Label className="text-sm">Retention Window (days)</Label>
                  <Input
                    type="number"
                    min={30}
                    max={365}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value) || 90)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-5">
                  Default: 90 days. Range: 30–365 days.
                </div>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("organisation_plan")
                      .update({ report_retention_days: retentionDays } as any)
                      .eq("org_id", selectedOrgId);
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Retention updated", description: `Reports will be available for ${retentionDays} days.` });
                    }
                  }}
                >
                  Save Retention Setting
                </Button>
              )}
            </CardContent>
          </Card>

          {!canEdit && (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  These settings are managed by your Clifton Ruskin Assurance Manager. Contact them to request changes.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Programme Audit Log</CardTitle>
              <CardDescription>
                All changes to programme settings are recorded here for compliance and governance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No changes recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>What Changed</TableHead>
                      <TableHead>Previous</TableHead>
                      <TableHead>New</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatFieldLabel(entry.field_changed)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatValue(entry.field_changed, entry.old_value)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatValue(entry.field_changed, entry.new_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
