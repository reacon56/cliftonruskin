import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";
import { format } from "date-fns";

interface Props {
  entityId: string;
}

const BAND_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  MEDIUM: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  HIGH: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
  SEVERE: { bg: "bg-destructive/20", text: "text-destructive", border: "border-destructive/50" },
};

const BAND_LABELS: Record<string, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  SEVERE: "Severe Risk",
};

export default function CrRiskBandPanel({ entityId }: Props) {
  const navigate = useNavigate();
  const [factorsOpen, setFactorsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const { data: result } = useQuery({
    queryKey: ["cr-risk-result", entityId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("cr_risk_result") as any)
        .select("*")
        .eq("entity_id", entityId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!result) return null;

  const band = result.risk_band as string;
  const style = BAND_STYLES[band] || BAND_STYLES.LOW;
  const factors: any[] = result.contributing_factors_json || [];
  const controls: any[] = result.recommended_controls_json || [];

  return (
    <Card className={`${style.border}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className={`h-4 w-4 ${style.text}`} />
          Clifton Ruskin Risk Assessment
          <Badge
            variant="outline"
            className="text-[9px] ml-auto font-normal cursor-pointer hover:bg-muted"
            onClick={() => navigate("/methodology")}
            title="View risk methodology"
          >
            {result.engine_version} ↗
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Risk Band + Score */}
        <div className="flex items-center gap-3">
          <Badge className={`${style.bg} ${style.text} text-sm px-3 py-1 font-semibold`}>
            {BAND_LABELS[band] || band}
          </Badge>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  band === "LOW" ? "bg-success" : band === "MEDIUM" ? "bg-warning" : "bg-destructive"
                }`}
                style={{ width: `${Math.min(result.risk_score, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{result.risk_score}/100</span>
          </div>
        </div>

        {/* Why — Contributing Factors */}
        <Collapsible open={factorsOpen} onOpenChange={setFactorsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Why this rating? ({factors.length} factor{factors.length !== 1 ? "s" : ""})
              </span>
              {factorsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {factors.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No specific risk factors identified — baseline low risk.
              </p>
            ) : (
              factors.map((f, i) => (
                <div key={i} className="rounded-md border p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                      <Badge variant="outline" className="text-[9px]">{f.indicator_type}</Badge>
                      {f.jurisdiction_country && (
                        <span className="text-[10px] text-muted-foreground">{f.jurisdiction_country}</span>
                      )}
                    </div>
                    <Badge className={`text-[9px] ${style.bg} ${style.text}`}>
                      +{f.score_contribution}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-foreground leading-relaxed">{f.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {f.source_name && (
                      <span className="text-[9px] text-muted-foreground">Source: {f.source_name}</span>
                    )}
                    {f.link_type && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">via {f.link_type}</Badge>
                    )}
                    {f.weight_multiplier != null && f.weight_multiplier < 1 && (
                      <span className="text-[8px] text-muted-foreground/60">×{f.weight_multiplier} weight</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Recommended Controls */}
        <Collapsible open={controlsOpen} onOpenChange={setControlsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Recommended Controls ({controls.length})
              </span>
              {controlsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1.5">
            {controls.map((c, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">{formatControl(c.control)}</p>
                  <p className="text-[10px] text-muted-foreground">{c.rationale}</p>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t">
          <Clock className="h-3 w-3" />
          Assessed {format(new Date(result.generated_at), "dd MMM yyyy HH:mm")}
        </div>
      </CardContent>
    </Card>
  );
}

function formatControl(control: string): string {
  return control
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
