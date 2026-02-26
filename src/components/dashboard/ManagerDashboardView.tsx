import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Users, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  selectedOrgId: string;
  onOrgChange: (id: string) => void;
}

export default function ManagerDashboardView({ selectedOrgId, onOrgChange }: Props) {
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [slaMetrics, setSlaMetrics] = useState({ onTime: 0, late: 0, avgDays: 0 });
  const [officerWorkload, setOfficerWorkload] = useState<{ name: string; count: number }[]>([]);
  const [riskMovement, setRiskMovement] = useState<{ upgrades: number; downgrades: number; period: string }>({
    upgrades: 0, downgrades: 0, period: "30",
  });
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
    const { data: cases } = await supabase
      .from("cases")
      .select("due_date, status, created_at")
      .eq("org_id", selectedOrgId)
      .in("status", ["delivered", "closed", "complete"]);

    if (!cases?.length) {
      setSlaMetrics({ onTime: 0, late: 0, avgDays: 0 });
      return;
    }

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
    const { data: cases } = await supabase
      .from("cases")
      .select("assigned_to")
      .not("status", "in", '("delivered","closed","cancelled","complete")')
      .not("assigned_to", "is", null);

    if (!cases?.length) {
      setOfficerWorkload([]);
      return;
    }

    // Count per officer
    const counts: Record<string, number> = {};
    cases.forEach((c: any) => {
      counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1;
    });

    // Get names
    const userIds = Object.keys(counts);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      nameMap[p.user_id] = p.full_name || p.email || "Unknown";
    });

    setOfficerWorkload(
      Object.entries(counts)
        .map(([id, count]) => ({ name: nameMap[id] || id.slice(0, 8), count }))
        .sort((a, b) => b.count - a.count)
    );
  };

  const loadRiskMovement = async () => {
    const days = parseInt(riskPeriod);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: logs } = await supabase
      .from("audit_events")
      .select("metadata")
      .eq("object_type", "entity")
      .eq("action_type", "risk_tier_changed")
      .gte("created_at", since);

    let upgrades = 0, downgrades = 0;
    (logs ?? []).forEach((l: any) => {
      const meta = l.metadata ?? {};
      if (meta.direction === "upgrade") upgrades++;
      else if (meta.direction === "downgrade") downgrades++;
      else {
        // Infer from old/new if available
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
        <div className="fvc-card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-accent" />
            <h3 className="fvc-heading-3 text-foreground">SLA Performance</h3>
          </div>
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
              <div className="flex items-center justify-center gap-1 text-success mb-0.5">
                <CheckCircle2 size={12} />
              </div>
              <div className="text-sm font-semibold text-foreground">{slaMetrics.onTime}</div>
              <div className="text-[10px] text-muted-foreground">On Time</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-destructive mb-0.5">
                <AlertTriangle size={12} />
              </div>
              <div className="text-sm font-semibold text-foreground">{slaMetrics.late}</div>
              <div className="text-[10px] text-muted-foreground">Late</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <Clock size={12} />
              </div>
              <div className="text-sm font-semibold text-foreground">{slaMetrics.avgDays}d</div>
              <div className="text-[10px] text-muted-foreground">Avg Duration</div>
            </div>
          </div>
        </div>

        {/* Officer Workload */}
        <div className="fvc-card">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-accent" />
            <h3 className="fvc-heading-3 text-foreground">Officer Workload</h3>
          </div>
          {officerWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No active assignments</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officerWorkload} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Risk Movement */}
        <div className="fvc-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              <h3 className="fvc-heading-3 text-foreground">Risk Movement</h3>
            </div>
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              {["30", "90"].map((p) => (
                <button
                  key={p}
                  onClick={() => setRiskPeriod(p)}
                  className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    riskPeriod === p ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-6">
            Entity risk tier changes over the last {riskPeriod} days
          </p>
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-destructive mb-2">
                <TrendingUp size={18} />
              </div>
              <div className="text-2xl font-display font-bold text-foreground">{riskMovement.upgrades}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Escalated</div>
              <div className="text-[9px] text-muted-foreground">Moved to higher tier</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-success mb-2">
                <TrendingDown size={18} />
              </div>
              <div className="text-2xl font-display font-bold text-foreground">{riskMovement.downgrades}</div>
              <div className="text-[10px] text-muted-foreground mt-1">De-escalated</div>
              <div className="text-[9px] text-muted-foreground">Moved to lower tier</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
