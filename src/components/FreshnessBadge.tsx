import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { type FreshnessStatus, freshnessColor, freshnessTooltipText } from "@/lib/freshness-utils";

interface FreshnessBadgeProps {
  status: FreshnessStatus;
  retrievedAt?: string | null;
  maxDays?: number | null;
  /** Show label text next to icon */
  showLabel?: boolean;
  className?: string;
}

const STATUS_ICON = {
  FRESH: CheckCircle2,
  STALE: AlertCircle,
  UNKNOWN: HelpCircle,
} as const;

export default function FreshnessBadge({
  status,
  retrievedAt,
  maxDays,
  showLabel = false,
  className = "",
}: FreshnessBadgeProps) {
  const colors = freshnessColor(status);
  const Icon = STATUS_ICON[status];
  const tooltip = freshnessTooltipText(status, retrievedAt, maxDays);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium cursor-default select-none ${colors.bg} ${colors.text} ${colors.border} ${className}`}
          >
            <Icon className="h-3 w-3" />
            {showLabel && <span>{status}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[280px]">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
