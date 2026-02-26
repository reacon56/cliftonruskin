import { useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  owner_id: string | null;
  case_id: string;
  case_sla_breach: boolean;
}

interface Officer {
  id: string;
  name: string;
}

interface Props {
  tasks: Task[];
  officers: Officer[];
  weekOffset: number;
}

export default function CalendarSwimlane({ tasks, officers, weekOffset }: Props) {
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const tasksByOfficerDay = useMemo(() => {
    const map: Record<string, Record<string, Task[]>> = {};
    officers.forEach(o => { map[o.id] = {}; });

    tasks.forEach(t => {
      if (!t.owner_id || !t.due_date) return;
      const dayKey = format(new Date(t.due_date), "yyyy-MM-dd");
      if (!map[t.owner_id]) return;
      if (!map[t.owner_id][dayKey]) map[t.owner_id][dayKey] = [];
      map[t.owner_id][dayKey].push(t);
    });
    return map;
  }, [tasks, officers]);

  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-border">
          <div className="p-2 text-[10px] font-medium text-muted-foreground uppercase">Officer</div>
          {days.map(d => (
            <div
              key={d.toISOString()}
              className={`p-2 text-center text-[10px] font-medium ${
                isSameDay(d, today) ? "bg-accent/10 text-accent" : "text-muted-foreground"
              }`}
            >
              <div>{format(d, "EEE")}</div>
              <div className="font-semibold">{format(d, "d MMM")}</div>
            </div>
          ))}
        </div>

        {/* Swimlanes */}
        {officers.map(officer => (
          <div key={officer.id} className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-border/50 hover:bg-muted/20 transition-colors">
            <div className="p-2 flex items-start">
              <span className="text-xs font-medium text-foreground truncate">{officer.name}</span>
            </div>
            {days.map(d => {
              const dayKey = format(d, "yyyy-MM-dd");
              const dayTasks = tasksByOfficerDay[officer.id]?.[dayKey] ?? [];
              const isPast = isBefore(d, today) && !isSameDay(d, today);

              return (
                <div
                  key={dayKey}
                  className={`p-1 min-h-[60px] border-l border-border/30 ${
                    isSameDay(d, today) ? "bg-accent/5" : isPast ? "bg-muted/10" : ""
                  }`}
                >
                  {dayTasks.map(t => (
                    <div
                      key={t.id}
                      className={`text-[10px] rounded px-1.5 py-0.5 mb-0.5 truncate ${
                        t.status === "blocked"
                          ? "bg-destructive/15 text-destructive"
                          : t.status === "done"
                          ? "bg-success/15 text-success line-through"
                          : t.case_sla_breach
                          ? "bg-warning/15 text-warning"
                          : "bg-primary/10 text-primary"
                      }`}
                      title={t.title}
                    >
                      {t.case_sla_breach && <AlertTriangle size={8} className="inline mr-0.5" />}
                      {t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}

        {officers.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No officers match current filters
          </div>
        )}
      </div>
    </div>
  );
}
