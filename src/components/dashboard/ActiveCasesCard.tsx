import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Clock, AlertCircle } from "lucide-react";
import ExpandableTile from "./ExpandableTile";

interface CaseItem {
  id: string;
  status: string;
  product_type: string;
  priority: string;
  due_date: string | null;
  entities?: { name: string } | null;
}

interface Props {
  cases: CaseItem[];
}

const STAGES = ["scheduled", "quoted", "submitted", "approved", "assigned", "in_progress", "awaiting_client", "qc", "delivered", "closed"] as const;
const STAGE_LABELS: Record<string, string> = {
  scheduled: "Scheduled", quoted: "Quoted", submitted: "Submitted", approved: "Approved",
  assigned: "Assigned", in_progress: "In Progress", awaiting_client: "Awaiting Client",
  qc: "QC", delivered: "Delivered", closed: "Closed", cancelled: "Cancelled",
};

function stageIndex(status: string): number {
  const idx = STAGES.indexOf(status as any);
  return idx >= 0 ? idx : -1;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function SlaCountdown({ dueDate }: { dueDate: string | null }) {
  const days = daysUntil(dueDate);
  if (days === null) return <span className="text-[10px] text-muted-foreground">No SLA</span>;
  let color = "text-success";
  let label = `${days}d left`;
  if (days < 0) { color = "text-destructive"; label = `${Math.abs(days)}d overdue`; }
  else if (days <= 2) { color = "text-destructive"; }
  else if (days <= 5) { color = "text-warning"; }
  return (
    <span className={`text-[10px] font-semibold ${color} flex items-center gap-1`}>
      <Clock size={10} />{label}
    </span>
  );
}

function StageIndicator({ status }: { status: string }) {
  const currentIdx = stageIndex(status);
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {STAGES.map((stage, i) => {
        const isActive = i <= currentIdx && currentIdx >= 0;
        const isCurrent = stage === status;
        return (
          <div key={stage} className="flex items-center gap-0.5">
            <div className={`h-1.5 rounded-full transition-all ${isCurrent ? "w-5 bg-accent" : isActive ? "w-3 bg-accent/50" : "w-3 bg-border"}`} title={STAGE_LABELS[stage]} />
          </div>
        );
      })}
      <span className="text-[9px] font-medium text-muted-foreground ml-1.5 uppercase tracking-wider">
        {STAGE_LABELS[status] ?? status}
      </span>
    </div>
  );
}

function BlockerTag({ status }: { status: string }) {
  const blockers: Record<string, { label: string; color: string }> = {
    awaiting_client: { label: "Awaiting client info", color: "bg-warning/10 text-warning" },
    submitted: { label: "Pending approval", color: "bg-primary/10 text-primary" },
    quoted: { label: "Quote pending", color: "bg-accent/10 text-accent" },
    scheduled: { label: "Scheduled", color: "bg-muted text-muted-foreground" },
  };
  const blocker = blockers[status];
  if (!blocker) return null;
  return (
    <Badge className={`fvc-status-badge text-[9px] ${blocker.color} flex items-center gap-1`}>
      <AlertCircle size={8} />{blocker.label}
    </Badge>
  );
}

function CaseRow({ c, onClick }: { c: CaseItem; onClick: () => void }) {
  return (
    <div
      className="py-3 border-b border-border/60 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 -mx-2 px-2 rounded group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {(c as any).entities?.name ?? "Entity"}
            </span>
            <BlockerTag status={c.status} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{c.product_type} · {c.priority}</div>
          <StageIndicator status={c.status} />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <SlaCountdown dueDate={c.due_date} />
          <ChevronRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

export default function ActiveCasesCard({ cases }: Props) {
  const navigate = useNavigate();

  const headerRight = (
    <button onClick={() => navigate("/commission")} className="fvc-link text-xs">View all</button>
  );

  const expandedContent = (
    <div className="space-y-0">
      {cases.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No cases commissioned yet.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Entity</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Product</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Priority</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">SLA</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/cases/${c.id}`)}>
                  <td className="p-3 text-foreground font-medium">{(c as any).entities?.name ?? "Entity"}</td>
                  <td className="p-3 text-muted-foreground">{c.product_type}</td>
                  <td className="p-3 capitalize text-muted-foreground">{c.priority}</td>
                  <td className="p-3 capitalize text-muted-foreground">{STAGE_LABELS[c.status] ?? c.status}</td>
                  <td className="p-3"><SlaCountdown dueDate={c.due_date} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <ExpandableTile
      title="Active Cases"
      headerRight={headerRight}
      expandedContent={expandedContent}
    >
      {cases.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No cases commissioned yet.</p>
      ) : (
        <div className="space-y-0">
          {cases.map((c) => (
            <CaseRow key={c.id} c={c} onClick={() => navigate(`/cases/${c.id}`)} />
          ))}
        </div>
      )}
    </ExpandableTile>
  );
}
