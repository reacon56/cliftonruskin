import { Globe, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { countryCodeToFlag } from "@/lib/country-flag";

interface FlagBadgeProps {
  code: string | null | undefined;
  name: string | null | undefined;
  label: "INC" | "HQ";
  size?: "sm" | "md";
}

const tooltipText = {
  INC: (name: string) => `Incorporated in: ${name}`,
  HQ: (name: string) => `HQ / Principal Place of Business: ${name}`,
};

const placeholderTooltip = {
  INC: "Incorporation not confirmed",
  HQ: "HQ not confirmed",
};

export function CountryFlagBadge({ code, name, label, size = "sm" }: FlagBadgeProps) {
  const flag = countryCodeToFlag(code);
  const flagSize = size === "sm" ? "text-sm" : "text-lg";
  const iconSize = size === "sm" ? 12 : 18;
  const labelSize = size === "sm" ? "text-[8px]" : "text-[9px]";
  const badgePx = size === "sm" ? "px-1.5 py-0.5 gap-1" : "px-2 py-1 gap-1.5";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-full border border-border bg-muted/50 ${badgePx} cursor-default select-none`}
            role="img"
            aria-label={name ? tooltipText[label](name) : placeholderTooltip[label]}
          >
            {flag ? (
              <span className={`${flagSize} leading-none`}>{flag}</span>
            ) : (
              <Globe size={iconSize} className="text-muted-foreground/40" />
            )}
            <span className={`${labelSize} font-semibold uppercase tracking-wider text-muted-foreground`}>
              {label}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {name ? tooltipText[label](name) : placeholderTooltip[label]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FlagBadgesInfo({ size = "sm" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? 11 : 13;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors">
            <Info size={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          INC = legal jurisdiction of incorporation. HQ = principal place of business.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
