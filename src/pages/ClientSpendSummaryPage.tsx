import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, FileText, Wallet, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";

export default function ClientSpendSummaryPage() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const [cases, setCases] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodMonths, setPeriodMonths] = useState("12");

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [orgId, periodMonths]);

  const loadData = async () => {
    setLoading(true);
    const since = subMonths(new Date(), parseInt(periodMonths)).toISOString();

    const [casesRes, delsRes, budgetRes] = await Promise.all([
      supabase.from("cases").select("id, product_type, price_estimate, status, created_at").eq("org_id", orgId!).gte("created_at", since),
      supabase.from("deliverables").select("id, case_id, title, deliverable_type, created_at, version"),
      supabase.from("programme_budgets" as any).select("*").eq("org_id", orgId!).order("created_at", { ascending: false }).limit(1),
    ]);

    setCases(casesRes.data ?? []);
    setDeliverables(delsRes.data ?? []);
    setBudget((budgetRes.data as any[])?.[0] ?? null);
    setLoading(false);
  };

  // Committed = approved/quoted cases, Delivered = delivered/closed/complete
  const committed = cases
    .filter(c => ["approved", "quoted", "assigned", "in_progress", "qa_review"].includes(c.status))
    .reduce((s, c) => s + (Number(c.price_estimate) || 0), 0);
  const delivered = cases
    .filter(c => ["delivered", "closed", "complete"].includes(c.status))
    .reduce((s, c) => s + (Number(c.price_estimate) || 0), 0);
  const totalSpend = committed + delivered;

  const budgetCap = budget ? Number(budget.annual_cap || 0) : 0;
  const budgetRemaining = budgetCap > 0 ? budgetCap - totalSpend : null;
  const budgetPct = budgetCap > 0 ? Math.min(Math.round((totalSpend / budgetCap) * 100), 100) : 0;

  // Deliverables by month
  const months = parseInt(periodMonths);
  const monthBuckets: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const m = startOfMonth(subMonths(new Date(), i));
    monthBuckets[format(m, "yyyy-MM")] = 0;
  }
  deliverables.forEach(d => {
    const key = format(new Date(d.created_at), "yyyy-MM");
    if (key in monthBuckets) monthBuckets[key]++;
  });
  const deliverablesByMonth = Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month: format(new Date(month + "-01"), "MMM yy"), count }));

  // Spend by product type
  const spendByProduct: Record<string, number> = {};
  cases.forEach(c => {
    if (c.price_estimate) {
      const pt = c.product_type || "Other";
      spendByProduct[pt] = (spendByProduct[pt] || 0) + Number(c.price_estimate);
    }
  });

  if (loading) return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Spend Summary</h1>
          <p className="text-sm text-muted-foreground">Your programme spend and deliverables overview</p>
        </div>
        <Select value={periodMonths} onValueChange={setPeriodMonths}>
          <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={16} />} label="Total Spend" value={`£${totalSpend.toLocaleString()}`} />
        <KpiCard icon={<TrendingUp size={16} />} label="Committed" value={`£${committed.toLocaleString()}`} sub="In progress" />
        <KpiCard icon={<FileText size={16} />} label="Delivered" value={`£${delivered.toLocaleString()}`} sub="Completed" />
        <KpiCard icon={<Wallet size={16} />} label="Budget Remaining" value={budgetRemaining !== null ? `£${budgetRemaining.toLocaleString()}` : "—"} sub={budgetCap > 0 ? `of £${budgetCap.toLocaleString()}` : "No cap set"} />
      </div>

      {/* Budget bar */}
      {budgetCap > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-semibold text-foreground">Budget Utilisation</h3>
            <Badge variant={budgetPct >= 90 ? "destructive" : budgetPct >= 70 ? "secondary" : "outline"} className="text-[10px]">
              {budgetPct}% used
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${budgetPct >= 90 ? "bg-destructive" : budgetPct >= 70 ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Spend by Product */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Spend by Product</h3>
          <div className="space-y-2">
            {Object.entries(spendByProduct).sort(([, a], [, b]) => b - a).map(([product, amount]) => {
              const pct = totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0;
              return (
                <div key={product} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{product}</span>
                    <span className="text-muted-foreground">£{amount.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(spendByProduct).length === 0 && <p className="text-xs text-muted-foreground italic">No spend data.</p>}
          </div>
        </div>

        {/* Deliverables by Period */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Deliverables by Period</h3>
          {deliverablesByMonth.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-8 text-center">No deliverables.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliverablesByMonth} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <div className="text-2xl font-display font-bold text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
