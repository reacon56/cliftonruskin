import { TrendingUp, TrendingDown, Minus, ShieldCheck, AlertTriangle, Clock, Activity } from "lucide-react";

interface Props {
  compliancePct: number;
  overdueCount: number;
  activeCases: number;
  highAlerts: number;
  totalEntities: number;
}

export default function ProgrammeHealthIndicator({
  compliancePct, overdueCount, activeCases, highAlerts, totalEntities,
}: Props) {
  // Compute health score: 0-100
  const overdueRatio = totalEntities > 0 ? overdueCount / totalEntities : 0;
  const alertPenalty = Math.min(highAlerts * 5, 25);
  const score = Math.max(0, Math.round(compliancePct - (overdueRatio * 30) - alertPenalty));

  const getHealthColor = () => {
    if (score >= 85) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getHealthLabel = () => {
    if (score >= 85) return "Healthy";
    if (score >= 60) return "Attention Needed";
    return "At Risk";
  };

  const getHealthIcon = () => {
    if (score >= 85) return <TrendingUp size={16} />;
    if (score >= 60) return <Minus size={16} />;
    return <TrendingDown size={16} />;
  };

  const indicators = [
    {
      label: "Policy Compliance",
      value: `${compliancePct}%`,
      icon: <ShieldCheck size={13} />,
      status: compliancePct >= 90 ? "good" : compliancePct >= 70 ? "warn" : "bad",
    },
    {
      label: "Overdue Reviews",
      value: overdueCount.toString(),
      icon: <Clock size={13} />,
      status: overdueCount === 0 ? "good" : overdueCount <= 3 ? "warn" : "bad",
    },
    {
      label: "Active Cases",
      value: activeCases.toString(),
      icon: <Activity size={13} />,
      status: "neutral" as const,
    },
    {
      label: "High Alerts",
      value: highAlerts.toString(),
      icon: <AlertTriangle size={13} />,
      status: highAlerts === 0 ? "good" : "bad",
    },
  ];

  const statusColor = (s: string) => {
    if (s === "good") return "text-success";
    if (s === "warn") return "text-warning";
    if (s === "bad") return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div>
      {/* Health score header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex items-center gap-1.5 ${getHealthColor()}`}>
          {getHealthIcon()}
          <span className="text-2xl font-display font-bold">{score}</span>
        </div>
        <div>
          <div className={`text-sm font-medium ${getHealthColor()}`}>{getHealthLabel()}</div>
          <div className="text-[10px] text-muted-foreground">Programme Health Score</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-muted mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            score >= 85 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-destructive"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Sub-indicators */}
      <div className="grid grid-cols-2 gap-3">
        {indicators.map((ind) => (
          <div key={ind.label} className="flex items-center gap-2">
            <span className={statusColor(ind.status)}>{ind.icon}</span>
            <div>
              <div className="text-xs font-medium text-foreground">{ind.value}</div>
              <div className="text-[10px] text-muted-foreground">{ind.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
