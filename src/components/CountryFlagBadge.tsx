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
  const flagDiameter = size === "sm" ? "w-[18px] h-[18px] text-[11px]" : "w-[22px] h-[22px] text-[13px]";
  const iconSize = size === "sm" ? 11 : 14;
  const labelSize = size === "sm" ? "text-[10px]" : "text-[11px]";
  const badgePx = size === "sm" ? "pl-0.5 pr-2 py-0.5 gap-1.5" : "pl-0.5 pr-2.5 py-0.5 gap-1.5";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={`inline-flex items-center rounded-full border border-border bg-card ${badgePx}
              cursor-default select-none transition-all duration-200
              hover:shadow-[0_0_0_1px_hsl(var(--gold)/0.2),0_2px_8px_hsl(var(--gold)/0.08)]
              hover:border-[hsl(var(--gold-light))]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold)/0.4)] focus-visible:ring-offset-1`}
            role="img"
            aria-label={name ? tooltipText[label](name) : placeholderTooltip[label]}
          >
            <span className={`${flagDiameter} rounded-full inline-flex items-center justify-center overflow-hidden shrink-0 bg-muted/60`}>
              {flag ? (
                <span className="leading-none">{flag}</span>
              ) : (
                <Globe size={iconSize} className="text-muted-foreground/40" />
              )}
            </span>
            <span className={`${labelSize} font-semibold uppercase tracking-[0.1em] text-foreground/70`}>
              {label}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[240px]">
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
          <span
            tabIndex={0}
            className="inline-flex items-center cursor-help text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold)/0.4)] rounded-sm"
          >
            <Info size={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[260px] leading-relaxed">
          <p className="font-medium mb-0.5">What do these mean?</p>
          <p><strong>INC</strong> = legal jurisdiction of incorporation/registration.</p>
          <p><strong>HQ</strong> = principal place of business (operational base).</p>
          <p className="text-muted-foreground mt-0.5">These can differ from the registered office.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
