import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SavedViewsDropdown, { type FilterState } from "@/components/SavedViewsDropdown";
import EventReviewButton from "@/components/monitoring/EventReviewButton";
import { KnowledgePanelWidget } from "@/components/insight/KnowledgePanel";
import type { KnowledgeSection } from "@/components/insight/KnowledgePanel";

const MONITORING_KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  {
    title: "The Obligation",
    content: "Article 5(1)(e) UK GDPR requires that personal data is not kept longer than necessary AND is kept accurate. For third-party risk, this means the risk assessment must reflect current reality, not the state at onboarding.",
  },
  {
    title: "What Triggers a Review",
    content: "Material changes in entity structure, jurisdiction risk changes (e.g. FATF grey listing), adverse media, sanctions hits, or elapsed review cadence per tier policy.",
  },
  {
    title: "Tier Review Cadence",
    type: "keyvalue",
    pairs: [
      { key: "Tier A", value: "6 months" },
      { key: "Tier B", value: "12 months" },
      { key: "Tier C", value: "24 months" },
    ],
  },
  {
    title: "Monitoring vs Re-screening",
    content: "Monitoring tracks change signals continuously. Re-screening is a full due diligence repeat triggered by a monitoring alert. They are not the same thing.",
  },
  {
    title: "Quick Reference",
    type: "keyvalue",
    pairs: [
      { key: "Primary", value: "UK GDPR Article 5(1)(e)" },
      { key: "Regulation", value: "MLR 2017 Regulation 28" },
      { key: "Internal", value: "CR Monitoring Policy" },
    ],
  },
];

export default function MonitoringPage() {
  const { profile, isInternal } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterEventStatus, setFilterEventStatus] = useState("all");

  useEffect(() => {
    loadEvents();
  }, [profile?.org_id]);

  const loadEvents = async () => {
    let query = supabase.from("monitoring_events").select("*, entities(name, org_id, risk_tier)").order("detected_at", { ascending: false });
    const { data } = await query;
    
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

  const handleApplyFilters = (filters: FilterState) => {
    setFilterSeverity(filters.severity || "all");
    setFilterEventStatus(filters.eventStatus || "all");
  };

  const currentFilters: FilterState = {
    severity: filterSeverity,
    eventStatus: filterEventStatus,
  };

  const filtered = events.filter((e) => {
    const matchSeverity = filterSeverity === "all" || e.severity === filterSeverity;
    const matchStatus = filterEventStatus === "all" || e.status === filterEventStatus;
    return matchSeverity && matchStatus;
  });

  const severityColor = (s: string) => {
    if (s === "high") return "bg-destructive/10 text-destructive";
    if (s === "med") return "bg-warning/10 text-warning";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="fvc-heading-1 text-foreground">Monitoring</h1>
        <SavedViewsDropdown
          pageType="monitoring"
          currentFilters={currentFilters}
          onApplyFilters={handleApplyFilters}
        />
      </div>
      <p className="text-sm text-muted-foreground mb-4">Continuous monitoring alerts and events</p>

      <div className="mb-6">
        <KnowledgePanelWidget
          pageId="monitoring-legal-obligation"
          title="Why Ongoing Monitoring is a Legal Obligation"
          sections={MONITORING_KNOWLEDGE_SECTIONS}
        />
      </div>

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
        <Select value={filterEventStatus} onValueChange={setFilterEventStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="noted">Noted</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
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
                <div className="flex items-center gap-2">
                  {e.case_id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 border-accent/30 text-accent"
                      onClick={() => navigate(`/cases/${e.case_id}`)}
                    >
                      Case opened →
                    </Button>
                  ) : (
                    <>
                      {e.status === "new" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "noted")}>Note</Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "actioned")}>Action</Button>
                        </>
                      )}
                      {e.status !== "new" && !e.case_id && (
                        <Badge className="fvc-status-badge bg-muted text-muted-foreground capitalize">{e.status}</Badge>
                      )}
                      <EventReviewButton
                        event={e}
                        entityRiskTier={e.entities?.risk_tier}
                        onCaseCreated={loadEvents}
                      />
                    </>
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
