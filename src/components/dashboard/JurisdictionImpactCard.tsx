import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Globe, Building2, ChevronRight, Shield, TrendingUp, Bell } from "lucide-react";
import ExpandableTile from "./ExpandableTile";

interface ImpactGroup {
  alertEventId: string;
  alertType: string;
  jurisdictionName: string | null;
  detectedAt: string;
  summary: string;
  entities: { id: string; name: string; impactType: string; impactSummary: string }[];
}

const IMPACT_ICONS: Record<string, React.ReactNode> = {
  CR_SCORE_CHANGE: <TrendingUp size={10} className="text-destructive" />,
  POLICY_TRIGGER: <Shield size={10} className="text-warning" />,
  MONITORING_ALERT: <Bell size={10} className="text-info" />,
};

const IMPACT_COLORS: Record<string, string> = {
  CR_SCORE_CHANGE: "bg-destructive/10 text-destructive",
  POLICY_TRIGGER: "bg-warning/10 text-warning",
  MONITORING_ALERT: "bg-info/10 text-info",
};

export default function JurisdictionImpactCard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ImpactGroup[]>([]);

  useEffect(() => {
    if (!profile?.org_id) return;
    loadImpacts();
  }, [profile?.org_id]);

  const loadImpacts = async () => {
    const orgId = profile!.org_id!;

    const { data: impacts } = await supabase
      .from("jurisdiction_change_impact" as any)
      .select(
        "id, alert_event_id, entity_id, impact_type, impact_summary, created_at, " +
        "alert_event:alert_event_id(id, alert_type, summary, detected_at, jurisdiction_id, " +
        "jurisdiction:jurisdiction_id(country_name)), " +
        "entities:entity_id(id, name)"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!impacts || impacts.length === 0) {
      setGroups([]);
      return;
    }

    const groupMap = new Map<string, ImpactGroup>();
    for (const imp of impacts as any[]) {
      const ae = imp.alert_event;
      if (!ae) continue;

      const key = imp.alert_event_id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          alertEventId: ae.id,
          alertType: ae.alert_type,
          jurisdictionName: ae.jurisdiction?.country_name ?? null,
          detectedAt: ae.detected_at,
          summary: ae.summary,
          entities: [],
        });
      }

      const group = groupMap.get(key)!;
      if (!group.entities.some((e) => e.id === imp.entity_id && e.impactType === imp.impact_type)) {
        group.entities.push({
          id: imp.entities?.id ?? imp.entity_id,
          name: imp.entities?.name ?? "Unknown entity",
          impactType: imp.impact_type,
          impactSummary: imp.impact_summary,
        });
      }
    }

    setGroups(Array.from(groupMap.values()).slice(0, 8));
  };

  const totalImpacted = new Set(groups.flatMap((g) => g.entities.map((e) => e.id))).size;

  const headerRight = totalImpacted > 0 ? (
    <Badge className="bg-destructive/10 text-destructive text-[9px] px-1.5 py-0">
      {totalImpacted} {totalImpacted === 1 ? "entity" : "entities"} impacted
    </Badge>
  ) : undefined;

  const expandedContent = (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No jurisdiction changes affecting your entities.</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.alertEventId} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {g.jurisdictionName && (
                <span className="text-sm font-medium text-foreground">{g.jurisdictionName}</span>
              )}
              <Badge className="fvc-status-badge bg-accent/10 text-accent text-[9px]">
                {g.alertType.replace(/_/g, " ")}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(g.detectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{g.summary}</p>
            <div className="space-y-2">
              {g.entities.map((ent, idx) => (
                <div
                  key={`${ent.id}-${ent.impactType}-${idx}`}
                  className="flex items-center justify-between border rounded-lg p-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="shrink-0">{IMPACT_ICONS[ent.impactType] ?? <Bell size={10} />}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{ent.name}</div>
                      <div className="text-[10px] text-muted-foreground">{ent.impactSummary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[9px] ${IMPACT_COLORS[ent.impactType] ?? "bg-muted text-muted-foreground"}`}>
                      {ent.impactType.replace(/_/g, " ")}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/entities/${ent.id}`)}>
                      <ChevronRight size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <ExpandableTile
      title="Jurisdiction Changes Affecting You"
      icon={<Globe size={16} className="text-accent" />}
      headerRight={headerRight}
      expandedContent={expandedContent}
      className="animate-fade-in"
    >
      {groups.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No jurisdiction changes affecting your entities.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {groups.map((g) => (
            <div
              key={g.alertEventId}
              className="py-3 border-b border-border/60 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 -mx-2 px-2 rounded"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    {g.jurisdictionName && (
                      <span className="text-xs font-medium text-foreground">{g.jurisdictionName}</span>
                    )}
                    <Badge className="fvc-status-badge bg-accent/10 text-accent text-[9px]">
                      {g.alertType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{g.summary}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Building2 size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {g.entities.length} {g.entities.length === 1 ? "entity" : "entities"} affected
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(g.detectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpandableTile>
  );
}
