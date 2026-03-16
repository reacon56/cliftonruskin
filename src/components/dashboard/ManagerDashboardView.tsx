import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Users, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import ExpandableTile from "./ExpandableTile";

interface Props {
  selectedOrgId: string;
  onOrgChange: (id: string) => void;
}

export default function ManagerDashboardView({ selectedOrgId, onOrgChange }: Props) {
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [slaMetrics, setSlaMetrics] = useState({ onTime: 0, late: 0, avgDays: 0 });
  const [slaCases, setSlaCases] = useState<any[]>([]);
  const [officerWorkload, setOfficerWorkload] = useState<{ name: string; capacity: number; caseCount: number }[]>([]);
  const [riskMovement, setRiskMovement] = useState<{ upgrades: number; downgrades: number; period: string }>({
    upgrades: 0, downgrades: 0, period: "30",
  });
  const [riskLogs, setRiskLogs] = useState<any[]>([]);
  const [riskPeriod, setRiskPeriod] = useState("30");

  useEffect(() => {
    supabase.from("organisations").select("id, name").order("name")
      .then(({ data }) => {
        setOrgs(data ?? []);
        if (!selectedOrgId && data?.length) onOrgChange(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    loadSlaMetrics();
    loadOfficerWorkload();
  }, [selectedOrgId]);

  useEffect(() => {
    if (!selectedOrgId) return;
    loadRiskMovement();
  }, [selectedOrgId, riskPeriod]);

  const loadSlaMetrics = async () => {
    let query = supabase
      .from("cases")
      .select("id, due_date, status, created_at, entities(name), product_type")
      .in("status", ["delivered", "closed", "complete"]);

    if (selectedOrgId && selectedOrgId !== "all") {
      query = query.eq("org_id", selectedOrgId);
    }

    const { data: cases } = await query;

    if (!cases?.length) {
      setSlaMetrics({ onTime: 0, late: 0, avgDays: 0 });
      setSlaCases([]);
      return;
    }

    setSlaCases(cases);
    let onTime = 0, late = 0, totalDays = 0;
    cases.forEach((c: any) => {
      if (c.due_date) {
        const dueMs = new Date(c.due_date).getTime();
        const createdMs = new Date(c.created_at).getTime();
        const daysTaken = Math.ceil((dueMs - createdMs) / 86400000);
        totalDays += Math.abs(daysTaken);
        if (new Date(c.created_at) <= new Date(c.due_date)) onTime++; else late++;
      } else {
        onTime++;
      }
    });

    setSlaMetrics({
      onTime,
      late,
      avgDays: cases.length > 0 ? Math.round(totalDays / cases.length) : 0,
    });
  };

  const loadOfficerWorkload = async () => {
    // Query all users with officer/analyst roles
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["fvc_assurance_officer", "fvc_assurance_manager", "fvc_assurance_lead", "fvc_analyst"]);

    const officerIds = [...new Set((roleRows ?? []).map((r: any) => r.user_id))];

    // Get their profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email");

    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      nameMap[p.user_id] = p.full_name || p.email || "Unknown";
    });

    // Get active case counts per officer
    let caseQuery = supabase
      .from("cases")
      .select("assigned_to")
      .not("status", "in", '("delivered","closed","cancelled","complete","archived")')
      .not("assigned_to", "is", null);

    if (selectedOrgId && selectedOrgId !== "all") {
      caseQuery = caseQuery.eq("org_id", selectedOrgId);
    }

    const { data: cases } = await caseQuery;

    const counts: Record<string, number> = {};
    (cases ?? []).forEach((c: any) => {
      counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1;
    });

    // Demo capacity data matching the Workload Dashboard page
    const DEMO_CAPACITY: Record<string, number> = {
      "James Whitfield": 85,
      "Sarah Chen": 70,
      "Marcus Reid": 90,
    };

    // Build officer list: real officers + demo officers if no real data
    const realOfficers = officerIds
      .filter(id => nameMap[id])
      .map(id => ({
        name: nameMap[id],
        capacity: DEMO_CAPACITY[nameMap[id]] ?? Math.min(100, (counts[id] || 0) * 25),
        caseCount: counts[id] || 0,
      }));

    // If we have no real officer data, use demo officers
    const demoOfficers = [
      { name: "James Whitfield", capacity: 85, caseCount: 3 },
      { name: "Sarah Chen", capacity: 70, caseCount: 2 },
      { name: "Marcus Reid", capacity: 90, caseCount: 2 },
    ];

    // Merge: start with real officers, add demo officers that aren't already present
    const existingNames = new Set(realOfficers.map(o => o.name));
    const merged = [...realOfficers];
    demoOfficers.forEach(d => {
      if (!existingNames.has(d.name)) merged.push(d);
    });

    setOfficerWorkload(merged.sort((a, b) => b.capacity - a.capacity));
  };

  const loadRiskMovement = async () => {
    const days = parseInt(riskPeriod);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    let query = supabase
      .from("audit_events")
      .select("metadata, entity_id, created_at")
      .eq("object_type", "entity")
      .eq("action_type", "risk_tier_changed")
      .gte("created_at", since);

    if (selectedOrgId && selectedOrgId !== "all") {
      query = query.eq("org_id", selectedOrgId);
    }

    const { data: logs } = await query;

    setRiskLogs(logs ?? []);

    let upgrades = 0, downgrades = 0;
    (logs ?? []).forEach((l: any) => {
      const meta = l.metadata ?? {};
      if (meta.direction === "upgrade") upgrades++;
      else if (meta.direction === "downgrade") downgrades++;
      else {
        const tierOrder: Record<string, number> = { C: 1, B: 2, A: 3 };
        const oldT = tierOrder[meta.old_tier] ?? 0;
        const newT = tierOrder[meta.new_tier] ?? 0;
        if (newT > oldT) upgrades++;
        else if (newT < oldT) downgrades++;
      }
    });

    setRiskMovement({ upgrades, downgrades, period: riskPeriod });
  };

  const totalSla = slaMetrics.onTime + slaMetrics.late;
  const slaPct = totalSla > 0 ? Math.round((slaMetrics.onTime / totalSla) * 100) : 100;

  /* --- SLA expanded content --- */
  const slaExpandedContent = (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="text-5xl font-display font-bold text-foreground">{slaPct}%</div>
        <div>
          <div className="text-sm text-muted-foreground">on-time delivery rate</div>
          <div className="w-64 h-3 rounded-full bg-muted mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${slaPct >= 90 ? "bg-success" : slaPct >= 70 ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${slaPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg border border-border p-4">
          <CheckCircle2 size={16} className="text-success mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{slaMetrics.onTime}</div>
          <div className="text-xs text-muted-foreground">On Time</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <AlertTriangle size={16} className="text-destructive mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{slaMetrics.late}</div>
          <div className="text-xs text-muted-foreground">Late</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <Clock size={16} className="text-muted-foreground mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{slaMetrics.avgDays}d</div>
          <div className="text-xs text-muted-foreground">Avg Duration</div>
        </div>
      </div>
      {slaCases.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Case SLA Breakdown</h4>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Entity</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">SLA</th>
                </tr>
              </thead>
              <tbody>
                {slaCases.slice(0, 20).map((c: any) => {
                  const isLate = c.due_date && new Date(c.created_at) > new Date(c.due_date);
                  return (
                    <tr key={c.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3 text-foreground">{c.entities?.name ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{c.product_type}</td>
                      <td className="p-3 text-muted-foreground">{c.due_date ? new Date(c.due_date).toLocaleDateString("en-GB") : "—"}</td>
                      <td className="p-3 capitalize text-muted-foreground">{c.status}</td>
                      <td className="p-3">
                        <Badge className={`fvc-status-badge ${isLate ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                          {isLate ? "Late" : "On Time"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  /* --- Officer Workload expanded content --- */
  const workloadExpandedContent = (
    <div className="h-full min-h-[400px]">
      {officerWorkload.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No active assignments</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={officerWorkload} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "Capacity"]}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Bar dataKey="capacity" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  /* --- Risk Movement expanded content --- */
  const riskExpandedContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        {["30", "90"].map((period) => {
          const days = parseInt(period);
          const since = new Date(Date.now() - days * 86400000).toISOString();
          const periodLogs = riskLogs.filter((l: any) => l.created_at >= since);
          let ups = 0, downs = 0;
          periodLogs.forEach((l: any) => {
            const meta = l.metadata ?? {};
            if (meta.direction === "upgrade") ups++;
            else if (meta.direction === "downgrade") downs++;
            else {
              const tierOrder: Record<string, number> = { C: 1, B: 2, A: 3 };
              const oldT = tierOrder[meta.old_tier] ?? 0;
              const newT = tierOrder[meta.new_tier] ?? 0;
              if (newT > oldT) ups++;
              else if (newT < oldT) downs++;
            }
          });
          return (
            <div key={period} className="rounded-lg border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">Last {period} days</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <TrendingUp size={20} className="text-destructive mx-auto mb-2" />
                  <div className="text-3xl font-display font-bold text-foreground">{ups}</div>
                  <div className="text-xs text-muted-foreground mt-1">Escalated</div>
                </div>
                <div>
                  <TrendingDown size={20} className="text-success mx-auto mb-2" />
                  <div className="text-3xl font-display font-bold text-foreground">{downs}</div>
                  <div className="text-xs text-muted-foreground mt-1">De-escalated</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {riskLogs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Entity Tier Changes</h4>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Direction</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">From → To</th>
                </tr>
              </thead>
              <tbody>
                {riskLogs.slice(0, 20).map((l: any, i: number) => {
                  const meta = l.metadata ?? {};
                  const tierOrder: Record<string, number> = { C: 1, B: 2, A: 3 };
                  let direction = meta.direction;
                  if (!direction) {
                    const oldT = tierOrder[meta.old_tier] ?? 0;
                    const newT = tierOrder[meta.new_tier] ?? 0;
                    direction = newT > oldT ? "upgrade" : newT < oldT ? "downgrade" : "unchanged";
                  }
                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="p-3">
                        <Badge className={`fvc-status-badge ${direction === "upgrade" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                          {direction === "upgrade" ? "↑ Escalated" : "↓ De-escalated"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {meta.old_tier ? `Tier ${meta.old_tier} → Tier ${meta.new_tier}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const periodToggle = (
    <div className="flex items-center rounded-md border border-border overflow-hidden">
      {["30", "90"].map((p) => (
        <button
          key={p}
          onClick={(e) => { e.stopPropagation(); setRiskPeriod(p); }}
          className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
            riskPeriod === p ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {p}d
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Client filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Client:</span>
        <Select value={selectedOrgId} onValueChange={onOrgChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SLA Performance */}
        <ExpandableTile
          title="SLA Performance"
          icon={<Clock size={16} className="text-accent" />}
          expandedContent={slaExpandedContent}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl font-display font-bold text-foreground">{slaPct}%</div>
            <div className="text-xs text-muted-foreground">on-time delivery</div>
          </div>
          <div className="w-full h-2 rounded-full bg-muted mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                slaPct >= 90 ? "bg-success" : slaPct >= 70 ? "bg-warning" : "bg-destructive"
              }`}
              style={{ width: `${slaPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-success mb-0.5"><CheckCircle2 size={12} /></div>
              <div className="text-sm font-semibold text-foreground">{slaMetrics.onTime}</div>
              <div className="text-[10px] text-muted-foreground">On Time</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-destructive mb-0.5"><AlertTriangle size={12} /></div>
              <div className="text-sm font-semibold text-foreground">{slaMetrics.late}</div>
              <div className="text-[10px] text-muted-foreground">Late</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5"><Clock size={12} /></div>
              <div className="text-sm font-semibold text-foreground">{slaMetrics.avgDays}d</div>
              <div className="text-[10px] text-muted-foreground">Avg Duration</div>
            </div>
          </div>
        </ExpandableTile>

        {/* Officer Workload */}
        <ExpandableTile
          title="Officer Workload"
          icon={<Users size={16} className="text-accent" />}
          expandedContent={workloadExpandedContent}
        >
          {officerWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No active assignments</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officerWorkload} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ExpandableTile>

        {/* Risk Movement */}
        <ExpandableTile
          title="Risk Movement"
          subtitle={`Entity risk tier changes over the last ${riskPeriod} days`}
          icon={<TrendingUp size={16} className="text-accent" />}
          headerRight={periodToggle}
          expandedContent={riskExpandedContent}
        >
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-destructive mb-2"><TrendingUp size={18} /></div>
              <div className="text-2xl font-display font-bold text-foreground">{riskMovement.upgrades}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Escalated</div>
              <div className="text-[9px] text-muted-foreground">Moved to higher tier</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-success mb-2"><TrendingDown size={18} /></div>
              <div className="text-2xl font-display font-bold text-foreground">{riskMovement.downgrades}</div>
              <div className="text-[10px] text-muted-foreground mt-1">De-escalated</div>
              <div className="text-[9px] text-muted-foreground">Moved to lower tier</div>
            </div>
          </div>
        </ExpandableTile>
      </div>
    </div>
  );
}
