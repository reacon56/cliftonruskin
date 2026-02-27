import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertTriangle, XCircle, Shield,
  ChevronDown, ChevronUp,
} from "lucide-react";

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
  status: "complete" | "missing" | "warning";
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
}: Props) {
  const { user, profile } = useAuth();
  const [matrixRule, setMatrixRule] = useState<any>(null);
  const [matrixVersion, setMatrixVersion] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);
  const [logged, setLogged] = useState(false);

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

  if (!matrixRule || !matrixVersion) return null;

  // ── Evaluate requirements ──
  const requirements: Requirement[] = [];

  // Source categories
  const requiredSources: string[] = matrixRule.required_source_categories ?? [];
  const minLogs: Record<string, number> = matrixRule.min_retrieval_logs ?? {};

  requiredSources.forEach((cat) => {
    const logCount = retrievalLogs.filter((l: any) => l.category === cat).length;
    const required = minLogs[cat] ?? 1;
    requirements.push({
      label: SOURCE_LABELS[cat] || cat,
      status: logCount >= required ? "complete" : "missing",
      detail: `${logCount}/${required} logs`,
    });
  });

  // Commentary sections
  const requiredCommentary: string[] = matrixRule.required_commentary_sections ?? [];
  requiredCommentary.forEach((key) => {
    const filled = !!(officerCommentary && (officerCommentary as any)[key]?.trim());
    requirements.push({
      label: COMMENTARY_LABELS[key] || key,
      status: filled ? "complete" : "missing",
      detail: filled ? "Populated" : "Required",
    });
  });

  // Structured data
  requirements.push({
    label: "Structured Data Locked",
    status: structuredDataLocked ? "complete" : "missing",
  });

  // Risk model
  requirements.push({
    label: "Risk Model Executed",
    status: riskModelExecuted ? "complete" : "missing",
  });

  // Pre-QA
  requirements.push({
    label: "Pre-QA Review Passed",
    status: preQaPassed ? "complete" : "missing",
  });

  // AI Review
  if (matrixRule.ai_review_required) {
    requirements.push({
      label: "AI Review Completed",
      status: aiReviewCompleted ? "complete" : "missing",
    });
  }

  // QA checklist items (advisory)
  const qaItems: string[] = matrixRule.qa_checklist_items ?? [];
  qaItems.forEach((item) => {
    // Map known items to actual status
    let status: "complete" | "missing" | "warning" = "warning";
    if (item.toLowerCase().includes("structured data") && structuredDataLocked) status = "complete";
    else if (item.toLowerCase().includes("commentary") && officerCommentary) status = "complete";
    else if (item.toLowerCase().includes("risk model") && riskModelExecuted) status = "complete";
    else if (item.toLowerCase().includes("pre-qa") && preQaPassed) status = "complete";
    else if (item.toLowerCase().includes("ai review") && aiReviewCompleted) status = "complete";
    // Don't duplicate items already added
    if (!requirements.some((r) => r.label.toLowerCase().includes(item.toLowerCase().slice(0, 15)))) {
      requirements.push({ label: item, status, detail: status === "warning" ? "Manual check" : undefined });
    }
  });

  const completeCount = requirements.filter((r) => r.status === "complete").length;
  const missingCount = requirements.filter((r) => r.status === "missing").length;
  const totalCount = requirements.length;
  const allComplete = missingCount === 0;

  // Log enforcement check once
  useEffect(() => {
    if (logged || !user || !profile) return;
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
  }, [logged, user, profile, caseId]);

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
