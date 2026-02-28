import { useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, Globe, CheckCircle2, ExternalLink, Clock, AlertTriangle, BookOpen,
} from "lucide-react";
import { countryCodeToFlag } from "@/lib/country-flag";
import { format, subMonths } from "date-fns";
import { computeFreshness, type FreshnessStatus } from "@/lib/freshness-utils";
import FreshnessBadge from "@/components/FreshnessBadge";
import { useCadenceRules } from "@/components/CountryCard";

/* ── helpers ── */
const INDICATOR_LABELS: Record<string, string> = {
  FATF_STATUS: "FATF Status",
  EU_AML_HRTC: "EU AML High-Risk Third Country",
  SANCTIONS_UK_PROGRAMME: "UK Sanctions Programme",
  SANCTIONS_EU_PROGRAMME: "EU Sanctions Programme",
  SANCTIONS_US_OFAC_PROGRAMME: "US OFAC Programme",
  US_STATE_SPONSOR_TERRORISM: "US State Sponsor of Terrorism",
  US_FINCEN_311: "US FinCEN Section 311",
  EU_TAX_NONCOOP: "EU Tax Non-Cooperative List",
  CPI_SCORE: "CPI Score",
};

const INDICATOR_IMPLICATIONS: Record<string, string> = {
  FATF_STATUS: "A jurisdiction with FATF observations may require Enhanced Due Diligence (EDD) and additional source corroboration.",
  EU_AML_HRTC: "Listed jurisdictions trigger mandatory enhanced measures under EU AML regulations for EU-regulated entities.",
  SANCTIONS_UK_PROGRAMME: "Active UK sanctions may restrict certain dealings and require screening of all connected parties.",
  SANCTIONS_EU_PROGRAMME: "EU sanctions programmes require transaction-level and relationship-level screening.",
  SANCTIONS_US_OFAC_PROGRAMME: "OFAC programmes carry strict liability risk; US-nexus activities require comprehensive screening.",
  US_STATE_SPONSOR_TERRORISM: "Designation imposes significant restrictions on US-connected financial dealings.",
  US_FINCEN_311: "Section 311 measures may require special due diligence or prohibit certain correspondent banking.",
  EU_TAX_NONCOOP: "Listed jurisdictions may trigger additional tax transparency checks and enhanced reporting.",
  CPI_SCORE: "Lower CPI scores indicate higher perceived corruption, informing the depth of integrity checks required.",
};

const COMMON_CONTROLS = [
  "Enhanced source corroboration (minimum two independent sources)",
  "Senior management sign-off on engagement decisions",
  "Beneficial ownership verification to ultimate level",
  "Sanctions screening across all relevant regimes (UK, EU, OFAC)",
  "Periodic re-screening at shortened intervals",
  "Adverse media monitoring with local-language coverage",
  "PEP and close-associate screening",
  "Transaction pattern analysis where applicable",
  "Documentary evidence of legitimate business purpose",
  "Escalation to compliance committee for material findings",
];

function formatValue(vj: any): string {
  if (!vj || typeof vj !== "object") return String(vj ?? "—");
  const parts: string[] = [];
  if (vj.status) parts.push(vj.status);
  if (vj.score != null) parts.push(`Score: ${vj.score}`);
  if (vj.rank != null) parts.push(`Rank: ${vj.rank}`);
  if (vj.programme) parts.push(vj.programme);
  if (vj.designations != null) parts.push(`${vj.designations} designations`);
  if (vj.packages != null) parts.push(`${vj.packages} packages`);
  if (vj.note) parts.push(vj.note);
  return parts.join(" · ") || "—";
}

export default function JurisdictionBriefPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { data: cadenceRules } = useCadenceRules();

  const { data: jurisdiction, isLoading } = useQuery({
    queryKey: ["jurisdiction-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: indicators = [] } = useQuery({
    queryKey: ["jurisdiction-indicators", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_indicator")
        .select("*")
        .eq("jurisdiction_id", id!)
        .order("indicator_type");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const twelveMonthsAgo = useMemo(() => subMonths(new Date(), 12).toISOString(), []);

  const { data: recentChanges = [] } = useQuery({
    queryKey: ["jurisdiction-changes-12m", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_indicator_change")
        .select("*")
        .eq("jurisdiction_id", id!)
        .gte("detected_at", twelveMonthsAgo)
        .order("detected_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  /* ── derived risk signals ── */
  const activeIndicatorTypes = useMemo(
    () => new Set(indicators.map((i: any) => i.indicator_type)),
    [indicators]
  );

  const relevantControls = useMemo(() => {
    // Show all controls if high-risk indicators are present
    const highRisk = activeIndicatorTypes.has("FATF_STATUS") ||
      activeIndicatorTypes.has("EU_AML_HRTC") ||
      activeIndicatorTypes.has("SANCTIONS_UK_PROGRAMME") ||
      activeIndicatorTypes.has("SANCTIONS_EU_PROGRAMME") ||
      activeIndicatorTypes.has("SANCTIONS_US_OFAC_PROGRAMME");
    return highRisk ? COMMON_CONTROLS : COMMON_CONTROLS.slice(0, 6);
  }, [activeIndicatorTypes]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>;
  }
  if (!jurisdiction) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Jurisdiction not found</div>;
  }

  const flag = countryCodeToFlag(jurisdiction.country_code) || "🌐";

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #jurisdiction-brief, #jurisdiction-brief * { visibility: visible; }
          #jurisdiction-brief { position: absolute; top: 0; left: 0; width: 100%; padding: 32px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="jurisdiction-brief" ref={printRef} className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        {/* Navigation */}
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/jurisdictions/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Profile
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print Brief
          </Button>
        </div>

        {/* Header */}
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest mb-3">
            <Globe className="h-3.5 w-3.5" />
            Clifton Ruskin — Jurisdiction Brief
          </div>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{flag}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{jurisdiction.country_name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                ISO {jurisdiction.country_code} · Updated {format(new Date(jurisdiction.updated_at), "dd MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Overview */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" /> Overview
          </h2>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This brief provides a summary of the key regulatory and risk indicators associated with{" "}
                <strong className="text-foreground">{jurisdiction.country_name}</strong> that are relevant to due diligence
                scoping and assurance planning. The information below is drawn from authoritative public sources and is
                maintained by Clifton Ruskin's intelligence function. It is intended to support proportionate
                decision-making and does not constitute legal or regulatory advice.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 2. Current Indicators & Implications */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" /> Current Indicators &amp; Implications
          </h2>
          {indicators.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No indicators currently recorded for this jurisdiction.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {indicators.map((ind: any) => {
                const rule = cadenceRules?.get(ind.indicator_type);
                const fresh = computeFreshness(ind.retrieved_at, rule);
                return (
                  <Card key={ind.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {INDICATOR_LABELS[ind.indicator_type] || ind.indicator_type}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {formatValue(ind.value_json)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FreshnessBadge status={fresh.status} showLabel className="text-xs" />
                          <span className="text-[10px] text-muted-foreground">
                            Effective: {format(new Date(ind.effective_date), "dd MMM yyyy")}
                          </span>
                        </div>
                      </div>
                      {INDICATOR_IMPLICATIONS[ind.indicator_type] && (
                        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-accent/30 pl-3">
                          {INDICATOR_IMPLICATIONS[ind.indicator_type]}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Common Control Enhancements */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-accent" /> Common Control Enhancements
          </h2>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Based on the current indicator profile, the following controls are commonly applied to
                engagements involving this jurisdiction. Specific requirements depend on the entity's
                risk tier and the client organisation's policies.
              </p>
              <ul className="space-y-2">
                {relevantControls.map((ctrl, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-foreground">{ctrl}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* 4. Change History (last 12 months) */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" /> Change History — Last 12 Months
          </h2>
          {recentChanges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No indicator changes detected in the past 12 months.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentChanges.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-3 pb-3 flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      <AlertTriangle className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {INDICATOR_LABELS[c.indicator_type] || c.indicator_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(c.detected_at), "dd MMM yyyy")}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.old_value_json && (
                          <span>
                            <span className="text-muted-foreground">From:</span>{" "}
                            <span className="text-foreground">{formatValue(c.old_value_json)}</span>
                            {" → "}
                          </span>
                        )}
                        <span className="text-foreground">{formatValue(c.new_value_json)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 5. Methodology link */}
        <section>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Methodology &amp; Framework</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Jurisdiction indicators are assessed within the context of Clifton Ruskin's proprietary
                    risk methodology. For details on how indicators inform risk tiering, control triggers,
                    and due diligence scoping, please refer to the methodology documentation.
                  </p>
                  <Link to="/methodology" className="no-print">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Methodology
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Disclaimer */}
        <section className="border-t border-border pt-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">
            This jurisdiction brief is prepared by Clifton Ruskin Ltd for informational purposes only.
            It does not constitute legal, tax, or regulatory advice. The indicators and assessments
            presented are based on publicly available information and proprietary analysis at the date
            of publication. Clifton Ruskin accepts no liability for decisions made in reliance on this
            document. © {new Date().getFullYear()} Clifton Ruskin Ltd. All rights reserved.
          </p>
        </section>
      </div>
    </>
  );
}
