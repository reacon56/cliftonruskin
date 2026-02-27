import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, AlertTriangle, XCircle, Shield,
  ChevronDown, ChevronUp, Send, ShieldOff,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { requestDeviationOverride } from "./TierDeviationPanel";

const SOURCE_LABELS: Record<string, string> = {
  sanctions: "Sanctions Check",
  corporate_registry: "Corporate Registry",
  adverse_media: "Adverse Media",
  jurisdiction_reference: "Jurisdiction Reference",
  litigation: "Litigation Search",
  offshore_leaks: "Offshore Leaks",
};

const COMMENTARY_LABELS: Record<string, string> = {
  contextual_analysis: "Contextual Analysis",
  explanation_of_material_findings: "Material Findings",
  mitigating_factors: "Mitigating Factors",
  recommended_follow_up_actions: "Follow-up Actions",
  client_safe_notes: "Client-safe Notes",
};

interface Requirement {
  label: string;
  ruleKey: string;
  status: "complete" | "missing" | "warning" | "waived";
  detail?: string;
}

interface Props {
  caseId: string;
  reportTier: string;
  retrievalLogs: any[];
  officerCommentary: Record<string, string> | null;
  riskModelExecuted: boolean;
  preQaPassed: boolean;
  aiReviewCompleted: boolean;
  structuredDataLocked: boolean;
  deviationOverrides?: any[];
  onDeviationRequested?: () => void;
}

export default function TierRequirementsPanel({
  caseId,
  reportTier,
  retrievalLogs,
  officerCommentary,
  riskModelExecuted,
  preQaPassed,
  aiReviewCompleted,
  structuredDataLocked,
  deviationOverrides = [],
  onDeviationRequested,
}: Props) {
  const { user, profile, canQuote: isManager } = useAuth();
  const isOfficer = !isManager;
  const { toast } = useToast();
  const [matrixRule, setMatrixRule] = useState<any>(null);
  const [matrixVersion, setMatrixVersion] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);
  const [logged, setLogged] = useState(false);
  const [requestingFor, setRequestingFor] = useState<Requirement | null>(null);
  const [deviationReason, setDeviationReason] = useState("");
  const [deviationNotes, setDeviationNotes] = useState("");
  const [submittingDeviation, setSubmittingDeviation] = useState(false);

  useEffect(() => { loadMatrix(); }, [reportTier]);

  const loadMatrix = async () => {
    // Get active version
    const { data: vData } = await supabase
      .from("tier_matrix_versions" as any)
      .select("*")
      .eq("status", "active")
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (!vData) return;
    setMatrixVersion(vData);

    const { data: rData } = await supabase
      .from("tier_requirements_matrix" as any)
      .select("*")
      .eq("matrix_version_id", (vData as any).id)
      .eq("report_tier", reportTier)
      .single();

    setMatrixRule(rData);
  };

  // ── Evaluate requirements ──
  const { requirements, completeCount, missingCount, totalCount, allComplete } = (() => {
    if (!matrixRule) return { requirements: [] as Requirement[], completeCount: 0, missingCount: 0, totalCount: 0, allComplete: false };
    const reqs: Requirement[] = [];

    const requiredSources: string[] = matrixRule.required_source_categories ?? [];
    const minLogsCfg: Record<string, number> = matrixRule.min_retrieval_logs ?? {};

    requiredSources.forEach((cat: string) => {
      const logCount = retrievalLogs.filter((l: any) => l.category === cat).length;
      const required = minLogsCfg[cat] ?? 1;
      reqs.push({
        label: SOURCE_LABELS[cat] || cat,
        status: logCount >= required ? "complete" : "missing",
        detail: `${logCount}/${required} logs`,
      });
    });

    const requiredCommentary: string[] = matrixRule.required_commentary_sections ?? [];
    requiredCommentary.forEach((key: string) => {
      const filled = !!(officerCommentary && (officerCommentary as any)[key]?.trim());
      reqs.push({
        label: COMMENTARY_LABELS[key] || key,
        status: filled ? "complete" : "missing",
        detail: filled ? "Populated" : "Required",
      });
    });

    reqs.push({ label: "Structured Data Locked", status: structuredDataLocked ? "complete" : "missing" });
    reqs.push({ label: "Risk Model Executed", status: riskModelExecuted ? "complete" : "missing" });
    reqs.push({ label: "Pre-QA Review Passed", status: preQaPassed ? "complete" : "missing" });

    if (matrixRule.ai_review_required) {
      reqs.push({ label: "AI Review Completed", status: aiReviewCompleted ? "complete" : "missing" });
    }

    const qaItems: string[] = matrixRule.qa_checklist_items ?? [];
    qaItems.forEach((item: string) => {
      let status: "complete" | "missing" | "warning" = "warning";
      if (item.toLowerCase().includes("structured data") && structuredDataLocked) status = "complete";
      else if (item.toLowerCase().includes("commentary") && officerCommentary) status = "complete";
      else if (item.toLowerCase().includes("risk model") && riskModelExecuted) status = "complete";
      else if (item.toLowerCase().includes("pre-qa") && preQaPassed) status = "complete";
      else if (item.toLowerCase().includes("ai review") && aiReviewCompleted) status = "complete";
      if (!reqs.some((r) => r.label.toLowerCase().includes(item.toLowerCase().slice(0, 15)))) {
        reqs.push({ label: item, status, detail: status === "warning" ? "Manual check" : undefined });
      }
    });

    const cc = reqs.filter((r) => r.status === "complete").length;
    const mc = reqs.filter((r) => r.status === "missing").length;
    return { requirements: reqs, completeCount: cc, missingCount: mc, totalCount: reqs.length, allComplete: mc === 0 };
  })();

  // Log enforcement check once
  useEffect(() => {
    if (logged || !user || !profile || !matrixVersion) return;
    setLogged(true);
    supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "TIER_REQUIREMENTS_CHECKED",
      object_type: "case",
      object_id: caseId,
      metadata: {
        report_tier: reportTier,
        matrix_version: matrixVersion.version_number,
        complete: completeCount,
        missing: missingCount,
        total: totalCount,
      },
    });
  }, [logged, user, profile, caseId, matrixVersion]);

  if (!matrixRule || !matrixVersion) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Shield size={14} className="text-accent" />
        <h3 className="font-display text-sm font-semibold text-foreground flex-1">
          Tier Requirements
        </h3>
        <Badge variant="outline" className="text-[10px] capitalize">{reportTier}</Badge>
        <Badge variant="outline" className="text-[10px]">Matrix v{matrixVersion.version_number}</Badge>
        <Badge className={`text-[10px] ${allComplete ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          {completeCount}/{totalCount}
        </Badge>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="space-y-1.5">
          {requirements.map((req, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {req.status === "complete" ? (
                <CheckCircle2 size={12} className="text-success shrink-0" />
              ) : req.status === "missing" ? (
                <XCircle size={12} className="text-destructive shrink-0" />
              ) : (
                <AlertTriangle size={12} className="text-warning shrink-0" />
              )}
              <span className={req.status === "complete" ? "text-foreground" : req.status === "missing" ? "text-destructive" : "text-warning"}>
                {req.label}
              </span>
              {req.detail && (
                <span className="text-[10px] text-muted-foreground ml-auto">{req.detail}</span>
              )}
            </div>
          ))}

          {!allComplete && (
            <p className="text-[10px] text-destructive italic mt-2">
              All required items must be complete before QA submission.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
