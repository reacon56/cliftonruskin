import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ApprovalDecision {
  id: string;
  status: string;
  entity_name: string;
  product_type: string;
  created_at: string;
}

export default function ApprovalsSummaryCard() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [recentDecisions, setRecentDecisions] = useState<ApprovalDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = hasRole("client_admin");

  useEffect(() => {
    if (!profile?.org_id || !canView) return;
    loadData();
  }, [profile?.org_id, canView]);

  const loadData = async () => {
    const orgId = profile!.org_id!;
    const [pendingRes, decisionsRes] = await Promise.all([
      supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "submitted"),
      supabase
        .from("cases")
        .select("id, status, product_type, created_at, entities(name)")
        .eq("org_id", orgId)
        .in("status", ["approved", "cancelled"])
        .not("approved_by", "is", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setPendingCount(pendingRes.count ?? 0);
    setRecentDecisions(
      (decisionsRes.data ?? []).map((c: any) => ({
        id: c.id,
        status: c.status,
        entity_name: c.entities?.name ?? "Entity",
        product_type: c.product_type,
        created_at: c.created_at,
      }))
    );
    setLoading(false);
  };

  if (!canView || loading) return null;

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 size={13} className="text-success" />;
    return <XCircle size={13} className="text-destructive" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Approved";
    if (status === "cancelled") return "Rejected";
    return status;
  };

  return (
    <div className="fvc-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-accent" />
          <h2 className="fvc-heading-3 text-foreground">Approvals</h2>
        </div>
        <button onClick={() => navigate("/approvals")} className="fvc-link text-xs">
          View all
        </button>
      </div>

      {/* Pending count */}
      <div
        className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-3 mb-5 cursor-pointer transition-colors hover:bg-muted/50"
        onClick={() => navigate("/approvals")}
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-warning" />
          <span className="text-sm font-medium text-foreground">Pending Approvals</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold font-display ${pendingCount > 0 ? "text-warning" : "text-muted-foreground"}`}>
            {pendingCount}
          </span>
          <ArrowRight size={13} className="text-muted-foreground" />
        </div>
      </div>

      {/* Recent decisions */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-3">
          Recent Decisions
        </p>
        {recentDecisions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No recent approval decisions.</p>
        ) : (
          <div className="space-y-0">
            {recentDecisions.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {statusIcon(d.status)}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.entity_name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {d.product_type} · {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge className={`fvc-status-badge shrink-0 ${
                  d.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {statusLabel(d.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
