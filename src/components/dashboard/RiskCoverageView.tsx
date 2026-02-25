import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface Entity {
  id: string;
  name: string;
  country: string | null;
  risk_tier: string;
  next_review_date: string | null;
}

interface Props {
  entities: Entity[];
}

export default function RiskCoverageView({ entities }: Props) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const tierData = useMemo(() => {
    const tiers = ["A", "B", "C"];
    return tiers.map((tier) => {
      const tierEntities = entities.filter((e) => e.risk_tier === tier);
      const overdue = tierEntities.filter((e) => e.next_review_date && e.next_review_date < todayStr).length;
      const inDate = tierEntities.length - overdue;
      return { tier: `Tier ${tier}`, inDate, overdue, total: tierEntities.length };
    });
  }, [entities, todayStr]);

  const workloadData = useMemo(() => {
    const buckets = [
      { label: "Next 30d", max: 30 },
      { label: "31–60d", max: 60 },
      { label: "61–90d", max: 90 },
    ];
    return buckets.map(({ label, max }) => {
      const min = max - 30;
      const count = entities.filter((e) => {
        if (!e.next_review_date) return false;
        const diff = Math.ceil((new Date(e.next_review_date).getTime() - now.getTime()) / 86400000);
        return diff > min && diff <= max;
      }).length;
      return { period: label, reviews: count };
    });
  }, [entities, now]);

  const TIER_COLORS: Record<string, string> = {
    "Tier A": "hsl(0 60% 48%)",
    "Tier B": "hsl(38 75% 52%)",
    "Tier C": "hsl(152 45% 38%)",
  };

  return (
    <div className="space-y-6">
      {/* Tier compliance breakdown */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
          In-Date vs Overdue by Risk Tier
        </h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierData} barGap={4}>
              <XAxis
                dataKey="tier"
                tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220 28% 12%)",
                  border: "1px solid hsl(220 20% 20%)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(40 15% 90%)",
                }}
              />
              <Bar dataKey="inDate" name="In-date" stackId="a" radius={[0, 0, 0, 0]}>
                {tierData.map((entry) => (
                  <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "hsl(152 45% 38%)"} opacity={0.7} />
                ))}
              </Bar>
              <Bar dataKey="overdue" name="Overdue" stackId="a" radius={[4, 4, 0, 0]}>
                {tierData.map((entry) => (
                  <Cell key={entry.tier} fill="hsl(0 60% 48%)" opacity={0.9} />
                ))}
              </Bar>
              <Legend
                wrapperStyle={{ fontSize: 10, color: "hsl(220 10% 46%)" }}
                iconSize={8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming workload */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Upcoming Review Workload
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {workloadData.map((bucket) => (
            <div key={bucket.period} className="rounded-lg border border-border p-3 text-center">
              <div className="text-xl font-semibold font-display text-foreground">{bucket.reviews}</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground mt-1">
                {bucket.period}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
