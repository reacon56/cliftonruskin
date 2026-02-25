import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";
import EventReviewButton from "@/components/monitoring/EventReviewButton";

interface Props {
  entity: any;
  events: any[];
  canTriage: boolean;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
  { value: "noted", label: "Mark Noted" },
  { value: "action_required", label: "Mark Action Required" },
  { value: "actioned", label: "Mark Actioned" },
];

export default function MonitoringTab({ entity, events, canTriage, onRefresh }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    setUpdating(eventId);
    const { error } = await supabase
      .from("monitoring_events")
      .update({ status: newStatus })
      .eq("id", eventId);
    if (!error) {
      toast({ title: `Event marked as ${newStatus.replace(/_/g, " ")}` });
      onRefresh();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setUpdating(null);
  };

  const severityColor = (s: string) =>
    s === "high" ? "bg-destructive/10 text-destructive"
    : s === "med" ? "bg-warning/10 text-warning"
    : "bg-muted text-muted-foreground";

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      new: "bg-info/10 text-info",
      noted: "bg-muted text-muted-foreground",
      action_required: "bg-warning/10 text-warning",
      actioned: "bg-success/10 text-success",
    };
    return map[s] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4 fvc-stagger">
      {events.length === 0 ? (
        <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No monitoring events for this entity.</div>
      ) : (
        events.map((ev) => (
          <div key={ev.id} className="fvc-card">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 mr-4">
                <div className="text-sm font-medium text-foreground">{ev.headline}</div>
                <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                  {ev.event_type.replace(/_/g, " ")} · {new Date(ev.detected_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`fvc-status-badge ${severityColor(ev.severity)}`}>{ev.severity}</Badge>
                <Badge className={`fvc-status-badge ${statusColor(ev.status)}`}>{ev.status.replace(/_/g, " ")}</Badge>
              </div>
            </div>

            {/* Case linked indicator */}
            {ev.case_id && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-accent/30 text-accent"
                  onClick={() => navigate(`/cases/${ev.case_id}`)}
                >
                  Case opened →
                </Button>
              </div>
            )}

            {/* Triage actions */}
            {canTriage && !ev.case_id && ev.status !== "actioned" && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                {STATUS_OPTIONS.filter((o) => o.value !== ev.status).map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant="outline"
                    disabled={updating === ev.id}
                    onClick={() => handleStatusChange(ev.id, opt.value)}
                    className="text-xs"
                  >
                    {opt.label}
                  </Button>
                ))}
                <EventReviewButton
                  event={{ ...ev, entities: { name: entity.name, org_id: entity.org_id, risk_tier: entity.risk_tier } }}
                  entityRiskTier={entity.risk_tier}
                  onCaseCreated={onRefresh}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs ml-auto"
                  onClick={() => navigate(`/commission?entity=${entity.id}&product=Emergency+Note&alert=${ev.id}`)}
                >
                  <Zap size={12} className="mr-1" /> Emergency Note
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
