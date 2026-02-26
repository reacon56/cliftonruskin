import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Download, Eye, ToggleRight, Calendar, TrendingUp, Building2,
} from "lucide-react";

interface BillingEvent {
  id: string;
  org_id: string;
  feature_key: string;
  event_type: string;
  entity_id: string | null;
  performed_by: string | null;
  metadata: any;
  created_at: string;
}

interface OrgUsageSummary {
  org_id: string;
  org_name: string;
  feature_tier: string;
  exports: number;
  first_views: number;
  enables: number;
  disables: number;
  unique_entities_viewed: number;
  events: BillingEvent[];
}

interface Props {
  className?: string;
}

export default function BillingUsagePanel({ className }: Props) {
  const [summaries, setSummaries] = useState<OrgUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month

  const targetDate = monthOffset === 0 ? new Date() : subMonths(new Date(), Math.abs(monthOffset));
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const monthLabel = format(targetDate, "MMMM yyyy");

  useEffect(() => {
    loadUsage();
  }, [monthOffset]);

  const loadUsage = async () => {
    setLoading(true);

    const [{ data: orgData }, { data: eventsData }] = await Promise.all([
      supabase.from("organisations").select("id, name, feature_tier").order("name"),
      supabase
        .from("billing_events" as any)
        .select("*")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false }),
    ]);

    const orgs = orgData ?? [];
    const events = ((eventsData ?? []) as unknown) as BillingEvent[];

    const orgMap = new Map<string, OrgUsageSummary>();
    orgs.forEach((o: any) => {
      orgMap.set(o.id, {
        org_id: o.id,
        org_name: o.name,
        feature_tier: o.feature_tier || "C",
        exports: 0,
        first_views: 0,
        enables: 0,
        disables: 0,
        unique_entities_viewed: 0,
        events: [],
      });
    });

    events.forEach((e) => {
      const summary = orgMap.get(e.org_id);
      if (!summary) return;
      summary.events.push(e);
      if (e.event_type === "export") summary.exports++;
      else if (e.event_type === "first_view") summary.first_views++;
      else if (e.event_type === "enabled") summary.enables++;
      else if (e.event_type === "disabled") summary.disables++;
    });

    // Count unique entities viewed
    orgMap.forEach((summary) => {
      const entityIds = new Set(
        summary.events
          .filter((e) => e.event_type === "first_view" && e.entity_id)
          .map((e) => e.entity_id)
      );
      summary.unique_entities_viewed = entityIds.size;
    });

    setSummaries(Array.from(orgMap.values()).filter((s) => s.events.length > 0));
    setLoading(false);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading usage data…</div>;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="fvc-heading-2 flex items-center gap-2">
            <TrendingUp size={18} /> Monthly Usage
          </h2>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground">
            Billable events for manual invoicing. Covers exports, entity views, and feature activations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            onClick={() => setMonthOffset((o) => o - 1)}
          >
            ← Prev
          </button>
          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
            <Calendar className="h-3 w-3" />
            {monthLabel}
          </Badge>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 disabled:opacity-30"
            disabled={monthOffset >= 0}
            onClick={() => setMonthOffset((o) => o + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <p className="text-sm text-muted-foreground">No billable events recorded for {monthLabel}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => (
            <div key={summary.org_id} className="fvc-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-base font-semibold text-foreground">{summary.org_name}</h3>
                   <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                     {summary.feature_tier === "custom" ? "Plan: Bespoke" : `Plan: ${({A:"Premium",B:"Standard",C:"Essential"} as Record<string,string>)[summary.feature_tier] || summary.feature_tier}`}
                   </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {summary.events.length} event{summary.events.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <SummaryCard icon={Download} label="Exports" value={summary.exports} />
                <SummaryCard icon={Eye} label="Entities Viewed" value={summary.unique_entities_viewed} />
                <SummaryCard icon={ToggleRight} label="Features Enabled" value={summary.enables} />
                <SummaryCard icon={ToggleRight} label="Features Disabled" value={summary.disables} />
              </div>

              {/* Event log */}
              <details className="group">
                <summary className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Event detail ({summary.events.length})
                </summary>
                <div className="mt-3 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-[9px] uppercase tracking-widest text-muted-foreground">
                        <th className="text-left py-1.5 px-2 font-medium">Time</th>
                        <th className="text-left py-1.5 px-2 font-medium">Type</th>
                        <th className="text-left py-1.5 px-2 font-medium">Feature</th>
                        <th className="text-left py-1.5 px-2 font-medium">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.events.map((e) => (
                        <tr key={e.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                            {format(new Date(e.created_at), "dd MMM HH:mm")}
                          </td>
                          <td className="py-1.5 px-2">
                            <EventTypeBadge type={e.event_type} />
                          </td>
                          <td className="py-1.5 px-2 text-foreground">
                            {e.feature_key.replace(/_/g, " ")}
                          </td>
                          <td className="py-1.5 px-2 text-muted-foreground truncate max-w-[200px]">
                            {e.entity_id ? `Entity: ${e.entity_id.slice(0, 8)}…` : ""}
                            {e.metadata?.format ? ` (${e.metadata.format})` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/50 px-3 py-2.5 text-center">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
      <p className="text-lg font-display font-semibold text-foreground">{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    export: "bg-primary/10 text-primary border-primary/30",
    first_view: "bg-accent/10 text-accent-foreground border-accent/30",
    enabled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    disabled: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={`text-[8px] uppercase tracking-wider px-1.5 py-0 ${styles[type] || styles.disabled}`}>
      {type}
    </Badge>
  );
}
