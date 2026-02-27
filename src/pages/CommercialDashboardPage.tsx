import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Building2, Users, DollarSign, Clock, AlertTriangle, Briefcase } from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--chart-3, 142 71% 45%))",
  "hsl(var(--chart-4, 43 74% 66%))",
  "hsl(var(--destructive))",
];

interface OrgRow { id: string; name: string; package?: string }
interface CaseRow { id: string; org_id: string; product_type: string; price_estimate: number | null; status: string; report_tier: string }
interface EntityRow { id: string; org_id: string }
interface TimeEntry { case_id: string; officer_id: string; minutes: number }

export default function CommercialDashboardPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [marginOverride, setMarginOverride] = useState("65");
  const [periodFilter, setPeriodFilter] = useState("365");

  useEffect(() => { loadData(); }, [periodFilter]);

  const loadData = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(periodFilter));

    const [orgsRes, casesRes, entRes, timeRes, profRes] = await Promise.all([
      supabase.from("organisations" as any).select("id, name, package"),
      supabase.from("cases").select("id, org_id, product_type, price_estimate, status, report_tier").gte("created_at", since.toISOString()),
      supabase.from("entities").select("id, org_id"),
      supabase.from("analyst_time_entries" as any).select("case_id, officer_id, minutes").gte("entry_date", since.toISOString().split("T")[0]),
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    setOrgs((orgsRes.data as any[]) ?? []);
    setCases(casesRes.data ?? []);
    setEntities((entRes.data as any[]) ?? []);
    setTimeEntries((timeRes.data as any[]) ?? []);
    setProfiles(profRes.data ?? []);
    setLoading(false);
  };

  // ── ARR by client ──
  const revenueByOrg: Record<string, number> = {};
  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o]));
  const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || "Unknown"]));

  cases.forEach(c => {
    if (c.price_estimate && ["delivered", "closed", "complete"].includes(c.status)) {
      revenueByOrg[c.org_id] = (revenueByOrg[c.org_id] || 0) + Number(c.price_estimate);
    }
  });

  const arrByClient = Object.entries(revenueByOrg)
    .map(([orgId, rev]) => ({ name: orgMap[orgId]?.name || orgId.slice(0, 8), revenue: rev, package: orgMap[orgId]?.package || "core" }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = arrByClient.reduce((s, c) => s + c.revenue, 0);

  // ── Entities monitored by client ──
  const entitiesByOrg: Record<string, number> = {};
  entities.forEach(e => { entitiesByOrg[e.org_id] = (entitiesByOrg[e.org_id] || 0) + 1; });
  const totalEntities = entities.length;

  // ── Revenue by product type ──
  const revenueByProduct: Record<string, number> = {};
  cases.forEach(c => {
    if (c.price_estimate && ["delivered", "closed", "complete"].includes(c.status)) {
      const pt = c.product_type || "Unknown";
      revenueByProduct[pt] = (revenueByProduct[pt] || 0) + Number(c.price_estimate);
    }
  });
  const productData = Object.entries(revenueByProduct)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Average revenue per entity ──
  const avgRevenuePerEntity = totalEntities > 0 ? Math.round(totalRevenue / totalEntities) : 0;

  // ── Gross margin estimate ──
  const grossMarginPct = parseFloat(marginOverride) || 0;
  const grossProfit = Math.round(totalRevenue * (grossMarginPct / 100));

  // ── Analyst minutes per £ revenue ──
  const totalMinutes = timeEntries.reduce((s, e) => s + e.minutes, 0);
  const minutesPerPound = totalRevenue > 0 ? (totalMinutes / totalRevenue).toFixed(2) : "—";

  // ── Utilisation by officer ──
  const minutesByOfficer: Record<string, number> = {};
  timeEntries.forEach(e => { minutesByOfficer[e.officer_id] = (minutesByOfficer[e.officer_id] || 0) + e.minutes; });
  const officerUtilisation = Object.entries(minutesByOfficer)
    .map(([uid, mins]) => ({ name: profileMap[uid] || uid.slice(0, 8), minutes: mins }))
    .sort((a, b) => b.minutes - a.minutes);

  // ── QA rework rate ──
  const totalCases = cases.length;
  const reworkCases = cases.filter(c => c.status === "rework" || c.status === "qa_rejected").length;
  const reworkRate = totalCases > 0 ? Math.round((reworkCases / totalCases) * 100) : 0;

  if (loading) return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Commercial Dashboard</h1>
          <p className="text-sm text-muted-foreground">PE-grade metrics — revenue, margins & efficiency</p>
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={16} />} label="Total Revenue" value={`£${totalRevenue.toLocaleString()}`} />
        <KpiCard icon={<Building2 size={16} />} label="Entities Monitored" value={totalEntities.toLocaleString()} />
        <KpiCard icon={<TrendingUp size={16} />} label="Avg Rev / Entity" value={`£${avgRevenuePerEntity.toLocaleString()}`} />
        <KpiCard icon={<Clock size={16} />} label="Min / £ Revenue" value={minutesPerPound.toString()} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue by Client */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Briefcase size={14} /> Revenue by Client
          </h3>
          {arrByClient.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-8 text-center">No revenue data.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arrByClient.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} formatter={(v: number) => [`£${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue by Product Type */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Revenue by Product Type</h3>
          {productData.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-8 text-center">No data.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2} stroke="hsl(var(--card))">
                      {productData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} formatter={(v: number) => `£${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                {productData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-foreground truncate flex-1">{p.name}</span>
                    <span className="text-muted-foreground font-medium">£{p.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Gross Margin Estimate */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Gross Margin Estimate</h3>
          <div className="flex items-center gap-2 mb-4">
            <Input type="number" min={0} max={100} value={marginOverride} onChange={e => setMarginOverride(e.target.value)} className="w-20 text-sm" />
            <span className="text-sm text-muted-foreground">% assumed margin</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="text-foreground font-medium">£{totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Gross Profit</span>
              <span className="text-foreground font-bold">£{grossProfit.toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${grossMarginPct}%` }} />
            </div>
          </div>
        </div>

        {/* Officer Utilisation */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users size={14} /> Officer Utilisation
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {officerUtilisation.map(o => (
              <div key={o.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate">{o.name}</span>
                <span className="font-medium text-foreground">{o.minutes} min</span>
              </div>
            ))}
            {officerUtilisation.length === 0 && <p className="text-xs text-muted-foreground italic">No data.</p>}
          </div>
        </div>

        {/* QA Rework Rate */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> QA Rework Rate
          </h3>
          <div className="text-center py-4">
            <div className={`text-3xl font-display font-bold ${reworkRate > 15 ? "text-destructive" : reworkRate > 5 ? "text-warning" : "text-foreground"}`}>
              {reworkRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{reworkCases} of {totalCases} cases</p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${reworkRate > 15 ? "bg-destructive" : reworkRate > 5 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(reworkRate, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            Margin impact: ~£{Math.round(grossProfit * (reworkRate / 100)).toLocaleString()} at current rate
          </p>
        </div>
      </div>

      {/* Entities by Client */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Entities Monitored by Client</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(entitiesByOrg).sort(([, a], [, b]) => b - a).slice(0, 12).map(([orgId, count]) => (
            <div key={orgId} className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-muted/30">
              <span className="text-foreground truncate">{orgMap[orgId]?.name || orgId.slice(0, 8)}</span>
              <Badge variant="outline" className="text-[10px]">{count}</Badge>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Commercial metrics are restricted to Assurance Managers. Clients cannot access this view.
      </p>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    </div>
  );
}
