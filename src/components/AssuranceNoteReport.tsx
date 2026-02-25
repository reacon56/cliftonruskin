import { useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle2, Info, Building2, Globe, Users, FileText, Download } from "lucide-react";

interface AssuranceNoteReportProps {
  entityName: string;
  caseDate: string;
  riskTier?: string;
  dpSummary?: {
    purpose?: string;
    lawfulBasis?: string;
    minimisationConfirmed?: boolean;
  };
}

const DUMMY_REPORT = {
  reference: "FVC-AN-2026-0042",
  classification: "CONFIDENTIAL",
  riskRating: "Medium",
  overallScore: 62,
  executiveSummary:
    "Based on our review of publicly available records, corporate registry filings, and screening databases, we have identified no materially adverse information that would preclude a commercial relationship. However, certain areas warrant enhanced monitoring as outlined below.",
  sections: [
    {
      title: "Corporate Identity & Registration",
      icon: Building2,
      status: "clear" as const,
      findings: [
        "Entity is registered and in good standing with the relevant corporate registry.",
        "Directors and officers match the information provided by the client.",
        "No discrepancies identified in the registered address or incorporation details.",
      ],
    },
    {
      title: "Beneficial Ownership",
      icon: Users,
      status: "attention" as const,
      findings: [
        "Ultimate beneficial owner identified as holding 78% of voting shares.",
        "One layer of intermediate holding structure noted (BVI-registered SPV).",
        "Recommend periodic re-verification of ownership chain given offshore element.",
      ],
    },
    {
      title: "Sanctions & Watchlist Screening",
      icon: Shield,
      status: "clear" as const,
      findings: [
        "No matches against OFAC SDN, EU Consolidated, UN Security Council, or HMT sanctions lists.",
        "No matches against PEP databases (Dow Jones, Refinitiv World-Check).",
        "No adverse entries in law enforcement or regulatory action databases.",
      ],
    },
    {
      title: "Adverse Media Review",
      icon: Globe,
      status: "attention" as const,
      findings: [
        "Minor coverage identified relating to a 2024 employment tribunal claim (resolved, no finding against entity).",
        "No coverage relating to fraud, corruption, money laundering, or terrorist financing.",
        "Social media presence consistent with stated business activities.",
      ],
    },
    {
      title: "Financial Standing",
      icon: FileText,
      status: "clear" as const,
      findings: [
        "Most recent filed accounts show a healthy balance sheet with positive net assets.",
        "No county court judgements, winding-up petitions, or insolvency events recorded.",
        "Credit risk score within acceptable range for the sector.",
      ],
    },
  ],
  recommendation:
    "We recommend proceeding with the proposed relationship subject to standard ongoing monitoring. The offshore holding structure should be flagged for enhanced periodic review in accordance with your risk policy.",
  analyst: "J. Harrington, CAMS",
  reviewer: "S. Pemberton, Senior Analyst",
};

const statusConfig = {
  clear: { label: "Clear", color: "bg-success/10 text-success", icon: CheckCircle2 },
  attention: { label: "Attention", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  adverse: { label: "Adverse", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export default function AssuranceNoteReport({ entityName, caseDate, riskTier, dpSummary }: AssuranceNoteReportProps) {
  const report = DUMMY_REPORT;
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = useCallback(() => {
    if (!reportRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportHTML = reportRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Assurance Note — ${entityName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', sans-serif; color: #1a2235; padding: 48px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
          h2, h3, h4 { font-family: 'Cormorant Garamond', serif; }
          .report-header { display: flex; justify-content: space-between; border-bottom: 1px solid #e0d9cf; padding-bottom: 24px; margin-bottom: 24px; }
          .classification { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
          .report-title { font-size: 28px; font-weight: 600; }
          .entity-name { font-size: 14px; color: #6b7280; margin-top: 4px; }
          .ref-label { font-size: 11px; color: #6b7280; }
          .ref-value { font-size: 13px; font-family: monospace; font-weight: 500; }
          .risk-bar-container { background: #f5f0eb; border: 1px solid #e0d9cf; border-radius: 8px; padding: 16px; margin-top: 20px; }
          .risk-bar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .risk-bar-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #6b7280; }
          .risk-badge { font-size: 11px; padding: 2px 10px; border-radius: 12px; font-weight: 500; }
          .risk-medium { background: #fef3c7; color: #92400e; }
          .risk-low { background: #d1fae5; color: #065f46; }
          .risk-high { background: #fee2e2; color: #991b1b; }
          .risk-track { width: 100%; height: 6px; background: #e0d9cf; border-radius: 4px; overflow: hidden; }
          .risk-fill { height: 100%; border-radius: 4px; }
          .risk-labels { display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; margin-top: 4px; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; margin-top: 28px; }
          .gold-rule { width: 40px; height: 2px; background: #c0924c; margin-bottom: 12px; }
          .summary-text { font-size: 13px; line-height: 1.7; }
          .finding-card { border: 1px solid #e0d9cf; border-radius: 8px; padding: 16px; margin-top: 16px; page-break-inside: avoid; }
          .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .finding-title { font-size: 14px; font-weight: 600; }
          .status-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
          .status-clear { background: #d1fae5; color: #065f46; }
          .status-attention { background: #fef3c7; color: #92400e; }
          .status-adverse { background: #fee2e2; color: #991b1b; }
          .finding-list { list-style: none; }
          .finding-item { font-size: 13px; color: #374151; margin-bottom: 6px; padding-left: 12px; position: relative; }
          .finding-item::before { content: "•"; position: absolute; left: 0; color: #9ca3af; }
          .recommendation { border: 1px solid #dbc49a; border-radius: 8px; padding: 20px; background: #faf6f0; margin-top: 24px; }
          .recommendation-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
          .recommendation-text { font-size: 13px; line-height: 1.7; }
          .sign-off { display: flex; justify-content: space-between; border-top: 1px solid #e0d9cf; padding-top: 16px; margin-top: 28px; font-size: 11px; color: #6b7280; }
          .sign-name { font-weight: 500; color: #1a2235; }
          .no-print { display: none !important; }
          .pdf-logo { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; margin-bottom: 28px; border-bottom: 2px solid #c0924c; }
          .pdf-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: #1a2235; letter-spacing: -0.01em; }
          .pdf-logo-sub { font-family: 'DM Sans', sans-serif; font-size: 8px; text-transform: uppercase; letter-spacing: 0.25em; color: #c0924c; margin-top: 2px; }
          .pdf-logo-shield { width: 36px; height: 36px; border: 2px solid #c0924c; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 15px; font-weight: 700; color: #c0924c; }
          .pdf-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0d9cf; }
          .pdf-footer-brand { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .pdf-footer-name { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; color: #1a2235; }
          .pdf-footer-ref { font-family: monospace; font-size: 10px; color: #9ca3af; }
          .pdf-footer-disclaimer { font-size: 9px; color: #9ca3af; line-height: 1.5; }
          .pdf-footer-contacts { display: flex; gap: 24px; margin-top: 12px; font-size: 9px; color: #6b7280; }
          @media print {
            body { padding: 24px; }
            .pdf-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px 48px; background: white; }
          }
        </style>
      </head>
      <body>
        <!-- Branded header -->
        <div class="pdf-logo">
          <div>
            <div class="pdf-logo-text">Far View &amp; Chase</div>
            <div class="pdf-logo-sub">Assurance &amp; Advisory</div>
          </div>
          <div class="pdf-logo-shield">FVC</div>
        </div>

        <div class="report-header">
          <div>
            <div class="classification">${report.classification}</div>
            <h2 class="report-title">Assurance Note</h2>
            <p class="entity-name">${entityName}</p>
          </div>
          <div style="text-align: right;">
            <div class="ref-label">Reference</div>
            <div class="ref-value">${report.reference}</div>
            <div class="ref-label" style="margin-top: 8px;">Date</div>
            <div style="font-size: 13px;">${new Date(caseDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        <div class="risk-bar-container">
          <div class="risk-bar-header">
            <span class="risk-bar-label">Overall Risk Assessment</span>
            <span class="risk-badge ${report.riskRating === "Low" ? "risk-low" : report.riskRating === "Medium" ? "risk-medium" : "risk-high"}">${report.riskRating} Risk</span>
          </div>
          <div class="risk-track">
            <div class="risk-fill" style="width: ${report.overallScore}%; background: ${report.overallScore < 40 ? "#059669" : report.overallScore < 70 ? "#d97706" : "#dc2626"};"></div>
          </div>
          <div class="risk-labels">
            <span>Low Risk</span>
            <span>Score: ${report.overallScore}/100</span>
            <span>High Risk</span>
          </div>
        </div>

        <h3 class="section-title">Executive Summary</h3>
        <div class="gold-rule"></div>
        <p class="summary-text">${report.executiveSummary}</p>

        ${report.sections.map((section) => {
          const statusClass = section.status === "clear" ? "status-clear" : section.status === "attention" ? "status-attention" : "status-adverse";
          const statusLabel = section.status === "clear" ? "Clear" : section.status === "attention" ? "Attention" : "Adverse";
          return `
            <div class="finding-card">
              <div class="finding-header">
                <span class="finding-title">${section.title}</span>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
              </div>
              <ul class="finding-list">
                ${section.findings.map((f) => `<li class="finding-item">${f}</li>`).join("")}
              </ul>
            </div>
          `;
        }).join("")}

        <div class="recommendation">
          <div class="recommendation-title">Recommendation</div>
          <p class="recommendation-text">${report.recommendation}</p>
        </div>

        <div class="sign-off">
          <div><div class="sign-name">${report.analyst}</div><div>Prepared by</div></div>
          <div style="text-align: right;"><div class="sign-name">${report.reviewer}</div><div>Reviewed by</div></div>
        </div>

        <!-- Branded footer -->
        <div class="pdf-footer">
          <div class="pdf-footer-brand">
            <span class="pdf-footer-name">Far View &amp; Chase Ltd</span>
            <span class="pdf-footer-ref">${report.reference} · Page 1 of 1</span>
          </div>
          <div class="pdf-footer-disclaimer">
            This document is confidential and intended solely for the use of the commissioning party. It must not be disclosed, copied, or distributed to any third party without the prior written consent of Far View &amp; Chase Ltd. The findings herein are based on information available at the date of issue and do not constitute legal advice. Far View &amp; Chase Ltd accepts no liability for any loss arising from reliance on this document.
          </div>
          <div class="pdf-footer-contacts">
            <span>info@farviewchase.com</span>
            <span>+44 (0)20 7946 0123</span>
            <span>farviewchase.com</span>
            <span>Registered in England &amp; Wales No. 12345678</span>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }, [entityName, caseDate]);

  return (
    <div className="space-y-6 animate-fade-in" ref={reportRef}>
      {/* Download button */}
      <div className="flex justify-end no-print">
        <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
          <Download size={14} />
          Download PDF
        </Button>
      </div>
      <div className="border-b border-border pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="fvc-label mb-2">{report.classification}</div>
            <h2 className="fvc-heading-2 text-foreground">Assurance Note</h2>
            <p className="text-sm text-muted-foreground mt-1">{entityName}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Reference</div>
            <div className="text-sm font-medium text-foreground font-mono">{report.reference}</div>
            <div className="text-xs text-muted-foreground mt-2">Date</div>
            <div className="text-sm text-foreground">{new Date(caseDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        {/* Risk score bar */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Risk Assessment</span>
            <Badge className={`fvc-status-badge ${
              report.riskRating === "Low" ? "bg-success/10 text-success" :
              report.riskRating === "Medium" ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            }`}>
              {report.riskRating} Risk
            </Badge>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${report.overallScore}%`,
                background: report.overallScore < 40
                  ? "hsl(var(--success))"
                  : report.overallScore < 70
                  ? "hsl(var(--warning))"
                  : "hsl(var(--destructive))",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Low Risk</span>
            <span className="text-[10px] text-muted-foreground">Score: {report.overallScore}/100</span>
            <span className="text-[10px] text-muted-foreground">High Risk</span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div>
        <h3 className="fvc-heading-3 text-foreground mb-3">Executive Summary</h3>
        <div className="fvc-gold-rule mb-3" />
        <p className="text-sm text-foreground leading-relaxed">{report.executiveSummary}</p>
      </div>

      {/* Sections */}
      {report.sections.map((section) => {
        const config = statusConfig[section.status];
        const StatusIcon = config.icon;
        const SectionIcon = section.icon;
        return (
          <div key={section.title} className="fvc-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SectionIcon size={16} className="text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
              </div>
              <Badge className={`fvc-status-badge ${config.color} gap-1`}>
                <StatusIcon size={10} />
                {config.label}
              </Badge>
            </div>
            <ul className="space-y-2">
              {section.findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-muted-foreground mt-1 shrink-0">•</span>
                  <span className="leading-relaxed">{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Recommendation */}
      <div className="border border-accent/20 rounded-lg p-5 bg-accent/5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Recommendation</h3>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{report.recommendation}</p>
      </div>

      {/* Data Protection Summary (if applicable) */}
      {dpSummary?.purpose && (
        <div className="border border-border rounded-lg p-5 bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Data Protection Summary</h3>
          </div>
          <div className="space-y-1.5 text-xs text-foreground">
            <div className="flex justify-between"><span className="text-muted-foreground">Purpose</span><span>{dpSummary.purpose}</span></div>
            {dpSummary.lawfulBasis && <div className="flex justify-between"><span className="text-muted-foreground">Lawful basis</span><span>{dpSummary.lawfulBasis}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">As-of date</span><span>{new Date().toISOString().split("T")[0]}</span></div>
            {dpSummary.minimisationConfirmed && (
              <p className="text-muted-foreground pt-1 italic">Only necessary personal data was processed in accordance with the stated purpose and lawful basis.</p>
            )}
          </div>
        </div>
      )}

      {/* Sign-off */}
      <div className="border-t border-border pt-4 flex justify-between text-xs text-muted-foreground">
        <div>
          <div className="font-medium text-foreground">{report.analyst}</div>
          <div>Prepared by</div>
        </div>
        <div className="text-right">
          <div className="font-medium text-foreground">{report.reviewer}</div>
          <div>Reviewed by</div>
        </div>
      </div>
    </div>
  );
}
