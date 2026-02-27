import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ClipboardCheck,
} from "lucide-react";

/* ────── types ────── */
type CheckSeverity = "pass" | "warning" | "blocker";

export interface PreQaCheckResult {
  id: string;
  label: string;
  severity: CheckSeverity;
  detail: string;
}

export interface PreQaReviewResult {
  ranAt: string;
  checks: PreQaCheckResult[];
  hasBlockers: boolean;
  warningCount: number;
  passCount: number;
}

interface StructuredData {
  entity_core_data?: Record<string, any>;
  risk_model_output?: Record<string, any>;
  jurisdiction_reference?: Record<string, any>;
  [key: string]: any;
}

interface OfficerCommentary {
  contextual_analysis?: string;
  explanation_of_material_findings?: string;
  mitigating_factors?: string;
  recommended_follow_up_actions?: string;
  client_safe_notes?: string;
}

interface Props {
  caseId: string;
  caseData: any;
  structuredData: StructuredData;
  structuredDataLocked: boolean;
  officerCommentary: OfficerCommentary;
  officerCommentaryComplete: boolean;
  aiDraftReviewed: boolean;
  aiDraftDismissed: boolean;
  onReviewComplete: (result: PreQaReviewResult) => void;
}

const SEVERITY_CONFIG: Record<CheckSeverity, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pass: { label: "Pass", color: "bg-success/10 text-success", icon: CheckCircle2 },
  warning: { label: "Warning", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  blocker: { label: "Blocker", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

/* ── required retrieval log categories per report tier ── */
const TIER_REQUIRED_CATEGORIES: Record<string, string[]> = {
  standard: ["sanctions", "pep", "adverse_media"],
  enhanced: ["sanctions", "pep", "adverse_media", "corporate_registry", "litigation"],
  dossier: ["sanctions", "pep", "adverse_media", "corporate_registry", "litigation", "financial_analysis", "source_intelligence"],
};

function hasFieldContent(val: any): boolean {
  if (!val) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "object") return Object.values(val).some((v) => !!v && v !== "—" && v !== "Pending" && v !== "To be completed");
  return false;
}

export default function PreQaReviewPanel({
  caseId, caseData,
  structuredData, structuredDataLocked,
  officerCommentary, officerCommentaryComplete,
  aiDraftReviewed, aiDraftDismissed,
  onReviewComplete,
}: Props) {
  const { user, profile } = useAuth();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PreQaReviewResult | null>(null);

  const runReview = async () => {
    setRunning(true);
    const checks: PreQaCheckResult[] = [];

    /* 1. Retrieval Logs completeness */
    const reportTier = (caseData?.report_tier ?? "standard").toLowerCase();
    const requiredCategories = TIER_REQUIRED_CATEGORIES[reportTier] ?? TIER_REQUIRED_CATEGORIES.standard;

    const { data: logs } = await supabase
      .from("retrieval_logs")
      .select("id, research_sources(category)")
      .eq("case_id", caseId);

    const foundCategories = new Set(
      (logs ?? []).map((l: any) => l.research_sources?.category?.toLowerCase()).filter(Boolean)
    );

    const missingCategories = requiredCategories.filter((c) => !foundCategories.has(c));
    if (missingCategories.length === 0) {
      checks.push({ id: "retrieval_complete", label: "Retrieval Logs", severity: "pass", detail: `All ${requiredCategories.length} required source categories present for ${reportTier} tier.` });
    } else {
      checks.push({ id: "retrieval_missing", label: "Retrieval Logs", severity: "blocker", detail: `Missing source categories: ${missingCategories.join(", ")}. Required for ${reportTier} tier.` });
    }

    /* 2. Structured data locked */
    if (structuredDataLocked) {
      checks.push({ id: "data_locked", label: "Structured Data", severity: "pass", detail: "Structured data locked and verified." });
    } else {
      checks.push({ id: "data_unlocked", label: "Structured Data", severity: "blocker", detail: "Structured data must be locked before QA submission." });
    }

    /* 3. Officer commentary complete */
    const requiredCommentaryKeys: (keyof OfficerCommentary)[] = [
      "contextual_analysis", "explanation_of_material_findings",
      "mitigating_factors", "recommended_follow_up_actions",
    ];
    const missingCommentary = requiredCommentaryKeys.filter((k) => !officerCommentary?.[k]?.trim());

    if (officerCommentaryComplete && missingCommentary.length === 0) {
      checks.push({ id: "commentary_complete", label: "Officer Commentary", severity: "pass", detail: "All required commentary fields completed." });
    } else if (missingCommentary.length > 0) {
      checks.push({ id: "commentary_missing", label: "Officer Commentary", severity: "blocker", detail: `Missing fields: ${missingCommentary.map((k) => k.replace(/_/g, " ")).join(", ")}.` });
    } else {
      checks.push({ id: "commentary_not_marked", label: "Officer Commentary", severity: "warning", detail: "Commentary fields present but not marked complete." });
    }

    /* 4. Risk model output exists + reason codes */
    const riskOutput = structuredData?.risk_model_output;
    if (hasFieldContent(riskOutput) && riskOutput?.band && riskOutput.band !== "Pending") {
      const reasonCodes = riskOutput.reason_codes;
      if (Array.isArray(reasonCodes) && reasonCodes.length > 0) {
        checks.push({ id: "risk_output", label: "Risk Model Output", severity: "pass", detail: `Risk band: ${riskOutput.band}, ${reasonCodes.length} reason code(s).` });
      } else {
        checks.push({ id: "risk_no_reasons", label: "Risk Model Output", severity: "warning", detail: `Risk band ${riskOutput.band} present but no reason codes attached.` });
      }
    } else {
      checks.push({ id: "risk_missing", label: "Risk Model Output", severity: "blocker", detail: "Risk model output is missing or still pending." });
    }

    /* 5. Jurisdiction reference (warning-level if entity has a country) */
    const jurisdictionRef = structuredData?.jurisdiction_reference;
    const entityCountry = caseData?.entities?.country ?? structuredData?.entity_core_data?.country;
    if (hasFieldContent(jurisdictionRef) && jurisdictionRef?.country && jurisdictionRef.country !== "—") {
      checks.push({ id: "jurisdiction_ok", label: "Jurisdiction Reference", severity: "pass", detail: `Jurisdiction reference attached: ${jurisdictionRef.country}.` });
    } else if (entityCountry && entityCountry !== "—") {
      checks.push({ id: "jurisdiction_missing", label: "Jurisdiction Reference", severity: "warning", detail: `Entity country (${entityCountry}) present but no jurisdiction benchmark linked.` });
    } else {
      checks.push({ id: "jurisdiction_na", label: "Jurisdiction Reference", severity: "pass", detail: "No jurisdiction reference required (no country specified)." });
    }

    /* 6. AI sections reviewed or dismissed */
    if (aiDraftReviewed || aiDraftDismissed) {
      checks.push({ id: "ai_reviewed", label: "AI Draft Sections", severity: "pass", detail: aiDraftReviewed ? "AI sections reviewed and accepted." : "AI sections explicitly dismissed." });
    } else {
      checks.push({ id: "ai_pending", label: "AI Draft Sections", severity: "warning", detail: "AI draft sections have not been reviewed or dismissed." });
    }

    const hasBlockers = checks.some((c) => c.severity === "blocker");
    const warningCount = checks.filter((c) => c.severity === "warning").length;
    const passCount = checks.filter((c) => c.severity === "pass").length;

    const reviewResult: PreQaReviewResult = {
      ranAt: new Date().toISOString(),
      checks,
      hasBlockers,
      warningCount,
      passCount,
    };

    setResult(reviewResult);
    onReviewComplete(reviewResult);

    // Log to audit
    if (user && profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: "PRE_QA_REVIEW_RUN",
        object_type: "case",
        object_id: caseId,
        metadata: {
          has_blockers: hasBlockers,
          warning_count: warningCount,
          pass_count: passCount,
          blocker_ids: checks.filter((c) => c.severity === "blocker").map((c) => c.id),
        },
      });
    }

    setRunning(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardCheck size={14} className="text-primary" /> Pre-QA Completeness Check
        </h4>
        <Button
          size="sm"
          variant={result ? "outline" : "default"}
          className="text-xs gap-1.5"
          onClick={runReview}
          disabled={running}
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
          {running ? "Checking…" : result ? "Re-run Check" : "Run Pre-QA Check"}
        </Button>
      </div>

      {result && (
        <>
          {/* Summary banner */}
          <div className={`flex items-center gap-2 p-2.5 rounded-md border ${
            result.hasBlockers
              ? "border-destructive/30 bg-destructive/5"
              : result.warningCount > 0
              ? "border-warning/30 bg-warning/5"
              : "border-success/30 bg-success/5"
          }`}>
            {result.hasBlockers ? (
              <XCircle size={14} className="text-destructive shrink-0" />
            ) : result.warningCount > 0 ? (
              <AlertTriangle size={14} className="text-warning shrink-0" />
            ) : (
              <CheckCircle2 size={14} className="text-success shrink-0" />
            )}
            <span className="text-xs text-foreground font-medium flex-1">
              {result.hasBlockers
                ? "Blockers found — resolve before submitting to QA."
                : result.warningCount > 0
                ? `Passed with ${result.warningCount} warning${result.warningCount !== 1 ? "s" : ""} — submission allowed.`
                : "All checks passed — ready for QA submission."}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-success/10 text-success text-[9px]">{result.passCount} pass</Badge>
              {result.warningCount > 0 && <Badge className="bg-warning/10 text-warning text-[9px]">{result.warningCount} warn</Badge>}
              {result.hasBlockers && (
                <Badge className="bg-destructive/10 text-destructive text-[9px]">
                  {result.checks.filter((c) => c.severity === "blocker").length} block
                </Badge>
              )}
            </div>
          </div>

          {/* Individual check results */}
          <div className="space-y-1">
            {result.checks.map((check) => {
              const cfg = SEVERITY_CONFIG[check.severity];
              const Icon = cfg.icon;
              return (
                <div key={check.id} className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors">
                  <Icon size={12} className={`shrink-0 mt-0.5 ${
                    check.severity === "pass" ? "text-success" :
                    check.severity === "warning" ? "text-warning" : "text-destructive"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{check.label}</span>
                      <Badge className={`text-[9px] py-0 ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Checked at {new Date(result.ranAt).toLocaleString()}
          </p>
        </>
      )}

      {!result && !running && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Run the completeness check before submitting to QA.
        </p>
      )}
    </div>
  );
}
