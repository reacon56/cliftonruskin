import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Database, Pen, Sparkles, ShieldCheck, Lock, Unlock,
  CheckCircle2, AlertTriangle, FileText, Save,
  RefreshCw, XCircle, BarChart3,
} from "lucide-react";
import ReportPdfRenderer from "@/components/case-detail/ReportPdfRenderer";
import ReportAmendmentPanel from "@/components/case-detail/ReportAmendmentPanel";
import AutomationCoverageMap from "@/components/case-detail/AutomationCoverageMap";
import AiAssurancePanel from "@/components/case-detail/AiAssurancePanel";
import type { AiDecisionEvent } from "@/components/case-detail/AiAssurancePanel";

/* ────── types ────── */
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

interface ReportDraft {
  id: string;
  case_id: string;
  structured_data: StructuredData;
  structured_data_locked: boolean;
  officer_commentary: OfficerCommentary;
  officer_commentary_complete: boolean;
  ai_draft: AiDraft;
  ai_draft_reviewed: boolean;
  ai_draft_dismissed: boolean;
  qa_comments: string | null;
  qa_approval_status: string;
  report_version: number;
  amendment_history: any[];
  pdf_generated: boolean;
}

interface Props {
  caseId: string;
  caseData: any;
  entity: any;
  isManager: boolean;
}

/* ────── helpers ────── */
const SECTION_FIELDS: { key: keyof StructuredData; label: string }[] = [
  { key: "entity_core_data", label: "Entity Core Data" },
  { key: "sanctions_summary", label: "Sanctions Summary" },
  { key: "adverse_media_summary", label: "Adverse Media Summary" },
  { key: "corporate_structure_summary", label: "Corporate Structure" },
  { key: "jurisdiction_reference", label: "Jurisdiction Reference" },
  { key: "case_metadata", label: "Case Metadata" },
  { key: "risk_model_output", label: "Risk Model Output" },
  { key: "lia_reference", label: "LIA Reference" },
];

const COMMENTARY_FIELDS: { key: keyof OfficerCommentary; label: string; placeholder: string }[] = [
  { key: "contextual_analysis", label: "Contextual Analysis", placeholder: "Provide context around the entity, its operating environment, and relevant background…" },
  { key: "explanation_of_material_findings", label: "Explanation of Material Findings", placeholder: "Detail any material findings and their significance…" },
  { key: "mitigating_factors", label: "Mitigating Factors", placeholder: "Note any mitigating factors that reduce identified risks…" },
  { key: "recommended_follow_up_actions", label: "Recommended Follow-up Actions", placeholder: "Suggest follow-up actions or monitoring requirements…" },
  { key: "client_safe_notes", label: "Client-safe Notes (optional)", placeholder: "Notes safe for client visibility — no sensitive internal commentary…" },
];

const AI_FIELDS: { key: keyof AiDraft; label: string }[] = [
  { key: "draft_executive_summary", label: "Draft Executive Summary" },
  { key: "draft_risk_driver_explanation", label: "Risk Driver Explanation" },
  { key: "suggested_follow_up_actions", label: "Suggested Follow-up Actions" },
  { key: "gap_analysis_prompts", label: "Gap Analysis Prompts" },
];

export default function ReportBuilderEngine({ caseId, caseData, entity, isManager }: Props) {
  const { user, profile, isInternal, canQc } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("structured");

  /* ── load or create draft ── */
  const loadDraft = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("report_drafts")
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle();

    if (data) {
      setDraft(data as any);
    } else {
      // auto-create draft with populated structured data
      const structured = buildStructuredData();
      const { data: newDraft } = await supabase
        .from("report_drafts")
        .insert({
          case_id: caseId,
          org_id: caseData.org_id,
          created_by: user?.id,
          structured_data: structured,
        } as any)
        .select("*")
        .single();
      if (newDraft) setDraft(newDraft as any);
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  /* ── auto-fill structured data from case ── */
  const buildStructuredData = (): StructuredData => ({
    entity_core_data: {
      name: entity?.name ?? "Unknown",
      risk_tier: entity?.risk_tier ?? "—",
      country: entity?.country ?? "—",
      registration_number: entity?.registration_number ?? "—",
      entity_type: entity?.entity_type ?? "—",
    },
    sanctions_summary: { status: "No adverse findings", checked_at: new Date().toISOString() },
    adverse_media_summary: { count: 0, log_references: [] },
    corporate_structure_summary: { ownership_layers: "To be completed" },
    jurisdiction_reference: { country: entity?.country ?? "—" },
    case_metadata: {
      case_id: caseId,
      created_at: caseData?.created_at,
      assigned_to: caseData?.assigned_to,
      qa_owner: caseData?.qa_owner,
      case_type: caseData?.case_type,
      report_tier: caseData?.report_tier,
    },
    risk_model_output: { band: "Pending", reason_codes: [], confidence: "Low" },
    lia_reference: {
      active_lia_id: caseData?.active_lia_id,
      lawful_basis: caseData?.lawful_basis ?? "legitimate_interests",
    },
  });

  /* ── refresh structured data ── */
  const refreshStructuredData = async () => {
    if (!draft || draft.structured_data_locked) return;
    const structured = buildStructuredData();
    // Also fetch risk score
    const { data: riskScore } = await supabase
      .from("entity_risk_scores")
      .select("*")
      .eq("entity_id", caseData.entity_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (riskScore) {
      structured.risk_model_output = {
        band: riskScore.risk_band,
        reason_codes: riskScore.reason_codes,
        confidence: riskScore.confidence,
      };
    }
    await saveDraftField("structured_data", structured);
    toast({ title: "Structured data refreshed" });
  };

  /* ── save helpers ── */
  const saveDraftField = async (field: string, value: any) => {
    if (!draft) return;
    setSaving(true);
    await supabase
      .from("report_drafts")
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
      .eq("id", draft.id);
    setDraft((prev) => prev ? { ...prev, [field]: value } : prev);
    setSaving(false);
  };

  /* ── lock structured data ── */
  const lockStructuredData = async () => {
    if (!draft) return;
    await supabase.from("report_drafts").update({
      structured_data_locked: true,
      structured_data_locked_at: new Date().toISOString(),
      structured_data_locked_by: user?.id,
    } as any).eq("id", draft.id);
    await logAudit("REPORT_DATA_LOCKED");
    setDraft((prev) => prev ? { ...prev, structured_data_locked: true } : prev);
    toast({ title: "Structured data locked" });
  };

  /* ── officer commentary ── */
  const updateCommentary = (key: keyof OfficerCommentary, value: string) => {
    if (!draft) return;
    const updated = { ...draft.officer_commentary, [key]: value };
    setDraft((prev) => prev ? { ...prev, officer_commentary: updated } : prev);
  };

  const saveCommentary = async () => {
    if (!draft) return;
    await saveDraftField("officer_commentary", draft.officer_commentary);
    toast({ title: "Commentary saved" });
  };

  const markCommentaryComplete = async () => {
    if (!draft) return;
    await saveDraftField("officer_commentary_complete", true);
    await logAudit("REPORT_COMMENTARY_COMPLETED");
    setDraft((prev) => prev ? { ...prev, officer_commentary_complete: true } : prev);
    toast({ title: "Commentary marked complete" });
  };

  /* ── AI draft ── */
  const generateAiDraft = async () => {
    if (!draft) return;
    // Simulated AI generation — in production, call edge function
    const aiDraft: AiDraft = {
      draft_executive_summary: `Based on the review of ${entity?.name ?? "the entity"}, no materially adverse information has been identified that would preclude a commercial relationship. The entity presents a ${entity?.risk_tier === "A" ? "heightened" : "standard"} risk profile requiring ${entity?.risk_tier === "A" ? "enhanced" : "routine"} monitoring.`,
      draft_risk_driver_explanation: "The primary risk drivers relate to jurisdictional exposure and ownership complexity. No sanctions matches or significant adverse media were identified during the screening process.",
      suggested_follow_up_actions: "1. Schedule periodic re-verification of beneficial ownership chain.\n2. Monitor for changes in regulatory environment.\n3. Review ahead of contract renewal date.",
      gap_analysis_prompts: "• Verify most recent financial statements availability\n• Confirm UBO declaration completeness\n• Check for any pending litigation not captured in public records",
    };
    await saveDraftField("ai_draft", aiDraft);
    await logAudit("REPORT_AI_DRAFT_GENERATED");
    toast({ title: "AI draft generated" });
  };

  const updateAiField = (key: keyof AiDraft, value: string) => {
    if (!draft) return;
    const updated = { ...draft.ai_draft, [key]: value };
    setDraft((prev) => prev ? { ...prev, ai_draft: updated } : prev);
  };

  const saveAiDraft = async () => {
    if (!draft) return;
    await saveDraftField("ai_draft", draft.ai_draft);
    toast({ title: "AI draft saved" });
  };

  const markAiReviewed = async () => {
    if (!draft) return;
    await saveDraftField("ai_draft_reviewed", true);
    await logAudit("REPORT_AI_DRAFT_REVIEWED");
    setDraft((prev) => prev ? { ...prev, ai_draft_reviewed: true } : prev);
    toast({ title: "AI sections marked as reviewed" });
  };

  const dismissAiDraft = async () => {
    if (!draft) return;
    await saveDraftField("ai_draft_dismissed", true);
    await logAudit("REPORT_AI_DRAFT_DISMISSED");
    setDraft((prev) => prev ? { ...prev, ai_draft_dismissed: true } : prev);
    toast({ title: "AI sections dismissed" });
  };

  /* ── QA ── */
  const saveQaComments = async () => {
    if (!draft) return;
    await saveDraftField("qa_comments", draft.qa_comments);
    toast({ title: "QA comments saved" });
  };

  const approveReport = async () => {
    if (!draft) return;
    await supabase.from("report_drafts").update({
      qa_approval_status: "approved",
      qa_approved_by: user?.id,
      qa_approved_at: new Date().toISOString(),
    } as any).eq("id", draft.id);
    await logAudit("REPORT_QA_APPROVED");
    setDraft((prev) => prev ? { ...prev, qa_approval_status: "approved" } : prev);
    toast({ title: "Report approved for PDF generation" });
  };

  const rejectReport = async () => {
    if (!draft) return;
    await supabase.from("report_drafts").update({
      qa_approval_status: "rejected",
      report_version: draft.report_version + 1,
      amendment_history: [...draft.amendment_history, {
        version: draft.report_version,
        rejected_at: new Date().toISOString(),
        rejected_by: user?.id,
        comments: draft.qa_comments,
      }],
    } as any).eq("id", draft.id);
    await logAudit("REPORT_QA_REJECTED");
    setDraft((prev) => prev ? {
      ...prev,
      qa_approval_status: "rejected",
      report_version: prev.report_version + 1,
      structured_data_locked: false,
      officer_commentary_complete: false,
      ai_draft_reviewed: false,
    } : prev);
    toast({ title: "Report returned for revision", variant: "destructive" });
  };

  /* ── PDF readiness (delegated to ReportPdfRenderer) ── */

  /* ── audit ── */
  const logAudit = async (action: string) => {
    if (!user || !profile) return;
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: action,
      object_type: "report_draft",
      object_id: draft?.id,
      metadata: { case_id: caseId, report_version: draft?.report_version },
    });
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading report builder…</div>;
  if (!draft) return <div className="text-sm text-destructive py-8 text-center">Failed to initialise report draft.</div>;

  /* ── section completion indicators ── */
  const steps = [
    { label: "Data", done: draft.structured_data_locked, icon: Database },
    { label: "Commentary", done: draft.officer_commentary_complete, icon: Pen },
    { label: "AI Draft", done: draft.ai_draft_reviewed || draft.ai_draft_dismissed, icon: Sparkles },
    { label: "QA", done: draft.qa_approval_status === "approved", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Progress bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold text-foreground">Report Builder</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">v{draft.report_version}</Badge>
            {draft.qa_approval_status === "approved" && <Badge className="bg-success/10 text-success text-[10px]">Approved</Badge>}
            {draft.qa_approval_status === "rejected" && <Badge className="bg-destructive/10 text-destructive text-[10px]">Returned</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const StepIcon = step.icon;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${step.done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {step.done ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
                  </div>
                  <span className={`text-[9px] font-medium ${step.done ? "text-success" : "text-muted-foreground"}`}>{step.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`w-10 h-px mx-1 mt-[-14px] ${step.done ? "bg-success/50" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="w-full justify-start bg-transparent p-0 gap-1 flex-wrap">
          <TabsTrigger value="structured" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Database className="h-3.5 w-3.5" /> Structured Data</TabsTrigger>
          <TabsTrigger value="commentary" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Pen className="h-3.5 w-3.5" /> Commentary</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Sparkles className="h-3.5 w-3.5" /> AI Draft</TabsTrigger>
          <TabsTrigger value="qa" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><ShieldCheck className="h-3.5 w-3.5" /> QA</TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><BarChart3 className="h-3.5 w-3.5" /> Coverage</TabsTrigger>
        </TabsList>

        {/* ── 1. STRUCTURED DATA ── */}
        <TabsContent value="structured" className="space-y-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {draft.structured_data_locked ? <Lock size={14} className="text-success" /> : <Unlock size={14} className="text-warning" />}
                Auto-filled Data
              </h4>
              <div className="flex items-center gap-2">
                {!draft.structured_data_locked && (
                  <>
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={refreshStructuredData}>
                      <RefreshCw size={12} /> Refresh
                    </Button>
                    <Button size="sm" className="text-xs h-7 gap-1" onClick={lockStructuredData}>
                      <Lock size={12} /> Lock Data
                    </Button>
                  </>
                )}
                {draft.structured_data_locked && <Badge className="bg-success/10 text-success text-[10px]">Locked</Badge>}
              </div>
            </div>
            <div className="space-y-3">
              {SECTION_FIELDS.map(({ key, label }) => {
                const val = (draft.structured_data as StructuredData)?.[key];
                return (
                  <div key={key} className="border rounded-lg p-3 bg-muted/20">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    <div className="mt-1.5 text-xs text-foreground space-y-0.5">
                      {val && typeof val === "object" ? Object.entries(val).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</span>
                        </div>
                      )) : <span className="text-muted-foreground italic">No data</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── 2. OFFICER COMMENTARY ── */}
        <TabsContent value="commentary" className="space-y-3">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Officer Commentary</h4>
              {draft.officer_commentary_complete && <Badge className="bg-success/10 text-success text-[10px]">Complete</Badge>}
            </div>
            {COMMENTARY_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
                <Textarea
                  rows={4}
                  placeholder={placeholder}
                  value={(draft.officer_commentary as OfficerCommentary)?.[key] ?? ""}
                  onChange={(e) => updateCommentary(key, e.target.value)}
                  disabled={draft.officer_commentary_complete}
                  className="text-sm"
                />
              </div>
            ))}
            {!draft.officer_commentary_complete && (
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={saveCommentary} disabled={saving}>
                  <Save size={12} /> Save Draft
                </Button>
                <Button size="sm" className="text-xs gap-1" onClick={markCommentaryComplete}>
                  <CheckCircle2 size={12} /> Mark Complete
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── 3. AI DRAFT ── */}
        <TabsContent value="ai" className="space-y-3">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles size={14} className="text-accent" /> AI-Generated Sections</h4>
              <div className="flex items-center gap-2">
                {(draft.ai_draft_reviewed || draft.ai_draft_dismissed) && (
                  <Badge className={`text-[10px] ${draft.ai_draft_reviewed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {draft.ai_draft_reviewed ? "Reviewed" : "Dismissed"}
                  </Badge>
                )}
              </div>
            </div>

            {!draft.ai_draft?.draft_executive_summary && !draft.ai_draft_dismissed && (
              <div className="text-center py-6 border rounded-lg border-dashed border-accent/30 bg-accent/5">
                <Sparkles size={24} className="text-accent mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Generate AI-assisted draft sections based on the structured data and officer commentary.</p>
                <Button size="sm" className="gap-1" onClick={generateAiDraft}>
                  <Sparkles size={12} /> Generate Draft
                </Button>
              </div>
            )}

            {draft.ai_draft?.draft_executive_summary && (
              <>
                {AI_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
                    <Textarea
                      rows={4}
                      value={(draft.ai_draft as AiDraft)?.[key] ?? ""}
                      onChange={(e) => updateAiField(key, e.target.value)}
                      disabled={draft.ai_draft_reviewed || draft.ai_draft_dismissed}
                      className="text-sm"
                    />
                  </div>
                ))}
                {!draft.ai_draft_reviewed && !draft.ai_draft_dismissed && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={saveAiDraft} disabled={saving}>
                      <Save size={12} /> Save Edits
                    </Button>
                    <Button size="sm" className="text-xs gap-1" onClick={markAiReviewed}>
                      <CheckCircle2 size={12} /> Mark Reviewed
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground" onClick={dismissAiDraft}>
                      <XCircle size={12} /> Dismiss
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ── 4. QA ── */}
        <TabsContent value="qa" className="space-y-3">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldCheck size={14} /> QA Review</h4>
              <Badge variant="outline" className="text-[10px] capitalize">{draft.qa_approval_status}</Badge>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">QA Comments</label>
              <Textarea
                rows={4}
                placeholder="QA reviewer comments…"
                value={draft.qa_comments ?? ""}
                onChange={(e) => setDraft((prev) => prev ? { ...prev, qa_comments: e.target.value } : prev)}
                disabled={draft.qa_approval_status === "approved"}
                className="text-sm"
              />
            </div>

            {canQc && draft.qa_approval_status !== "approved" && (
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={saveQaComments} disabled={saving}>
                  <Save size={12} /> Save Comments
                </Button>
                <Button size="sm" className="text-xs gap-1 bg-success hover:bg-success/90" onClick={approveReport}
                  disabled={!draft.structured_data_locked || !draft.officer_commentary_complete || !(draft.ai_draft_reviewed || draft.ai_draft_dismissed)}>
                  <CheckCircle2 size={12} /> Approve
                </Button>
                <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={rejectReport}>
                  <AlertTriangle size={12} /> Return
                </Button>
              </div>
            )}

            {!canQc && draft.qa_approval_status !== "approved" && (
              <p className="text-xs text-muted-foreground italic">Awaiting QA reviewer approval.</p>
            )}

            {/* PDF Renderer */}
            <ReportPdfRenderer
              draft={draft}
              entityName={entity?.name ?? "Entity"}
              caseId={caseId}
              onPdfGenerated={loadDraft}
            />

            {/* Version Control & Amendment Panel */}
            <ReportAmendmentPanel
              draftId={draft.id}
              caseId={caseId}
              orgId={caseData.org_id}
              currentVersion={draft.report_version}
              pdfGenerated={draft.pdf_generated}
              onAmendmentCreated={loadDraft}
            />
          </div>
        </TabsContent>

        {/* ── 5. COVERAGE MAP ── */}
        <TabsContent value="coverage">
          <AutomationCoverageMap
            structuredData={draft.structured_data}
            structuredDataLocked={draft.structured_data_locked}
            officerCommentary={draft.officer_commentary}
            officerCommentaryComplete={draft.officer_commentary_complete}
            aiDraft={draft.ai_draft}
            aiDraftReviewed={draft.ai_draft_reviewed}
            aiDraftDismissed={draft.ai_draft_dismissed}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

