import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, User } from "lucide-react";

export interface OfficerLoad {
  id: string;
  name: string;
  role?: string;
  taskCount: number;
  dueSoon: number;
  overdue: number;
  caseCount: number;
  capacityPercent?: number;
}

interface Props {
  officers: OfficerLoad[];
}

function capacityColor(pct: number) {
  if (pct >= 90) return { bar: "bg-destructive", badge: "bg-destructive/15 text-destructive border-destructive/30", label: "Over capacity" };
  if (pct >= 75) return { bar: "bg-warning", badge: "bg-warning/15 text-warning border-warning/30", label: "At capacity" };
  return { bar: "bg-success", badge: "bg-success/15 text-success border-success/30", label: "Available" };
}

function legacyCapacity(taskCount: number): number {
  return Math.min(100, taskCount * 10);
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
      {officers.map(o => {
        const pct = o.capacityPercent ?? legacyCapacity(o.taskCount);
        const colors = capacityColor(pct);

        return (
          <div key={o.id} className="fvc-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User size={14} className="text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {o.role || `${o.caseCount} case${o.caseCount !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {/* Capacity bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className={`text-[10px] ${colors.badge}`}>
                  {colors.label}
                </Badge>
                <span className="text-xs font-medium text-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-muted-foreground">{o.caseCount} case{o.caseCount !== 1 ? "s" : ""}</span>
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
        );
      })}
    </div>
  );
}
