import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function LiaSummaryCard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ liCount: 0, liaCompleted: 0, liaTotal: 0, dpPending: 0 });

  useEffect(() => {
    if (!profile?.org_id) return;
    const orgId = profile.org_id;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    Promise.all([
      supabase.from("cases").select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("lawful_basis", "legitimate_interests")
        .gte("created_at", monthStart),
      supabase.from("lia_assessments" as any).select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "final"),
      supabase.from("lia_assessments" as any).select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase.from("cases").select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("dp_review_required", true)
        .not("status", "in", '("delivered","closed","cancelled")'),
    ]).then(([liRes, liaFinalRes, liaTotalRes, dpRes]) => {
      setStats({
        liCount: (liRes as any).count ?? 0,
        liaCompleted: (liaFinalRes as any).count ?? 0,
        liaTotal: (liaTotalRes as any).count ?? 0,
        dpPending: (dpRes as any).count ?? 0,
      });
    });
  }, [profile?.org_id]);

  const completionRate = stats.liaTotal > 0 ? Math.round((stats.liaCompleted / stats.liaTotal) * 100) : 0;

  return (
    <div className="fvc-card">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-accent" />
        <h2 className="fvc-heading-3 text-foreground">Data Protection</h2>
      </div>
      <div className="fvc-gold-rule mb-4" />
      <div className="space-y-3">
        <div
          className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors cursor-pointer -mx-2"
          onClick={() => navigate("/lia-library")}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCheck size={13} /> Legit. Interests cases (this month)
          </div>
          <span className="text-foreground font-semibold font-display text-lg">{stats.liCount}</span>
        </div>

        {/* Mini-LIA completion rate with progress bar */}
        <div
          className="py-2 px-2 rounded hover:bg-muted/30 transition-colors cursor-pointer -mx-2"
          onClick={() => navigate("/lia-library")}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 size={13} className={completionRate === 100 ? "text-success" : ""} /> Mini-LIA completed rate
            </div>
            <span className={`font-semibold font-display text-lg ${completionRate === 100 ? "text-success" : "text-foreground"}`}>
              {stats.liaTotal > 0 ? `${completionRate}%` : "—"}
            </span>
          </div>
          {stats.liaTotal > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {stats.liaCompleted}/{stats.liaTotal}
              </span>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors cursor-pointer -mx-2"
          onClick={() => navigate("/cases")}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle size={13} className={stats.dpPending > 0 ? "text-warning" : ""} /> High-risk DP pending review
          </div>
          <span className={`font-semibold font-display text-lg ${stats.dpPending > 0 ? "text-warning" : "text-foreground"}`}>{stats.dpPending}</span>
        </div>
      </div>
    </div>
  );
}
