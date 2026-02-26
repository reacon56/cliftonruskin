import type { StructureNode, StructureEdge, OverlayState } from "./OwnershipStructureTab";
import { countryCodeToFlag } from "@/lib/country-flag";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import {
  getJurisdictionRegion,
  JURISDICTION_TINTS,
  JURISDICTION_LABELS,
} from "@/lib/jurisdiction-utils";

interface Props {
  nodes: StructureNode[];
  edges: StructureEdge[];
  centralEntityId: string;
  overlayState: OverlayState;
}

const RISK_BORDER: Record<string, string> = {
  A: "border-destructive",
  B: "border-accent",
  C: "border-success",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "Confirmed",
  med: "Likely",
  low: "Unverified",
};

export default function OwnershipTreeView({ nodes, edges, centralEntityId, overlayState }: Props) {
  const nodeMap = new Map<string, StructureNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const mismatchMap = new Map(overlayState.riskMismatches.map((m) => [m.entityId, m]));

  const ownershipTypes = new Set(["shareholder", "ubo", "parent", "subsidiary", "branch"]);
  const ownershipEdges = edges.filter((e) => ownershipTypes.has(e.relationship_type));

  const parents = ownershipEdges
    .filter((e) => e.target === centralEntityId && ["shareholder", "ubo", "parent"].includes(e.relationship_type))
    .map((e) => ({
      entity: nodeMap.get(e.source)!,
      percentage: e.percentage,
      relType: e.relationship_type,
      edge: e,
    }))
    .filter((p) => p.entity);

  const children = ownershipEdges
    .filter((e) => e.source === centralEntityId && ["subsidiary", "parent", "branch"].includes(e.relationship_type))
    .map((e) => ({
      entity: nodeMap.get(e.target)!,
      percentage: e.percentage,
      relType: e.relationship_type,
      edge: e,
    }))
    .filter((c) => c.entity);

  const centralEntity = nodeMap.get(centralEntityId);
  if (!centralEntity) return null;

  const renderCard = (
    entity: StructureNode,
    percentage: number | null,
    relType: string,
    edge: StructureEdge
  ) => {
    const flag = countryCodeToFlag(entity.hq_country_code || entity.incorporation_country_code);
    const borderColor = RISK_BORDER[entity.risk_tier] || "border-border";
    const isUBO = relType === "ubo";
    const mismatch = mismatchMap.get(entity.id);
    const code = entity.hq_country_code || entity.incorporation_country_code;
    const jurisdictionBg = overlayState.jurisdictionOverlay
      ? JURISDICTION_TINTS[getJurisdictionRegion(code)]
      : "hsl(220, 30%, 14%)";

    return (
      <div key={entity.id + edge.id} className="flex flex-col items-center">
        <div
          className={`relative border-2 ${borderColor} rounded-md px-4 py-3 min-w-[180px] text-center transition-all`}
          style={{ background: jurisdictionBg }}
        >
          {isUBO && (
            <Badge
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] px-1.5 py-0 tracking-wider uppercase"
              style={{ background: "hsl(0, 55%, 50%)", color: "hsl(40, 25%, 97%)", border: "none" }}
            >
              UBO
            </Badge>
          )}

          {/* Risk mismatch indicator */}
          {mismatch && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -top-2 -right-2">
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: "hsl(38, 55%, 52%)" }} />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[240px] text-xs"
                  style={{ background: "hsl(220, 30%, 14%)", color: "hsl(40, 15%, 85%)", border: "1px solid hsl(220, 20%, 25%)" }}
                >
                  {mismatch.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <p className="text-xs font-semibold mb-0.5" style={{ color: "hsl(40, 15%, 88%)", fontFamily: "var(--font-display)" }}>
            {flag && <span className="mr-1">{flag}</span>}
            {entity.name}
          </p>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: "hsl(220, 10%, 50%)" }}>
            {entity.entity_type}
          </p>
          {percentage != null && (
            <p className="text-[10px] font-semibold mt-1" style={{ color: "hsl(38, 55%, 52%)" }}>
              {percentage}%
            </p>
          )}

          {/* Provenance metadata */}
          {overlayState.showProvenance && (
            <div className="mt-2 pt-1.5 space-y-0.5" style={{ borderTop: "1px solid hsl(220, 20%, 22%)" }}>
              <p className="text-[7px] uppercase tracking-widest" style={{ color: "hsl(220, 10%, 45%)" }}>
                {CONFIDENCE_LABELS[edge.confidence_level] || edge.confidence_level}
              </p>
              {overlayState.isInternal && edge.source_reference && (
                <p className="text-[7px]" style={{ color: "hsl(220, 10%, 42%)" }}>
                  {edge.source_reference}
                </p>
              )}
              {edge.last_verified_date && (
                <p className="text-[7px]" style={{ color: "hsl(220, 10%, 40%)" }}>
                  Verified: {edge.last_verified_date}
                </p>
              )}
            </div>
          )}

          {/* Jurisdiction label when overlay active */}
          {overlayState.jurisdictionOverlay && code && (
            <p className="text-[7px] mt-1 uppercase tracking-widest" style={{ color: "hsl(220, 10%, 50%)" }}>
              {JURISDICTION_LABELS[getJurisdictionRegion(code)]}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center py-10 px-4 gap-2" style={{ minHeight: 520 }}>
      {/* Parents / Shareholders */}
      {parents.length > 0 && (
        <>
          <p className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: "hsl(220, 10%, 50%)", fontFamily: "var(--font-body)" }}>
            Shareholders & UBOs
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            {parents.map((p) => renderCard(p.entity, p.percentage, p.relType, p.edge))}
          </div>
          <div className="w-px h-8" style={{ background: "hsl(220, 20%, 30%)" }} />
          <div className="w-2 h-2 rotate-45 -mt-1.5" style={{ background: "hsl(220, 20%, 30%)" }} />
        </>
      )}

      {/* Central entity */}
      <div
        className="border-2 rounded-md px-6 py-4 min-w-[220px] text-center relative"
        style={{
          background: overlayState.jurisdictionOverlay
            ? JURISDICTION_TINTS[getJurisdictionRegion(centralEntity.hq_country_code || centralEntity.incorporation_country_code)]
            : "hsl(220, 30%, 16%)",
          borderColor: "hsl(38, 55%, 52%)",
          boxShadow: "0 0 20px hsl(38 55% 52% / 0.15)",
        }}
      >
        {mismatchMap.has(centralEntity.id) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute -top-2 -right-2">
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: "hsl(38, 55%, 52%)" }} />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[240px] text-xs"
                style={{ background: "hsl(220, 30%, 14%)", color: "hsl(40, 15%, 85%)", border: "1px solid hsl(220, 20%, 25%)" }}
              >
                {mismatchMap.get(centralEntity.id)!.description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <p className="text-sm font-semibold" style={{ color: "hsl(40, 15%, 92%)", fontFamily: "var(--font-display)" }}>
          {countryCodeToFlag(centralEntity.hq_country_code || centralEntity.incorporation_country_code) && (
            <span className="mr-1.5">
              {countryCodeToFlag(centralEntity.hq_country_code || centralEntity.incorporation_country_code)}
            </span>
          )}
          {centralEntity.name}
        </p>
        <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "hsl(38, 55%, 52%)" }}>
          Subject Entity
        </p>
        {overlayState.jurisdictionOverlay && (
          <p className="text-[7px] mt-1 uppercase tracking-widest" style={{ color: "hsl(220, 10%, 50%)" }}>
            {JURISDICTION_LABELS[getJurisdictionRegion(centralEntity.hq_country_code || centralEntity.incorporation_country_code)]}
          </p>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <>
          <div className="w-2 h-2 rotate-45 mt-0" style={{ background: "hsl(220, 20%, 30%)" }} />
          <div className="w-px h-8 -mt-1.5" style={{ background: "hsl(220, 20%, 30%)" }} />
          <p className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: "hsl(220, 10%, 50%)", fontFamily: "var(--font-body)" }}>
            Subsidiaries & Branches
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {children.map((c) => renderCard(c.entity, c.percentage, c.relType, c.edge))}
          </div>
        </>
      )}
    </div>
  );
}
