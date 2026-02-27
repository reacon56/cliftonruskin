import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const INDICATOR_TYPES = [
  { value: "FATF_STATUS", label: "FATF Status" },
  { value: "EU_AML_HRTC", label: "EU AML High-Risk Third Country" },
  { value: "SANCTIONS_UK_PROGRAMME", label: "UK Sanctions Programme" },
  { value: "SANCTIONS_EU_PROGRAMME", label: "EU Sanctions Programme" },
  { value: "SANCTIONS_US_OFAC_PROGRAMME", label: "US OFAC Programme" },
  { value: "CPI_SCORE", label: "CPI Score" },
  { value: "US_STATE_SPONSOR_TERRORISM", label: "US State Sponsor of Terrorism" },
  { value: "US_FINCEN_311", label: "US FinCEN Section 311" },
  { value: "EU_TAX_NONCOOP", label: "EU Tax Non-Cooperative List" },
];

const OPERATORS = [
  { value: "EQUALS", label: "=" },
  { value: "NOT_EQUALS", label: "≠" },
  { value: "IN", label: "IN" },
  { value: "NOT_IN", label: "NOT IN" },
  { value: "GTE", label: "≥" },
  { value: "LTE", label: "≤" },
  { value: "GT", label: ">" },
  { value: "LT", label: "<" },
  { value: "EXISTS", label: "EXISTS" },
  { value: "NOT_EXISTS", label: "NOT EXISTS" },
];

const OUTCOME_PRESETS = [
  "EDD_REQUIRED",
  "SENIOR_APPROVAL",
  "REVIEW_CYCLE=6M",
  "REVIEW_CYCLE=12M",
  "CLIENT_TIER=T1",
  "CLIENT_TIER=T2",
  "CLIENT_TIER=T3",
  "BLOCK_ONBOARDING",
  "FLAG_FOR_REVIEW",
  "ENHANCED_MONITORING",
];

interface Rule {
  id: string;
  priority: number;
  if_indicator_type: string;
  operator: string;
  compare_value_json: any;
  then_outcome_json: any;
  notes: string | null;
}

interface Props {
  rulesetId: string;
  rulesetName: string;
}

export default function PolicyRuleEditor({ rulesetId, rulesetName }: Props) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    if_indicator_type: "",
    operator: "EQUALS",
    compare_value: "",
    outcomes: [] as string[],
    customOutcome: "",
    notes: "",
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["policy-rules", rulesetId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("client_policy_rule") as any)
        .select("*")
        .eq("ruleset_id", rulesetId)
        .order("priority");
      if (error) throw error;
      return data as Rule[];
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      const allOutcomes = [...form.outcomes];
      if (form.customOutcome.trim()) allOutcomes.push(form.customOutcome.trim());

      const maxPriority = rules.length > 0 ? Math.max(...rules.map(r => r.priority)) + 1 : 1;

      const { error } = await (supabase
        .from("client_policy_rule") as any)
        .insert({
          ruleset_id: rulesetId,
          priority: maxPriority,
          if_indicator_type: form.if_indicator_type,
          operator: form.operator,
          compare_value_json: parseCompareValue(form.compare_value, form.operator),
          then_outcome_json: { actions: allOutcomes },
          notes: form.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policy-rules", rulesetId] });
      toast.success("Rule added");
      setAddOpen(false);
      setForm({ if_indicator_type: "", operator: "EQUALS", compare_value: "", outcomes: [], customOutcome: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("client_policy_rule") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policy-rules", rulesetId] });
      toast.success("Rule removed");
    },
  });

  function parseCompareValue(val: string, operator: string): any {
    if (operator === "EXISTS" || operator === "NOT_EXISTS") return {};
    if (operator === "IN" || operator === "NOT_IN") {
      return { values: val.split(",").map(v => v.trim()).filter(Boolean) };
    }
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== "") return { value: num };
    return { value: val.trim() };
  }

  function describeCompare(rule: Rule): string {
    const op = OPERATORS.find(o => o.value === rule.operator);
    const opLabel = op?.label ?? rule.operator;
    if (rule.operator === "EXISTS") return "exists";
    if (rule.operator === "NOT_EXISTS") return "does not exist";
    const cv = rule.compare_value_json;
    if (cv?.values) return `${opLabel} [${cv.values.join(", ")}]`;
    return `${opLabel} ${cv?.value ?? ""}`;
  }

  function describeOutcome(rule: Rule): string {
    const actions = rule.then_outcome_json?.actions;
    if (Array.isArray(actions)) return actions.join(", ");
    return JSON.stringify(rule.then_outcome_json);
  }

  function toggleOutcome(outcome: string) {
    setForm(prev => ({
      ...prev,
      outcomes: prev.outcomes.includes(outcome)
        ? prev.outcomes.filter(o => o !== outcome)
        : [...prev.outcomes, outcome],
    }));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{rulesetName} — Rules</CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No rules yet. Add rules to define how indicators map to outcomes.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <span className="text-[10px] text-muted-foreground font-mono w-6 text-center">{rule.priority}</span>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {INDICATOR_TYPES.find(i => i.value === rule.if_indicator_type)?.label || rule.if_indicator_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{describeCompare(rule)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge className="text-[10px]">{describeOutcome(rule)}</Badge>
                </div>
                {rule.notes && (
                  <span className="text-[10px] text-muted-foreground italic max-w-[120px] truncate">{rule.notes}</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                  onClick={() => deleteRule.mutate(rule.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Rule Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Policy Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* IF */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">If Indicator</Label>
              <Select value={form.if_indicator_type} onValueChange={(v) => setForm({ ...form, if_indicator_type: v })}>
                <SelectTrigger><SelectValue placeholder="Choose indicator..." /></SelectTrigger>
                <SelectContent>
                  {INDICATOR_TYPES.map(i => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* OPERATOR */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operator</Label>
              <Select value={form.operator} onValueChange={(v) => setForm({ ...form, operator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* COMPARE VALUE */}
            {form.operator !== "EXISTS" && form.operator !== "NOT_EXISTS" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compare Value</Label>
                <Input
                  placeholder={form.operator === "IN" || form.operator === "NOT_IN" ? "VALUE1, VALUE2, ..." : "e.g. CALL_FOR_ACTION or 30"}
                  value={form.compare_value}
                  onChange={(e) => setForm({ ...form, compare_value: e.target.value })}
                />
              </div>
            )}

            {/* THEN OUTCOME */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Then Outcome</Label>
              <div className="flex flex-wrap gap-1.5">
                {OUTCOME_PRESETS.map(o => (
                  <Badge
                    key={o}
                    variant={form.outcomes.includes(o) ? "default" : "outline"}
                    className="cursor-pointer text-[10px]"
                    onClick={() => toggleOutcome(o)}
                  >
                    {o}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Custom outcome (optional)"
                value={form.customOutcome}
                onChange={(e) => setForm({ ...form, customOutcome: e.target.value })}
                className="mt-2"
              />
            </div>

            {/* NOTES */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
              <Textarea
                placeholder="Internal notes about this rule..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addRule.mutate()}
              disabled={!form.if_indicator_type || (form.outcomes.length === 0 && !form.customOutcome.trim())}
            >
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
