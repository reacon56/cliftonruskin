import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, AlertTriangle, BookOpen, Scale, Globe, Bell, Info } from "lucide-react";
import { format } from "date-fns";

export default function MethodologyPage() {
  const { data } = useQuery({
    queryKey: ["methodology-client"],
    queryFn: async () => {
      const { data: docRow, error: dErr } = await supabase
        .from("methodology_document")
        .select("*")
        .eq("audience", "CLIENT")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dErr) throw dErr;
      if (!docRow || !docRow.current_version_id) return null;

      const { data: ver, error: vErr } = await supabase
        .from("methodology_version")
        .select("*")
        .eq("id", docRow.current_version_id)
        .maybeSingle();
      if (vErr) throw vErr;

      return { doc: docRow, currentVersion: ver };
    },
  });

  const doc = data?.doc;
  const currentVersion = data?.currentVersion;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Risk Methodology
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          How Clifton Ruskin assesses, scores, and communicates risk
        </p>
        {currentVersion && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">
              Version {currentVersion.version}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Published {format(new Date(currentVersion.published_at), "dd MMM yyyy")}
            </span>
          </div>
        )}
      </div>

      {/* Dynamic content if published */}
      {currentVersion?.content_markdown && (
        <Card>
          <CardContent className="pt-5 prose prose-sm max-w-none text-foreground">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {currentVersion.content_markdown}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facts vs CR Assessment vs Client Policy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" /> Facts vs CR Assessment vs Client Policy Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> Facts (Indicators)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Objective, externally-sourced data points — FATF listings, EU HRTC designations,
                sanctions programmes, CPI scores. These are retrieved directly from authoritative
                sources and presented without editorial interpretation.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> CR Assessment
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clifton Ruskin's proprietary risk engine applies versioned weighting logic to
                indicators, producing a risk band (Low / Medium / High / Severe). The engine
                version is disclosed on every assessment and linked to this methodology.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-primary" /> Client Policy Mapping
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clients define their own policy rulesets that map indicators to outcomes such as
                enhanced due diligence, escalation triggers, or board reporting. These policies are
                evaluated independently of CR's risk assessment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Indicators Are Used */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Indicators Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { code: "FATF_STATUS", label: "FATF Status", desc: "Whether the jurisdiction appears on the FATF grey or black lists. Call for Action = highest weighting." },
              { code: "EU_AML_HRTC", label: "EU AML High-Risk Third Country", desc: "EU Commission's delegated regulation identifying jurisdictions with strategic deficiencies in AML/CFT frameworks." },
              { code: "SANCTIONS_UK_PROGRAMME", label: "UK Sanctions Programme", desc: "Classified as Targeted or Comprehensive using Clifton Ruskin's curated regime mapping." },
              { code: "SANCTIONS_EU_PROGRAMME", label: "EU Sanctions Programme", desc: "EU restrictive measures programmes, classified by regime type." },
              { code: "SANCTIONS_US_OFAC_PROGRAMME", label: "US OFAC Programme", desc: "OFAC sanctions programmes, classified by regime type." },
              { code: "CPI_SCORE", label: "CPI Score", desc: "Transparency International Corruption Perceptions Index. Below 30 adds a minor risk factor but is never a sole trigger." },
            ].map((ind) => (
              <div key={ind.code} className="flex items-start gap-3 rounded-md border p-3">
                <Badge variant="outline" className="text-[9px] mt-0.5 shrink-0">{ind.code}</Badge>
                <div>
                  <p className="text-xs font-medium text-foreground">{ind.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{ind.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How Alerts Work */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> How Alerts Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            When a jurisdiction indicator changes (e.g. a FATF listing update or new sanctions programme),
            the platform detects the change, records it with an <strong>effective date</strong> (the date
            the change takes legal or regulatory effect, as published by the source authority), and creates
            an alert event.
          </p>
          <div className="rounded-lg border p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">What "Effective Date" Means</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The effective date is the date published by the source authority (e.g. FATF, EU Commission)
              on which a regulatory change comes into force. This is distinct from the "detected at" timestamp,
              which records when Clifton Ruskin's systems first identified the change. Alerts reference both dates
              so clients can distinguish between regulatory timelines and platform detection latency.
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Alerts are distributed to subscribed users and to any organisation that monitors entities
            linked to the affected jurisdiction. Each alert links back to the source and the indicator
            change record for full auditability.
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Important Disclaimer</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The information provided through this platform, including risk assessments, jurisdiction
                indicators, and alert notifications, does <strong>not</strong> constitute legal advice.
                Clifton Ruskin provides assurance intelligence to support clients' compliance programmes,
                but <strong>the client remains solely responsible for all compliance decisions</strong>,
                including whether to onboard, maintain, or exit relationships with third parties.
                Clients should consult qualified legal counsel for advice specific to their regulatory
                obligations and jurisdiction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engine version note */}
      <div className="text-[10px] text-muted-foreground text-center pb-4">
        <Info className="h-3 w-3 inline mr-1" />
        Risk engine version identifiers are displayed on each entity risk assessment and link to this page for traceability.
      </div>
    </div>
  );
}
