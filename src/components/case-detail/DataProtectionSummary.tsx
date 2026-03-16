import { Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RegChangeAlertBanner } from "@/components/insight/RegChangeAlertBanner";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const DP_CASE_KNOWLEDGE: KnowledgeSection[] = [
  {
    title: "Why Every Case Needs a Documented Lawful Basis",
    content: "Processing personal data in a due diligence context requires a lawful basis under UK GDPR. The basis must be selected before processing begins and recorded in the case file.",
  },
  {
    title: "The Three Bases Most Used in DD",
    type: "keyvalue",
    pairs: [
      { key: "Art 6(1)(f)", value: "Legitimate Interests — standard DD" },
      { key: "Art 6(1)(c)", value: "Legal Obligation — AML/MLR regulated firms" },
      { key: "Art 6(1)(ea)", value: "Recognised Legitimate Interests under DUAA 2025 — crime prevention, no balancing test required" },
    ],
  },
  {
    title: "What DP Review Status Means",
    content: "Pending = AI output generated, human review not yet completed. In Review = analyst actively reviewing. Approved = human sign-off recorded, compliant with Article 22. Flagged = issue identified, legal review required.",
  },
  {
    title: "Retention Period",
    content: "The lawful basis determines the retention period. Art 6(1)(c) (MLR): 5 years from end of relationship. Art 6(1)(f): 6 years (Limitation Act). Records must be deleted or anonymised at expiry unless a new basis applies.",
  },
  {
    title: "Quick Reference",
    type: "keyvalue",
    pairs: [
      { key: "Primary", value: "DUAA 2025 Article 22" },
      { key: "Basis", value: "UK GDPR Article 6" },
      { key: "Guidance", value: "ICO Lawful Basis Guidance" },
      { key: "Regulation", value: "MLR 2017 Regulation 40" },
    ],
  },
];

const LAWFUL_BASIS_LABELS: Record<string, string> = {
  legitimate_interests: "Legitimate interests",
  contract: "Performance of a contract",
  legal_obligation: "Legal obligation",
  consent: "Consent",
  public_task: "Public task",
  vital_interests: "Vital interests",
};

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identity details",
  roles: "Directorships / roles",
  sanctions_pep: "Sanctions / PEP screening",
  adverse_media: "Adverse media",
  litigation: "Litigation / court records",
  social_media: "Social media / online presence",
  criminal_offence: "Criminal offence data",
  special_category: "Special category data",
};

interface Props {
  caseData: any;
  isInternal?: boolean;
  dpReview?: any;
}

export default function DataProtectionSummary({ caseData, isInternal, dpReview }: Props) {
  if (!caseData?.requires_personal_data) return null;

  const categories: string[] = Array.isArray(caseData.data_categories) ? caseData.data_categories : [];
  const riskLevel = caseData.dp_risk_level ?? "low";

  return (
    <div className="fvc-card">
      <RegChangeAlertBanner
        alertId="duaa-2025-art22-case"
        text="DUAA 2025 — Article 22 Applies to This Review: Where AI-assisted processing has been used in this case, Article 22 of the Data (Use and Access) Act 2025 requires a documented human review before the case record is finalised. The DP Review Status field below records this compliance step."
        dateText="In force: 5 Feb 2026"
      />

      <div className="mb-4">
        <KnowledgePanelWidget
          pageId="case-dp-lawful-basis"
          title="Lawful Basis & DP Review — What This Tab Records"
          sections={DP_CASE_KNOWLEDGE}
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-accent" />
        <h2 className="fvc-heading-3 text-foreground">Data Protection</h2>
        <Badge className={`ml-auto text-[10px] capitalize ${
          riskLevel === "high" ? "bg-destructive/10 text-destructive" :
          riskLevel === "medium" ? "bg-warning/10 text-warning" :
          "bg-muted text-muted-foreground"
        }`}>
          {riskLevel} risk
        </Badge>
      </div>
      <div className="fvc-gold-rule mb-4" />

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Purpose</span>
          <span className="text-foreground font-medium text-right max-w-[60%]">
            {caseData.processing_purpose}
            {caseData.processing_purpose_detail ? ` — ${caseData.processing_purpose_detail}` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lawful basis</span>
          <span className="text-foreground font-medium">{LAWFUL_BASIS_LABELS[caseData.lawful_basis] || caseData.lawful_basis}</span>
        </div>
        {caseData.lia_summary && (
          <div className="pt-2 border-t border-border">
            <span className="fvc-label block mb-1">LIA Summary</span>
            <p className="text-foreground leading-relaxed text-xs">{caseData.lia_summary}</p>
          </div>
        )}
        {categories.length > 0 && (
          <div className="pt-2 border-t border-border">
            <span className="fvc-label block mb-2">Data Categories</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Badge key={cat} variant="outline" className="text-[10px] font-normal">
                  {CATEGORY_LABELS[cat] || cat}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Minimisation confirmed</span>
          <span className="text-foreground font-medium">{caseData.minimisation_confirmed ? "Yes" : "No"}</span>
        </div>
        {caseData.retention_months !== null && caseData.retention_months !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retention</span>
            <span className="text-foreground font-medium">{caseData.retention_months === 0 ? "Per policy" : `${caseData.retention_months} months`}</span>
          </div>
        )}

        {/* DP Review status */}
        {caseData.dp_review_required && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={12} className="text-warning" />
              <span className="text-xs font-medium text-foreground">DP Review Required</span>
            </div>
            {dpReview ? (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={`text-[10px] capitalize ${
                    dpReview.status === "approved" ? "bg-success/10 text-success" :
                    dpReview.status === "changes_required" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {dpReview.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {/* Only show internal review notes to internal users */}
                {isInternal && dpReview.notes && (
                  <div className="pt-1">
                    <span className="fvc-label block mb-1">Review Notes</span>
                    <p className="text-foreground leading-relaxed">{dpReview.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Pending CR review</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
