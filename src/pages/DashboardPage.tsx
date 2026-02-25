import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, AlertTriangle, FileCheck, Activity, Clock, TrendingUp, MapPin, CalendarClock, ShieldCheck, CalendarDays, BarChart3, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import EntityWorldMap from "@/components/EntityWorldMap";
import ReviewTimeline from "@/components/ReviewTimeline";
import ActionsRequired from "@/components/dashboard/ActionsRequired";
import ActionsDrawer from "@/components/dashboard/ActionsDrawer";
import WhatChangedCard from "@/components/dashboard/WhatChangedCard";
import ActiveCasesCard from "@/components/dashboard/ActiveCasesCard";
import RiskCoverageView from "@/components/dashboard/RiskCoverageView";
import SavedViewsDropdown from "@/components/dashboard/SavedViewsDropdown";
import { MessageSquare, Shield } from "lucide-react";
import PlanUtilisationCard from "@/components/dashboard/PlanUtilisationCard";
import ApprovalsSummaryCard from "@/components/dashboard/ApprovalsSummaryCard";
import EnhancementCoverageCard from "@/components/dashboard/EnhancementCoverageCard";
import LiaSummaryCard from "@/components/dashboard/LiaSummaryCard";

interface DashboardStats {
  totalEntities: number;
  dueSoon: number;
  dueIn60: number;
  overdue: number;
  activeCases: number;
  completedThisMonth: number;
  highAlerts: number;
  pendingApprovals: number;
  awaitingClient: number;
  compliancePct: number;
  liaReviewsDue: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEntities: 0, dueSoon: 0, dueIn60: 0, overdue: 0, activeCases: 0,
    completedThisMonth: 0, highAlerts: 0, pendingApprovals: 0, awaitingClient: 0, compliancePct: 100,
    liaReviewsDue: 0,
  });
  const [recentEntities, setRecentEntities] = useState<any[]>([]);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [mapView, setMapView] = useState<"map" | "risk">("map");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Drawer detail data
  const [overdueEntities, setOverdueEntities] = useState<any[]>([]);
  const [awaitingCases, setAwaitingCases] = useState<any[]>([]);
  const [highAlertItems, setHighAlertItems] = useState<any[]>([]);
  const [dueSoonEntities, setDueSoonEntities] = useState<any[]>([]);
  const [pendingCases, setPendingCases] = useState<any[]>([]);
  const [changeStats, setChangeStats] = useState({ total: 0, adverseMedia: 0, ownership: 0, litigation: 0 });
  const [liaReviewItems, setLiaReviewItems] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.org_id) return;
    loadDashboard();
  }, [profile?.org_id]);

  const loadDashboard = async () => {
    const orgId = profile!.org_id!;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
    const in60 = new Date(now.getTime() + 60 * 86400000).toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      entitiesRes, dueSoonRes, dueIn60Res, overdueRes, casesRes, completedRes,
      alertsRes, recentEntRes, recentCasesRes, allEntRes,
      pendingApprovalsRes, awaitingClientRes, highAlertsRes,
      overdueEntRes, awaitingCasesRes, dueSoonEntRes, pendingCasesRes,
      changeLogsRes, monitoringTypesRes,
      liaReviewsDueRes, liaReviewItemsRes,
    ] = await Promise.all([
      supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId).lte("next_review_date", in30).gte("next_review_date", todayStr),
      supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId).lte("next_review_date", in60).gte("next_review_date", todayStr),
      supabase.from("entities").select("id", { count: "exact", head: true }).eq("org_id", orgId).lt("next_review_date", todayStr),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).not("status", "in", '("complete","cancelled")'),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "complete").gte("created_at", monthStart),
      supabase.from("monitoring_events").select("*").eq("status", "new").order("detected_at", { ascending: false }).limit(5),
      supabase.from("entities").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
      supabase.from("cases").select("*, entities(name)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
      supabase.from("entities").select("id, name, country, risk_tier, next_review_date, registered_lat, registered_lng, hq_lat, hq_lng, registered_city, head_office_city").eq("org_id", orgId),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "submitted"),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "awaiting_client"),
      supabase.from("monitoring_events").select("id", { count: "exact", head: true }).eq("status", "new").eq("severity", "high"),
      supabase.from("entities").select("id, name, country, next_review_date").eq("org_id", orgId).lt("next_review_date", todayStr).order("next_review_date", { ascending: true }).limit(10),
      supabase.from("cases").select("id, product_type, entities(name)").eq("org_id", orgId).eq("status", "awaiting_client").limit(10),
      supabase.from("entities").select("id, name, next_review_date").eq("org_id", orgId).lte("next_review_date", in30).gte("next_review_date", todayStr).order("next_review_date", { ascending: true }).limit(10),
      supabase.from("cases").select("id, product_type, entities(name)").eq("org_id", orgId).eq("status", "submitted").limit(10),
      supabase.from("change_logs").select("id, summary, what_changed").gte("created_at", new Date(now.getTime() - 30 * 86400000).toISOString()),
      supabase.from("monitoring_events").select("id, event_type").gte("detected_at", new Date(now.getTime() - 30 * 86400000).toISOString()),
      // LIA reviews due within 30 days or overdue
      supabase.from("lia_assessments" as any).select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "final").lte("review_date", in30),
      supabase.from("lia_assessments" as any).select("id, purpose, review_date").eq("org_id", orgId).eq("status", "final").lte("review_date", in30).order("review_date", { ascending: true }).limit(10),
    ]);

    const totalEntities = entitiesRes.count ?? 0;
    const overdueCount = overdueRes.count ?? 0;
    const compliancePct = totalEntities > 0 ? Math.round(((totalEntities - overdueCount) / totalEntities) * 100) : 100;

    setStats({
      totalEntities,
      dueSoon: dueSoonRes.count ?? 0,
      dueIn60: dueIn60Res.count ?? 0,
      overdue: overdueCount,
      activeCases: casesRes.count ?? 0,
      completedThisMonth: completedRes.count ?? 0,
      highAlerts: highAlertsRes.count ?? 0,
      pendingApprovals: pendingApprovalsRes.count ?? 0,
      awaitingClient: awaitingClientRes.count ?? 0,
      compliancePct,
      liaReviewsDue: (liaReviewsDueRes as any).count ?? 0,
    });
    setLiaReviewItems(((liaReviewItemsRes as any).data as any[]) ?? []);
    setRecentEntities(recentEntRes.data ?? []);
    setAllEntities(allEntRes.data ?? []);
    setRecentCases(recentCasesRes.data ?? []);
    setAlerts(alertsRes.data ?? []);
    setOverdueEntities(overdueEntRes.data ?? []);
    setAwaitingCases(awaitingCasesRes.data ?? []);
    setHighAlertItems(alertsRes.data?.filter((a) => a.severity === "high") ?? []);
    setDueSoonEntities(dueSoonEntRes.data ?? []);
    setPendingCases(pendingCasesRes.data ?? []);

    // Compute change stats
    const changeLogs = changeLogsRes.data ?? [];
    const monTypes = monitoringTypesRes.data ?? [];
    const adverseMedia = monTypes.filter((m: any) => ["adverse_media", "negative_news", "media"].includes(m.event_type)).length;
    const ownership = monTypes.filter((m: any) => ["ownership_change", "director_change", "psc_change", "corporate_change"].includes(m.event_type)).length;
    const litigation = monTypes.filter((m: any) => ["litigation", "regulatory", "sanctions", "enforcement"].includes(m.event_type)).length;
    setChangeStats({
      total: changeLogs.length,
      adverseMedia,
      ownership,
      litigation,
    });
  };

  const kpis = [
    { label: "Total Entities", value: stats.totalEntities, icon: <Building2 size={18} className="opacity-60" />, color: "text-muted-foreground", route: "/entities" },
    { label: "Policy Compliance", value: `${stats.compliancePct}%`, icon: <ShieldCheck size={18} />, color: stats.compliancePct < 80 ? "text-destructive" : stats.compliancePct < 95 ? "text-warning" : "text-success", route: "/entities" },
    { label: "Due Within 30 Days", value: stats.dueSoon, icon: <Clock size={18} />, color: stats.dueSoon > 0 ? "text-warning" : "text-muted-foreground", route: "/entities?filter=due_soon" },
    { label: "Due Within 60 Days", value: stats.dueIn60, icon: <CalendarDays size={18} />, color: stats.dueIn60 > 0 ? "text-info" : "text-muted-foreground", route: "/entities?filter=due_60" },
    { label: "Overdue Reviews", value: stats.overdue, icon: <AlertTriangle size={18} />, color: stats.overdue > 0 ? "text-destructive" : "text-muted-foreground", route: "/entities?filter=overdue" },
    { label: "Active Cases", value: stats.activeCases, icon: <FileCheck size={18} />, color: "text-info", route: "/cases" },
    { label: "Completed This Month", value: stats.completedThisMonth, icon: <TrendingUp size={18} />, color: "text-success", route: "/cases?status=complete" },
    { label: "High Severity Alerts", value: stats.highAlerts, icon: <Activity size={18} />, color: stats.highAlerts > 0 ? "text-destructive" : "text-muted-foreground", route: "/monitoring?severity=high" },
  ];

  const drawerSections = [
    {
      key: "approvals",
      label: "Approvals pending",
      count: stats.pendingApprovals,
      icon: <Shield size={14} />,
      colorClass: "text-accent",
      bgClass: "bg-accent/10",
      cta: "Review approvals",
      route: "/commission?filter=pending_approval",
      items: pendingCases.map((c: any) => ({
        id: c.id,
        title: c.entities?.name ?? "Entity",
        subtitle: c.product_type,
      })),
    },
    {
      key: "awaiting",
      label: "Awaiting your input",
      count: stats.awaitingClient,
      icon: <MessageSquare size={14} />,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      cta: "Respond now",
      route: "/cases?status=awaiting_client",
      items: awaitingCases.map((c: any) => ({
        id: c.id,
        title: (c as any).entities?.name ?? "Entity",
        subtitle: c.product_type,
      })),
    },
    {
      key: "overdue",
      label: "Overdue reviews",
      count: stats.overdue,
      icon: <AlertTriangle size={14} />,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      cta: "Open review queue",
      route: "/entities?filter=overdue",
      items: overdueEntities.map((e: any) => ({
        id: e.id,
        title: e.name,
        subtitle: e.next_review_date ? `Due ${e.next_review_date}` : "No date set",
      })),
    },
    {
      key: "highAlerts",
      label: "High severity alerts",
      count: stats.highAlerts,
      icon: <AlertTriangle size={14} />,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      cta: "Triage alerts",
      route: "/monitoring?severity=high&status=new",
      items: highAlertItems.map((a: any) => ({
        id: a.id,
        title: a.headline,
        subtitle: a.event_type?.replace(/_/g, " "),
      })),
    },
    {
      key: "dueSoon",
      label: "Reviews due within 30 days",
      count: stats.dueSoon,
      icon: <CalendarClock size={14} />,
      colorClass: "text-info",
      bgClass: "bg-info/10",
      cta: "Plan upcoming reviews",
      route: "/entities?filter=due_soon",
      items: dueSoonEntities.map((e: any) => ({
        id: e.id,
        title: e.name,
        subtitle: e.next_review_date ? `Due ${e.next_review_date}` : "No date set",
      })),
    },
    {
      key: "liaReviews",
      label: "LIA reviews due",
      count: stats.liaReviewsDue,
      icon: <Shield size={14} />,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      cta: "Review LIAs",
      route: "/lia-library",
      items: liaReviewItems.map((l: any) => ({
        id: l.id,
        title: l.purpose || "Untitled LIA",
        subtitle: l.review_date ? `Review due ${l.review_date}` : "No date",
      })),
    },
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
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="fvc-heading-1 text-foreground">Dashboard</h1>
          <div className="fvc-gold-rule mt-3 mb-2" />
          <p className="text-sm text-muted-foreground">
            Overview of your assurance programme
          </p>
        </div>
        <SavedViewsDropdown />
      </div>

      {/* Actions Required strip */}
      <ActionsRequired
        stats={{
          pendingApprovals: stats.pendingApprovals,
          awaitingClient: stats.awaitingClient,
          overdue: stats.overdue,
          highAlerts: stats.highAlerts,
          dueSoon: stats.dueSoon,
          liaReviewsDue: stats.liaReviewsDue,
        }}
        onViewAll={() => setDrawerOpen(true)}
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-10 fvc-stagger">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="fvc-kpi-tile group cursor-pointer"
            onClick={() => navigate(kpi.route)}
          >
            <div className={`${kpi.color} mb-3 transition-transform duration-300 group-hover:scale-110`}>
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

      {/* Map / Risk & Coverage + Review Timeline */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10 fvc-stagger">
        <div className="fvc-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {mapView === "map" ? <MapPin size={16} className="text-accent" /> : <BarChart3 size={16} className="text-accent" />}
              <h2 className="fvc-heading-3 text-foreground">
                {mapView === "map" ? "Entity Locations" : "Risk & Coverage"}
              </h2>
            </div>
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setMapView("map")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mapView === "map"
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Globe size={11} /> Map
              </button>
              <button
                onClick={() => setMapView("risk")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mapView === "risk"
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <BarChart3 size={11} /> Risk & Coverage
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            {mapView === "map"
              ? "Head office locations of registered entities"
              : "Entities in-date vs overdue by risk tier and upcoming workload"}
          </p>
          {mapView === "map" ? (
            <EntityWorldMap entities={allEntities} />
          ) : (
            <RiskCoverageView entities={allEntities} />
          )}
        </div>
        <div className="fvc-card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={16} className="text-accent" />
            <h2 className="fvc-heading-3 text-foreground">Review Schedule</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">Upcoming and overdue entity reviews</p>
          <ReviewTimeline entities={allEntities} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-10 fvc-stagger">
        {/* What Changed card */}
        <WhatChangedCard
          totalChanges={changeStats.total}
          adverseMedia={changeStats.adverseMedia}
          ownershipChanges={changeStats.ownership}
          litigationSignals={changeStats.litigation}
        />

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

        {/* Active Cases - Enhanced */}
        <ActiveCasesCard cases={recentCases} />

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

        {/* Plan & Utilisation */}
        <PlanUtilisationCard entityCount={stats.totalEntities} />

        {/* Approvals Summary */}
        <ApprovalsSummaryCard />

        {/* Enhancement Coverage */}
        <EnhancementCoverageCard />

        {/* Data Protection / LIA Summary */}
        <LiaSummaryCard />
      </div>

      {/* Actions Drawer */}
      <ActionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sections={drawerSections}
      />
    </div>
  );
}
