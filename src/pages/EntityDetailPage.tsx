import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileCheck } from "lucide-react";

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [entity, setEntity] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [monitoringEvents, setMonitoringEvents] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);

  useEffect(() => {
    if (id) loadEntity();
  }, [id]);

  const loadEntity = async () => {
    const [entityRes, casesRes, clRes, meRes] = await Promise.all([
      supabase.from("entities").select("*").eq("id", id!).single(),
      supabase.from("cases").select("*").eq("entity_id", id!).order("created_at", { ascending: false }),
      supabase.from("change_logs").select("*").eq("entity_id", id!).order("created_at", { ascending: false }),
      supabase.from("monitoring_events").select("*").eq("entity_id", id!).order("detected_at", { ascending: false }),
    ]);
    setEntity(entityRes.data);
    setCases(casesRes.data ?? []);
    setChangeLogs(clRes.data ?? []);
    setMonitoringEvents(meRes.data ?? []);

    // Load deliverables from cases
    const caseIds = (casesRes.data ?? []).map((c: any) => c.id);
    if (caseIds.length > 0) {
      const { data } = await supabase.from("deliverables").select("*").in("case_id", caseIds).order("created_at", { ascending: false });
      setDeliverables(data ?? []);
    }
  };

  if (!entity) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  const tierColor = (t: string) => t === "A" ? "bg-destructive/10 text-destructive" : t === "B" ? "bg-warning/10 text-warning" : "bg-success/10 text-success";

  return (
    <div>
      <button onClick={() => navigate("/entities")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to register
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="fvc-heading-1 text-foreground">{entity.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={`fvc-status-badge ${tierColor(entity.risk_tier)}`}>Tier {entity.risk_tier}</Badge>
            <span className="text-sm text-muted-foreground capitalize">{entity.entity_type}</span>
            <span className="text-sm text-muted-foreground">{entity.country || ""}</span>
          </div>
        </div>
        <Button onClick={() => navigate(`/commission?entity=${entity.id}`)}>
          <FileCheck size={16} className="mr-2" /> Commission Check
        </Button>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases">Cases ({cases.length})</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring ({monitoringEvents.length})</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables ({deliverables.length})</TabsTrigger>
          <TabsTrigger value="changelog">Change Log ({changeLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="fvc-card space-y-4">
              <h3 className="fvc-heading-3 text-foreground">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize text-foreground">{entity.status}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Website</span><span className="text-foreground">{entity.website || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Registration</span><span className="text-foreground">{entity.registration_number || "—"}</span></div>
              </div>
            </div>
            <div className="fvc-card space-y-4">
              <h3 className="fvc-heading-3 text-foreground">Review Cycle</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Last review</span><span className="text-foreground">{entity.last_review_date ? new Date(entity.last_review_date).toLocaleDateString() : "Never"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Next review</span><span className="text-foreground">{entity.next_review_date ? new Date(entity.next_review_date).toLocaleDateString() : "Not set"}</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          {cases.length === 0 ? (
            <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No cases for this entity yet.</div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <div key={c.id} className="fvc-card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/cases/${c.id}`)}>
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.product_type}</div>
                    <div className="text-xs text-muted-foreground">{c.priority} · {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge className="fvc-status-badge bg-muted text-muted-foreground">{c.status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          {monitoringEvents.length === 0 ? (
            <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No monitoring events.</div>
          ) : (
            <div className="space-y-3">
              {monitoringEvents.map((me) => (
                <div key={me.id} className="fvc-card flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{me.headline}</div>
                    <div className="text-xs text-muted-foreground capitalize">{me.event_type.replace(/_/g, " ")} · {new Date(me.detected_at).toLocaleDateString()}</div>
                  </div>
                  <Badge className={`fvc-status-badge ${me.severity === "high" ? "bg-destructive/10 text-destructive" : me.severity === "med" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{me.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliverables" className="mt-6">
          {deliverables.length === 0 ? (
            <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No deliverables yet.</div>
          ) : (
            <div className="space-y-3">
              {deliverables.map((d) => (
                <div key={d.id} className="fvc-card flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{d.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{d.deliverable_type.replace(/_/g, " ")} · v{d.version}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="changelog" className="mt-6">
          {changeLogs.length === 0 ? (
            <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No change logs recorded.</div>
          ) : (
            <div className="space-y-4">
              {changeLogs.map((cl) => (
                <div key={cl.id} className="fvc-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-foreground">{cl.summary}</div>
                    <Badge className={`fvc-status-badge ${cl.confidence_level === "high" ? "bg-success/10 text-success" : cl.confidence_level === "med" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                      {cl.confidence_level} confidence
                    </Badge>
                  </div>
                  {cl.what_changed && <p className="text-xs text-muted-foreground mt-1"><strong>What changed:</strong> {cl.what_changed}</p>}
                  {cl.why_it_matters && <p className="text-xs text-muted-foreground mt-1"><strong>Why it matters:</strong> {cl.why_it_matters}</p>}
                  {cl.recommended_action && <p className="text-xs text-muted-foreground mt-1"><strong>Recommended:</strong> {cl.recommended_action}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(cl.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
