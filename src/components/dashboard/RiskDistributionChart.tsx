import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  entities: any[];
}

const TIER_CONFIG = [
  { tier: "A", label: "Tier A — High", color: "hsl(var(--destructive))" },
  { tier: "B", label: "Tier B — Medium", color: "hsl(var(--warning, 45 93% 47%))" },
  { tier: "C", label: "Tier C — Low", color: "hsl(var(--success, 142 71% 45%))" },
];

export default function RiskDistributionChart({ entities }: Props) {
  const data = TIER_CONFIG.map(({ tier, label, color }) => ({
    name: label,
    value: entities.filter((e) => e.risk_tier === tier).length,
    color,
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No entity data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="w-40 h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-muted-foreground">{d.name}</span>
            <span className="text-xs font-semibold text-foreground ml-auto">{d.value}</span>
          </div>
        ))}
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
          Total: {total} entities
        </div>
      </div>
    </div>
  );
}
