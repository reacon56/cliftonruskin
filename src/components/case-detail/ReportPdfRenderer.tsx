import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, CheckCircle2, AlertTriangle, Loader2, FileText,
} from "lucide-react";

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
  qa_approval_status: string;
  qa_approved_by?: string;
  qa_approved_at?: string;
  report_version: number;
  amendment_history: any[];
  pdf_generated: boolean;
  pdf_generated_at?: string;
}

export interface CoverageRowForPdf {
  section: string;
  status: string;
  dataSources: string[];
  lastUpdatedBy: string;
  timestamp: string | null;
}

interface Props {
  draft: ReportDraft;
  entityName: string;
  caseId: string;
  onPdfGenerated: () => void;
  coverageRows?: CoverageRowForPdf[];
  coverageAutoPct?: number;
  coverageManualPct?: number;
}

/* ────── gate check helper ────── */
function GateCheck({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {pass ? <CheckCircle2 size={12} className="text-success shrink-0" /> : <AlertTriangle size={12} className="text-warning shrink-0" />}
      <span className={pass ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

/* ────── main component ────── */
export default function ReportPdfRenderer({ draft, entityName, caseId, onPdfGenerated, coverageRows = [], coverageAutoPct = 0, coverageManualPct = 0 }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const canGenerate =
    draft.structured_data_locked &&
    draft.officer_commentary_complete &&
    (draft.ai_draft_reviewed || draft.ai_draft_dismissed) &&
    draft.qa_approval_status === "approved";

  const logAudit = async (action: string, metadata?: Record<string, any>) => {
    if (!user || !profile) return;
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: action,
      object_type: "report_draft",
      object_id: draft.id,
      metadata: { case_id: caseId, report_version: draft.report_version, ...metadata },
    });
  };

  /* ── build PDF HTML ── */
  const buildPdfHtml = useCallback(() => {
    const sd = draft.structured_data;
    const oc = draft.officer_commentary;
    const ai = draft.ai_draft;
    const now = new Date();
    const generatedTs = now.toISOString();
    const dateFormatted = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const caseRef = (sd.case_metadata?.case_id ?? caseId).slice(0, 8).toUpperCase();
    const riskBand = sd.risk_model_output?.band ?? "—";
    const riskConfidence = sd.risk_model_output?.confidence ?? "—";
    const reasonCodes: string[] = Array.isArray(sd.risk_model_output?.reason_codes) ? sd.risk_model_output.reason_codes : [];
    const entityCountry = sd.entity_core_data?.country ?? sd.jurisdiction_reference?.country ?? "—";
    const lawfulBasis = sd.lia_reference?.lawful_basis ?? "legitimate_interests";

    const kv = (label: string, value: string) => `<div class="kv"><span class="kv-label">${label}</span><span class="kv-value">${value}</span></div>`;

    const sectionHtml = (title: string, content: string) => `
      <div class="section">
        <h3 class="section-title">${title}</h3>
        <div class="gold-rule"></div>
        ${content}
      </div>`;

    // Cover page
    const coverPage = `
      <div class="cover-page">
        <div class="cover-brand">
          <div class="cover-logo-text">Clifton Ruskin</div>
          <div class="cover-logo-sub">Assurance &amp; Advisory</div>
        </div>
        <div class="cover-body">
          <div class="cover-classification">CONFIDENTIAL</div>
          <h1 class="cover-title">Assurance Report</h1>
          <div class="cover-entity">${entityName}</div>
          <div class="cover-meta">
            ${kv("Reference", `FVC-RPT-${caseRef}`)}
            ${kv("Version", `v${draft.report_version}`)}
            ${kv("Date", dateFormatted)}
            ${kv("Risk Band", riskBand)}
          </div>
        </div>
        <div class="cover-footer">
          <div class="cover-footer-text">Prepared by Clifton Ruskin Ltd · ${dateFormatted}</div>
        </div>
      </div>`;

    // Executive Summary
    const execSummary = sectionHtml("1. Executive Summary",
      `<p class="body-text">${ai.draft_executive_summary || oc.contextual_analysis || "No executive summary available."}</p>`
    );

    // Scope & Methodology
    const scopeSection = sectionHtml("2. Scope &amp; Methodology", `
      ${kv("Case Type", sd.case_metadata?.case_type ?? "—")}
      ${kv("Report Tier", sd.case_metadata?.report_tier ?? "—")}
      ${kv("Entity Type", sd.entity_core_data?.entity_type ?? "—")}
      ${kv("Risk Tier", sd.entity_core_data?.risk_tier ?? "—")}
      <p class="body-text" style="margin-top:12px;">This report has been prepared based on publicly available information, proprietary databases, and structured research checks. 
      The methodology follows Clifton Ruskin's standard assurance framework appropriate to the identified risk tier.</p>
    `);

    // Findings
    const findingsContent = [
      oc.explanation_of_material_findings ? `<div class="finding-block"><h4 class="finding-subtitle">Material Findings</h4><p class="body-text">${oc.explanation_of_material_findings}</p></div>` : "",
      sd.sanctions_summary ? `<div class="finding-block"><h4 class="finding-subtitle">Sanctions &amp; Watchlist Screening</h4><p class="body-text">Status: ${sd.sanctions_summary.status ?? "—"}. Checked: ${sd.sanctions_summary.checked_at ? new Date(sd.sanctions_summary.checked_at).toLocaleDateString("en-GB") : "—"}.</p></div>` : "",
      sd.adverse_media_summary ? `<div class="finding-block"><h4 class="finding-subtitle">Adverse Media</h4><p class="body-text">Records identified: ${sd.adverse_media_summary.count ?? 0}.</p></div>` : "",
      sd.corporate_structure_summary ? `<div class="finding-block"><h4 class="finding-subtitle">Corporate Structure</h4><p class="body-text">Ownership layers: ${sd.corporate_structure_summary.ownership_layers ?? "—"}.</p></div>` : "",
      oc.mitigating_factors ? `<div class="finding-block"><h4 class="finding-subtitle">Mitigating Factors</h4><p class="body-text">${oc.mitigating_factors}</p></div>` : "",
    ].filter(Boolean).join("");
    const findingsSection = sectionHtml("3. Findings", findingsContent || '<p class="body-text muted">No findings recorded.</p>');

    // Risk Assessment
    const riskSection = sectionHtml("4. Risk Assessment", `
      ${kv("Overall Risk Band", riskBand)}
      ${kv("Confidence", riskConfidence)}
      ${reasonCodes.length > 0 ? `<div style="margin-top:8px;"><span class="kv-label">Reason Codes</span><ul class="reason-list">${reasonCodes.map((r: any) => `<li>${typeof r === "string" ? r : JSON.stringify(r)}</li>`).join("")}</ul></div>` : ""}
      ${ai.draft_risk_driver_explanation ? `<p class="body-text" style="margin-top:12px;">${ai.draft_risk_driver_explanation}</p>` : ""}
    `);

    // Jurisdiction Context
    const jurisdictionSection = sectionHtml("5. Jurisdiction Context", `
      ${kv("Jurisdiction", entityCountry)}
      ${sd.jurisdiction_reference && typeof sd.jurisdiction_reference === "object" ? Object.entries(sd.jurisdiction_reference).filter(([k]) => k !== "country").map(([k, v]) => kv(k.replace(/_/g, " "), String(v ?? "—"))).join("") : ""}
    `);

    // Source Attribution Summary
    const sourceSection = sectionHtml("6. Source Attribution Summary", `
      <p class="body-text">All information has been sourced from publicly available records, proprietary databases, and structured research checks conducted in accordance with the approved processing basis. 
      Individual source references are maintained in the case retrieval log and are available upon request.</p>
    `);

    // Processing Basis Reference
    const processingSection = sectionHtml("7. Processing Basis Reference", `
      ${kv("Lawful Basis", lawfulBasis.replace(/_/g, " "))}
      ${sd.lia_reference?.active_lia_id ? kv("Active LIA", sd.lia_reference.active_lia_id.slice(0, 8).toUpperCase()) : ""}
      <p class="body-text" style="margin-top:8px;">Personal data processed in the preparation of this report has been handled in accordance with the organisation's approved Legitimate Interest Assessment and applicable data protection regulations.</p>
    `);

    // Limitations
    const limitationsSection = sectionHtml("8. Limitations", `
      <p class="body-text">This report is based on information available at the date of issue. It does not constitute legal advice. 
      Findings are limited to publicly accessible sources and may not reflect undisclosed matters. 
      Clifton Ruskin Ltd accepts no liability for any loss arising from reliance on this document.</p>
    `);

    // Follow-up / Recommendations
    const followUpSection = (oc.recommended_follow_up_actions || ai.suggested_follow_up_actions)
      ? sectionHtml("9. Recommended Follow-up", `<p class="body-text">${oc.recommended_follow_up_actions || ai.suggested_follow_up_actions}</p>`)
      : "";

    const sectionNum = followUpSection ? 10 : 9;

    // Version Control
    const versionSection = sectionHtml(`${sectionNum}. Version Control`, `
      ${kv("Report Version", `v${draft.report_version}`)}
      ${kv("Generated", generatedTs)}
      ${kv("QA Approved At", draft.qa_approved_at ? new Date(draft.qa_approved_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—")}
      ${kv("QA Approver", draft.qa_approved_by?.slice(0, 8).toUpperCase() ?? "—")}
      ${draft.amendment_history.length > 0 ? `
        <div style="margin-top:12px;">
          <span class="kv-label">Amendment History</span>
          <table class="amendment-table">
            <tr><th>Version</th><th>Date</th><th>Action</th></tr>
            ${draft.amendment_history.map((a: any) => `<tr><td>v${a.version}</td><td>${new Date(a.rejected_at).toLocaleDateString("en-GB")}</td><td>Returned for revision</td></tr>`).join("")}
          </table>
        </div>` : ""}
    `);

    // Appendix: Provenance & Automation Summary
    const clientSafeStatuses: Record<string, string> = {
      auto_filled: "Automated",
      manual: "Analyst Input",
      ai_draft: "AI-Assisted",
      ai_accepted: "AI-Assisted (Reviewed)",
      ai_edited: "AI-Assisted (Edited)",
      ai_rejected: "Analyst Input",
      system_check: "System Verification",
      missing: "Pending",
    };

    // Collect unique high-level sources (client-safe phrasing)
    const allSources = new Set<string>();
    coverageRows.forEach((r) => r.dataSources.forEach((s) => {
      // Sanitise internal-only references
      const safe = s
        .replace(/Retrieval Logs? —/gi, "Database Check —")
        .replace(/Officer Input/gi, "Analyst Review")
        .replace(/System — Pre-QA Agent/gi, "Quality Verification");
      allSources.add(safe);
    }));

    const provenanceAppendix = sectionHtml(`Appendix A: Provenance &amp; Automation Summary`, `
      <p class="body-text" style="margin-bottom:12px;">This appendix summarises the data sources and methodology coverage for this report.</p>
      ${kv("Automated Coverage", `${coverageAutoPct}%`)}
      ${kv("Analyst Input Coverage", `${coverageManualPct}%`)}
      <div style="margin-top:16px;">
        <span class="kv-label" style="display:block;margin-bottom:6px;">Sources Consulted</span>
        <ul class="reason-list">
          ${Array.from(allSources).map((s) => `<li>${s}</li>`).join("")}
        </ul>
      </div>
      ${coverageRows.length > 0 ? `
        <div style="margin-top:16px;">
          <span class="kv-label" style="display:block;margin-bottom:6px;">Section Completion Summary</span>
          <table class="amendment-table">
            <tr><th>Section</th><th>Method</th><th>Last Updated</th></tr>
            ${coverageRows.filter((r) => r.status !== "missing").map((r) => `
              <tr>
                <td>${r.section}</td>
                <td>${clientSafeStatuses[r.status] ?? r.status}</td>
                <td>${r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-GB") : "—"}</td>
              </tr>
            `).join("")}
          </table>
        </div>` : ""}
    `);

    return `<!DOCTYPE html>
<html>
<head>
  <title>Assurance Report — ${entityName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', sans-serif; color: #1a2235; line-height: 1.6; max-width: 800px; margin: 0 auto; }
    h1, h2, h3, h4 { font-family: 'Cormorant Garamond', serif; }

    /* Cover */
    .cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 60px 48px; page-break-after: always; }
    .cover-brand { border-bottom: 2px solid #c0924c; padding-bottom: 20px; }
    .cover-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; color: #1a2235; }
    .cover-logo-sub { font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; color: #c0924c; margin-top: 2px; }
    .cover-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .cover-classification { font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; color: #6b7280; margin-bottom: 16px; }
    .cover-title { font-size: 42px; font-weight: 700; color: #1a2235; line-height: 1.1; }
    .cover-entity { font-size: 20px; color: #6b7280; margin-top: 12px; font-family: 'DM Sans', sans-serif; }
    .cover-meta { margin-top: 40px; border-top: 1px solid #e0d9cf; padding-top: 20px; }
    .cover-footer { border-top: 1px solid #e0d9cf; padding-top: 16px; }
    .cover-footer-text { font-size: 10px; color: #9ca3af; }

    /* Sections */
    .section { padding: 0 48px; margin-bottom: 28px; page-break-inside: avoid; }
    .section-title { font-size: 20px; font-weight: 600; color: #1a2235; margin-bottom: 6px; }
    .gold-rule { width: 40px; height: 2px; background: #c0924c; margin-bottom: 14px; }
    .body-text { font-size: 13px; line-height: 1.7; color: #374151; }
    .body-text.muted { color: #9ca3af; font-style: italic; }

    /* Key-value */
    .kv { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid #f3f0ec; }
    .kv-label { color: #6b7280; text-transform: capitalize; }
    .kv-value { color: #1a2235; font-weight: 500; text-align: right; max-width: 55%; }

    /* Findings */
    .finding-block { margin-top: 16px; padding: 14px; border: 1px solid #e0d9cf; border-radius: 6px; page-break-inside: avoid; }
    .finding-subtitle { font-size: 14px; font-weight: 600; margin-bottom: 6px; }

    /* Reason codes */
    .reason-list { list-style: none; margin-top: 4px; }
    .reason-list li { font-size: 12px; color: #374151; padding: 2px 0 2px 14px; position: relative; }
    .reason-list li::before { content: "•"; position: absolute; left: 0; color: #c0924c; }

    /* Amendment table */
    .amendment-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    .amendment-table th { text-align: left; font-weight: 600; color: #1a2235; border-bottom: 1px solid #e0d9cf; padding: 4px 8px; }
    .amendment-table td { border-bottom: 1px solid #f3f0ec; padding: 4px 8px; color: #374151; }

    /* Footer */
    .pdf-footer { margin-top: 40px; padding: 20px 48px; border-top: 1px solid #e0d9cf; }
    .pdf-footer-brand { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .pdf-footer-name { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; }
    .pdf-footer-ref { font-family: monospace; font-size: 10px; color: #9ca3af; }
    .pdf-footer-disclaimer { font-size: 9px; color: #9ca3af; line-height: 1.5; }
    .pdf-footer-contacts { display: flex; gap: 24px; margin-top: 10px; font-size: 9px; color: #6b7280; }

    @media print {
      body { padding: 0; }
      .cover-page { min-height: auto; page-break-after: always; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${coverPage}
  ${execSummary}
  ${scopeSection}
  ${findingsSection}
  ${riskSection}
  ${jurisdictionSection}
  ${sourceSection}
  ${processingSection}
  ${limitationsSection}
  ${followUpSection}
  ${versionSection}
  ${provenanceAppendix}

  <div class="pdf-footer">
    <div class="pdf-footer-brand">
      <span class="pdf-footer-name">Clifton Ruskin Ltd</span>
      <span class="pdf-footer-ref">FVC-RPT-${caseRef} · v${draft.report_version}</span>
    </div>
    <div class="pdf-footer-disclaimer">
      This document is confidential and intended solely for the use of the commissioning party. It must not be disclosed, copied, or distributed to any third party without the prior written consent of Clifton Ruskin Ltd. The findings herein are based on information available at the date of issue and do not constitute legal advice. Clifton Ruskin Ltd accepts no liability for any loss arising from reliance on this document.
    </div>
    <div class="pdf-footer-contacts">
      <span>info@cliftonruskin.com</span>
      <span>+44 (0)20 7946 0123</span>
      <span>cliftonruskin.com</span>
      <span>Registered in England &amp; Wales No. 12345678</span>
    </div>
  </div>
</body>
</html>`;
  }, [draft, entityName, caseId, coverageRows, coverageAutoPct, coverageManualPct]);

  /* ── generate & open PDF ── */
  const handleGeneratePdf = useCallback(async () => {
    if (!canGenerate) {
      toast({ title: "Cannot generate PDF", description: "QA approval required.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const html = buildPdfHtml();
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups to generate the PDF.", variant: "destructive" });
        setGenerating(false);
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();

      // Mark as generated
      const now = new Date().toISOString();
      await supabase.from("report_drafts").update({
        pdf_generated: true,
        pdf_generated_at: now,
      } as any).eq("id", draft.id);

      // Log audit event with full provenance
      await logAudit("REPORT_PDF_GENERATED", {
        report_id: draft.id,
        report_version: draft.report_version,
        generated_at: now,
        generated_by: user?.id,
        qa_approver: draft.qa_approved_by,
        qa_approved_at: draft.qa_approved_at,
        automated_coverage_pct: coverageAutoPct,
        manual_coverage_pct: coverageManualPct,
      });

      toast({ title: "PDF generated successfully" });
      onPdfGenerated();
    } catch (err) {
      toast({ title: "PDF generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, buildPdfHtml, draft, caseId]);

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
        <FileText size={12} /> PDF Generation Readiness
      </h4>
      <div className="space-y-1.5">
        <GateCheck label="Structured data locked" pass={draft.structured_data_locked} />
        <GateCheck label="Officer commentary completed" pass={draft.officer_commentary_complete} />
        <GateCheck label="AI sections reviewed or dismissed" pass={draft.ai_draft_reviewed || draft.ai_draft_dismissed} />
        <GateCheck label="QA status = Approved" pass={draft.qa_approval_status === "approved"} />
      </div>

      {draft.pdf_generated && draft.pdf_generated_at && (
        <div className="mt-3 p-2 rounded border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
          <CheckCircle2 size={12} className="text-success shrink-0" />
          <span>PDF generated on {new Date(draft.pdf_generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · v{draft.report_version}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Button
          className="flex-1 gap-1.5"
          size="sm"
          disabled={!canGenerate || generating}
          onClick={handleGeneratePdf}
        >
          {generating ? (
            <><Loader2 size={12} className="animate-spin" /> Generating…</>
          ) : draft.pdf_generated ? (
            <><Download size={12} /> Re-generate PDF</>
          ) : (
            <><Download size={12} /> Generate PDF</>
          )}
        </Button>
      </div>

      {!canGenerate && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          All four gates must pass before PDF generation is permitted.
        </p>
      )}
    </div>
  );
}
