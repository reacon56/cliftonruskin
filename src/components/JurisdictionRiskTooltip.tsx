import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

// Plain English descriptions for each indicator type
const INDICATOR_DESCRIPTIONS: Record<string, { label: string; triggers: string; badgeVariant: "default" | "destructive" | "secondary" | "outline" }> = {
  FATF_STATUS: {
    label: "FATF Status",
    triggers: "Triggers enhanced due diligence requirements and may block automated approvals for entities in this jurisdiction.",
    badgeVariant: "destructive",
  },
  EU_AML_HRTC: {
    label: "EU High-Risk Third Country",
    triggers: "Mandates enhanced customer due diligence under EU AML Directive. Affects all EU-regulated clients.",
    badgeVariant: "destructive",
  },
  SANCTIONS_UK_PROGRAMME: {
    label: "UK Sanctions Programme",
    triggers: "Comprehensive programmes block all transactions; targeted programmes require screening against the OFSI list.",
    badgeVariant: "destructive",
  },
  SANCTIONS_EU_PROGRAMME: {
    label: "EU Sanctions Programme",
    triggers: "Comprehensive regimes prohibit most dealings; targeted regimes require entity-level screening against the EU FSF list.",
    badgeVariant: "destructive",
  },
  SANCTIONS_US_OFAC_PROGRAMME: {
    label: "US OFAC Programme",
    triggers: "Comprehensive programmes impose near-total embargoes; targeted programmes require SDN/SSI screening for US-nexus activity.",
    badgeVariant: "destructive",
  },
  US_STATE_SPONSOR_TERRORISM: {
    label: "US State Sponsor of Terrorism",
    triggers: "Restricts US foreign assistance, defence exports, and financial transactions. Highest-risk US designation.",
    badgeVariant: "destructive",
  },
  US_FINCEN_311: {
    label: "FinCEN Section 311",
    triggers: "Designates primary money laundering concern. US financial institutions must apply special measures.",
    badgeVariant: "outline",
  },
  EU_TAX_NONCOOP: {
    label: "EU Tax Non-Cooperative",
    triggers: "Listed on EU blacklist of non-cooperative tax jurisdictions. May trigger withholding tax obligations.",
    badgeVariant: "outline",
  },
  CPI_SCORE: {
    label: "CPI Score",
    triggers: "Corruption Perceptions Index — indicator only. Informs risk weighting but does not trigger automatic controls.",
    badgeVariant: "secondary",
  },
};

interface JurisdictionRiskTooltipProps {
  indicatorType: string;
  sourceName?: string;
  lastUpdated?: string;
  value?: string;
  programmeStatus?: string;
  children?: React.ReactNode;
}

export default function JurisdictionRiskTooltip({
  indicatorType,
  sourceName,
  lastUpdated,
  value,
  programmeStatus,
  children,
}: JurisdictionRiskTooltipProps) {
  const info = INDICATOR_DESCRIPTIONS[indicatorType] || {
    label: indicatorType,
    triggers: "No description available.",
    badgeVariant: "secondary" as const,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <Badge variant={info.badgeVariant} className="text-[10px] cursor-help gap-1">
              {info.label}
              {value && <span className="opacity-70">({value})</span>}
              <Info className="h-2.5 w-2.5 opacity-60" />
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3 space-y-2">
          <div>
            <p className="text-xs font-semibold">{info.label}</p>
            {programmeStatus && (
              <Badge variant={programmeStatus === "COMPREHENSIVE" ? "destructive" : "outline"} className="text-[9px] mt-0.5">
                {programmeStatus}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{info.triggers}</p>
          <div className="border-t pt-1.5 space-y-0.5">
            {sourceName && (
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium">Source:</span> {sourceName}
              </p>
            )}
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium">Last updated:</span> {lastUpdated}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Convenience export for getting indicator info without rendering */
export function getIndicatorInfo(indicatorType: string) {
  return INDICATOR_DESCRIPTIONS[indicatorType] || {
    label: indicatorType,
    triggers: "No description available.",
    badgeVariant: "secondary" as const,
  };
}
