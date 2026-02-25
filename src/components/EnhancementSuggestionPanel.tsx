import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Globe, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  entityCountry?: string;
  riskTier?: string;
  dataAccessLevel?: string;
  selectedModules: string[];
  onAddModule: (code: string) => void;
}

export default function EnhancementSuggestionPanel({
  entityCountry,
  riskTier,
  dataAccessLevel,
  selectedModules,
  onAddModule,
}: Props) {
  const { profile } = useAuth();
  const [orgSettings, setOrgSettings] = useState<{ auto_suggest_benchmark: boolean; auto_suggest_posture: boolean } | null>(null);
  const [orgCountry, setOrgCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.org_id) return;
    supabase
      .from("organisations")
      .select("auto_suggest_benchmark, auto_suggest_posture, industry")
      .eq("id", profile.org_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setOrgSettings({
            auto_suggest_benchmark: (data as any).auto_suggest_benchmark ?? true,
            auto_suggest_posture: (data as any).auto_suggest_posture ?? true,
          });
        }
      });

    // Infer org's "home" country from majority of entities
    supabase
      .from("entities")
      .select("country")
      .eq("org_id", profile.org_id)
      .then(({ data }) => {
        if (!data?.length) return;
        const counts: Record<string, number> = {};
        data.forEach((e) => {
          const c = (e.country || "").toLowerCase().trim();
          if (c) counts[c] = (counts[c] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) setOrgCountry(sorted[0][0]);
      });
  }, [profile?.org_id]);

  if (!orgSettings) return null;

  const suggestions: { code: string; label: string; icon: React.ReactNode; reason: string }[] = [];

  // Jurisdiction Benchmark suggestion
  const isNonHome = entityCountry && orgCountry && entityCountry.toLowerCase().trim() !== orgCountry;
  const isTierA = riskTier === "A";
  const isHighAccess = dataAccessLevel === "high";

  if (orgSettings.auto_suggest_benchmark && (isNonHome || isTierA || isHighAccess)) {
    const reasons = [];
    if (isNonHome) reasons.push("non-home jurisdiction");
    if (isTierA) reasons.push("high-risk tier");
    if (isHighAccess) reasons.push("high data access");

    suggestions.push({
      code: "JURISDICTION_BENCHMARK",
      label: "Jurisdiction & Sector Benchmark",
      icon: <Globe size={14} className="text-accent" />,
      reason: `Recommended: ${reasons.join(", ")}`,
    });
  }

  // Commercial Posture suggestion
  if (orgSettings.auto_suggest_posture && isTierA) {
    suggestions.push({
      code: "COMMERCIAL_POSTURE",
      label: "Commercial Posture Note",
      icon: <Sparkles size={14} className="text-accent" />,
      reason: "Recommended for Tier A entities",
    });
  }

  // Filter out already-selected
  const unselected = suggestions.filter((s) => !selectedModules.includes(s.code));

  if (unselected.length === 0) return null;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-accent" />
        <span className="text-xs font-semibold text-accent uppercase tracking-wider">Intelligent Recommendations</span>
      </div>
      {unselected.map((s) => (
        <div key={s.code} className="flex items-center gap-3 bg-background/60 rounded-lg p-3 border border-accent/10">
          {s.icon}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">{s.label}</div>
            <div className="text-[11px] text-muted-foreground">{s.reason}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1 border-accent/30 text-accent hover:bg-accent/10 h-7 text-xs"
            onClick={() => onAddModule(s.code)}
          >
            <Plus size={12} /> Add
          </Button>
        </div>
      ))}
    </div>
  );
}
