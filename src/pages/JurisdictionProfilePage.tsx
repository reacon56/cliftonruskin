import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, ExternalLink, Info, ArrowUp, ArrowDown, Minus, Clock, Shield } from "lucide-react";
import { countryCodeToFlag } from "@/lib/country-flag";
import { format } from "date-fns";
import JurisdictionSubscribeToggle from "@/components/JurisdictionSubscribeToggle";
import FreshnessBadge from "@/components/FreshnessBadge";
import { useCadenceRules } from "@/components/CountryCard";
import { computeFreshness, computeOverallFreshness, type FreshnessStatus } from "@/lib/freshness-utils";

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

function deriveChangeClass(oldVal: any, newVal: any): "added" | "removed" | "changed" {
  if (!oldVal) return "added";
  if (!newVal) return "removed";
  return "changed";
}

export default function JurisdictionProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: cadenceRules } = useCadenceRules();
  const navigate = useNavigate();

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

  const { data: changes = [] } = useQuery({
    queryKey: ["jurisdiction-changes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_indicator_change")
        .select("*")
        .eq("jurisdiction_id", id!)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: regimeClassifications = [] } = useQuery({
    queryKey: ["jurisdiction-regimes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanctions_regime_map")
        .select("*")
        .eq("jurisdiction_id", id!)
        .order("authority");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Group indicators by type
  const grouped = indicators.reduce<Record<string, typeof indicators>>((acc, ind) => {
    const type = (ind as any).indicator_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(ind);
    return acc;
  }, {});

  // Overall freshness
  const overallFreshness = useMemo((): FreshnessStatus => {
    if (!cadenceRules || indicators.length === 0) return "UNKNOWN";
    const statuses: FreshnessStatus[] = [];
    for (const ind of indicators as any[]) {
      const rule = cadenceRules.get(ind.indicator_type);
      statuses.push(computeFreshness(ind.retrieved_at, rule).status);
    }
    return computeOverallFreshness(statuses);
  }, [indicators, cadenceRules]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>;
  }

  if (!jurisdiction) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Jurisdiction not found</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jurisdictions")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-4xl">{countryCodeToFlag(jurisdiction.country_code) || "🌐"}</span>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{jurisdiction.country_name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>ISO: {jurisdiction.country_code}</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last refreshed: {format(new Date(jurisdiction.updated_at), "dd MMM yyyy HH:mm")}
            </span>
          </div>
        </div>
      </div>

      {/* Subscribe Toggle */}
      {id && <JurisdictionSubscribeToggle jurisdictionId={id} />}

      {/* Current Indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Current Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {indicators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No indicators recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Retrieved</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).map(([type, inds]) =>
                  inds.map((ind: any, idx: number) => (
                    <TableRow key={ind.id}>
                      {idx === 0 && (
                        <TableCell rowSpan={inds.length} className="font-medium text-sm align-top">
                          <Badge variant="outline" className="text-[10px]">{INDICATOR_LABELS[type] || type}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{formatValue(ind.value_json)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(ind.effective_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(ind.retrieved_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs">
                        {ind.source_url ? (
                          <a href={ind.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {ind.source_name} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{ind.source_name}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sanctions Regime Classifications */}
      {regimeClassifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Sanctions Regime Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {regimeClassifications.map((rc: any) => (
              <div key={rc.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{rc.authority}</Badge>
                  <Badge
                    variant={rc.regime_type === "COMPREHENSIVE" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {rc.regime_type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Effective: {format(new Date(rc.effective_date), "dd MMM yyyy")}
                  </span>
                </div>
                {rc.rationale_text && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{rc.rationale_text}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="italic">Classified by Clifton Ruskin using curated mapping</span>
                  {rc.source_url && (
                    <a href={rc.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                      Source <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* What This Means */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">What this means</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jurisdiction indicators inform control triggers and risk weighting within the platform's
                risk model. They help determine the appropriate tier of due diligence, flag enhanced
                monitoring requirements, and identify where sanctions screening or source restrictions
                apply. These indicators are <strong>not</strong> a full assessment of conditions on the ground —
                they reflect the regulatory and enforcement signals relevant to Clifton Ruskin's
                assurance methodology.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Change Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No changes detected yet</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              {changes.map((c: any) => {
                const changeClass = deriveChangeClass(c.old_value_json, c.new_value_json);
                const icon = changeClass === "added"
                  ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
                  : changeClass === "removed"
                  ? <ArrowDown className="h-3.5 w-3.5 text-destructive" />
                  : <Minus className="h-3.5 w-3.5 text-primary" />;
                const classBadge = changeClass === "added" ? "default" as const
                  : changeClass === "removed" ? "destructive" as const
                  : "secondary" as const;

                return (
                  <div key={c.id} className="relative">
                    <div className="absolute -left-6 top-1.5 w-[9px] h-[9px] rounded-full border-2 border-primary bg-background" />
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {icon}
                          <Badge variant="outline" className="text-[10px]">{INDICATOR_LABELS[c.indicator_type] || c.indicator_type}</Badge>
                          <Badge variant={classBadge} className="text-[10px] capitalize">{changeClass}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(c.detected_at), "dd MMM yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {c.old_value_json && (
                          <div>
                            <span className="text-muted-foreground">Old: </span>
                            <span className="text-foreground">{formatValue(c.old_value_json)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">New: </span>
                          <span className="text-foreground">{formatValue(c.new_value_json)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Source: {c.source_url ? (
                          <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{c.source_name}</a>
                        ) : c.source_name}
                        {" · "}Effective: {format(new Date(c.new_effective_date), "dd MMM yyyy")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
