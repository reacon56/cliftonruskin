import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, TrendingUp, Users, Briefcase, BarChart3 } from "lucide-react";

const BUCKET_LABELS: Record<string, string> = {
  data_retrieval: "Data Retrieval & Checks",
  analysis_writeup: "Analysis & Write-up",
  partner_management: "Partner Management",
  revisions: "Revisions",
  qa_rework: "QA Rework",
};

interface TimeEntry {
  id: string;
  case_id: string;
  officer_id: string;
  org_id: string;
  bucket: string;
  minutes: number;
  entry_date: string;
}

export default function UnitEconomicsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("30");

  useEffect(() => { loadData(); }, [periodFilter]);

  const loadData = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(periodFilter));

    const [entriesRes, casesRes, profilesRes, orgsRes] = await Promise.all([
      supabase.from("analyst_time_entries" as any).select("*").gte("entry_date", since.toISOString().split("T")[0]),
      supabase.from("cases").select("id, report_tier, org_id, entity_id, status, product_type"),
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("organisations" as any).select("id, name"),
    ]);

    setEntries((entriesRes.data as any[]) ?? []);
    setCases(casesRes.data ?? []);
    setProfiles(profilesRes.data ?? []);
    setOrgs((orgsRes.data as any[]) ?? []);
    setLoading(false);
  };

  // Index maps
  const caseMap = Object.fromEntries(cases.map((c) => [c.id, c]));
  const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name || "Unknown"]));
  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name || "Unknown"]));

  // ── Minutes per case by tier ──
  const minutesByTier: Record<string, { totalMinutes: number; caseCount: number }> = {};
  const minutesByCase: Record<string, number> = {};
  entries.forEach((e) => {
    minutesByCase[e.case_id] = (minutesByCase[e.case_id] || 0) + e.minutes;
  });
  Object.entries(minutesByCase).forEach(([caseId, mins]) => {
    const tier = caseMap[caseId]?.report_tier || "standard";
    if (!minutesByTier[tier]) minutesByTier[tier] = { totalMinutes: 0, caseCount: 0 };
    minutesByTier[tier].totalMinutes += mins;
    minutesByTier[tier].caseCount += 1;
  });

  // ── Minutes per client (org) ──
  const minutesByOrg: Record<string, number> = {};
  entries.forEach((e) => {
    const c = caseMap[e.case_id];
    const orgId = c?.org_id || e.org_id;
    minutesByOrg[orgId] = (minutesByOrg[orgId] || 0) + e.minutes;
  });

  // ── Minutes per officer ──
  const minutesByOfficer: Record<string, number> = {};
  entries.forEach((e) => {
    minutesByOfficer[e.officer_id] = (minutesByOfficer[e.officer_id] || 0) + e.minutes;
  });

  // ── Bucket breakdown ──
  const minutesByBucket: Record<string, number> = {};
  entries.forEach((e) => {
    minutesByBucket[e.bucket] = (minutesByBucket[e.bucket] || 0) + e.minutes;
  });

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const totalCases = Object.keys(minutesByCase).length;
  const avgPerCase = totalCases > 0 ? Math.round(totalMinutes / totalCases) : 0;

  if (loading) return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Unit Economics</h1>
          <p className="text-sm text-muted-foreground">Analyst time tracking and cost analysis</p>
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Clock size={16} />} label="Total Minutes" value={totalMinutes.toLocaleString()} />
        <KpiCard icon={<Briefcase size={16} />} label="Cases Tracked" value={totalCases.toString()} />
        <KpiCard icon={<TrendingUp size={16} />} label="Avg Min / Case" value={avgPerCase.toString()} />
        <KpiCard icon={<Users size={16} />} label="Active Officers" value={Object.keys(minutesByOfficer).length.toString()} />
      </div>

      {/* ── Minutes per Tier ── */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 size={14} /> Minutes per Case by Tier
        </h3>
        <div className="space-y-2">
          {Object.entries(minutesByTier).sort(([a], [b]) => a.localeCompare(b)).map(([tier, data]) => (
            <div key={tier} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">{tier}</Badge>
                <span className="text-muted-foreground">{data.caseCount} cases</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-foreground font-medium">{data.totalMinutes} min total</span>
                <span className="text-muted-foreground text-xs">({Math.round(data.totalMinutes / data.caseCount)} avg)</span>
              </div>
            </div>
          ))}
          {Object.keys(minutesByTier).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No time entries in this period.</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* ── Minutes per Client ── */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Minutes per Client</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(minutesByOrg).sort(([, a], [, b]) => b - a).map(([orgId, mins]) => (
              <div key={orgId} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate">{orgMap[orgId] || orgId.slice(0, 8)}</span>
                <span className="font-medium text-foreground">{mins} min</span>
              </div>
            ))}
            {Object.keys(minutesByOrg).length === 0 && <p className="text-xs text-muted-foreground italic">No data.</p>}
          </div>
        </div>

        {/* ── Minutes per Officer ── */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Minutes per Officer</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(minutesByOfficer).sort(([, a], [, b]) => b - a).map(([uid, mins]) => (
              <div key={uid} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate">{profileMap[uid] || uid.slice(0, 8)}</span>
                <span className="font-medium text-foreground">{mins} min</span>
              </div>
            ))}
            {Object.keys(minutesByOfficer).length === 0 && <p className="text-xs text-muted-foreground italic">No data.</p>}
          </div>
        </div>
      </div>

      {/* ── Bucket Breakdown ── */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Time by Activity</h3>
        <div className="space-y-2">
          {Object.entries(minutesByBucket).sort(([, a], [, b]) => b - a).map(([bucket, mins]) => {
            const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
            return (
              <div key={bucket} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{BUCKET_LABELS[bucket] || bucket}</span>
                  <span className="text-muted-foreground">{mins} min ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Unit economics data is internal only. Clients cannot access time tracking information.
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
