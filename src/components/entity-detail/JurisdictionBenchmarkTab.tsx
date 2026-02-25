import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Globe, FileText, RefreshCw, CheckCircle, Clock } from "lucide-react";

interface Props {
  entity: any;
  cases: any[];
}

export default function JurisdictionBenchmarkTab({ entity, cases }: Props) {
  const navigate = useNavigate();
  const [latestOutput, setLatestOutput] = useState<any>(null);
  const [latestDeliverable, setLatestDeliverable] = useState<any>(null);
  const [benchmarkInput, setBenchmarkInput] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBenchmarkData();
  }, [cases]);

  const loadBenchmarkData = async () => {
    setLoading(true);
    const caseIds = cases.map((c) => c.id);
    if (caseIds.length === 0) { setLoading(false); return; }

    const { data: mt } = await supabase
      .from("module_types")
      .select("id")
      .eq("code", "jurisdiction_benchmark")
      .single();

    if (!mt) { setLoading(false); return; }

    const { data: cms } = await supabase
      .from("case_modules")
      .select("id, case_id, status, created_at")
      .in("case_id", caseIds)
      .eq("module_type_id", mt.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!cms?.length) { setLoading(false); return; }

    const cm = cms[0];

    const [outputRes, delivRes, inputRes] = await Promise.all([
      supabase.from("module_outputs").select("*").eq("case_module_id", cm.id).order("created_at", { ascending: false }).limit(1),
      supabase.from("deliverables").select("*").eq("case_id", cm.case_id).eq("deliverable_type", "Jurisdiction Benchmark Addendum").order("created_at", { ascending: false }).limit(1),
      supabase.from("jurisdiction_benchmark_inputs").select("*").eq("case_module_id", cm.id).limit(1),
    ]);

    setLatestOutput(outputRes.data?.[0] ?? null);
    setLatestDeliverable(delivRes.data?.[0] ?? null);
    setBenchmarkInput(inputRes.data?.[0] ?? null);
    setLoading(false);
  };

  const confidenceColor = (c: string) =>
    c === "high" ? "bg-success/10 text-success" : c === "med" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";

  // Check if > 12 months old
  const isStale = latestOutput
    ? (Date.now() - new Date(latestOutput.created_at).getTime()) > 365 * 86400000
    : false;

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-6 fvc-stagger">
      <div className="fvc-card border-accent/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-accent" />
            <h3 className="fvc-heading-3 text-foreground">Jurisdiction & Sector Benchmark</h3>
            <Badge className="fvc-status-badge bg-accent/10 text-accent ml-auto text-[10px]">EDD+ Enhancement</Badge>
          </div>

          {latestOutput ? (
            <div className="space-y-4">
              {/* Jurisdiction context */}
              {benchmarkInput && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="fvc-label block mb-1">Jurisdiction</span>
                    <span className="text-foreground font-medium">{benchmarkInput.jurisdiction_country}</span>
                  </div>
                  {benchmarkInput.sector && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <span className="fvc-label block mb-1">Sector</span>
                      <span className="text-foreground font-medium">{benchmarkInput.sector}</span>
                    </div>
                  )}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="fvc-label block mb-1">As-of Date</span>
                    <span className="text-foreground font-medium">{new Date(latestOutput.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Executive summary */}
              <div className="bg-accent/5 rounded-lg p-4 border border-accent/10">
                <p className="text-sm text-foreground leading-relaxed">
                  {latestOutput.executive_summary || "No benchmark summary available."}
                </p>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`fvc-status-badge ${confidenceColor(latestOutput.confidence_level)}`}>
                  {latestOutput.confidence_level} confidence
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Generated {new Date(latestOutput.created_at).toLocaleDateString()}
                </span>
                {isStale ? (
                  <div className="flex items-center gap-1 text-xs text-warning">
                    <Clock size={12} /> Over 12 months old
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle size={12} /> In-date
                  </div>
                )}
              </div>

              {latestOutput.limitations && (
                <p className="text-[11px] text-muted-foreground italic border-l-2 border-accent/20 pl-3">
                  {latestOutput.limitations}
                </p>
              )}

              {latestDeliverable && (
                <button
                  onClick={() => navigate(`/cases/${latestDeliverable.case_id}`)}
                  className="fvc-link text-sm flex items-center gap-1.5"
                >
                  <FileText size={13} />
                  View deliverable: {latestDeliverable.title} (V{latestDeliverable.version})
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe size={32} className="text-accent/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No Jurisdiction Benchmark has been produced yet.</p>
              <p className="text-xs text-muted-foreground">Commission one to contextualise this entity's operating environment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isStale && (
            <span className="flex items-center gap-1 text-warning">
              <Clock size={11} /> Benchmark is over 12 months old — refresh recommended
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/commission?entity=${entity.id}&product=Jurisdiction+Benchmark`)}
          className="gap-1.5"
          variant={isStale ? "default" : "outline"}
        >
          <RefreshCw size={13} />
          {latestOutput ? "Refresh Benchmark" : "Commission Benchmark"}
        </Button>
      </div>
    </div>
  );
}
