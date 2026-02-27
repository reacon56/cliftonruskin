import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Database, Pen, Sparkles, AlertCircle,
  CheckCircle2, Clock, ClipboardCheck, Globe,
} from "lucide-react";
import type { PreQaCheckResult } from "@/components/case-detail/PreQaReviewPanel";

/* ────── types ────── */
type CompletionStatus = "auto_filled" | "manual" | "ai_draft" | "ai_accepted" | "ai_edited" | "ai_rejected" | "system_check" | "missing";

interface AiSectionDecision {
  key: string;
  status: "accepted" | "edited" | "rejected";
  reviewer: string;
  decidedAt: string;
}

export interface CoverageRow {
  section: string;
  status: CompletionStatus;
  dataSources: string[];
  lastUpdatedBy: string;
  timestamp: string | null;
}

interface StructuredData {
  entity_core_data?: Record<string, any>;
  sanctions_summary?: Record<string, any>;
  adverse_media_summary?: Record<string, any>;
  corporate_structure_summary?: Record<string, any>;
  jurisdiction_reference?: Record<string, any>;
  case_metadata?: Record<string, any>;
  risk_model_output?: Record<string, any>;
  lia_reference?: Record<string, any>;
}

interface OfficerCommentary {
  contextual_analysis?: string;
  explanation_of_material_findings?: string;
  mitigating_factors?: string;
  recommended_follow_up_actions?: string;
  client_safe_notes?: string;
}

interface AiDraft {
  draft_executive_summary?: string;
  draft_risk_driver_explanation?: string;
  suggested_follow_up_actions?: string;
  gap_analysis_prompts?: string;
}

interface Props {
  structuredData: StructuredData;
  structuredDataLocked: boolean;
  officerCommentary: OfficerCommentary;
  officerCommentaryComplete: boolean;
  aiDraft: AiDraft;
  aiDraftReviewed: boolean;
  aiDraftDismissed: boolean;
  aiDecisions?: AiSectionDecision[];
  preQaChecks?: PreQaCheckResult[];
  preQaRanAt?: string;
}

const STATUS_CONFIG: Record<CompletionStatus, { label: string; color: string; icon: typeof Database }> = {
  auto_filled: { label: "Auto-filled", color: "bg-primary/10 text-primary", icon: Database },
  manual: { label: "Manual", color: "bg-accent/10 text-accent", icon: Pen },
  ai_draft: { label: "AI Draft", color: "bg-warning/10 text-warning", icon: Sparkles },
  ai_accepted: { label: "AI Accepted", color: "bg-success/10 text-success", icon: CheckCircle2 },
  ai_edited: { label: "AI Edited", color: "bg-primary/10 text-primary", icon: Pen },
  ai_rejected: { label: "AI Rejected", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
  system_check: { label: "System Check", color: "bg-secondary/50 text-secondary-foreground", icon: ClipboardCheck },
  missing: { label: "Missing", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

function hasContent(val: any): boolean {
  if (!val) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "object") {
    return Object.values(val).some((v) => {
      if (typeof v === "string") return v.trim().length > 0 && v !== "—" && v !== "To be completed" && v !== "Pending";
      if (typeof v === "number") return true;
      if (Array.isArray(v)) return v.length > 0;
      return !!v;
    });
  }
  return false;
}

function getDataSources(key: string, data: Record<string, any> | undefined): string[] {
  if (!data) return [];
  const sources: string[] = [];
  if (data._provenance) sources.push(data._provenance);
  switch (key) {
    case "entity_core_data": sources.push("Entity Registry"); break;
    case "sanctions_summary": sources.push("Retrieval Logs — Sanctions"); break;
    case "adverse_media_summary": sources.push("Retrieval Logs — Media"); break;
    case "corporate_structure_summary": sources.push("Manual / Registry Data"); break;
    case "jurisdiction_reference": sources.push("Jurisdiction Benchmark Library"); break;
    case "case_metadata": sources.push("Case Record"); break;
    case "risk_model_output": sources.push("Risk Model v1.0"); break;
    case "lia_reference": sources.push("Programme LIA Templates"); break;
  }
  return sources;
}

export function computeCoverageRows(props: {
  structuredData: StructuredData;
  officerCommentary: OfficerCommentary;
  aiDraft: AiDraft;
  aiDraftDismissed: boolean;
  aiDecisions: AiSectionDecision[];
  preQaChecks: PreQaCheckResult[];
  preQaRanAt?: string;
}): { rows: CoverageRow[]; autoPct: number; manualPct: number; aiPct: number; coveragePct: number; missingCount: number } {
  const { structuredData, officerCommentary, aiDraft, aiDraftDismissed, aiDecisions, preQaChecks, preQaRanAt } = props;
  const rows: CoverageRow[] = [];
  const now = new Date().toISOString();

  const sdKeys: { key: keyof StructuredData; label: string }[] = [
    { key: "entity_core_data", label: "Entity Core Data" },
    { key: "sanctions_summary", label: "Sanctions Summary" },
    { key: "adverse_media_summary", label: "Adverse Media" },
    { key: "corporate_structure_summary", label: "Corporate Structure" },
    { key: "jurisdiction_reference", label: "Jurisdiction Reference" },
    { key: "case_metadata", label: "Case Metadata" },
    { key: "risk_model_output", label: "Risk Model Output" },
    { key: "lia_reference", label: "LIA Reference" },
  ];

  for (const { key, label } of sdKeys) {
    const val = structuredData?.[key];
    const filled = hasContent(val);
    rows.push({
      section: label,
      status: filled ? "auto_filled" : "missing",
      dataSources: getDataSources(key, val as Record<string, any> | undefined),
      lastUpdatedBy: filled ? "System" : "—",
      timestamp: filled ? now : null,
    });
  }

  const commentaryKeys: { key: keyof OfficerCommentary; label: string }[] = [
    { key: "contextual_analysis", label: "Contextual Analysis" },
    { key: "explanation_of_material_findings", label: "Material Findings" },
    { key: "mitigating_factors", label: "Mitigating Factors" },
    { key: "recommended_follow_up_actions", label: "Follow-up Actions" },
    { key: "client_safe_notes", label: "Client-safe Notes" },
  ];

  for (const { key, label } of commentaryKeys) {
    const val = officerCommentary?.[key];
    const filled = !!val && val.trim().length > 0;
    rows.push({
      section: label,
      status: filled ? "manual" : "missing",
      dataSources: filled ? ["Officer Input"] : [],
      lastUpdatedBy: filled ? "Officer" : "—",
      timestamp: filled ? now : null,
    });
  }

  const aiKeysWithDecisionMap: { key: keyof AiDraft; label: string; decisionKey: string }[] = [
    { key: "draft_executive_summary", label: "Executive Summary (AI)", decisionKey: "executive_summary" },
    { key: "draft_risk_driver_explanation", label: "Risk Drivers (AI)", decisionKey: "risk_driver" },
    { key: "suggested_follow_up_actions", label: "Suggested Follow-up (AI)", decisionKey: "follow_ups" },
    { key: "gap_analysis_prompts", label: "Gap Analysis (AI)", decisionKey: "inconsistencies" },
  ];

  for (const { key, label, decisionKey } of aiKeysWithDecisionMap) {
    const val = aiDraft?.[key];
    const filled = !!val && val.trim().length > 0;
    const decision = aiDecisions.find((d) => d.key === decisionKey);

    let status: CompletionStatus;
    let updatedBy = "—";
    let timestamp: string | null = null;

    if (decision) {
      status = decision.status === "accepted" ? "ai_accepted"
        : decision.status === "edited" ? "ai_edited"
        : "ai_rejected";
      updatedBy = decision.reviewer;
      timestamp = decision.decidedAt;
    } else if (aiDraftDismissed) {
      status = "missing";
    } else if (filled) {
      status = "ai_draft";
      updatedBy = "AI";
      timestamp = now;
    } else {
      status = "missing";
    }

    rows.push({
      section: label,
      status,
      dataSources: filled && !aiDraftDismissed ? ["AI Assurance Assistant"] : [],
      lastUpdatedBy: updatedBy,
      timestamp,
    });
  }

  if (preQaChecks.length > 0) {
    rows.push({
      section: "Pre-QA Completeness Check",
      status: "system_check",
      dataSources: ["System — Pre-QA Agent"],
      lastUpdatedBy: "System",
      timestamp: preQaRanAt ?? now,
    });
  }

  const total = rows.length;
  const autoCount = rows.filter((r) => r.status === "auto_filled").length;
  const manualCount = rows.filter((r) => r.status === "manual").length;
  const aiCount = rows.filter((r) => r.status === "ai_draft").length;
  const missingCount = rows.filter((r) => r.status === "missing").length;
  const filledCount = total - missingCount;
  const autoPct = total > 0 ? Math.round((autoCount / total) * 100) : 0;
  const manualPct = total > 0 ? Math.round((manualCount / total) * 100) : 0;
  const aiPct = total > 0 ? Math.round((aiCount / total) * 100) : 0;
  const coveragePct = total > 0 ? Math.round((filledCount / total) * 100) : 0;

  return { rows, autoPct, manualPct, aiPct, coveragePct, missingCount };
}

export default function AutomationCoverageMap({
  structuredData, structuredDataLocked,
  officerCommentary, officerCommentaryComplete,
  aiDraft, aiDraftReviewed, aiDraftDismissed,
  aiDecisions = [],
  preQaChecks = [], preQaRanAt,
}: Props) {

  const { rows, autoPct, manualPct, aiPct, coveragePct, missingCount } = computeCoverageRows({
    structuredData, officerCommentary, aiDraft, aiDraftDismissed,
    aiDecisions, preQaChecks, preQaRanAt,
  });
  const total = rows.length;
  const filledCount = total - missingCount;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 size={14} className="text-primary" /> Automation Coverage Map
        </h4>
        <Badge variant="outline" className="text-[10px]">{coveragePct}% complete</Badge>
      </div>

      {/* Coverage bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Progress value={coveragePct} className="h-2" />
          </div>
          <span className="text-[10px] text-muted-foreground w-16 text-right">{filledCount}/{total} sections</span>
        </div>
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" /> Auto {autoPct}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" /> Manual {manualPct}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" /> AI {aiPct}%
          </span>
          {missingCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive" /> Missing {missingCount}
            </span>
          )}
        </div>
      </div>

      {/* Section table */}
      <div className="space-y-1">
        {rows.map((row) => {
          const cfg = STATUS_CONFIG[row.status];
          const Icon = cfg.icon;
          return (
            <div key={row.section} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors text-xs">
              <Icon size={10} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 text-foreground truncate">{row.section}</span>
              <Badge className={`text-[9px] py-0 ${cfg.color}`}>{cfg.label}</Badge>
              <span className="text-[9px] text-muted-foreground w-24 text-right truncate hidden sm:inline">
                {row.dataSources[0] ?? "—"}
              </span>
              <span className="text-[9px] text-muted-foreground w-12 text-right hidden sm:inline">
                {row.lastUpdatedBy}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
