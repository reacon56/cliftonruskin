import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Save, Plus, History, X, CheckCircle2,
} from "lucide-react";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const TIER_KNOWLEDGE: KnowledgeSection[] = [
  {
    title: "What the Tier Does",
    content: "A tier is not just a label. It determines the due diligence pathway (Standard / Enhanced), the review cadence, the approval level required, and the reporting obligations to the client.",
  },
  {
    title: "Tier A — Highest Risk",
    content: "Enhanced DD required. Four-eyes sign-off. 6-month review cycle. Typically: PEP exposure, High-risk jurisdiction, complex ownership, prior adverse findings.",
  },
  {
    title: "Tier B — Elevated Risk",
    content: "Standard DD with enhanced elements. 12-month review cycle. Analyst sign-off sufficient.",
  },
  {
    title: "Tier C — Standard Risk",
    content: "Standard DD. 24-month review cycle. Officer-level sign-off.",
  },
  {
    title: "Regulatory Proportionality",
    content: "The FCA and HMRC both require that EDD is applied proportionately to actual risk. Applying EDD to every entity regardless of tier is not compliant — it is over-processing. The tier matrix is the proportionality mechanism.",
  },
  {
    title: "Quick Reference",
    type: "keyvalue",
    pairs: [
      { key: "Regulation", value: "MLR 2017 Regulation 33" },
      { key: "FCA", value: "Financial Crime Guide" },
      { key: "HMRC", value: "AML Supervision Guidance" },
      { key: "Internal", value: "CR Tier Policy" },
    ],
  },
];
const SOURCE_CATEGORY_OPTIONS = [
  { key: "sanctions", label: "Sanctions Check" },
  { key: "corporate_registry", label: "Corporate Registry Verification" },
  { key: "adverse_media", label: "Adverse Media Protocol" },
  { key: "jurisdiction_reference", label: "Jurisdiction Reference Review" },
  { key: "litigation", label: "Litigation Search" },
  { key: "offshore_leaks", label: "Offshore Leak Signal Check" },
];

const COMMENTARY_OPTIONS = [
  { key: "contextual_analysis", label: "Contextual Analysis" },
  { key: "explanation_of_material_findings", label: "Explanation of Material Findings" },
  { key: "mitigating_factors", label: "Mitigating Factors" },
  { key: "recommended_follow_up_actions", label: "Recommended Follow-up Actions" },
  { key: "client_safe_notes", label: "Client-safe Notes" },
];

const TIER_LABELS: Record<string, string> = {
  standard: "Core (Standard)",
  enhanced: "Enhanced",
  dossier: "Premium (Dossier)",
};

interface MatrixRule {
  id?: string;
  report_tier: string;
  required_source_categories: string[];
  min_retrieval_logs: Record<string, number>;
  required_commentary_sections: string[];
  ai_review_required: boolean;
  qa_checklist_items: string[];
  escalation_risk_band_threshold: string;
  sanctions_match_requires_manager_review: boolean;
  adverse_media_threshold: number;
  adverse_media_requires_contextual_analysis: boolean;
}

interface MatrixVersion {
  id: string;
  version_number: number;
  status: string;
  created_by: string | null;
  change_log: string | null;
  created_at: string;
}

export default function TierMatrixPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [versions, setVersions] = useState<MatrixVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<MatrixVersion | null>(null);
  const [rules, setRules] = useState<MatrixRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeLog, setChangeLog] = useState("");
  const [editedTier, setEditedTier] = useState("standard");
  const [newQaItem, setNewQaItem] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: vData } = await supabase
      .from("tier_matrix_versions" as any)
      .select("*")
      .order("version_number", { ascending: false });
    const allVersions = (vData as any[]) ?? [];
    setVersions(allVersions);

    const active = allVersions.find((v: any) => v.status === "active") ?? allVersions[0];
    setActiveVersion(active ?? null);

    if (active) {
      const { data: rData } = await supabase
        .from("tier_requirements_matrix" as any)
        .select("*")
        .eq("matrix_version_id", active.id);
      setRules((rData as any[]) ?? []);
    }
    setLoading(false);
  };

  const currentRule = rules.find((r) => r.report_tier === editedTier);

  const updateRule = (patch: Partial<MatrixRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.report_tier === editedTier ? { ...r, ...patch } : r))
    );
  };

  const toggleSource = (key: string) => {
    if (!currentRule) return;
    const cats = currentRule.required_source_categories.includes(key)
      ? currentRule.required_source_categories.filter((c) => c !== key)
      : [...currentRule.required_source_categories, key];
    updateRule({ required_source_categories: cats });
  };

  const toggleCommentary = (key: string) => {
    if (!currentRule) return;
    const secs = currentRule.required_commentary_sections.includes(key)
      ? currentRule.required_commentary_sections.filter((c) => c !== key)
      : [...currentRule.required_commentary_sections, key];
    updateRule({ required_commentary_sections: secs });
  };

  const setMinLogs = (cat: string, val: number) => {
    if (!currentRule) return;
    updateRule({ min_retrieval_logs: { ...currentRule.min_retrieval_logs, [cat]: val } });
  };

  const addQaItem = () => {
    if (!newQaItem.trim() || !currentRule) return;
    updateRule({ qa_checklist_items: [...currentRule.qa_checklist_items, newQaItem.trim()] });
    setNewQaItem("");
  };

  const removeQaItem = (idx: number) => {
    if (!currentRule) return;
    updateRule({ qa_checklist_items: currentRule.qa_checklist_items.filter((_, i) => i !== idx) });
  };

  const handlePublishNewVersion = async () => {
    if (!changeLog.trim()) {
      toast({ title: "Provide a change log entry", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Supersede current active version
      if (activeVersion) {
        await supabase.from("tier_matrix_versions" as any)
          .update({ status: "superseded" } as any)
          .eq("id", activeVersion.id);
      }

      const newVersionNum = (activeVersion?.version_number ?? 0) + 1;
      const { data: newVer } = await supabase
        .from("tier_matrix_versions" as any)
        .insert({
          version_number: newVersionNum,
          status: "active",
          created_by: user?.id,
          change_log: changeLog.trim(),
        } as any)
        .select("*")
        .single();

      if (!newVer) throw new Error("Failed to create version");

      // Insert all rules under new version
      for (const rule of rules) {
        await supabase.from("tier_requirements_matrix" as any).insert({
          matrix_version_id: (newVer as any).id,
          report_tier: rule.report_tier,
          required_source_categories: rule.required_source_categories,
          min_retrieval_logs: rule.min_retrieval_logs,
          required_commentary_sections: rule.required_commentary_sections,
          ai_review_required: rule.ai_review_required,
          qa_checklist_items: rule.qa_checklist_items,
          escalation_risk_band_threshold: rule.escalation_risk_band_threshold,
          sanctions_match_requires_manager_review: rule.sanctions_match_requires_manager_review,
          adverse_media_threshold: rule.adverse_media_threshold,
          adverse_media_requires_contextual_analysis: rule.adverse_media_requires_contextual_analysis,
        } as any);
      }

      // Audit log
      if (user && profile) {
        await supabase.from("audit_events").insert({
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "TIER_MATRIX_VERSION_PUBLISHED",
          object_type: "tier_matrix_version",
          object_id: (newVer as any).id,
          metadata: {
            version_number: newVersionNum,
            change_log: changeLog.trim(),
          },
        });
      }

      toast({ title: `Matrix v${newVersionNum} published` });
      setChangeLog("");
      loadAll();
    } catch {
      toast({ title: "Failed to publish", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Tier Requirements Matrix</h1>
          <p className="text-sm text-muted-foreground">Institutional methodology enforcement per report tier</p>
        </div>
        {activeVersion && (
          <Badge variant="outline" className="text-xs">Active: v{activeVersion.version_number}</Badge>
        )}
      </div>

      <KnowledgePanelWidget
        pageId="tier-matrix-proportionality"
        title="How Risk Tiers Connect to Policy & Regulatory Proportionality"
        sections={TIER_KNOWLEDGE}
      />

      <Tabs value={editedTier} onValueChange={setEditedTier}>
        <TabsList>
          {["standard", "enhanced", "dossier"].map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize">{TIER_LABELS[t]}</TabsTrigger>
          ))}
        </TabsList>

        {["standard", "enhanced", "dossier"].map((tier) => {
          const rule = rules.find((r) => r.report_tier === tier);
          if (!rule) return null;
          return (
            <TabsContent key={tier} value={tier} className="space-y-4">
              {/* 1. Required Source Categories */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3">1. Required Source Categories</h3>
                <div className="space-y-2">
                  {SOURCE_CATEGORY_OPTIONS.map((s) => (
                    <div key={s.key} className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.required_source_categories.includes(s.key)}
                          onChange={() => { setEditedTier(tier); toggleSource(s.key); }}
                          className="rounded"
                        />
                        {s.label}
                      </label>
                      {rule.required_source_categories.includes(s.key) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Min logs:</span>
                          <Input
                            type="number"
                            min={1}
                            value={rule.min_retrieval_logs[s.key] ?? 1}
                            onChange={(e) => { setEditedTier(tier); setMinLogs(s.key, parseInt(e.target.value) || 1); }}
                            className="w-16 h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Required Commentary Sections */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3">2. Required Commentary Sections</h3>
                <div className="space-y-2">
                  {COMMENTARY_OPTIONS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.required_commentary_sections.includes(c.key)}
                        onChange={() => { setEditedTier(tier); toggleCommentary(c.key); }}
                        className="rounded"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. AI & QA Requirements */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="font-display text-sm font-semibold text-foreground">3. AI & QA Requirements</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">AI Review Run Required</span>
                  <Switch checked={rule.ai_review_required} onCheckedChange={(v) => { setEditedTier(tier); updateRule({ ai_review_required: v }); }} />
                </div>
                <div>
                  <span className="text-xs font-medium text-foreground block mb-2">QA Checklist Items</span>
                  <div className="space-y-1">
                    {rule.qa_checklist_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/20 rounded px-2 py-1">
                        <span className="text-foreground">{item}</span>
                        <button onClick={() => { setEditedTier(tier); removeQaItem(i); }} className="text-muted-foreground hover:text-destructive"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={newQaItem} onChange={(e) => setNewQaItem(e.target.value)} placeholder="New checklist item…" className="text-xs h-7 flex-1" />
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditedTier(tier); addQaItem(); }}><Plus size={12} /></Button>
                  </div>
                </div>
              </div>

              {/* 4. Escalation Thresholds */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="font-display text-sm font-semibold text-foreground">4. Escalation Thresholds</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Risk Band Threshold for Follow-up</span>
                  <select
                    value={rule.escalation_risk_band_threshold}
                    onChange={(e) => { setEditedTier(tier); updateRule({ escalation_risk_band_threshold: e.target.value }); }}
                    className="text-xs border rounded px-2 py-1 bg-background text-foreground"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Sanctions Match → Manager Review</span>
                  <Switch checked={rule.sanctions_match_requires_manager_review} onCheckedChange={(v) => { setEditedTier(tier); updateRule({ sanctions_match_requires_manager_review: v }); }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Adverse Media Threshold</span>
                  <Input
                    type="number"
                    min={1}
                    value={rule.adverse_media_threshold}
                    onChange={(e) => { setEditedTier(tier); updateRule({ adverse_media_threshold: parseInt(e.target.value) || 1 }); }}
                    className="w-20 h-7 text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Adverse Media → Contextual Analysis Required</span>
                  <Switch checked={rule.adverse_media_requires_contextual_analysis} onCheckedChange={(v) => { setEditedTier(tier); updateRule({ adverse_media_requires_contextual_analysis: v }); }} />
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Publish */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2"><Save size={14} /> Publish New Version</h3>
        <Textarea
          rows={2}
          placeholder="Change log — describe what changed and why…"
          value={changeLog}
          onChange={(e) => setChangeLog(e.target.value)}
          className="text-xs"
        />
        <Button size="sm" className="text-xs gap-1" onClick={handlePublishNewVersion} disabled={saving}>
          <Save size={12} /> {saving ? "Publishing…" : "Publish New Matrix Version"}
        </Button>
      </div>

      {/* Version History */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><History size={14} /> Version History</h3>
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <Badge variant={v.status === "active" ? "default" : "outline"} className="text-[10px]">v{v.version_number}</Badge>
                <span className="text-foreground">{v.change_log || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] capitalize">{v.status}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString("en-GB")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Matrix rules are internal only. Clients cannot access methodology enforcement configurations.
      </p>
    </div>
  );
}
