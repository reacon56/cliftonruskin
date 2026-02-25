import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, AlertTriangle, FileCheck, Activity, Clock, TrendingUp } from "lucide-react";
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
    { label: "Total Entities", value: stats.totalEntities, icon: <Building2 size={18} className="opacity-60" />, accent: false },
    { label: "Due Within 30 Days", value: stats.dueSoon, icon: <Clock size={18} />, accent: stats.dueSoon > 0, color: "text-warning" },
    { label: "Overdue Reviews", value: stats.overdue, icon: <AlertTriangle size={18} />, accent: stats.overdue > 0, color: "text-destructive" },
    { label: "Active Cases", value: stats.activeCases, icon: <FileCheck size={18} />, accent: false, color: "text-info" },
    { label: "Completed This Month", value: stats.completedThisMonth, icon: <TrendingUp size={18} />, accent: false, color: "text-success" },
    { label: "High Severity Alerts", value: stats.highAlerts, icon: <Activity size={18} />, accent: stats.highAlerts > 0, color: "text-destructive" },
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
      {/* Header */}
      <div className="mb-10">
        <h1 className="fvc-heading-1 text-foreground">Dashboard</h1>
        <div className="fvc-gold-rule mt-3 mb-2" />
        <p className="text-sm text-muted-foreground">
          Overview of your assurance programme
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10 fvc-stagger">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="fvc-kpi-tile group">
            <div className={`${kpi.color || "text-muted-foreground"} mb-3 transition-transform duration-300 group-hover:scale-110`}>
              {kpi.icon}
            </div>
            <div className="text-[1.75rem] font-semibold font-display text-foreground leading-none tracking-tight">
              {kpi.value}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground mt-2">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 fvc-stagger">
        {/* Recent entities */}
        <div className="fvc-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="fvc-heading-3 text-foreground">Recent Entities</h2>
            <button onClick={() => navigate("/entities")} className="fvc-link text-xs">View all</button>
          </div>
          {recentEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No entities registered yet.</p>
          ) : (
            <div className="space-y-0">
              {recentEntities.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-3 border-b border-border/60 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 -mx-2 px-2 rounded"
                  onClick={() => navigate(`/entities/${e.id}`)}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.name}</div>
                    <div className="text-[11px] text-muted-foreground capitalize mt-0.5">{e.entity_type} · {e.country || "—"}</div>
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
          <div className="flex items-center justify-between mb-5">
            <h2 className="fvc-heading-3 text-foreground">Active Cases</h2>
            <button onClick={() => navigate("/commission")} className="fvc-link text-xs">View all</button>
          </div>
          {recentCases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No cases commissioned yet.</p>
          ) : (
            <div className="space-y-0">
              {recentCases.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3 border-b border-border/60 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 -mx-2 px-2 rounded"
                  onClick={() => navigate(`/cases/${c.id}`)}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {(c as any).entities?.name ?? "Entity"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{c.product_type} · {c.priority}</div>
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
          <div className="flex items-center justify-between mb-5">
            <h2 className="fvc-heading-3 text-foreground">Monitoring Alerts</h2>
            <button onClick={() => navigate("/monitoring")} className="fvc-link text-xs">View all</button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No new monitoring alerts.</p>
          ) : (
            <div className="space-y-0">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30 -mx-2 px-2 rounded">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="text-sm font-medium text-foreground">{a.headline}</div>
                    <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                      {a.event_type.replace(/_/g, " ")} · {new Date(a.detected_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge className={`fvc-status-badge shrink-0 ${
                    a.severity === "high" ? "bg-destructive/10 text-destructive" 
                    : a.severity === "med" ? "bg-warning/10 text-warning" 
                    : "bg-muted text-muted-foreground"
                  }`}>
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
