import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RegChangeAlertBanner } from "@/components/insight/RegChangeAlertBanner";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const DP_ENTITY_KNOWLEDGE: KnowledgeSection[] = [
  {
    title: "Why Every Case Needs a Documented Lawful Basis",
    content:
      "Processing personal data in a due diligence context requires a lawful basis under UK GDPR. The basis must be selected before processing begins and recorded in the case file.",
  },
  {
    title: "The Three Bases Most Used in DD",
    type: "keyvalue",
    pairs: [
      { key: "Art 6(1)(f)", value: "Legitimate Interests — standard DD" },
      { key: "Art 6(1)(c)", value: "Legal Obligation — AML/MLR regulated firms" },
      {
        key: "Art 6(1)(ea)",
        value:
          "Recognised Legitimate Interests under DUAA 2025 — crime prevention, no balancing test required",
      },
    ],
  },
  {
    title: "What DP Review Status Means",
    content:
      "Pending = AI output generated, human review not yet completed. In Review = analyst actively reviewing. Approved = human sign-off recorded, compliant with Article 22. Flagged = issue identified, legal review required.",
  },
  {
    title: "Retention Period",
    content:
      "The lawful basis determines the retention period. Art 6(1)(c) (MLR): 5 years from end of relationship. Art 6(1)(f): 6 years (Limitation Act). Records must be deleted or anonymised at expiry unless a new basis applies.",
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

const RISK_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

const REVIEW_STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  changes_required: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  pending: "bg-muted text-muted-foreground",
  in_review: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
};

interface Props {
  entity: any;
  cases: any[];
}

export default function DataProtectionTab({ entity, cases }: Props) {
  // Fetch DP declarations for this entity's cases
  const caseIds = cases.map((c: any) => c.id);

  const { data: dpDeclarations = [] } = useQuery({
    queryKey: ["entity-dp-declarations", entity.id],
    enabled: caseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_dp_declarations")
        .select("*")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dpReviews = [] } = useQuery({
    queryKey: ["entity-dp-reviews", entity.id],
    enabled: caseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_protection_reviews")
        .select("*")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Build a map of case_id → review
  const reviewMap = new Map(dpReviews.map((r: any) => [r.case_id, r]));

  // Cases with DP data
  const dpCases = cases.filter(
    (c: any) => c.requires_personal_data || c.lawful_basis || c.dp_risk_level
  );

  return (
    <div className="space-y-6">
      <RegChangeAlertBanner
        alertId="duaa-2025-art22-entity"
        text="DUAA 2025 — Article 22 Applies to This Review: Where AI-assisted processing has been used in this case, Article 22 of the Data (Use and Access) Act 2025 requires a documented human review before the case record is finalised. The DP Review Status field below records this compliance step."
        dateText="In force: 5 Feb 2026"
      />

      <KnowledgePanelWidget
        pageId="entity-dp-lawful-basis"
        title="Lawful Basis & DP Review — What This Tab Records"
        sections={DP_ENTITY_KNOWLEDGE}
      />

      {dpCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground max-w-sm">
              No cases with data protection declarations recorded for this entity yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dpCases.map((c: any) => {
            const review = reviewMap.get(c.id);
            const riskLevel = c.dp_risk_level ?? "low";

            return (
              <Card key={c.id} className="hover:border-primary/20 transition-colors duration-200">
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck size={14} className="text-accent" />
                      <span className="text-sm font-semibold text-foreground">
                        {c.product_type?.replace(/_/g, " ")} — {c.case_type}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${RISK_STYLES[riskLevel] ?? RISK_STYLES.low}`}
                      >
                        {riskLevel} risk
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lawful basis</span>
                      <span className="text-foreground font-medium">
                        {LAWFUL_BASIS_LABELS[c.lawful_basis] ?? c.lawful_basis ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimisation</span>
                      <span className="text-foreground font-medium">
                        {c.minimisation_confirmed ? "Confirmed" : "Not confirmed"}
                      </span>
                    </div>
                    {c.retention_months != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retention</span>
                        <span className="text-foreground font-medium">
                          {c.retention_months === 0
                            ? "Per policy"
                            : `${c.retention_months} months`}
                        </span>
                      </div>
                    )}
                    {c.processing_purpose && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Purpose</span>
                        <span className="text-foreground font-medium truncate max-w-[200px]">
                          {c.processing_purpose}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DP Review */}
                  {c.dp_review_required && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-accent" />
                        <span className="text-xs font-medium text-foreground">
                          DP Review Required
                        </span>
                        {review ? (
                          <Badge
                            className={`text-[10px] capitalize ml-auto ${
                              REVIEW_STYLES[review.status] ?? REVIEW_STYLES.pending
                            }`}
                          >
                            {review.status.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] ml-auto bg-muted text-muted-foreground">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
