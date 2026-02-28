import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, AlertTriangle, ShieldCheck, HelpCircle, Clock } from "lucide-react";
import { countryCodeToFlag } from "@/lib/country-flag";
import { formatDistanceToNow } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CountryCardProps {
  jurisdictionId: string;
  /** Pre-loaded data – avoids extra queries when parent already fetched */
  preloaded?: {
    countryCode: string;
    countryName: string;
    indicators?: Map<string, any>;
  };
  /** Hide the "View profile →" affordance */
  hideLink?: boolean;
  /** Compact mode for inline usage */
  compact?: boolean;
}

type Indicator = {
  indicator_type: string;
  value_json: any;
  retrieved_at: string | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fatfLabel(status: string | undefined): { text: string; destructive: boolean } {
  if (!status) return { text: "NONE", destructive: false };
  const upper = status.toUpperCase();
  if (upper === "CALL_FOR_ACTION" || upper === "BLACKLISTED")
    return { text: "CALL FOR ACTION", destructive: true };
  if (upper === "MONITORING" || upper === "INCREASED_MONITORING")
    return { text: "INCREASED MONITORING", destructive: true };
  if (upper === "SUSPENDED") return { text: "SUSPENDED", destructive: true };
  return { text: upper, destructive: false };
}

const SANCTIONS_KEYS: { key: string; label: string }[] = [
  { key: "SANCTIONS_UK_PROGRAMME", label: "UK" },
  { key: "SANCTIONS_EU_PROGRAMME", label: "EU" },
  { key: "SANCTIONS_US_OFAC_PROGRAMME", label: "US" },
];

function NotAvailable({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 cursor-default">
            <HelpCircle className="h-3 w-3" />
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          Data may not have been ingested yet. It will appear automatically once available.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CountryCard({
  jurisdictionId,
  preloaded,
  hideLink = false,
  compact = false,
}: CountryCardProps) {
  const navigate = useNavigate();

  /* ---- Jurisdiction metadata (skip if preloaded) ---- */
  const { data: jurisdiction } = useQuery({
    queryKey: ["country-card-jurisdiction", jurisdictionId],
    enabled: !preloaded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction")
        .select("id, country_code, country_name")
        .eq("id", jurisdictionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  /* ---- Indicators (skip if preloaded) ---- */
  const { data: rawIndicators } = useQuery({
    queryKey: ["country-card-indicators", jurisdictionId],
    enabled: !preloaded?.indicators,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_indicator")
        .select("indicator_type, value_json, retrieved_at")
        .eq("jurisdiction_id", jurisdictionId);
      if (error) throw error;
      return data as Indicator[];
    },
  });

  const countryCode = preloaded?.countryCode ?? jurisdiction?.country_code ?? "";
  const countryName = preloaded?.countryName ?? jurisdiction?.country_name ?? "";

  const indicators = useMemo(() => {
    if (preloaded?.indicators) return preloaded.indicators;
    const map = new Map<string, any>();
    if (rawIndicators) {
      for (const ind of rawIndicators) {
        map.set(ind.indicator_type, { ...ind.value_json, _retrieved_at: ind.retrieved_at });
      }
    }
    return map;
  }, [preloaded?.indicators, rawIndicators]);

  /* ---- Derived values ---- */
  const fatf = indicators.get("FATF_STATUS");
  const fatfInfo = fatfLabel(fatf?.status);

  const euHrtc = indicators.get("EU_AML_HRTC");
  const hasEuHrtc = !!euHrtc;

  const activeSanctions = SANCTIONS_KEYS.filter(
    (s) => indicators.get(s.key)?.status === "active"
  );

  const cpi = indicators.get("CPI_SCORE");

  // Freshness: max retrieved_at across all indicators
  const freshness = useMemo(() => {
    let maxDate: Date | null = null;
    indicators.forEach((val) => {
      const retrieved = val?._retrieved_at;
      if (retrieved) {
        const d = new Date(retrieved);
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });
    return maxDate;
  }, [indicators]);

  const flag = countryCodeToFlag(countryCode);

  /* ---- Render ---- */
  return (
    <Card
      className={`cursor-pointer hover:border-primary/40 transition-colors group ${compact ? "" : ""}`}
      onClick={() => !hideLink && navigate(`/jurisdictions/${jurisdictionId}`)}
    >
      <CardContent className={compact ? "p-3" : "pt-4 pb-3 px-4"}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">{flag || "🌐"}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{countryName || "—"}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {countryCode || "—"}
              </div>
            </div>
          </div>
          {!hideLink && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1 mt-2.5">
          {/* FATF */}
          {fatf ? (
            <Badge
              variant={fatfInfo.destructive ? "destructive" : "secondary"}
              className="text-[10px]"
            >
              FATF: {fatfInfo.text}
            </Badge>
          ) : (
            <NotAvailable label="FATF" />
          )}

          {/* EU HRTC */}
          {hasEuHrtc && (
            <Badge variant="destructive" className="text-[10px]">
              EU HRTC
            </Badge>
          )}

          {/* Sanctions */}
          {activeSanctions.length > 0 ? (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {activeSanctions.map((s) => s.label).join(" · ")}
            </Badge>
          ) : null}

          {/* CPI */}
          {cpi?.score != null ? (
            <Badge variant="outline" className="text-[10px]">
              CPI: {cpi.score}
              <span className="ml-1 text-muted-foreground font-normal">indicator</span>
            </Badge>
          ) : (
            <NotAvailable label="CPI" />
          )}
        </div>

        {/* Freshness */}
        {!compact && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
            <Clock className="h-3 w-3" />
            {freshness ? (
              <span>Last updated: {formatDistanceToNow(freshness, { addSuffix: true })}</span>
            ) : (
              <span>No data retrieved yet</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
