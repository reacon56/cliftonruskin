import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Globe, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  cases: any[];
}

interface EnhancementStatus {
  hasData: boolean;
  isInDate: boolean;
  lastDate: string | null;
}

export default function AssuranceEnhancementsPanel({ cases }: Props) {
  const [posture, setPosture] = useState<EnhancementStatus>({ hasData: false, isInDate: false, lastDate: null });
  const [benchmark, setBenchmark] = useState<EnhancementStatus>({ hasData: false, isInDate: false, lastDate: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, [cases]);

  const loadStatus = async () => {
    const caseIds = cases.map((c) => c.id);
    if (caseIds.length === 0) { setLoading(false); return; }

    const { data: mts } = await supabase
      .from("module_types")
      .select("id, code")
      .in("code", ["commercial_posture", "jurisdiction_benchmark"]);

    if (!mts?.length) { setLoading(false); return; }

    const mtMap = Object.fromEntries(mts.map((m) => [m.code, m.id]));

    const { data: cms } = await supabase
      .from("case_modules")
      .select("id, module_type_id, created_at")
      .in("case_id", caseIds)
      .eq("status", "complete")
      .order("created_at", { ascending: false });

    if (!cms?.length) { setLoading(false); return; }

    const twelveMonthsAgo = Date.now() - 365 * 86400000;

    for (const code of ["commercial_posture", "jurisdiction_benchmark"] as const) {
      const mtId = mtMap[code];
      if (!mtId) continue;
      const latest = cms.find((cm) => cm.module_type_id === mtId);
      if (!latest) continue;
      const date = new Date(latest.created_at);
      const isInDate = date.getTime() > twelveMonthsAgo;
      const status: EnhancementStatus = { hasData: true, isInDate, lastDate: date.toLocaleDateString() };
      if (code === "commercial_posture") setPosture(status);
      else setBenchmark(status);
    }

    setLoading(false);
  };

  if (loading || (!posture.hasData && !benchmark.hasData)) return null;

  const items = [
    { label: "Commercial Posture", icon: <Sparkles size={13} className="text-accent" />, status: posture },
    { label: "Jurisdiction Benchmark", icon: <Globe size={13} className="text-accent" />, status: benchmark },
  ];

  return (
    <div className="fvc-card border-accent/20">
      <h3 className="fvc-heading-3 text-foreground mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-accent" /> Assurance Enhancements
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 bg-accent/5 rounded-lg p-3 border border-accent/10">
            {item.icon}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              {item.status.hasData ? (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Last: {item.status.lastDate}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground mt-0.5">Not commissioned</div>
              )}
            </div>
            {item.status.hasData ? (
              item.status.isInDate ? (
                <Badge className="fvc-status-badge bg-success/10 text-success text-[10px] gap-1">
                  <CheckCircle size={10} /> In-date
                </Badge>
              ) : (
                <Badge className="fvc-status-badge bg-warning/10 text-warning text-[10px] gap-1">
                  <AlertTriangle size={10} /> Out-of-date
                </Badge>
              )
            ) : (
              <Badge className="fvc-status-badge bg-muted text-muted-foreground text-[10px]">—</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
