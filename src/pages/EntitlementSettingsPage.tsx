import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Shield, Save, History, Package } from "lucide-react";
import { format } from "date-fns";

const PACKAGES = [
  { value: "core", label: "Core", desc: "Standard sources, Basic/Standard reports" },
  { value: "enhanced", label: "Enhanced", desc: "Pro sources, all report tiers, partner escalation" },
  { value: "premium", label: "Premium", desc: "Bank-grade sources, AI brief export, full dashboard" },
];

const SOURCE_TIERS = [
  { value: "core", label: "Core" },
  { value: "pro", label: "Pro" },
  { value: "bank_grade", label: "Bank-Grade" },
];

const REPORT_TIERS = ["basic", "standard", "enhanced"];

const ADDON_KEYS = [
  { key: "commercial_posture", label: "Commercial Posture Module" },
  { key: "jurisdiction_benchmark", label: "Jurisdiction Benchmark Module" },
  { key: "ownership_structure", label: "Ownership & Structure Intelligence" },
  { key: "monitoring_continuous", label: "Continuous Monitoring" },
];

interface Entitlement {
  id?: string;
  org_id: string;
  package: string;
  source_tier_access: string;
  allowed_report_tiers: string[];
  partner_escalation_enabled: boolean;
  ai_brief_export_enabled: boolean;
  addon_entitlements: Record<string, boolean>;
}

interface ChangeLog {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by: string;
  created_at: string;
}

export default function EntitlementSettingsPage() {
  const { profile, user } = useAuth();
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [draft, setDraft] = useState<Entitlement | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLog[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("organisations").select("id, name").order("name")
      .then(({ data }) => {
        setOrgs(data ?? []);
        if (data?.length && !selectedOrgId) setSelectedOrgId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("package_entitlements")
        .select("*")
        .eq("org_id", selectedOrgId)
        .maybeSingle();

      const ent: Entitlement = data ? {
        id: (data as any).id,
        org_id: selectedOrgId,
        package: (data as any).package ?? "core",
        source_tier_access: (data as any).source_tier_access ?? "core",
        allowed_report_tiers: (data as any).allowed_report_tiers ?? ["basic", "standard"],
        partner_escalation_enabled: (data as any).partner_escalation_enabled ?? false,
        ai_brief_export_enabled: (data as any).ai_brief_export_enabled ?? false,
        addon_entitlements: (data as any).addon_entitlements ?? {},
      } : {
        org_id: selectedOrgId,
        package: "core",
        source_tier_access: "core",
        allowed_report_tiers: ["basic", "standard"],
        partner_escalation_enabled: false,
        ai_brief_export_enabled: false,
        addon_entitlements: {},
      };

      setEntitlement(ent);
      setDraft({ ...ent });

      const { data: logs } = await supabase
        .from("entitlement_change_log")
        .select("*")
        .eq("org_id", selectedOrgId)
        .order("created_at", { ascending: false })
        .limit(50);
      setChangeLog((logs as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [selectedOrgId]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(entitlement);

  async function handleSave() {
    if (!draft || !user || !reason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for this change.", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Compute changes for logging
    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    if (entitlement) {
      if (draft.package !== entitlement.package) changes.push({ field: "package", oldVal: entitlement.package, newVal: draft.package });
      if (draft.source_tier_access !== entitlement.source_tier_access) changes.push({ field: "source_tier_access", oldVal: entitlement.source_tier_access, newVal: draft.source_tier_access });
      if (JSON.stringify(draft.allowed_report_tiers) !== JSON.stringify(entitlement.allowed_report_tiers)) changes.push({ field: "allowed_report_tiers", oldVal: entitlement.allowed_report_tiers.join(","), newVal: draft.allowed_report_tiers.join(",") });
      if (draft.partner_escalation_enabled !== entitlement.partner_escalation_enabled) changes.push({ field: "partner_escalation_enabled", oldVal: String(entitlement.partner_escalation_enabled), newVal: String(draft.partner_escalation_enabled) });
      if (draft.ai_brief_export_enabled !== entitlement.ai_brief_export_enabled) changes.push({ field: "ai_brief_export_enabled", oldVal: String(entitlement.ai_brief_export_enabled), newVal: String(draft.ai_brief_export_enabled) });
      for (const addon of ADDON_KEYS) {
        const oldVal = entitlement.addon_entitlements[addon.key] ?? false;
        const newVal = draft.addon_entitlements[addon.key] ?? false;
        if (oldVal !== newVal) changes.push({ field: `addon_${addon.key}`, oldVal: String(oldVal), newVal: String(newVal) });
      }
    }

    // Upsert entitlement
    const row: any = {
      org_id: selectedOrgId,
      package: draft.package,
      source_tier_access: draft.source_tier_access,
      allowed_report_tiers: draft.allowed_report_tiers,
      partner_escalation_enabled: draft.partner_escalation_enabled,
      ai_brief_export_enabled: draft.ai_brief_export_enabled,
      addon_entitlements: draft.addon_entitlements,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (draft.id) {
      await supabase.from("package_entitlements").update(row).eq("id", draft.id);
    } else {
      const { data } = await supabase.from("package_entitlements").insert(row).select("id").single();
      if (data) setDraft(prev => prev ? { ...prev, id: (data as any).id } : prev);
    }

    // Log changes
    if (changes.length > 0) {
      await supabase.from("entitlement_change_log").insert(
        changes.map(c => ({
          org_id: selectedOrgId,
          changed_by: user.id,
          field_changed: c.field,
          old_value: c.oldVal,
          new_value: c.newVal,
          reason: reason.trim(),
        })) as any
      );
    }

    setEntitlement({ ...draft });
    setReason("");
    toast({ title: "Entitlements saved", description: `${changes.length} change(s) logged.` });

    // Refresh log
    const { data: logs } = await supabase
      .from("entitlement_change_log").select("*").eq("org_id", selectedOrgId)
      .order("created_at", { ascending: false }).limit(50);
    setChangeLog((logs as any[]) ?? []);
    setSaving(false);
  }

  const toggleReportTier = (tier: string) => {
    if (!draft) return;
    const tiers = draft.allowed_report_tiers.includes(tier)
      ? draft.allowed_report_tiers.filter(t => t !== tier)
      : [...draft.allowed_report_tiers, tier];
    setDraft({ ...draft, allowed_report_tiers: tiers });
  };

  const toggleAddon = (key: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      addon_entitlements: {
        ...draft.addon_entitlements,
        [key]: !(draft.addon_entitlements[key] ?? false),
      },
    });
  };

  if (loading && !entitlement) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Package Entitlements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure what each client programme can access. Changes are logged with mandatory justification.
          </p>
        </div>
      </div>

      {/* Org selector */}
      {orgs.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Client:</span>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {draft && (
        <>
          {/* Package selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Package Level</CardTitle>
              <CardDescription>Determines default source access, report tiers, and feature availability.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PACKAGES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setDraft({ ...draft, package: p.value })}
                    className={`text-left rounded-lg border p-4 transition-all ${
                      draft.package === p.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="font-medium text-sm text-foreground">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Granular controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Granular Controls</CardTitle>
              <CardDescription>Override individual entitlements beyond the package default.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Tier Access</label>
                <Select value={draft.source_tier_access} onValueChange={v => setDraft({ ...draft, source_tier_access: v })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TIERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Allowed Report Tiers</label>
                <div className="flex gap-2">
                  {REPORT_TIERS.map(t => (
                    <Button
                      key={t}
                      variant={draft.allowed_report_tiers.includes(t) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReportTier(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <div className="text-sm font-medium">Partner Escalation</div>
                  <div className="text-xs text-muted-foreground">Allow field partner engagement for this programme</div>
                </div>
                <Switch checked={draft.partner_escalation_enabled} onCheckedChange={v => setDraft({ ...draft, partner_escalation_enabled: v })} />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <div className="text-sm font-medium">AI Brief Export</div>
                  <div className="text-xs text-muted-foreground">Enable AI-assisted brief generation and export</div>
                </div>
                <Switch checked={draft.ai_brief_export_enabled} onCheckedChange={v => setDraft({ ...draft, ai_brief_export_enabled: v })} />
              </div>
            </CardContent>
          </Card>

          {/* Add-on entitlements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add-on Module Entitlements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ADDON_KEYS.map(addon => (
                <div key={addon.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{addon.label}</span>
                  <Switch
                    checked={draft.addon_entitlements[addon.key] ?? false}
                    onCheckedChange={() => toggleAddon(addon.key)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Save with reason */}
          {hasChanges && (
            <Card className="border-primary/30">
              <CardContent className="pt-6 space-y-3">
                <label className="text-sm font-medium">Reason for change (required)</label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="E.g. Client upgraded to Enhanced package per contract amendment dated…"
                  rows={2}
                />
                <Button onClick={handleSave} disabled={saving || !reason.trim()} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save Entitlement Changes"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Change log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Entitlement Change Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No changes recorded</TableCell>
                    </TableRow>
                  ) : changeLog.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{log.field_changed}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.old_value ?? "—"}</TableCell>
                      <TableCell className="text-xs font-medium">{log.new_value ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.reason ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
