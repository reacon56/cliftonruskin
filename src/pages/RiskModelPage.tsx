import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Shield, Settings, BarChart3, Save, AlertTriangle, Globe,
  Building2, Users, Zap, History, PenLine, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const RISK_MODEL_KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  {
    title: "How the Model Works",
    content: "CR-JURIS-1.0 scores jurisdictions across four pillars: Financial Crime Risk, Regulatory Maturity, Transparency & Beneficial Ownership, and Geopolitical Exposure. Each pillar is weighted according to its relative importance, and the composite score determines the overall risk band (Low, Medium, High, or Critical).",
  },
  {
    title: "Why Pillar Weighting Matters",
    content: "A jurisdiction can score well on transparency but critically on geopolitical exposure (e.g. UAE). The composite score reflects this tension rather than masking it. Pillar weights are versioned and auditable — any change is recorded with a justification.",
  },
  {
    title: "FATF References",
    content: "FATF Mutual Evaluation Reports are a primary input. Grey list status triggers an automatic risk floor of High regardless of other pillar scores. Call for Action (black list) status mandates a minimum Critical band.",
  },
  {
    title: "How to Challenge a Score",
    content: "Analysts can apply a manual override with a documented reason. Overrides are flagged in the jurisdiction profile and visible in the audit trail. All overrides require a justification and are time-stamped with the overriding analyst's identity.",
  },
  {
    title: "Quick Reference",
    type: "keyvalue",
    pairs: [
      { key: "Framework", value: "FATF Methodology" },
      { key: "Engine", value: "CR-JURIS-1.0 Internal Spec" },
      { key: "Guidance", value: "ICO Data Minimisation Guidance" },
    ],
  },
];

const BANDS = ["Low", "Medium", "High", "Critical"] as const;
const BAND_COLORS: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Critical: "bg-destructive/10 text-destructive",
};

const PILLAR_META = [
  { key: "jurisdiction", label: "Jurisdiction Risk", icon: Globe, weightKey: "jurisdiction_weight" as const, scoreKey: "jurisdiction_score" as const },
  { key: "structural", label: "Structural Risk", icon: Building2, weightKey: "structural_weight" as const, scoreKey: "structural_score" as const },
  { key: "association", label: "Association Risk", icon: Users, weightKey: "association_weight" as const, scoreKey: "association_score" as const },
  { key: "event", label: "Event Risk", icon: Zap, weightKey: "event_weight" as const, scoreKey: "event_score" as const },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  High: "text-emerald-600",
  Medium: "text-amber-600",
  Low: "text-destructive",
};

export default function RiskModelPage() {
  const { user, isInternal, canQuote, profile } = useAuth();
  const isManager = canQuote;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("scores");
  const [config, setConfig] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);

  // Config editing
  const [editConfig, setEditConfig] = useState(false);
  const [weights, setWeights] = useState({ jurisdiction_weight: 25, structural_weight: 25, association_weight: 25, event_weight: 25 });
  const [bandThresholds, setBandThresholds] = useState({ band_low_max: 25, band_medium_max: 50, band_high_max: 75 });
  const [configVersion, setConfigVersion] = useState("v1.0");
  const [configNotes, setConfigNotes] = useState("");

  // Override dialog
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideEntityId, setOverrideEntityId] = useState("");
  const [overrideNewBand, setOverrideNewBand] = useState("Medium");
  const [overrideJustification, setOverrideJustification] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [configRes, scoresRes, entitiesRes, overridesRes] = await Promise.all([
      supabase.from("risk_model_configs").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1),
      supabase.from("entity_risk_scores").select("*").order("calculated_at", { ascending: false }),
      supabase.from("entities").select("id, name, risk_tier, org_id"),
      isInternal ? supabase.from("risk_overrides").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    const cfg = (configRes.data ?? [])[0] ?? null;
    setConfig(cfg);
    if (cfg) {
      setWeights({ jurisdiction_weight: cfg.jurisdiction_weight, structural_weight: cfg.structural_weight, association_weight: cfg.association_weight, event_weight: cfg.event_weight });
      setBandThresholds({ band_low_max: cfg.band_low_max, band_medium_max: cfg.band_medium_max, band_high_max: cfg.band_high_max });
      setConfigVersion(cfg.version);
      setConfigNotes(cfg.notes ?? "");
    }
    setScores(scoresRes.data ?? []);
    setEntities(entitiesRes.data ?? []);
    setOverrides((overridesRes as any).data ?? []);
  };

  const totalWeight = weights.jurisdiction_weight + weights.structural_weight + weights.association_weight + weights.event_weight;

  const saveConfig = async () => {
    if (totalWeight !== 100) {
      toast({ title: "Weights must sum to 100%", variant: "destructive" });
      return;
    }
    // Deactivate old config
    if (config?.id) {
      await supabase.from("risk_model_configs").update({ is_active: false } as any).eq("id", config.id);
    }
    const { error } = await supabase.from("risk_model_configs").insert({
      version: configVersion,
      ...weights,
      ...bandThresholds,
      is_active: true,
      created_by: user?.id,
      notes: configNotes || null,
    } as any);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("audit_events").insert({
      user_id: user!.id, org_id: profile?.org_id,
      action_type: "RISK_MODEL_CONFIG_UPDATED",
      object_type: "risk_model", object_id: null,
      metadata: { version: configVersion, weights, bandThresholds },
    });
    toast({ title: "Risk model configuration saved" });
    setEditConfig(false);
    loadAll();
  };

  const submitOverride = async () => {
    if (!overrideJustification.trim() || !overrideEntityId) return;
    const entityScore = scores.find((s) => s.entity_id === overrideEntityId);
    const previousBand = entityScore?.risk_band ?? "Unknown";

    const { error } = await supabase.from("risk_overrides").insert({
      entity_id: overrideEntityId,
      previous_band: previousBand,
      new_band: overrideNewBand,
      justification: overrideJustification,
      overridden_by: user!.id,
    } as any);
    if (error) {
      toast({ title: "Override failed", description: error.message, variant: "destructive" });
      return;
    }

    // Update the score record
    if (entityScore) {
      await supabase.from("entity_risk_scores").update({ risk_band: overrideNewBand } as any).eq("id", entityScore.id);
    }

    await supabase.from("audit_events").insert({
      user_id: user!.id, org_id: profile?.org_id,
      action_type: "RISK_OVERRIDE",
      object_type: "entity", object_id: overrideEntityId,
      metadata: { previous_band: previousBand, new_band: overrideNewBand, justification: overrideJustification },
    });

    toast({ title: "Risk override applied" });
    setOverrideOpen(false);
    setOverrideJustification("");
    loadAll();
  };

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));

  // Dedupe scores: latest per entity
  const latestScores = Object.values(
    scores.reduce<Record<string, any>>((acc, s) => {
      if (!acc[s.entity_id] || new Date(s.calculated_at) > new Date(acc[s.entity_id].calculated_at)) {
        acc[s.entity_id] = s;
      }
      return acc;
    }, {})
  );

  const getBand = (score: number): string => {
    if (!config) return "Low";
    if (score <= config.band_low_max) return "Low";
    if (score <= config.band_medium_max) return "Medium";
    if (score <= config.band_high_max) return "High";
    return "Critical";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Risk Model
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {config ? `${config.version} · Active` : "No active configuration"} · Pillar-based composite scoring
          </p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setEditConfig(true); setActiveTab("config"); }}>
              <Settings className="h-3.5 w-3.5" /> Configure
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          <TabsTrigger value="scores" className="text-xs gap-1.5 data-[state=active]:bg-primary/10">
            <BarChart3 className="h-3.5 w-3.5" /> Entity Scores
          </TabsTrigger>
          {isInternal && (
            <TabsTrigger value="config" className="text-xs gap-1.5 data-[state=active]:bg-primary/10">
              <Settings className="h-3.5 w-3.5" /> Model Config
            </TabsTrigger>
          )}
          {isInternal && (
            <TabsTrigger value="overrides" className="text-xs gap-1.5 data-[state=active]:bg-primary/10">
              <History className="h-3.5 w-3.5" /> Override Log
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ENTITY SCORES ── */}
        <TabsContent value="scores" className="space-y-4 mt-4">
          {isManager && (
            <div className="flex justify-end">
              <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <PenLine className="h-3 w-3" /> Manual Override
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display text-base">Risk Band Override</DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground">Overrides require written justification and are permanently logged.</p>
                  <Select value={overrideEntityId} onValueChange={setOverrideEntityId}>
                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={overrideNewBand} onValueChange={setOverrideNewBand}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Justification (required)…" rows={3} value={overrideJustification} onChange={(e) => setOverrideJustification(e.target.value)} />
                  <Button onClick={submitOverride} disabled={!overrideEntityId || !overrideJustification.trim()} className="gap-1">
                    <PenLine className="h-3.5 w-3.5" /> Apply Override
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {latestScores.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No risk scores calculated yet. Scores are generated during case processing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestScores.map((s) => {
                const ent = entityMap[s.entity_id];
                const reasons = (s.reason_codes as string[]) || [];
                return (
                  <div key={s.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-foreground">{ent?.name ?? "Unknown Entity"}</h3>
                        <span className="text-[10px] text-muted-foreground">{s.model_version} · Calculated {new Date(s.calculated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${CONFIDENCE_COLORS[s.confidence] || ""}`}>
                          {s.confidence} confidence
                        </span>
                        <Badge className={`text-xs ${BAND_COLORS[s.risk_band] || "bg-muted text-muted-foreground"}`}>
                          {s.risk_band}
                        </Badge>
                      </div>
                    </div>

                    {/* Pillar scores — internal only */}
                    {isInternal && (
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {PILLAR_META.map((p) => {
                          const score = s[p.scoreKey] ?? 0;
                          const Icon = p.icon;
                          return (
                            <div key={p.key} className="rounded-lg border p-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-medium text-muted-foreground">{p.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={score} className="h-1.5 flex-1" />
                                <span className="text-xs font-mono font-semibold text-foreground">{score}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Overall score — internal only */}
                    {isInternal && (
                      <div className="flex items-center gap-3 border-t border-border pt-3">
                        <span className="text-xs text-muted-foreground">Overall</span>
                        <Progress value={s.overall_score} className="h-2 flex-1" />
                        <span className="text-sm font-mono font-bold text-foreground">{s.overall_score}</span>
                      </div>
                    )}

                    {/* Reason codes — visible to all */}
                    {reasons.length > 0 && (
                      <div className={`${isInternal ? "mt-3 pt-3 border-t border-border" : "mt-2"}`}>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Top Risk Drivers</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {reasons.slice(0, 3).map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                              <ChevronRight className="h-2.5 w-2.5" /> {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── MODEL CONFIG ── */}
        {isInternal && (
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-foreground">Pillar Weights</h3>
                <Badge variant={totalWeight === 100 ? "default" : "destructive"} className="text-xs">
                  Total: {totalWeight}%
                </Badge>
              </div>

              {PILLAR_META.map((p) => {
                const Icon = p.icon;
                const val = weights[p.weightKey];
                return (
                  <div key={p.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {p.label}
                      </span>
                      <span className="text-xs font-mono text-foreground">{val}%</span>
                    </div>
                    {isManager && editConfig ? (
                      <Slider
                        value={[val]}
                        onValueChange={([v]) => setWeights((w) => ({ ...w, [p.weightKey]: v }))}
                        min={0} max={100} step={5}
                        className="w-full"
                      />
                    ) : (
                      <Progress value={val} className="h-2" />
                    )}
                  </div>
                );
              })}

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Band Thresholds</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "band_low_max" as const, label: "Low ≤", color: "text-emerald-600" },
                    { key: "band_medium_max" as const, label: "Medium ≤", color: "text-amber-600" },
                    { key: "band_high_max" as const, label: "High ≤", color: "text-orange-600" },
                  ].map((b) => (
                    <div key={b.key} className="space-y-1">
                      <span className={`text-[10px] font-medium ${b.color}`}>{b.label}</span>
                      {isManager && editConfig ? (
                        <Input
                          type="number" min={0} max={100}
                          value={bandThresholds[b.key]}
                          onChange={(e) => setBandThresholds((t) => ({ ...t, [b.key]: Number(e.target.value) }))}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <div className="text-sm font-mono font-semibold text-foreground">{bandThresholds[b.key]}</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Scores above High threshold are classified as Critical.</p>
              </div>

              {isManager && editConfig && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-muted-foreground">Model Version</span>
                      <Input value={configVersion} onChange={(e) => setConfigVersion(e.target.value)} className="h-8 text-xs" placeholder="v1.0" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground">Notes</span>
                    <Textarea value={configNotes} onChange={(e) => setConfigNotes(e.target.value)} rows={2} placeholder="Config change rationale…" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveConfig} disabled={totalWeight !== 100} size="sm" className="gap-1">
                      <Save className="h-3.5 w-3.5" /> Save Configuration
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditConfig(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Config history */}
              {config && (
                <div className="border-t border-border pt-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Config</span>
                  <p className="text-xs text-foreground mt-1">{config.version} · Created {new Date(config.created_at).toLocaleDateString()}</p>
                  {config.notes && <p className="text-xs text-muted-foreground mt-0.5">{config.notes}</p>}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* ── OVERRIDE LOG ── */}
        {isInternal && (
          <TabsContent value="overrides" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <History className="h-4 w-4" /> Override Audit Trail
              </h3>
              {overrides.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No overrides recorded.</p>
              ) : (
                <div className="space-y-2">
                  {overrides.map((o) => {
                    const ent = entityMap[o.entity_id];
                    return (
                      <div key={o.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{ent?.name ?? "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className={`text-[10px] ${BAND_COLORS[o.previous_band] || ""}`}>{o.previous_band}</Badge>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <Badge className={`text-[10px] ${BAND_COLORS[o.new_band] || ""}`}>{o.new_band}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground italic">"{o.justification}"</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
