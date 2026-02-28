import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FlaskConical, Play, Loader2, ArrowRight, Shield, AlertTriangle,
  CheckCircle2, XCircle, Save, Plus, Trash2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

/* ── types ── */
interface SimRule {
  id: string;
  if_indicator_type: string;
  operator: string;
  compare_value_json: any;
  then_outcome_json: { actions: string[] };
  notes?: string;
  priority: number;
}

interface SimResult {
  id: string;
  entity_id: string;
  current_outcome_json: any;
  proposed_outcome_json: any;
  has_change: boolean;
  entity_name?: string;
}

const INDICATOR_OPTIONS = [
  { value: "FATF_STATUS", label: "FATF Status" },
  { value: "EU_AML_HRTC", label: "EU AML High-Risk Third Country" },
  { value: "SANCTIONS_UK_PROGRAMME", label: "UK Sanctions Programme" },
  { value: "SANCTIONS_EU_PROGRAMME", label: "EU Sanctions Programme" },
  { value: "SANCTIONS_US_OFAC_PROGRAMME", label: "US OFAC Programme" },
  { value: "CPI_SCORE", label: "CPI Score" },
];

const OPERATOR_OPTIONS = [
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Not Equals" },
  { value: "IN", label: "In List" },
  { value: "EXISTS", label: "Exists" },
  { value: "NOT_EXISTS", label: "Not Exists" },
  { value: "GTE", label: "≥ (Greater/Equal)" },
  { value: "LTE", label: "≤ (Less/Equal)" },
  { value: "LT", label: "< (Less Than)" },
];

const ACTION_OPTIONS = [
  "EDD_REQUIRED",
  "BLOCK_ONBOARDING",
  "SENIOR_APPROVAL",
  "ENHANCED_MONITORING",
  "SOW_SOF_VERIFICATION",
  "SHORTENED_REVIEW_CYCLE",
  "LEGAL_REVIEW",
];

/* ── Quick rule presets ── */
const PRESETS: { label: string; rules: Omit<SimRule, "id">[] }[] = [
  {
    label: "Conservative",
    rules: [
      { if_indicator_type: "FATF_STATUS", operator: "EQUALS", compare_value_json: { value: "CALL_FOR_ACTION" }, then_outcome_json: { actions: ["BLOCK_ONBOARDING"] }, priority: 1 },
      { if_indicator_type: "FATF_STATUS", operator: "EQUALS", compare_value_json: { value: "INCREASED_MONITORING" }, then_outcome_json: { actions: ["EDD_REQUIRED", "SENIOR_APPROVAL"] }, priority: 2 },
      { if_indicator_type: "EU_AML_HRTC", operator: "EXISTS", compare_value_json: {}, then_outcome_json: { actions: ["EDD_REQUIRED"] }, priority: 3 },
      { if_indicator_type: "CPI_SCORE", operator: "LT", compare_value_json: { value: 40 }, then_outcome_json: { actions: ["EDD_REQUIRED"] }, priority: 4 },
    ],
  },
  {
    label: "Balanced",
    rules: [
      { if_indicator_type: "FATF_STATUS", operator: "EQUALS", compare_value_json: { value: "CALL_FOR_ACTION" }, then_outcome_json: { actions: ["EDD_REQUIRED", "SENIOR_APPROVAL"] }, priority: 1 },
      { if_indicator_type: "FATF_STATUS", operator: "EQUALS", compare_value_json: { value: "INCREASED_MONITORING" }, then_outcome_json: { actions: ["ENHANCED_MONITORING"] }, priority: 2 },
      { if_indicator_type: "CPI_SCORE", operator: "LT", compare_value_json: { value: 30 }, then_outcome_json: { actions: ["EDD_REQUIRED"] }, priority: 3 },
    ],
  },
];

let ruleCounter = 0;

export default function PolicySimulatePage() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const orgId = profile?.org_id;

  const [simName, setSimName] = useState("Untitled simulation");
  const [rules, setRules] = useState<SimRule[]>([]);
  const [activeSimId, setActiveSimId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // CPI threshold shortcut
  const [cpiThreshold, setCpiThreshold] = useState(30);

  // Load existing simulations
  const { data: simulations = [] } = useQuery({
    queryKey: ["policy-simulations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("policy_simulation") as any)
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Load results for active simulation
  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["policy-simulation-results", activeSimId],
    enabled: !!activeSimId,
    queryFn: async () => {
      const { data: rawResults, error } = await (supabase.from("policy_simulation_result") as any)
        .select("*, entities:entity_id(id, name)")
        .eq("simulation_id", activeSimId);
      if (error) throw error;
      return (rawResults || []).map((r: any) => ({
        ...r,
        entity_name: r.entities?.name ?? "Unknown",
      })) as SimResult[];
    },
  });

  // Load live ruleset for "Apply" flow
  const { data: liveRulesets = [] } = useQuery({
    queryKey: ["live-rulesets", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("client_policy_ruleset") as any)
        .select("id, name, version, enabled")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* ── Rule editing ── */
  const addRule = () => {
    ruleCounter++;
    setRules((prev) => [
      ...prev,
      {
        id: `new-${ruleCounter}`,
        if_indicator_type: "FATF_STATUS",
        operator: "EQUALS",
        compare_value_json: { value: "CALL_FOR_ACTION" },
        then_outcome_json: { actions: ["EDD_REQUIRED"] },
        priority: prev.length + 1,
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<SimRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setRules(preset.rules.map((r, i) => ({ ...r, id: `preset-${++ruleCounter}` })));
    toast.success(`Applied "${preset.label}" preset`);
  };

  const applyCpiThreshold = () => {
    // Find existing CPI rule and update, or add new
    setRules((prev) => {
      const existing = prev.find((r) => r.if_indicator_type === "CPI_SCORE");
      if (existing) {
        return prev.map((r) =>
          r.id === existing.id
            ? { ...r, compare_value_json: { value: cpiThreshold }, operator: "LT" }
            : r
        );
      }
      ruleCounter++;
      return [
        ...prev,
        {
          id: `cpi-${ruleCounter}`,
          if_indicator_type: "CPI_SCORE",
          operator: "LT",
          compare_value_json: { value: cpiThreshold },
          then_outcome_json: { actions: ["EDD_REQUIRED"] },
          priority: prev.length + 1,
        },
      ];
    });
  };

  /* ── Run simulation ── */
  const runSimulation = async () => {
    if (!orgId || rules.length === 0) {
      toast.error("Add at least one rule before running");
      return;
    }

    setRunning(true);
    try {
      // 1. Create simulation record
      const { data: sim, error: createErr } = await (supabase.from("policy_simulation") as any)
        .insert({
          org_id: orgId,
          name: simName,
          proposed_rules_json: rules,
          status: "running",
          created_by: user?.id,
        })
        .select()
        .single();

      if (createErr) throw createErr;

      // 2. Invoke edge function
      const { data: result, error: fnErr } = await supabase.functions.invoke(
        "run-policy-simulation",
        { body: { simulation_id: sim.id } }
      );

      if (fnErr) throw fnErr;

      setActiveSimId(sim.id);
      qc.invalidateQueries({ queryKey: ["policy-simulations", orgId] });
      qc.invalidateQueries({ queryKey: ["policy-simulation-results", sim.id] });

      toast.success(
        `Simulation complete: ${result.changed_entities}/${result.total_entities} entities affected`
      );
    } catch (err: any) {
      toast.error(err.message || "Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  /* ── Apply as new version ── */
  const applyAsNewVersion = async () => {
    if (!orgId || rules.length === 0) return;
    setApplying(true);

    try {
      const activeRuleset = liveRulesets.find((r: any) => r.enabled);
      if (!activeRuleset) {
        // Create new ruleset
        const { data: rs, error: rsErr } = await (supabase.from("client_policy_ruleset") as any)
          .insert({ org_id: orgId, name: simName, enabled: true })
          .select()
          .single();
        if (rsErr) throw rsErr;

        // Insert rules
        const ruleInserts = rules.map((r, i) => ({
          ruleset_id: rs.id,
          if_indicator_type: r.if_indicator_type,
          operator: r.operator,
          compare_value_json: r.compare_value_json,
          then_outcome_json: r.then_outcome_json,
          priority: i + 1,
          notes: r.notes || null,
        }));

        const { error: insertErr } = await (supabase.from("client_policy_rule") as any).insert(ruleInserts);
        if (insertErr) throw insertErr;
      } else {
        // Bump version and replace rules
        const newVersion = (activeRuleset.version || 1) + 1;
        await (supabase.from("client_policy_ruleset") as any)
          .update({ version: newVersion, updated_at: new Date().toISOString() })
          .eq("id", activeRuleset.id);

        // Delete old rules
        await (supabase.from("client_policy_rule") as any)
          .delete()
          .eq("ruleset_id", activeRuleset.id);

        // Insert new rules
        const ruleInserts = rules.map((r, i) => ({
          ruleset_id: activeRuleset.id,
          if_indicator_type: r.if_indicator_type,
          operator: r.operator,
          compare_value_json: r.compare_value_json,
          then_outcome_json: r.then_outcome_json,
          priority: i + 1,
          notes: r.notes || null,
        }));

        const { error: insertErr } = await (supabase.from("client_policy_rule") as any).insert(ruleInserts);
        if (insertErr) throw insertErr;
      }

      // Mark simulation as applied
      if (activeSimId) {
        await (supabase.from("policy_simulation") as any)
          .update({ status: "applied" })
          .eq("id", activeSimId);
      }

      qc.invalidateQueries({ queryKey: ["policy-simulations", orgId] });
      qc.invalidateQueries({ queryKey: ["live-rulesets", orgId] });
      toast.success("Rules applied as new version");
      setApplyOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  /* ── Result summaries ── */
  const changedResults = results.filter((r) => r.has_change);
  const eddCount = results.filter((r) =>
    r.proposed_outcome_json?.actions?.includes("EDD_REQUIRED")
  ).length;
  const blockCount = results.filter((r) =>
    r.proposed_outcome_json?.actions?.includes("BLOCK_ONBOARDING") ||
    r.proposed_outcome_json?.actions?.includes("DO_NOT_ONBOARD")
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-accent" />
            Policy Simulation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test rule changes against your monitored entities before applying to production.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/client/policy">
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-1" /> Live Policies
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Presets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Presets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="mr-2"
                onClick={() => applyPreset(p)}
              >
                {p.label} ({p.rules.length} rules)
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* CPI Threshold shortcut */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">CPI Threshold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Slider
                value={[cpiThreshold]}
                onValueChange={([v]) => setCpiThreshold(v)}
                min={10}
                max={60}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-medium text-foreground w-8">{cpiThreshold}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Entities in jurisdictions with CPI score below this threshold trigger EDD.
            </p>
            <Button variant="outline" size="sm" onClick={applyCpiThreshold}>
              Apply CPI rule
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Name */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Simulation Name</Label>
          <Input
            value={simName}
            onChange={(e) => setSimName(e.target.value)}
            placeholder="Describe what you're testing…"
          />
        </div>
        <Button onClick={runSimulation} disabled={running || rules.length === 0} className="gap-1.5">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Simulation
        </Button>
      </div>

      {/* Rule Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Proposed Rules ({rules.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={addRule} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No rules defined. Use a preset or add rules manually.
            </p>
          )}
          {rules.map((rule, idx) => (
            <div key={rule.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Rule {idx + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                  onClick={() => removeRule(rule.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">If Indicator</Label>
                  <Select
                    value={rule.if_indicator_type}
                    onValueChange={(v) => updateRule(rule.id, { if_indicator_type: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDICATOR_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Operator</Label>
                  <Select
                    value={rule.operator}
                    onValueChange={(v) => updateRule(rule.id, { operator: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Compare Value</Label>
                  <Input
                    className="h-8 text-xs"
                    value={
                      rule.compare_value_json?.value != null
                        ? String(rule.compare_value_json.value)
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = Number(val);
                      updateRule(rule.id, {
                        compare_value_json: {
                          value: isNaN(numVal) || val === "" ? val : numVal,
                        },
                      });
                    }}
                    placeholder={
                      rule.operator === "EXISTS" || rule.operator === "NOT_EXISTS"
                        ? "(not needed)"
                        : "e.g. CALL_FOR_ACTION"
                    }
                    disabled={rule.operator === "EXISTS" || rule.operator === "NOT_EXISTS"}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Then Actions</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_OPTIONS.map((action) => {
                    const isActive = rule.then_outcome_json.actions.includes(action);
                    return (
                      <Badge
                        key={action}
                        variant={isActive ? "default" : "outline"}
                        className="text-[10px] cursor-pointer select-none"
                        onClick={() => {
                          const newActions = isActive
                            ? rule.then_outcome_json.actions.filter((a) => a !== action)
                            : [...rule.then_outcome_json.actions, action];
                          updateRule(rule.id, {
                            then_outcome_json: { actions: newActions },
                          });
                        }}
                      >
                        {action.replace(/_/g, " ")}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Results */}
      {activeSimId && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Simulation Results
              </h2>
              {changedResults.length > 0 && (
                <Button size="sm" className="gap-1.5" onClick={() => setApplyOpen(true)}>
                  <Save className="h-4 w-4" /> Apply as New Version
                </Button>
              )}
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-display font-bold text-foreground">
                    {results.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    Entities Evaluated
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-display font-bold text-warning">
                    {changedResults.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    Outcome Changes
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-display font-bold text-accent">
                    {eddCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    EDD Required
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-display font-bold text-destructive">
                    {blockCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    Do Not Onboard
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Changed entities table */}
            {changedResults.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Entities with Changed Outcomes ({changedResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Current Actions</TableHead>
                        <TableHead className="text-center">
                          <ArrowRight className="h-3.5 w-3.5 inline" />
                        </TableHead>
                        <TableHead>Proposed Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changedResults.map((r) => {
                        const currentActions: string[] =
                          r.current_outcome_json?.actions || [];
                        const proposedActions: string[] =
                          r.proposed_outcome_json?.actions || [];
                        const addedActions = proposedActions.filter(
                          (a) => !currentActions.includes(a)
                        );
                        const removedActions = currentActions.filter(
                          (a) => !proposedActions.includes(a)
                        );

                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm font-medium">
                              {r.entity_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {currentActions.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">None</span>
                                ) : (
                                  currentActions.map((a) => (
                                    <Badge
                                      key={a}
                                      variant="secondary"
                                      className={`text-[9px] ${
                                        removedActions.includes(a)
                                          ? "line-through opacity-50"
                                          : ""
                                      }`}
                                    >
                                      {a.replace(/_/g, " ")}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground inline" />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {proposedActions.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">None</span>
                                ) : (
                                  proposedActions.map((a) => (
                                    <Badge
                                      key={a}
                                      variant={addedActions.includes(a) ? "default" : "secondary"}
                                      className="text-[9px]"
                                    >
                                      {addedActions.includes(a) && (
                                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                                      )}
                                      {a.replace(/_/g, " ")}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Unchanged entities */}
            {results.length > 0 && changedResults.length < results.length && (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {results.length - changedResults.length} entities have no outcome change
                    under proposed rules.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Info card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                How simulation works
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Simulations evaluate your proposed rules against <strong>monitored entities only</strong>.
                No production rules are modified until you explicitly click "Apply as New Version".
                Each application creates a new versioned ruleset, preserving your previous configuration
                for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply confirmation dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Apply Simulation as New Version
            </DialogTitle>
            <DialogDescription>
              This will replace your current live policy rules with the simulated rules. The
              previous version will be preserved for audit. This action cannot be undone
              without manually recreating your old rules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>
                {changedResults.length} entities will have changed outcomes
              </span>
            </div>
            {blockCount > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{blockCount} entities will be flagged "Do Not Onboard"</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAsNewVersion} disabled={applying}>
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Apply as New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Past simulations */}
      {simulations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Past Simulations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulations.map((sim: any) => (
                  <TableRow key={sim.id}>
                    <TableCell className="text-sm font-medium">{sim.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sim.status === "applied"
                            ? "default"
                            : sim.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px] capitalize"
                      >
                        {sim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(sim.proposed_rules_json || []).length} rules
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(sim.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setActiveSimId(sim.id);
                          setRules(sim.proposed_rules_json || []);
                          setSimName(sim.name);
                        }}
                      >
                        Load
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
