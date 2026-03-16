import { useMemo } from "react";
import { format, differenceInDays, addDays, startOfWeek, isBefore } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface GanttItem {
  id: string;
  label: string;
  type: "task" | "milestone";
  start: string;
  end: string;
  status: string;
  officer: string;
  slaBreach: boolean;
}

interface Props {
  items: GanttItem[];
  weekOffset: number;
}

const BAR_COLORS: Record<string, string> = {
  todo: "bg-muted-foreground/40",
  in_progress: "bg-primary",
  blocked: "bg-destructive",
  done: "bg-success",
};

export default function GanttView({ items, weekOffset }: Props) {
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const totalDays = 28; // 4 weeks
  const dayWidth = 100 / totalDays;
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  const todayOffset = differenceInDays(today, weekStart);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px] relative">
        {/* Day headers */}
        <div className="flex border-b border-border">
          <div className="w-[180px] shrink-0 p-2 text-[10px] font-medium text-muted-foreground uppercase">Item</div>
          <div className="flex-1 flex relative">
            {days.map((d, i) => (
              <div
                key={i}
                className={`text-[9px] text-center border-l border-border/30 ${
                  i % 7 === 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
                style={{ width: `${dayWidth}%` }}
              >
                {i % 7 === 0 ? format(d, "d MMM") : format(d, "d")}
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        {items.map(item => {
          const startDate = new Date(item.start);
          const endDate = new Date(item.end);
          const startOff = Math.max(0, differenceInDays(startDate, weekStart));
          const endOff = Math.min(totalDays, differenceInDays(endDate, weekStart) + 1);
          const barLeft = startOff * dayWidth;
          const barWidth = Math.max(dayWidth, (endOff - startOff) * dayWidth);
          const isOverdue = item.status !== "done" && isBefore(endDate, today);

          return (
            <div key={item.id} className="flex border-b border-border/30 hover:bg-muted/20 transition-colors">
              <div className="w-[180px] shrink-0 p-2 flex items-center gap-1.5">
                {item.slaBreach && <AlertTriangle size={10} className="text-destructive shrink-0" />}
                <span className={`text-[11px] truncate ${item.type === "milestone" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </div>
              <div className="flex-1 relative h-8">
                {barLeft < 100 && barWidth > 0 && (
                  <div
                    className={`absolute top-1.5 h-5 rounded-sm ${BAR_COLORS[item.status] || "bg-muted"} ${
                      isOverdue ? "ring-1 ring-destructive" : ""
                    } ${item.type === "milestone" ? "opacity-70" : ""}`}
                    style={{ left: `${barLeft}%`, width: `${barWidth}%`, maxWidth: `${100 - barLeft}%` }}
                    title={`${item.label} (${item.officer}) — ${format(startDate, "d MMM")} → ${format(endDate, "d MMM")}`}
                  />
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No items match current filters</div>
        )}

        {/* Today line */}
        {todayOffset >= 0 && todayOffset < totalDays && (
          <div
            className="absolute top-0 bottom-0 w-px bg-accent z-10 pointer-events-none"
            style={{ left: `calc(180px + ${todayOffset * dayWidth}%)` }}
          />
        )}
      </div>
    </div>
  );
}
