import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, Info, Building2, Globe, Users, FileText } from "lucide-react";

interface AssuranceNoteReportProps {
  entityName: string;
  caseDate: string;
  riskTier?: string;
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

export default function AssuranceNoteReport({ entityName, caseDate, riskTier }: AssuranceNoteReportProps) {
  const report = DUMMY_REPORT;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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
