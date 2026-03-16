import { useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface FieldTooltipProps {
  text: string;
}

export function FieldTooltip({ text }: FieldTooltipProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <span className="relative inline-flex">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMobileOpen(!mobileOpen);
          }}
          className="text-muted-foreground/50 hover:text-accent transition-colors"
          aria-label="More info"
        >
          <Info size={14} />
        </button>
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute z-50 left-1/2 -translate-x-1/2 top-6 w-[280px] rounded-md bg-foreground text-background px-3 py-2 text-[12px] leading-relaxed shadow-lg">
              {text}
            </div>
          </>
        )}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help text-muted-foreground/50 hover:text-accent transition-colors">
            <Info size={14} />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] bg-foreground text-background text-[12px] leading-relaxed border-none"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
