import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Check, AlertTriangle, Sparkles, Briefcase, Zap, Settings2, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requiresApproval } from "@/lib/approval-utils";
import EnhancementSuggestionPanel from "@/components/EnhancementSuggestionPanel";
import { useEntitlements } from "@/hooks/use-entitlements";
import DpDeclarationStep, {
  DP_DECLARATION_INITIAL, computeDpDeclarationRisk, type DpDeclarationState,
} from "@/components/commission/DpDeclarationStep";

const STEPS = ["Select Entity", "Product", "Priority", "Enhancements", "DP Declaration", "Scope Notes", "Estimate", "Review & Submit"];

const PRICING: Record<string, Record<string, number>> = {
  "Assurance Note": { standard: 1500, rush: 2250 },
  "Assurance Dossier": { standard: 4500, rush: 6750 },
  "Refresh Note": { standard: 950, rush: 1425 },
};

const MODULE_PRICING: Record<string, number> = {
  COMMERCIAL_POSTURE: 750,
  JURISDICTION_BENCHMARK: 600,
};

export default function CommissionPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAccessReportTier, canUseAddon, canUsePartnerEscalation, canExportAiBrief } = useEntitlements();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [quickCommissioning, setQuickCommissioning] = useState(false);
  const [entities, setEntities] = useState<any[]>([]);
  const [moduleTypes, setModuleTypes] = useState<any[]>([]);
  const [form, setForm] = useState({
    entity_id: searchParams.get("entity") || "",
    product_type: "Assurance Note",
    priority: "standard",
    scope_notes: "",
    selectedModules: [] as string[],
  });
  const [dpForm, setDpForm] = useState<DpDeclarationState>(DP_DECLARATION_INITIAL);

  useEffect(() => {
    if (profile?.org_id) {
      supabase.from("entities").select("id, name, risk_tier, country, data_access_level").eq("org_id", profile.org_id).order("name")
        .then(({ data }) => setEntities(data ?? []));
    }
    supabase.from("module_types").select("*").then(({ data }) => setModuleTypes(data ?? []));
  }, [profile?.org_id]);

  const baseEstimate = PRICING[form.product_type]?.[form.priority] ?? 0;
  const moduleEstimate = form.selectedModules.reduce((sum, code) => sum + (MODULE_PRICING[code] ?? 0), 0);
  const estimate = baseEstimate + moduleEstimate;

  const [approvalInfo, setApprovalInfo] = useState<{ required: boolean; reasons: string[] } | null>(null);
  const dpRisk = computeDpDeclarationRisk(dpForm);

  useEffect(() => {
    if (!profile?.org_id || !form.entity_id) return;
    const selectedEntity = entities.find((e: any) => e.id === form.entity_id);
    if (!selectedEntity) return;

    requiresApproval({
      orgId: profile.org_id,
      entityRiskTier: selectedEntity.risk_tier,
      productType: form.product_type,
      priority: form.priority,
      priceEstimate: estimate,
      hasEnhancements: form.selectedModules.length > 0,
      dpRiskLevel: dpRisk.requiresApproval ? "high" : "low",
    }).then(setApprovalInfo);
  }, [profile?.org_id, form.entity_id, form.product_type, form.priority, estimate, entities, form.selectedModules, dpRisk.requiresApproval]);

  const toggleModule = (code: string) => {
    setForm((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(code)
        ? prev.selectedModules.filter((c) => c !== code)
        : [...prev.selectedModules, code],
    }));
  };

  const handleSubmit = async () => {
    if (!profile?.org_id || !user) return;

    const selectedEntity = entities.find((e: any) => e.id === form.entity_id);
    const dpApprovalRequired = dpRisk.requiresApproval;

    // Commission creates a Scheduled case — CR will then generate a Quote
    const { data: insertedCase, error } = await supabase.from("cases").insert({
      org_id: profile.org_id,
      entity_id: form.entity_id,
      requested_by: user.id,
      product_type: form.product_type,
      priority: form.priority,
      scope_notes: form.scope_notes,
      status: "scheduled",
      price_estimate: estimate,
      sla_days: form.priority === "rush" ? 5 : 10,
      requires_personal_data: true,
      processing_purpose: dpForm.purpose || null,
      data_categories: dpForm.data_categories,
      minimisation_confirmed: dpForm.minimisation_confirmed,
      retention_months: dpForm.retention_months,
      dp_risk_level: dpApprovalRequired ? "high" : "low",
      dp_review_required: dpApprovalRequired,
    } as any).select("id").single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Create case_dp_declaration
    if (insertedCase?.id) {
      await supabase.from("case_dp_declarations" as any).insert({
        case_id: insertedCase.id,
        org_id: profile.org_id,
        master_lia_id: dpForm.use_master_lia && dpForm.master_lia_id ? dpForm.master_lia_id : null,
        purpose: dpForm.purpose,
        data_categories: dpForm.data_categories,
        sensitive_criminal_offence: dpForm.sensitive_criminal_offence,
        sensitive_special_category: dpForm.sensitive_special_category,
        minimisation_confirmed: dpForm.minimisation_confirmed,
        retention_months: dpForm.retention_months,
        requires_approval: dpApprovalRequired,
        approval_reasons: dpRisk.reasons,
      } as any);
    }

    // Create case_modules for selected enhancements
    if (insertedCase?.id && form.selectedModules.length > 0) {
      const moduleInserts = form.selectedModules.map((code) => {
        const mt = moduleTypes.find((m) => m.code === code);
        return {
          case_id: insertedCase.id,
          module_type_id: mt?.id,
          status: "submitted",
          requested_by: user.id,
          price_estimate: MODULE_PRICING[code] ?? 0,
        };
      }).filter((m) => m.module_type_id);

      if (moduleInserts.length > 0) {
        await supabase.from("case_modules").insert(moduleInserts);

        for (const mod of moduleInserts) {
          const mt = moduleTypes.find((m) => m.id === mod.module_type_id);
          await supabase.from("audit_events").insert({
            user_id: user.id,
            org_id: profile.org_id,
            action_type: "MODULE_ADDED",
            object_type: "case",
            object_id: insertedCase.id,
            metadata: {
              module_code: mt?.code,
              module_name: mt?.name,
              price_estimate: mod.price_estimate,
              entity_name: selectedEntity?.name,
            },
          });
        }
      }
    }

    // Create DP review record if required
    if (dpApprovalRequired && insertedCase?.id) {
      await supabase.from("data_protection_reviews").insert({
        case_id: insertedCase.id,
        status: "pending",
      });

      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: "DP_REVIEW_REQUESTED",
        object_type: "case",
        object_id: insertedCase.id,
        metadata: {
          dp_reasons: dpRisk.reasons,
          data_categories: dpForm.data_categories,
        },
      });
    }

    // Write audit event for scheduling
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "CASE_SCHEDULED",
      object_type: "case",
      object_id: insertedCase?.id,
      metadata: {
        product_type: form.product_type,
        priority: form.priority,
        entity_name: selectedEntity?.name,
        price_estimate: estimate,
        enhancements: form.selectedModules,
        approval_required: approvalInfo?.required ?? false,
        approval_reasons: approvalInfo?.reasons ?? [],
        dp_approval_required: dpApprovalRequired,
        master_lia_used: dpForm.use_master_lia && !!dpForm.master_lia_id,
      },
    });

    toast({
      title: "✓ Case scheduled",
      description: `${form.product_type} for ${selectedEntity?.name ?? "entity"} has been scheduled. Clifton Ruskin will generate a formal quote.`,
    });

    if (insertedCase?.id) {
      navigate(`/cases/${insertedCase.id}`);
    } else {
      navigate("/dashboard");
    }
  };

  const getDefaultProduct = (riskTier: string) => {
    if (riskTier === "a") return "Assurance Dossier";
    return "Assurance Note";
  };

  const getDefaultProductLabel = (riskTier: string) => {
    if (riskTier === "a") return "Assurance Dossier (Enhanced)";
    if (riskTier === "b") return "Assurance Note (Standard)";
    return "Assurance Note (Basic)";
  };

  const handleQuickCommission = async () => {
    if (!profile?.org_id || !user || !form.entity_id) return;
    setQuickCommissioning(true);

    const selectedEntity = entities.find((e: any) => e.id === form.entity_id);
    if (!selectedEntity) { setQuickCommissioning(false); return; }

    const product = getDefaultProduct(selectedEntity.risk_tier);
    const price = PRICING[product]?.standard ?? 1500;

    const { data: insertedCase, error } = await supabase.from("cases").insert({
      org_id: profile.org_id,
      entity_id: form.entity_id,
      requested_by: user.id,
      product_type: product,
      priority: "standard",
      scope_notes: "Quick commission — standard policy defaults applied.",
      status: "scheduled",
      price_estimate: price,
      sla_days: 10,
      requires_personal_data: true,
      processing_purpose: "Due diligence screening under organisational policy",
      minimisation_confirmed: true,
      dp_risk_level: "low",
      dp_review_required: false,
    } as any).select("id").single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setQuickCommissioning(false);
      return;
    }

    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "CASE_SCHEDULED",
      object_type: "case",
      object_id: insertedCase?.id,
      metadata: {
        product_type: product,
        priority: "standard",
        entity_name: selectedEntity.name,
        price_estimate: price,
        quick_commission: true,
      },
    });

    toast({
      title: "✓ Case commissioned successfully",
      description: "Your CR team will be in touch within 24 hours.",
    });

    if (insertedCase?.id) {
      navigate(`/cases/${insertedCase.id}`);
    } else {
      navigate("/dashboard");
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.entity_id;
    if (step === 1) return !!form.product_type;
    if (step === 4) return !!(dpForm.purpose && dpForm.minimisation_confirmed);
    return true;
  };

  const getModuleDescription = (code: string) => {
    if (code === "COMMERCIAL_POSTURE") return "Evidence-led view of market behaviour: payment reality, dispute posture, supplier/customer themes.";
    if (code === "JURISDICTION_BENCHMARK") return "One–two page 'state of the environment' for this jurisdiction/sector, plus practical controls guidance.";
    return "";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="fvc-heading-1 text-foreground mb-1">Commission a Check</h1>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground mb-10">
            Request a new due diligence engagement
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/service-request")}
          className="shrink-0 gap-1.5 text-xs"
        >
          <Briefcase size={14} />
          Request additional services
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all duration-300 ${
                i < step
                  ? "bg-accent text-accent-foreground scale-100"
                  : i === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check size={13} strokeWidth={2.5} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={12} className={`transition-colors duration-300 ${i < step ? "text-accent/60" : "text-muted-foreground/30"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="fvc-card-elevated animate-scale-in" key={step}>
        <h2 className="fvc-heading-3 text-foreground mb-5">{STEPS[step]}</h2>

        {step === 0 && (
          <div className="space-y-3 animate-fade-in">
            <Label>Select entity</Label>
            <Select value={form.entity_id} onValueChange={(v) => setForm({ ...form, entity_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose an entity…" /></SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 animate-fade-in">
            {(["Assurance Note", "Assurance Dossier", "Refresh Note"] as const).map((p) => {
              // Dossier requires "enhanced" report tier entitlement
              const tierNeeded = p === "Assurance Dossier" ? "enhanced" : "standard";
              const allowed = canAccessReportTier(tierNeeded);
              return (
                <label
                  key={p}
                  className={`block rounded-lg border p-5 transition-all duration-300 ${
                    !allowed
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/20"
                      : form.product_type === p
                      ? "border-accent/50 bg-accent/5 cursor-pointer"
                      : "border-border hover:border-border hover:bg-muted/30 cursor-pointer"
                  }`}
                  style={form.product_type === p && allowed ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
                >
                  <input
                    type="radio"
                    name="product"
                    className="sr-only"
                    checked={form.product_type === p}
                    onChange={() => allowed && setForm({ ...form, product_type: p })}
                    disabled={!allowed}
                  />
                  <div className="font-medium text-foreground text-sm flex items-center gap-2">
                    {p}
                    {!allowed && <Badge variant="outline" className="text-[10px]">Upgrade Required</Badge>}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                    {p === "Assurance Note" && "Concise due diligence summary with key risk indicators."}
                    {p === "Assurance Dossier" && "Comprehensive investigation report with evidence pack."}
                    {p === "Refresh Note" && "Update an existing assessment with new findings."}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            {(["standard", "rush"] as const).map((p) => (
              <label
                key={p}
                className={`block rounded-lg border p-5 cursor-pointer transition-all duration-300 ${
                  form.priority === p
                    ? "border-accent/50 bg-accent/5"
                    : "border-border hover:border-border hover:bg-muted/30"
                }`}
                style={form.priority === p ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
              >
                <input
                  type="radio"
                  name="priority"
                  className="sr-only"
                  checked={form.priority === p}
                  onChange={() => setForm({ ...form, priority: p })}
                />
                <div className="font-medium text-foreground text-sm capitalize">{p}</div>
                <div className="text-[12px] text-muted-foreground mt-1.5">
                  {p === "standard" ? "10 business days SLA" : "5 business days SLA (+50% surcharge)"}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Enhancements step */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-accent" />
              <p className="text-sm text-muted-foreground">Optional EDD+ modules that produce additional deliverables.</p>
            </div>

            {(() => {
              const selectedEntity = entities.find((e: any) => e.id === form.entity_id);
              return selectedEntity ? (
                <EnhancementSuggestionPanel
                  entityCountry={selectedEntity.country}
                  riskTier={selectedEntity.risk_tier}
                  dataAccessLevel={selectedEntity.data_access_level}
                  selectedModules={form.selectedModules}
                  onAddModule={(code) => toggleModule(code)}
                />
              ) : null;
            })()}

            {moduleTypes.map((mt) => {
              const isSelected = form.selectedModules.includes(mt.code);
              const addonKey = mt.code === "COMMERCIAL_POSTURE" ? "commercial_posture" : mt.code === "JURISDICTION_BENCHMARK" ? "jurisdiction_benchmark" : mt.code.toLowerCase();
              const allowed = canUseAddon(addonKey);
              return (
                <label
                  key={mt.id}
                  className={`block rounded-lg border p-5 transition-all duration-300 ${
                    !allowed
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/20"
                      : isSelected
                      ? "border-accent/50 bg-accent/5 cursor-pointer"
                      : "border-border hover:border-border hover:bg-muted/30 cursor-pointer"
                  }`}
                  style={isSelected && allowed ? { boxShadow: "var(--shadow-gold-glow)" } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => allowed && toggleModule(mt.code)}
                      disabled={!allowed}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground text-sm">
                          {mt.name} <span className="text-accent text-xs font-normal">(EDD+)</span>
                          {!allowed && <Badge variant="outline" className="ml-2 text-[10px]">Upgrade Required</Badge>}
                        </div>
                        <span className="text-xs text-accent font-display font-semibold">+£{(MODULE_PRICING[mt.code] ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                        {getModuleDescription(mt.code)}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
            <p className="text-[10px] text-muted-foreground">You can skip this step if no enhancements are needed.</p>
          </div>
        )}

        {/* DP Declaration step */}
        {step === 4 && (
          <DpDeclarationStep form={dpForm} onChange={setDpForm} orgId={profile?.org_id ?? null} />
        )}

        {step === 5 && (
          <div className="space-y-3 animate-fade-in">
            <Label>Scope notes &amp; special instructions</Label>
            <Textarea
              rows={5}
              value={form.scope_notes}
              onChange={(e) => setForm({ ...form, scope_notes: e.target.value })}
              placeholder="Describe the scope, any specific concerns, or supporting context…"
              className="resize-none"
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Product</span>
              <span className="text-foreground font-medium">{form.product_type}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Priority</span>
              <span className="capitalize text-foreground font-medium">{form.priority}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Base fee</span>
              <span className="text-foreground font-medium">£{baseEstimate.toLocaleString()}</span>
            </div>
            {form.selectedModules.map((code) => {
              const mt = moduleTypes.find((m) => m.code === code);
              return (
                <div key={code} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sparkles size={11} className="text-accent" /> {mt?.name ?? code}
                  </span>
                  <span className="text-accent font-medium">+£{(MODULE_PRICING[code] ?? 0).toLocaleString()}</span>
                </div>
              );
            })}
            <div className="fvc-divider" />
            <div className="flex justify-between items-baseline py-1">
              <span className="text-sm font-medium text-foreground">Total estimated fee</span>
              <span className="text-accent font-display text-2xl font-semibold tracking-tight">
                £{estimate.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Final fee may vary based on complexity. This is an indicative estimate.
            </p>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 text-sm animate-fade-in">
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Entity</span><span className="text-foreground font-medium">{entities.find((e) => e.id === form.entity_id)?.name}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Product</span><span className="text-foreground font-medium">{form.product_type}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Priority</span><span className="capitalize text-foreground font-medium">{form.priority}</span></div>
            {form.selectedModules.length > 0 && (
              <div className="py-1">
                <span className="text-muted-foreground block mb-1">Enhancements</span>
                {form.selectedModules.map((code) => {
                  const mt = moduleTypes.find((m) => m.code === code);
                  return (
                    <div key={code} className="flex items-center gap-2 text-foreground ml-2 mb-0.5">
                      <Sparkles size={11} className="text-accent" />
                      <span className="font-medium">{mt?.name ?? code}</span>
                      <span className="text-accent text-xs">+£{(MODULE_PRICING[code] ?? 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DP Declaration summary */}
            <div className="border-t border-border pt-3 mt-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-2">DP Declaration</span>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Master LIA</span><span className="text-foreground font-medium">{dpForm.use_master_lia && dpForm.master_lia_id ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Purpose</span><span className="text-foreground font-medium">{dpForm.purpose || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data categories</span><span className="text-foreground font-medium">{dpForm.data_categories.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sensitive data</span>
                  <span className={`font-medium ${(dpForm.sensitive_criminal_offence || dpForm.sensitive_special_category) ? "text-destructive" : "text-foreground"}`}>
                    {dpForm.sensitive_criminal_offence || dpForm.sensitive_special_category ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Minimisation</span><span className="text-foreground font-medium">{dpForm.minimisation_confirmed ? "Confirmed" : "Not confirmed"}</span></div>
                {dpForm.retention_months !== null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Retention</span><span className="text-foreground font-medium">{dpForm.retention_months === 0 ? "Per policy" : `${dpForm.retention_months} months`}</span></div>
                )}
              </div>
            </div>

            <div className="flex justify-between py-1"><span className="text-muted-foreground">Total estimated fee</span><span className="text-accent font-semibold font-display text-lg">£{estimate.toLocaleString()}</span></div>
            {form.scope_notes && (
              <div className="pt-2">
                <span className="text-muted-foreground block mb-1.5 text-[11px] uppercase tracking-wider font-medium">Scope notes</span>
                <p className="text-foreground leading-relaxed">{form.scope_notes}</p>
              </div>
            )}

            {/* Approval gate notice */}
            {(approvalInfo?.required || dpRisk.requiresApproval) && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 mt-4">
                <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground mb-1">Approval required</div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {[...(approvalInfo?.reasons ?? []), ...(dpRisk.requiresApproval ? dpRisk.reasons : [])].map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    This commission will be sent to your organisation's admin for review before processing begins.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="px-6">Back</Button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="px-6">Continue</Button>
          ) : (
            <Button onClick={handleSubmit} className="px-8">Submit Commission</Button>
          )}
        </div>
      </div>
    </div>
  );
}
