import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity } from "lucide-react";

export default function MonitoringPage() {
  const { profile, isInternal } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = useState("all");

  useEffect(() => {
    loadEvents();
  }, [profile?.org_id]);

  const loadEvents = async () => {
    // For internal users, show all; for clients, filter by entity org
    let query = supabase.from("monitoring_events").select("*, entities(name, org_id)").order("detected_at", { ascending: false });
    const { data } = await query;
    
    // Client-side filter for org scoping
    if (!isInternal && profile?.org_id) {
      setEvents((data ?? []).filter((e: any) => e.entities?.org_id === profile.org_id));
    } else {
      setEvents(data ?? []);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("monitoring_events").update({ status }).eq("id", id);
    loadEvents();
  };

  const filtered = events.filter((e) => filterSeverity === "all" || e.severity === filterSeverity);

  const severityColor = (s: string) => {
    if (s === "high") return "bg-destructive/10 text-destructive";
    if (s === "med") return "bg-warning/10 text-warning";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">Monitoring</h1>
      <p className="text-sm text-muted-foreground mb-8">Continuous monitoring alerts and events</p>

      <div className="flex gap-3 mb-6">
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="med">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Activity size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No monitoring events to display.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="fvc-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-foreground">{e.headline}</div>
                    <Badge className={`fvc-status-badge ${severityColor(e.severity)}`}>{e.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {e.entities?.name ?? "Unknown"} · {e.event_type.replace(/_/g, " ")} · {new Date(e.detected_at).toLocaleDateString()}
                  </div>
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 inline-block">
                      Source →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  {e.status === "new" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "noted")}>Note</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "actioned")}>Action</Button>
                    </>
                  )}
                  {e.status !== "new" && (
                    <Badge className="fvc-status-badge bg-muted text-muted-foreground capitalize">{e.status}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
