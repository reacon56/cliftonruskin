import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, MessageSquare, Shield, CalendarClock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActionItem {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  cta: string;
  onClick: () => void;
}

interface Props {
  stats: {
    pendingApprovals: number;
    awaitingClient: number;
    overdue: number;
    highAlerts: number;
    dueSoon: number;
    liaReviewsDue?: number;
  };
  onViewAll: () => void;
}

export default function ActionsRequired({ stats, onViewAll }: Props) {
  const navigate = useNavigate();

  const actions: ActionItem[] = [
    {
      key: "approvals",
      label: "Approvals pending",
      count: stats.pendingApprovals,
      icon: <Shield size={16} />,
      colorClass: "text-accent",
      bgClass: "bg-accent/10",
      cta: "Review approvals",
      onClick: () => navigate("/approvals"),
    },
    {
      key: "awaiting",
      label: "Awaiting your input",
      count: stats.awaitingClient,
      icon: <MessageSquare size={16} />,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      cta: "Respond now",
      onClick: () => navigate("/cases?status=awaiting_client"),
    },
    {
      key: "overdue",
      label: "Overdue reviews",
      count: stats.overdue,
      icon: <AlertTriangle size={16} />,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      cta: "Open review queue",
      onClick: () => navigate("/entities?filter=overdue"),
    },
    {
      key: "highAlerts",
      label: "High severity alerts",
      count: stats.highAlerts,
      icon: <AlertTriangle size={16} />,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      cta: "Triage alerts",
      onClick: () => navigate("/monitoring?severity=high&status=new"),
    },
    {
      key: "dueSoon",
      label: "Reviews due within 30 days",
      count: stats.dueSoon,
      icon: <CalendarClock size={16} />,
      colorClass: "text-info",
      bgClass: "bg-info/10",
      cta: "Plan upcoming reviews",
      onClick: () => navigate("/entities?filter=due_soon"),
    },
    {
      key: "liaReviews",
      label: "LIA reviews due",
      count: stats.liaReviewsDue ?? 0,
      icon: <Shield size={16} />,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      cta: "Review LIAs",
      onClick: () => navigate("/lia-library"),
    },
  ];

  const visible = actions.filter((a) => a.count > 0);

  if (visible.length === 0) {
    return (
      <div className="fvc-card mb-8 flex items-center gap-3 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
          <Shield size={16} className="text-success" />
        </div>
        <p className="text-sm font-medium text-foreground">All clear — no actions required right now.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent" />
          <h2 className="fvc-heading-3 text-foreground">Actions Required</h2>
          <Badge className="fvc-status-badge bg-destructive/10 text-destructive ml-1">
            {visible.length}
          </Badge>
        </div>
        <button onClick={onViewAll} className="fvc-link text-xs flex items-center gap-1">
          View all actions <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 fvc-stagger">
        {visible.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className="fvc-card-interactive text-left p-4 group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${action.bgClass}`}>
                <span className={action.colorClass}>{action.icon}</span>
              </div>
              <span className={`text-xl font-semibold font-display ${action.colorClass}`}>
                {action.count}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug mb-3">{action.label}</p>
            <span className="text-[11px] font-semibold text-accent group-hover:underline flex items-center gap-1">
              {action.cta} <ChevronRight size={10} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
