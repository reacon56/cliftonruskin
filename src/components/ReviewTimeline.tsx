import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, startOfMonth, addMonths, isBefore, isAfter, parseISO } from "date-fns";

interface Entity {
  id: string;
  name: string;
  next_review_date: string | null;
  risk_tier: string;
}

interface Props {
  entities: Entity[];
}

export default function ReviewTimeline({ entities }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { month: Date; label: string; overdue: number; due: number; upcoming: number }[] = [];

    // Show 1 month back (overdue bucket) + 6 months forward
    for (let i = -1; i < 6; i++) {
      const month = startOfMonth(addMonths(now, i));
      const nextMonth = startOfMonth(addMonths(now, i + 1));

      let overdue = 0;
      let due = 0;
      let upcoming = 0;

      entities.forEach((e) => {
        if (!e.next_review_date) return;
        const reviewDate = parseISO(e.next_review_date);

        if (i === -1) {
          // Overdue bucket: anything before today that falls in this month range
          if (isBefore(reviewDate, now) && !isBefore(reviewDate, month)) {
            overdue++;
          }
        } else {
          if (!isBefore(reviewDate, month) && isBefore(reviewDate, nextMonth)) {
            if (isBefore(reviewDate, now)) {
              overdue++;
            } else if (isBefore(reviewDate, addMonths(now, 1))) {
              due++;
            } else {
              upcoming++;
            }
          }
        }
      });

      months.push({
        month,
        label: i === -1 ? "Overdue" : format(month, "MMM yy"),
        overdue,
        due,
        upcoming,
      });
    }

    return months;
  }, [entities]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-[11px] text-muted-foreground">
            {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }}
            axisLine={{ stroke: "hsl(38 18% 88% / 0.3)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="overdue" name="Overdue" stackId="a" fill="hsl(0 60% 48%)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="due" name="Due Soon" stackId="a" fill="hsl(38 75% 52%)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="upcoming" name="Upcoming" stackId="a" fill="hsl(210 55% 52%)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
