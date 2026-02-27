import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Globe, ChevronDown, Loader2, RefreshCw, ExternalLink, Info,
} from "lucide-react";

/* ── Types matching edge-function output ── */
interface AnnexIndicator {
  indicator_type: string;
  value: Record<string, unknown>;
  effective_date: string | null;
  retrieved_at: string | null;
  source_name: string | null;
  source_url: string | null;
}

interface AnnexJurisdiction {
  jurisdiction_id: string;
  country_name: string;
  country_code: string;
  link_types: string[];
  confidence: string;
  indicators: AnnexIndicator[];
}

interface AnnexPayload {
  entity_id: string;
  entity_name: string;
  case_id: string | null;
  generated_at: string;
  methodology_note: string;
  jurisdictions: AnnexJurisdiction[];
}

/* ── Indicator labels ── */
const INDICATOR_LABELS: Record<string, string> = {
  FATF_STATUS: "FATF Status",
  EU_AML_HRTC: "EU AML High-Risk",
  CPI_SCORE: "CPI Score",
  SANCTIONS_UK_PROGRAMME: "UK Sanctions",
  SANCTIONS_EU_PROGRAMME: "EU Sanctions",
  SANCTIONS_US_OFAC_PROGRAMME: "US OFAC Sanctions",
};

const LINK_COLORS: Record<string, string> = {
  INCORPORATION: "bg-primary/10 text-primary",
  OPERATIONS: "bg-accent/10 text-accent-foreground",
  UBO_NATIONALITY: "bg-warning/10 text-warning",
  BANK_LOCATION: "bg-muted text-muted-foreground",
  SUPPLIER_LOCATION: "bg-muted text-muted-foreground",
  SHIPPING_ROUTE: "bg-muted text-muted-foreground",
  LEGACY: "bg-muted text-muted-foreground",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function indicatorValue(ind: AnnexIndicator): string {
  const v = ind.value;
  if (v.status) return String(v.status).replace(/_/g, " ");
  if (v.score != null) return String(v.score);
  if (v.programme_status) return String(v.programme_status).replace(/_/g, " ");
  return "—";
}

/* ── Main Component ── */
interface Props {
  entityId: string;
  caseId: string;
}

export default function ReportAnnexPreview({ entityId, caseId }: Props) {
  const [data, setData] = useState<AnnexPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke(
        "report-annex-generator",
        { body: { entity_id: entityId, case_id: caseId } }
      );
      if (fnErr) throw fnErr;
      setData(resp as AnnexPayload);
    } catch (e: any) {
      setError(e.message ?? "Failed to load annex data");
    } finally {
      setLoading(false);
    }
  }, [entityId, caseId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4" /> Jurisdiction Indicators Annex
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs"
          onClick={load}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading indicator data…
        </div>
      )}

      {data && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            As of {formatDate(data.generated_at)}
          </p>

          {data.jurisdictions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No linked jurisdictions found for this entity.</p>
          ) : (
            <div className="space-y-2">
              {data.jurisdictions.map((jur) => (
                <JurisdictionBlock key={jur.jurisdiction_id} jur={jur} />
              ))}
            </div>
          )}

          {/* Methodology note */}
          <div className="flex gap-2 items-start rounded-md bg-muted/40 border border-border p-3 mt-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
              {data.methodology_note}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Per-jurisdiction collapsible ── */
function JurisdictionBlock({ jur }: { jur: AnnexJurisdiction }) {
  const [open, setOpen] = useState(false);
  const hasIndicators = jur.indicators.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/30 transition-colors text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{jur.country_name}</span>
          {jur.link_types.map((lt) => (
            <Badge
              key={lt}
              className={`text-[9px] px-1.5 py-0 capitalize ${LINK_COLORS[lt] ?? "bg-muted text-muted-foreground"}`}
            >
              {lt.replace(/_/g, " ").toLowerCase()}
            </Badge>
          ))}
          {!hasIndicators && (
            <span className="text-[10px] text-muted-foreground italic">No indicators</span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1">
        {hasIndicators ? (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Indicator</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Effective</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Retrieved</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {jur.indicators.map((ind, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-1.5 font-medium text-foreground">
                      {INDICATOR_LABELS[ind.indicator_type] ?? ind.indicator_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">{indicatorValue(ind)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{formatDate(ind.effective_date)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{formatDate(ind.retrieved_at)}</td>
                    <td className="px-3 py-1.5">
                      {ind.source_url ? (
                        <a
                          href={ind.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {ind.source_name ?? "Link"} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{ind.source_name ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic px-3 py-2">No indicators recorded for this jurisdiction.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
