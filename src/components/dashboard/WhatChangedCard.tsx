import { useNavigate } from "react-router-dom";
import { FileText, Newspaper, Users, Scale, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ExpandableTile from "./ExpandableTile";

interface Props {
  totalChanges: number;
  adverseMedia: number;
  ownershipChanges: number;
  litigationSignals: number;
}

export default function WhatChangedCard({ totalChanges, adverseMedia, ownershipChanges, litigationSignals }: Props) {
  const navigate = useNavigate();

  const rows = [
    { label: "Material changes detected", count: totalChanges, icon: <FileText size={14} />, color: "text-accent", bg: "bg-accent/10", route: "/monitoring" },
    { label: "New adverse media alerts", count: adverseMedia, icon: <Newspaper size={14} />, color: "text-destructive", bg: "bg-destructive/10", route: "/monitoring?type=adverse_media" },
    { label: "Ownership / director changes", count: ownershipChanges, icon: <Users size={14} />, color: "text-warning", bg: "bg-warning/10", route: "/monitoring?type=ownership" },
    { label: "Litigation / regulatory signals", count: litigationSignals, icon: <Scale size={14} />, color: "text-info", bg: "bg-info/10", route: "/monitoring?type=litigation" },
  ];

  const expandedContent = (
    <div className="space-y-6">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${row.bg}`}>
              <span className={row.color}>{row.icon}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <div className="text-2xl font-display font-bold text-foreground">{row.count}</div>
            </div>
          </div>
          <button
            onClick={() => navigate(row.route)}
            className="fvc-link text-xs flex items-center gap-1"
          >
            View details <ChevronRight size={12} />
          </button>
        </div>
      ))}
    </div>
  );

  const headerRight = (
    <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Last 30 days</span>
  );

  return (
    <ExpandableTile
      title="What Changed"
      headerRight={headerRight}
      expandedContent={expandedContent}
    >
      <div className="space-y-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-3 border-b border-border/60 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 -mx-2 px-2 rounded group"
            onClick={() => navigate(row.route)}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${row.bg}`}>
                <span className={row.color}>{row.icon}</span>
              </div>
              <span className="text-sm text-foreground">{row.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`fvc-status-badge ${row.count > 0 ? `${row.bg} ${row.color}` : "bg-muted text-muted-foreground"}`}>
                {row.count}
              </Badge>
              <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>
    </ExpandableTile>
  );
}
