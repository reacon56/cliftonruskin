import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Radar, ChevronRight, Building2 } from "lucide-react";
import ExpandableTile from "./ExpandableTile";

interface MonitoringAlert {
  id: string;
  alert_type: string;
  summary: string;
  detected_at: string;
  jurisdiction_name: string | null;
  affected_entities: { id: string; name: string }[];
}

const ALERT_COLORS: Record<string, string> = {
  FATF_CHANGE: "bg-destructive/10 text-destructive",
  EU_HRTC_CHANGE: "bg-warning/10 text-warning",
  UK_SANCTIONS_CHANGE: "bg-destructive/10 text-destructive",
  EU_SANCTIONS_CHANGE: "bg-destructive/10 text-destructive",
  OFAC_SANCTIONS_CHANGE: "bg-destructive/10 text-destructive",
  CPI_CHANGE: "bg-info/10 text-info",
};

const ALERT_LABELS: Record<string, string> = {
  FATF_CHANGE: "FATF",
  EU_HRTC_CHANGE: "EU HRTC",
  UK_SANCTIONS_CHANGE: "UK Sanctions",
  EU_SANCTIONS_CHANGE: "EU Sanctions",
  OFAC_SANCTIONS_CHANGE: "OFAC",
  CPI_CHANGE: "CPI",
};

export default function MonitoringAlertsCard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [monitoredCount, setMonitoredCount] = useState(0);

  useEffect(() => {
    if (!profile?.org_id) return;
    loadData();
  }, [profile?.org_id]);

  const loadData = async () => {
    const orgId = profile!.org_id!;

    const { count } = await supabase
      .from("client_monitored_entity" as any)
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("enabled", true);
    setMonitoredCount(count ?? 0);

    const { data: notifications } = await supabase
      .from("alert_notification")
      .select("alert_event_id, alert_event:alert_event_id(id, alert_type, summary, detected_at, jurisdiction_id, jurisdiction:jurisdiction_id(country_name))")
      .eq("org_id", orgId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!notifications || notifications.length === 0) {
      setAlerts([]);
      return;
    }

    const eventMap = new Map<string, any>();
    for (const n of notifications as any[]) {
      const ev = n.alert_event;
      if (!ev || eventMap.has(ev.id)) continue;
      eventMap.set(ev.id, ev);
    }

    const result: MonitoringAlert[] = [];
    for (const [, ev] of eventMap) {
      if (!ev.jurisdiction_id) continue;

      const { data: linked } = await supabase
        .from("entity_jurisdiction_link")
        .select("entity_id, entities:entity_id(id, name, org_id)")
        .eq("jurisdiction_id", ev.jurisdiction_id);

      const monitoredEntities = (linked || [])
        .filter((l: any) => l.entities?.org_id === orgId)
        .map((l: any) => ({ id: l.entities.id, name: l.entities.name }));

      result.push({
        id: ev.id,
        alert_type: ev.alert_type,
        summary: ev.summary,
        detected_at: ev.detected_at,
        jurisdiction_name: ev.jurisdiction?.country_name ?? null,
        affected_entities: monitoredEntities,
      });

      if (result.length >= 6) break;
    }

    setAlerts(result);
  };

  const headerRight = (
    <button onClick={() => navigate("/client-alerts")} className="fvc-link text-xs">View all</button>
  );

  const monitoredBadge = monitoredCount > 0 ? (
    <Badge className="bg-accent/10 text-accent-foreground text-[9px] px-1.5 py-0 ml-2">
      {monitoredCount} monitored
    </Badge>
  ) : null;

  const expandedContent = (
    <div className="space-y-0">
      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No new monitoring alerts.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Jurisdiction</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Summary</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Affected Entities</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3">
                    <Badge className={`fvc-status-badge shrink-0 text-[9px] ${ALERT_COLORS[a.alert_type] ?? "bg-muted text-muted-foreground"}`}>
                      {ALERT_LABELS[a.alert_type] ?? a.alert_type.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{a.jurisdiction_name ?? "—"}</td>
                  <td className="p-3 text-foreground">{a.summary}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(a.detected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {a.affected_entities.slice(0, 3).map((ent) => (
                        <Button key={ent.id} variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary hover:underline" onClick={() => navigate(`/entities/${ent.id}`)}>
                          {ent.name}
                        </Button>
                      ))}
                      {a.affected_entities.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{a.affected_entities.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <ExpandableTile
      title="Monitoring Alerts"
      icon={<Radar size={16} className="text-accent" />}
      headerRight={<div className="flex items-center">{monitoredBadge}{headerRight}</div>}
      expandedContent={expandedContent}
      className="lg:col-span-2 animate-fade-in"
    >
      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No new monitoring alerts.</p>
          {monitoredCount === 0 && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Enable monitoring on entities to receive jurisdiction change alerts.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {alerts.map((a) => (
            <div key={a.id} className="py-3 border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30 -mx-2 px-2 rounded">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Badge className={`fvc-status-badge shrink-0 text-[9px] ${ALERT_COLORS[a.alert_type] ?? "bg-muted text-muted-foreground"}`}>
                      {ALERT_LABELS[a.alert_type] ?? a.alert_type.replace(/_/g, " ")}
                    </Badge>
                    {a.jurisdiction_name && (
                      <span className="text-xs text-muted-foreground">{a.jurisdiction_name}</span>
                    )}
                  </div>
                  <div className="text-sm text-foreground">{a.summary}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(a.detected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
              {a.affected_entities.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Building2 size={10} className="text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Affected:</span>
                  {a.affected_entities.slice(0, 3).map((ent) => (
                    <Button key={ent.id} variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary hover:underline" onClick={() => navigate(`/entities/${ent.id}`)}>
                      {ent.name} <ChevronRight size={8} />
                    </Button>
                  ))}
                  {a.affected_entities.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{a.affected_entities.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ExpandableTile>
  );
}
