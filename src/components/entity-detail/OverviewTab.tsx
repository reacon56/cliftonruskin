import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EntityLocationSection from "./EntityLocationSection";
import AssuranceEnhancementsPanel from "./AssuranceEnhancementsPanel";

interface Props {
  entity: any;
  cases: any[];
  changeLogs: any[];
  monitoringEvents: any[];
  deliverables: any[];
}

export default function OverviewTab({ entity, cases, changeLogs, monitoringEvents, deliverables }: Props) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split("T")[0];

  const latestComplete = cases.find((c) => c.status === "complete");
  const latestDeliverable = deliverables[0];
  const latestChangeLog = changeLogs[0];

  const isOverdue = entity.next_review_date && entity.next_review_date < todayStr;
  const highAlerts = monitoringEvents.filter((m) => m.severity === "high" && m.status === "new");
  const awaitingCases = cases.filter((c) => c.status === "awaiting_client" || c.status === "submitted");

  // Load latest module outputs for this entity's cases
  const [moduleOutputs, setModuleOutputs] = useState<any[]>([]);

  useEffect(() => {
    const loadModuleOutputs = async () => {
      const caseIds = cases.filter((c) => c.status === "complete").map((c) => c.id);
      if (caseIds.length === 0) return;

      const { data: caseModules } = await supabase
        .from("case_modules")
        .select("id, case_id, module_type_id, status")
        .in("case_id", caseIds)
        .eq("status", "complete");

      if (!caseModules?.length) return;

      const cmIds = caseModules.map((cm) => cm.id);
      const mtIds = [...new Set(caseModules.map((cm) => cm.module_type_id))];

      const [outputsRes, mtRes] = await Promise.all([
        supabase.from("module_outputs").select("*").in("case_module_id", cmIds).order("created_at", { ascending: false }),
        supabase.from("module_types").select("id, code, name").in("id", mtIds),
      ]);

      const mtMap = Object.fromEntries((mtRes.data ?? []).map((m) => [m.id, m]));
      const cmMap = Object.fromEntries(caseModules.map((cm) => [cm.id, cm]));

      setModuleOutputs(
        (outputsRes.data ?? []).map((o) => ({
          ...o,
          module_type: mtMap[cmMap[o.case_module_id]?.module_type_id],
        }))
      );
    };

    loadModuleOutputs();
  }, [cases]);

  return (
    <div className="space-y-6 fvc-stagger">
      {/* Executive Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="fvc-card space-y-4">
          <h3 className="fvc-heading-3 text-foreground">Latest Conclusion</h3>
          {latestComplete ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="fvc-status-badge bg-success/10 text-success">
                  {latestComplete.product_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(latestComplete.created_at).toLocaleDateString()}
                </span>
              </div>
              {latestDeliverable && (
                <button
                  onClick={() => navigate(`/cases/${latestComplete.id}`)}
                  className="fvc-link text-sm"
                >
                  <FileText size={12} className="inline mr-1" />
                  View latest deliverable: {latestDeliverable.title}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No completed reviews yet.</p>
          )}
        </div>

        <div className="fvc-card space-y-4">
          <h3 className="fvc-heading-3 text-foreground">Latest Change Log</h3>
          {latestChangeLog ? (
            <div>
              <p className="text-sm text-foreground line-clamp-2">{latestChangeLog.summary}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`fvc-status-badge ${
                  latestChangeLog.confidence_level === "high" ? "bg-success/10 text-success"
                  : latestChangeLog.confidence_level === "med" ? "bg-warning/10 text-warning"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {latestChangeLog.confidence_level} confidence
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(latestChangeLog.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No change logs recorded.</p>
          )}
        </div>
      </div>

      {/* EDD+ Module Outputs */}
      {moduleOutputs.length > 0 && (
        <div className="fvc-card border-accent/20">
          <h3 className="fvc-heading-3 text-foreground mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-accent" /> EDD+ Intelligence
          </h3>
          <div className="space-y-4">
            {moduleOutputs.slice(0, 4).map((output) => (
              <div key={output.id} className="border border-accent/10 rounded-lg p-4 bg-accent/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                    <Sparkles size={12} className="text-accent" />
                    {output.module_type?.name ?? "Module Output"}
                  </div>
                  <Badge className={`fvc-status-badge text-[10px] ${
                    output.confidence_level === "high" ? "bg-success/10 text-success"
                    : output.confidence_level === "med" ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {output.confidence_level} confidence
                  </Badge>
                </div>
                {output.executive_summary && (
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">{output.executive_summary}</p>
                )}
                {output.limitations && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">{output.limitations}</p>
                )}
                <span className="text-[10px] text-muted-foreground mt-2 block">
                  {new Date(output.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assurance Enhancements */}
      <AssuranceEnhancementsPanel cases={cases} />

      {/* Location Section */}
      <EntityLocationSection entity={entity} />

      {/* Quick Details */}
      <div className="fvc-card">
        <h3 className="fvc-heading-3 text-foreground mb-4">Entity Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm">
          <div>
            <span className="fvc-label block mb-1">Service Provided</span>
            <span className="text-foreground">{entity.service_provided || "—"}</span>
          </div>
          <div>
            <span className="fvc-label block mb-1">Geography</span>
            <span className="text-foreground">{entity.country || "—"}</span>
          </div>
          <div>
            <span className="fvc-label block mb-1">Onboarded</span>
            <span className="text-foreground">
              {entity.onboarded_date ? new Date(entity.onboarded_date).toLocaleDateString() : new Date(entity.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="fvc-label block mb-1">Last Review</span>
            <span className="text-foreground">
              {entity.last_review_date ? new Date(entity.last_review_date).toLocaleDateString() : "Never"}
            </span>
          </div>
        </div>
      </div>

      {/* Open Items */}
      {(isOverdue || highAlerts.length > 0 || awaitingCases.length > 0) && (
        <div className="fvc-card border-destructive/20">
          <h3 className="fvc-heading-3 text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-destructive" /> Open Items
          </h3>
          <div className="space-y-3">
            {isOverdue && (
              <div className="flex items-center gap-3 text-sm">
                <Clock size={14} className="text-destructive shrink-0" />
                <span className="text-foreground">Review is overdue (due {entity.next_review_date})</span>
              </div>
            )}
            {highAlerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <AlertTriangle size={14} className="text-destructive shrink-0" />
                <span className="text-foreground">{a.headline}</span>
                <Badge className="fvc-status-badge bg-destructive/10 text-destructive ml-auto">{a.severity}</Badge>
              </div>
            ))}
            {awaitingCases.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-1 rounded" onClick={() => navigate(`/cases/${c.id}`)}>
                <FileText size={14} className="text-warning shrink-0" />
                <span className="text-foreground">{c.product_type} — {c.status.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
