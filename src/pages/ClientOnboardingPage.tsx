import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Shield, CheckCircle2, Bell, ArrowRight, ArrowLeft,
  Zap, Scale, AlertTriangle, Building2, Banknote,
  Globe, Sparkles, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

/* ── Presets ──────────────────────────────────────────────── */

type Posture = "conservative" | "standard" | "growth";

const POSTURE_META: Record<Posture, { label: string; desc: string; icon: React.ReactNode }> = {
  conservative: {
    label: "Conservative",
    desc: "Maximum scrutiny — EDD on any elevated signal, senior approval for high-risk, block comprehensive-sanctions jurisdictions.",
    icon: <Shield className="h-5 w-5" />,
  },
  standard: {
    label: "Standard",
    desc: "Balanced approach — EDD where required, escalate FATF calls for action, 6-month review cycles on high-risk.",
    icon: <Scale className="h-5 w-5" />,
  },
  growth: {
    label: "Growth",
    desc: "Lighter controls — flag but don't block, 12-month cycles, rely on monitoring for emerging risks.",
    icon: <Zap className="h-5 w-5" />,
  },
};

/* Trigger / outcome definitions keyed by posture */

interface TriggerConfig {
  fatfCallForAction: boolean;
  fatfIncreasedMonitoring: boolean;
  euHrtc: boolean;
  sanctionsFlags: boolean;
  cpiThreshold: boolean;
  cpiValue: number;
}

interface OutcomeConfig {
  eddRequired: boolean;
  seniorApproval: boolean;
  reviewCycleMonths: 3 | 6 | 12;
  doNotOnboard: boolean;
}

interface MonitoringConfig {
  fatfChanges: boolean;
  sanctionsChanges: boolean;
  allLinkedJurisdictions: boolean;
}

const DEFAULT_TRIGGERS: Record<Posture, TriggerConfig> = {
  conservative: { fatfCallForAction: true, fatfIncreasedMonitoring: true, euHrtc: true, sanctionsFlags: true, cpiThreshold: true, cpiValue: 40 },
  standard:     { fatfCallForAction: true, fatfIncreasedMonitoring: true, euHrtc: true, sanctionsFlags: true, cpiThreshold: false, cpiValue: 30 },
  growth:       { fatfCallForAction: true, fatfIncreasedMonitoring: false, euHrtc: true, sanctionsFlags: false, cpiThreshold: false, cpiValue: 25 },
};

const DEFAULT_OUTCOMES: Record<Posture, OutcomeConfig> = {
  conservative: { eddRequired: true, seniorApproval: true, reviewCycleMonths: 3, doNotOnboard: true },
  standard:     { eddRequired: true, seniorApproval: true, reviewCycleMonths: 6, doNotOnboard: false },
  growth:       { eddRequired: true, seniorApproval: false, reviewCycleMonths: 12, doNotOnboard: false },
};

const DEFAULT_MONITORING: MonitoringConfig = { fatfChanges: true, sanctionsChanges: true, allLinkedJurisdictions: true };

/* ── Component ───────────────────────────────────────────── */

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, hasRole } = useAuth();
  const orgId = profile?.org_id;

  const [step, setStep] = useState(0);
  const [posture, setPosture] = useState<Posture>("standard");
  const [triggers, setTriggers] = useState<TriggerConfig>(DEFAULT_TRIGGERS.standard);
  const [outcomes, setOutcomes] = useState<OutcomeConfig>(DEFAULT_OUTCOMES.standard);
  const [monitoring, setMonitoring] = useState<MonitoringConfig>(DEFAULT_MONITORING);

  // When posture changes, reset triggers/outcomes to preset
  function selectPosture(p: Posture) {
    setPosture(p);
    setTriggers(DEFAULT_TRIGGERS[p]);
    setOutcomes(DEFAULT_OUTCOMES[p]);
  }

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !user?.id) throw new Error("Not authenticated");

      // 1. Create ruleset
      const rulesetName = `${POSTURE_META[posture].label} Risk Posture`;
      const { data: ruleset, error: rsErr } = await (supabase
        .from("client_policy_ruleset") as any)
        .insert({ org_id: orgId, name: rulesetName, enabled: true })
        .select("id")
        .single();
      if (rsErr) throw rsErr;

      // 2. Build rules
      const rules: any[] = [];
      let priority = 1;

      if (triggers.fatfCallForAction) {
        const actions = ["EDD_REQUIRED"];
        if (outcomes.seniorApproval) actions.push("SENIOR_APPROVAL");
        if (outcomes.doNotOnboard) actions.push("BLOCK_ONBOARDING");
        actions.push(`REVIEW_CYCLE=${outcomes.reviewCycleMonths}M`);
        rules.push({
          ruleset_id: ruleset.id,
          priority: priority++,
          if_indicator_type: "FATF_STATUS",
          operator: "EQUALS",
          compare_value_json: { value: "CALL_FOR_ACTION" },
          then_outcome_json: { actions },
          notes: "Auto-generated by onboarding wizard",
        });
      }

      if (triggers.fatfIncreasedMonitoring) {
        const actions = outcomes.eddRequired ? ["EDD_REQUIRED"] : ["FLAG_FOR_REVIEW"];
        actions.push(`REVIEW_CYCLE=${outcomes.reviewCycleMonths}M`);
        rules.push({
          ruleset_id: ruleset.id,
          priority: priority++,
          if_indicator_type: "FATF_STATUS",
          operator: "EQUALS",
          compare_value_json: { value: "INCREASED_MONITORING" },
          then_outcome_json: { actions },
          notes: "Auto-generated by onboarding wizard",
        });
      }

      if (triggers.euHrtc) {
        const actions = outcomes.eddRequired ? ["EDD_REQUIRED"] : ["FLAG_FOR_REVIEW"];
        if (outcomes.seniorApproval) actions.push("SENIOR_APPROVAL");
        rules.push({
          ruleset_id: ruleset.id,
          priority: priority++,
          if_indicator_type: "EU_AML_HRTC",
          operator: "EXISTS",
          compare_value_json: {},
          then_outcome_json: { actions },
          notes: "Auto-generated by onboarding wizard",
        });
      }

      if (triggers.sanctionsFlags) {
        for (const ind of ["SANCTIONS_UK_PROGRAMME", "SANCTIONS_EU_PROGRAMME", "SANCTIONS_US_OFAC_PROGRAMME"]) {
          const actions = outcomes.eddRequired ? ["EDD_REQUIRED"] : ["FLAG_FOR_REVIEW"];
          if (outcomes.doNotOnboard) actions.push("BLOCK_ONBOARDING");
          rules.push({
            ruleset_id: ruleset.id,
            priority: priority++,
            if_indicator_type: ind,
            operator: "EXISTS",
            compare_value_json: {},
            then_outcome_json: { actions },
            notes: "Auto-generated by onboarding wizard",
          });
        }
      }

      if (triggers.cpiThreshold) {
        rules.push({
          ruleset_id: ruleset.id,
          priority: priority++,
          if_indicator_type: "CPI_SCORE",
          operator: "LTE",
          compare_value_json: { value: triggers.cpiValue },
          then_outcome_json: { actions: ["FLAG_FOR_REVIEW", "ENHANCED_MONITORING"] },
          notes: `CPI ≤ ${triggers.cpiValue} — auto-generated by onboarding wizard`,
        });
      }

      if (rules.length > 0) {
        const { error: rErr } = await (supabase.from("client_policy_rule") as any).insert(rules);
        if (rErr) throw rErr;
      }

      // 3. Create alert subscriptions
      const alertSubs: any[] = [];
      if (monitoring.fatfChanges) {
        alertSubs.push({
          org_id: orgId,
          user_id: user.id,
          alert_type: "FATF_CHANGE",
          enabled: true,
          all_linked_jurisdictions: monitoring.allLinkedJurisdictions,
        });
      }
      if (monitoring.sanctionsChanges) {
        for (const at of ["UK_SANCTIONS_CHANGE", "EU_SANCTIONS_CHANGE", "OFAC_SANCTIONS_CHANGE"]) {
          alertSubs.push({
            org_id: orgId,
            user_id: user.id,
            alert_type: at,
            enabled: true,
            all_linked_jurisdictions: monitoring.allLinkedJurisdictions,
          });
        }
      }
      // Also subscribe to EU HRTC and CPI for good measure
      alertSubs.push({
        org_id: orgId,
        user_id: user.id,
        alert_type: "EU_HRTC_CHANGE",
        enabled: true,
        all_linked_jurisdictions: monitoring.allLinkedJurisdictions,
      });
      alertSubs.push({
        org_id: orgId,
        user_id: user.id,
        alert_type: "CPI_CHANGE",
        enabled: monitoring.fatfChanges, // only if they want broad monitoring
        all_linked_jurisdictions: monitoring.allLinkedJurisdictions,
      });

      if (alertSubs.length > 0) {
        const { error: aErr } = await (supabase.from("alert_subscription") as any).insert(alertSubs);
        if (aErr) throw aErr;
      }
    },
    onSuccess: () => {
      setStep(5); // confirmation
    },
    onError: (e: any) => toast.error(e.message),
  });

  const STEP_LABELS = ["Risk Posture", "Triggers", "Outcomes", "Monitoring", "Review"];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Policy &amp; Monitoring Setup
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your organisation's risk policy and alerts in minutes.
        </p>
      </div>

      {/* Stepper */}
      {step < 5 && (
        <div className="flex items-center justify-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-[11px] hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Risk Posture */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Choose Your Risk Posture</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(POSTURE_META) as Posture[]).map((p) => (
              <div
                key={p}
                onClick={() => selectPosture(p)}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  posture === p ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={posture === p ? "text-primary" : "text-muted-foreground"}>
                    {POSTURE_META[p].icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{POSTURE_META[p].label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{POSTURE_META[p].desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Triggers */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Confirm Triggers</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TriggerToggle label="FATF Call for Action" desc="Highest-risk FATF classification" value={triggers.fatfCallForAction} onChange={(v) => setTriggers({ ...triggers, fatfCallForAction: v })} />
            <TriggerToggle label="FATF Increased Monitoring" desc="Grey-list jurisdictions" value={triggers.fatfIncreasedMonitoring} onChange={(v) => setTriggers({ ...triggers, fatfIncreasedMonitoring: v })} />
            <TriggerToggle label="EU High-Risk Third Country" desc="EU AML high-risk designation" value={triggers.euHrtc} onChange={(v) => setTriggers({ ...triggers, euHrtc: v })} />
            <TriggerToggle label="Sanctions Flags" desc="UK, EU, and US OFAC sanctions programmes" value={triggers.sanctionsFlags} onChange={(v) => setTriggers({ ...triggers, sanctionsFlags: v })} />
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={triggers.cpiThreshold} onCheckedChange={(v) => setTriggers({ ...triggers, cpiThreshold: v })} />
                <div>
                  <p className="text-sm font-medium text-foreground">CPI Score Threshold</p>
                  <p className="text-xs text-muted-foreground">Flag jurisdictions below a CPI score</p>
                </div>
              </div>
              {triggers.cpiThreshold && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Score ≤</Label>
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    value={triggers.cpiValue}
                    onChange={(e) => setTriggers({ ...triggers, cpiValue: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Outcomes */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Choose Outcomes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TriggerToggle label="EDD Required" desc="Trigger enhanced due diligence for flagged entities" value={outcomes.eddRequired} onChange={(v) => setOutcomes({ ...outcomes, eddRequired: v })} />
            <TriggerToggle label="Senior Approval" desc="Require senior sign-off for high-risk onboarding" value={outcomes.seniorApproval} onChange={(v) => setOutcomes({ ...outcomes, seniorApproval: v })} />
            <TriggerToggle label="Do Not Onboard (Severe)" desc="Block onboarding for the most severe signals (e.g. FATF Call for Action)" value={outcomes.doNotOnboard} onChange={(v) => setOutcomes({ ...outcomes, doNotOnboard: v })} />
            <Separator />
            <div>
              <Label className="text-sm font-medium">Review Cycle</Label>
              <p className="text-xs text-muted-foreground mb-2">How often should high-risk entities be re-reviewed?</p>
              <div className="flex gap-2">
                {([3, 6, 12] as const).map((m) => (
                  <Button
                    key={m}
                    variant={outcomes.reviewCycleMonths === m ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOutcomes({ ...outcomes, reviewCycleMonths: m })}
                  >
                    {m} months
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Monitoring */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Turn On Monitoring</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TriggerToggle label="FATF Changes" desc="Subscribe to FATF grey/black list updates" value={monitoring.fatfChanges} onChange={(v) => setMonitoring({ ...monitoring, fatfChanges: v })} />
            <TriggerToggle label="Sanctions Changes" desc="Subscribe to UK, EU, and US OFAC sanctions updates" value={monitoring.sanctionsChanges} onChange={(v) => setMonitoring({ ...monitoring, sanctionsChanges: v })} />
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Alert on any linked jurisdiction changes</p>
                  <p className="text-xs text-muted-foreground">Only receive alerts for jurisdictions linked to your entities</p>
                </div>
              </div>
              <Switch
                checked={monitoring.allLinkedJurisdictions}
                onCheckedChange={(v) => setMonitoring({ ...monitoring, allLinkedJurisdictions: v })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Activate */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Review &amp; Activate</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Posture */}
            <SummarySection title="Risk Posture">
              <Badge className="text-xs">{POSTURE_META[posture].label}</Badge>
            </SummarySection>

            {/* Triggers */}
            <SummarySection title="Triggers">
              <div className="flex flex-wrap gap-1.5">
                {triggers.fatfCallForAction && <Badge variant="outline" className="text-[10px]">FATF Call for Action</Badge>}
                {triggers.fatfIncreasedMonitoring && <Badge variant="outline" className="text-[10px]">FATF Increased Monitoring</Badge>}
                {triggers.euHrtc && <Badge variant="outline" className="text-[10px]">EU HRTC</Badge>}
                {triggers.sanctionsFlags && <Badge variant="outline" className="text-[10px]">Sanctions Flags</Badge>}
                {triggers.cpiThreshold && <Badge variant="outline" className="text-[10px]">CPI ≤ {triggers.cpiValue}</Badge>}
              </div>
            </SummarySection>

            {/* Outcomes */}
            <SummarySection title="Outcomes">
              <div className="flex flex-wrap gap-1.5">
                {outcomes.eddRequired && <Badge variant="secondary" className="text-[10px]">EDD Required</Badge>}
                {outcomes.seniorApproval && <Badge variant="secondary" className="text-[10px]">Senior Approval</Badge>}
                {outcomes.doNotOnboard && <Badge variant="destructive" className="text-[10px]">Block Onboarding</Badge>}
                <Badge variant="secondary" className="text-[10px]">Review: {outcomes.reviewCycleMonths}M</Badge>
              </div>
            </SummarySection>

            {/* Monitoring */}
            <SummarySection title="Monitoring">
              <div className="flex flex-wrap gap-1.5">
                {monitoring.fatfChanges && <Badge variant="outline" className="text-[10px]">FATF Changes</Badge>}
                {monitoring.sanctionsChanges && <Badge variant="outline" className="text-[10px]">Sanctions Changes</Badge>}
                {monitoring.allLinkedJurisdictions && <Badge variant="outline" className="text-[10px]">Linked Jurisdictions Only</Badge>}
              </div>
            </SummarySection>

            <Separator />
            <p className="text-xs text-muted-foreground text-center">
              This will create a policy ruleset with {countRules(triggers)} rules and {countAlertSubs(monitoring)} alert subscriptions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirmation */}
      {step === 5 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-12 text-center space-y-4">
            <PartyPopper className="h-10 w-10 text-primary mx-auto" />
            <h2 className="font-display text-xl font-bold text-foreground">You're all set!</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your <strong>{POSTURE_META[posture].label}</strong> policy ruleset is now active and monitoring
              subscriptions are enabled. You can fine-tune rules anytime from Policy Mapping.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate("/entities")}>
                Add Entities to Monitor
              </Button>
              <Button onClick={() => navigate("/client/policy")}>
                View Policy Mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {step < 5 && (
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="gap-1"
            >
              {activateMutation.isPending ? "Activating…" : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Activate
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helper components ─────────────────────────────────── */

function TriggerToggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function countRules(t: TriggerConfig): number {
  let n = 0;
  if (t.fatfCallForAction) n++;
  if (t.fatfIncreasedMonitoring) n++;
  if (t.euHrtc) n++;
  if (t.sanctionsFlags) n += 3; // UK, EU, US
  if (t.cpiThreshold) n++;
  return n;
}

function countAlertSubs(m: MonitoringConfig): number {
  let n = 2; // EU HRTC + CPI always
  if (m.fatfChanges) n++;
  if (m.sanctionsChanges) n += 3;
  return n;
}
