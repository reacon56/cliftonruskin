import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, AlertTriangle, FileCheck, Activity, Clock, BarChart3, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalEntities: number;
  dueSoon: number;
  overdue: number;
  activeCases: number;
  completedThisMonth: number;
  highAlerts: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEntities: 0, dueSoon: 0, overdue: 0, activeCases: 0, completedThisMonth: 0, highAlerts: 0,
  });
  const [recentEntities, setRecentEntities] = useState<any[]>([]);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.org_id) return;
    loadDashboard();
  }, [profile?.org_id]);

  const loadDashboard = async () => {
    const orgId = profile!.org_id!;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [entitiesRes, dueSoonRes, overdueRes, casesRes, completedRes, alertsRes, recentEntRes, recentCasesRes] =
      await Promise.all([
        supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId).lte("next_review_date", in30).gte("next_review_date", now.toISOString().split("T")[0]),
        supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId).lt("next_review_date", now.toISOString().split("T")[0]),
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).not("status", "in", '("complete","cancelled")'),
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "complete").gte("created_at", monthStart),
        supabase.from("monitoring_events").select("*").eq("status", "new").order("detected_at", { ascending: false }).limit(5),
        supabase.from("entities").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
        supabase.from("cases").select("*, entities(name)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
      ]);

    setStats({
      totalEntities: entitiesRes.count ?? 0,
      dueSoon: dueSoonRes.count ?? 0,
      overdue: overdueRes.count ?? 0,
      activeCases: casesRes.count ?? 0,
      completedThisMonth: completedRes.count ?? 0,
      highAlerts: alertsRes.data?.filter((a) => a.severity === "high").length ?? 0,
    });
    setRecentEntities(recentEntRes.data ?? []);
    setRecentCases(recentCasesRes.data ?? []);
    setAlerts(alertsRes.data ?? []);
  };

  const kpis = [
    { label: "Total Entities", value: stats.totalEntities, icon: <Building2 size={20} />, color: "text-foreground" },
    { label: "Due Within 30 Days", value: stats.dueSoon, icon: <Clock size={20} />, color: "text-warning" },
    { label: "Overdue Reviews", value: stats.overdue, icon: <AlertTriangle size={20} />, color: "text-destructive" },
    { label: "Active Cases", value: stats.activeCases, icon: <FileCheck size={20} />, color: "text-info" },
    { label: "Completed This Month", value: stats.completedThisMonth, icon: <TrendingUp size={20} />, color: "text-success" },
    { label: "High Severity Alerts", value: stats.highAlerts, icon: <Activity size={20} />, color: "text-destructive" },
  ];

  const tierColor = (tier: string) => {
    if (tier === "A") return "bg-destructive/10 text-destructive";
    if (tier === "B") return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-info/10 text-info",
      approved: "bg-success/10 text-success",
      in_progress: "bg-accent/10 text-accent",
      awaiting_client: "bg-warning/10 text-warning",
      complete: "bg-success/10 text-success",
      cancelled: "bg-muted text-muted-foreground",
    };
    return map[s] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="fvc-heading-1 text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your assurance programme
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="fvc-kpi-tile">
            <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
            <div className="text-2xl font-semibold font-display text-foreground">{kpi.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent entities */}
        <div className="fvc-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="fvc-heading-3 text-foreground">Recent Entities</h2>
            <button onClick={() => navigate("/entities")} className="text-xs text-accent hover:underline">View all</button>
          </div>
          {recentEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entities registered yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEntities.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{e.entity_type} · {e.country || "—"}</div>
                  </div>
                  <Badge className={`fvc-status-badge ${tierColor(e.risk_tier)}`}>
                    Tier {e.risk_tier}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent cases */}
        <div className="fvc-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="fvc-heading-3 text-foreground">Active Cases</h2>
            <button onClick={() => navigate("/commission")} className="text-xs text-accent hover:underline">View all</button>
          </div>
          {recentCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases commissioned yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {(c as any).entities?.name ?? "Entity"}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.product_type} · {c.priority}</div>
                  </div>
                  <Badge className={`fvc-status-badge ${statusColor(c.status)}`}>
                    {c.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monitoring alerts */}
        <div className="fvc-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="fvc-heading-3 text-foreground">Monitoring Alerts</h2>
            <button onClick={() => navigate("/monitoring")} className="text-xs text-accent hover:underline">View all</button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new monitoring alerts.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{a.headline}</div>
                    <div className="text-xs text-muted-foreground capitalize">{a.event_type.replace(/_/g, " ")} · {new Date(a.detected_at).toLocaleDateString()}</div>
                  </div>
                  <Badge className={`fvc-status-badge ${a.severity === "high" ? "bg-destructive/10 text-destructive" : a.severity === "med" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                    {a.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
