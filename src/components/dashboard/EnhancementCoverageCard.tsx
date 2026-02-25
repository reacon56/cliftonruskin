import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Globe, TrendingUp } from "lucide-react";

interface CoverageStats {
  tierACount: number;
  postureInDate: number;
  benchmarkInDate: number;
}

export default function EnhancementCoverageCard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<CoverageStats>({ tierACount: 0, postureInDate: 0, benchmarkInDate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.org_id) return;
    loadCoverage();
  }, [profile?.org_id]);

  const loadCoverage = async () => {
    const orgId = profile!.org_id!;

    // Get Tier A entities
    const { data: tierA } = await supabase
      .from("entities")
      .select("id")
      .eq("org_id", orgId)
      .eq("risk_tier", "A");

    const tierAIds = (tierA ?? []).map((e) => e.id);
    if (tierAIds.length === 0) { setStats({ tierACount: 0, postureInDate: 0, benchmarkInDate: 0 }); setLoading(false); return; }

    // Get module type IDs
    const { data: mts } = await supabase
      .from("module_types")
      .select("id, code")
      .in("code", ["commercial_posture", "jurisdiction_benchmark"]);

    const mtMap = Object.fromEntries((mts ?? []).map((m) => [m.code, m.id]));

    // Get all cases for these entities
    const { data: entityCases } = await supabase
      .from("cases")
      .select("id, entity_id")
      .in("entity_id", tierAIds);

    if (!entityCases?.length) { setStats({ tierACount: tierAIds.length, postureInDate: 0, benchmarkInDate: 0 }); setLoading(false); return; }

    const caseIds = entityCases.map((c) => c.id);
    const caseToEntity = Object.fromEntries(entityCases.map((c) => [c.id, c.entity_id]));

    // Get completed modules
    const { data: cms } = await supabase
      .from("case_modules")
      .select("id, case_id, module_type_id, created_at")
      .in("case_id", caseIds)
      .eq("status", "complete")
      .order("created_at", { ascending: false });

    const twelveMonthsAgo = Date.now() - 365 * 86400000;
    const postureEntities = new Set<string>();
    const benchmarkEntities = new Set<string>();

    for (const cm of cms ?? []) {
      const entityId = caseToEntity[cm.case_id];
      if (!entityId || !tierAIds.includes(entityId)) continue;
      const isRecent = new Date(cm.created_at).getTime() > twelveMonthsAgo;
      if (!isRecent) continue;

      if (cm.module_type_id === mtMap.commercial_posture) postureEntities.add(entityId);
      if (cm.module_type_id === mtMap.jurisdiction_benchmark) benchmarkEntities.add(entityId);
    }

    setStats({
      tierACount: tierAIds.length,
      postureInDate: postureEntities.size,
      benchmarkInDate: benchmarkEntities.size,
    });
    setLoading(false);
  };

  const pct = (n: number) => stats.tierACount > 0 ? Math.round((n / stats.tierACount) * 100) : 0;
  const posturePct = pct(stats.postureInDate);
  const benchmarkPct = pct(stats.benchmarkInDate);

  return (
    <div className="fvc-card border-accent/20">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={16} className="text-accent" />
        <h2 className="fvc-heading-3 text-foreground">Enhancement Coverage</h2>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        In-date EDD+ coverage across {stats.tierACount} Tier A {stats.tierACount === 1 ? "entity" : "entities"}
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
      ) : stats.tierACount === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No Tier A entities in register</div>
      ) : (
        <div className="space-y-4">
          <CoverageBar
            icon={<Sparkles size={13} className="text-accent" />}
            label="Commercial Posture"
            count={stats.postureInDate}
            total={stats.tierACount}
            pct={posturePct}
          />
          <CoverageBar
            icon={<Globe size={13} className="text-accent" />}
            label="Jurisdiction Benchmark"
            count={stats.benchmarkInDate}
            total={stats.tierACount}
            pct={benchmarkPct}
          />
        </div>
      )}
    </div>
  );
}

function CoverageBar({ icon, label, count, total, pct }: { icon: React.ReactNode; label: string; count: number; total: number; pct: number }) {
  const barColor = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {icon} {label}
        </div>
        <span className="text-xs text-muted-foreground">
          {count}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
