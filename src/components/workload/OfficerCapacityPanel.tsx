import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, User } from "lucide-react";

interface OfficerLoad {
  id: string;
  name: string;
  taskCount: number;
  dueSoon: number;   // tasks due in ≤3 days
  overdue: number;
  caseCount: number;
}

interface Props {
  officers: OfficerLoad[];
}

function capacityColor(taskCount: number) {
  if (taskCount >= 10) return "bg-destructive/15 text-destructive border-destructive/30";
  if (taskCount >= 6) return "bg-warning/15 text-warning border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

function capacityLabel(taskCount: number) {
  if (taskCount >= 10) return "Over capacity";
  if (taskCount >= 6) return "At capacity";
  return "Available";
}

export default function OfficerCapacityPanel({ officers }: Props) {
  if (!officers.length) {
    return (
      <div className="fvc-card text-center py-8">
        <p className="text-sm text-muted-foreground">No officers with active assignments</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {officers.map(o => (
        <div key={o.id} className="fvc-card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User size={14} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
              <p className="text-[10px] text-muted-foreground">{o.caseCount} case{o.caseCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${capacityColor(o.taskCount)}`}>
              {capacityLabel(o.taskCount)}
            </Badge>
            <span className="text-xs text-muted-foreground">{o.taskCount} tasks</span>
          </div>

          <div className="flex items-center gap-4 text-[10px]">
            {o.overdue > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle size={10} /> {o.overdue} overdue
              </span>
            )}
            {o.dueSoon > 0 && (
              <span className="flex items-center gap-1 text-warning">
                {o.dueSoon} due soon
              </span>
            )}
            {o.overdue === 0 && o.dueSoon === 0 && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 size={10} /> On track
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
