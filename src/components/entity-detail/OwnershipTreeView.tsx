import type { StructureNode, StructureEdge } from "./OwnershipStructureTab";
import { countryCodeToFlag } from "@/lib/country-flag";
import { Badge } from "@/components/ui/badge";

interface Props {
  nodes: StructureNode[];
  edges: StructureEdge[];
  centralEntityId: string;
}

interface TreeNode {
  entity: StructureNode;
  children: { node: TreeNode; percentage: number | null; relType: string }[];
  parents: { node: TreeNode; percentage: number | null; relType: string }[];
}

const RISK_BORDER: Record<string, string> = {
  A: "border-destructive",
  B: "border-accent",
  C: "border-success",
};

export default function OwnershipTreeView({ nodes, edges, centralEntityId }: Props) {
  const nodeMap = new Map<string, StructureNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build parent/child relationships from ownership edges
  const ownershipTypes = new Set(["shareholder", "ubo", "parent", "subsidiary", "branch"]);
  const ownershipEdges = edges.filter((e) => ownershipTypes.has(e.relationship_type));

  // Parents = entities that own/are shareholders of the central entity
  const parents = ownershipEdges
    .filter(
      (e) =>
        e.target === centralEntityId &&
        ["shareholder", "ubo", "parent"].includes(e.relationship_type)
    )
    .map((e) => ({
      entity: nodeMap.get(e.source)!,
      percentage: e.percentage,
      relType: e.relationship_type,
    }))
    .filter((p) => p.entity);

  // Children = subsidiaries/branches of central entity
  const children = ownershipEdges
    .filter(
      (e) =>
        e.source === centralEntityId &&
        ["subsidiary", "parent", "branch"].includes(e.relationship_type)
    )
    .map((e) => ({
      entity: nodeMap.get(e.target)!,
      percentage: e.percentage,
      relType: e.relationship_type,
    }))
    .filter((c) => c.entity);

  const centralEntity = nodeMap.get(centralEntityId);
  if (!centralEntity) return null;

  const renderCard = (
    entity: StructureNode,
    percentage: number | null,
    relType: string,
    depth: number = 0
  ) => {
    const flag = countryCodeToFlag(entity.hq_country_code || entity.incorporation_country_code);
    const borderColor = RISK_BORDER[entity.risk_tier] || "border-border";
    const isUBO = relType === "ubo";

    return (
      <div key={entity.id} className="flex flex-col items-center">
        <div
          className={`relative border-2 ${borderColor} rounded-md px-4 py-3 min-w-[180px] text-center transition-all`}
          style={{ background: "hsl(220, 30%, 14%)" }}
        >
          {isUBO && (
            <Badge
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] px-1.5 py-0 tracking-wider uppercase"
              style={{
                background: "hsl(0, 55%, 50%)",
                color: "hsl(40, 25%, 97%)",
                border: "none",
              }}
            >
              UBO
            </Badge>
          )}
          <p
            className="text-xs font-semibold mb-0.5"
            style={{
              color: "hsl(40, 15%, 88%)",
              fontFamily: "var(--font-display)",
            }}
          >
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
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center py-10 px-4 gap-2" style={{ minHeight: 520 }}>
      {/* Parents / Shareholders */}
      {parents.length > 0 && (
        <>
          <p
            className="text-[9px] uppercase tracking-[0.15em] mb-2"
            style={{ color: "hsl(220, 10%, 50%)", fontFamily: "var(--font-body)" }}
          >
            Shareholders & UBOs
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            {parents.map((p) => renderCard(p.entity, p.percentage, p.relType))}
          </div>

          {/* Connector line */}
          <div className="w-px h-8" style={{ background: "hsl(220, 20%, 30%)" }} />
          <div className="w-2 h-2 rotate-45 -mt-1.5" style={{ background: "hsl(220, 20%, 30%)" }} />
        </>
      )}

      {/* Central entity */}
      <div
        className="border-2 rounded-md px-6 py-4 min-w-[220px] text-center"
        style={{
          background: "hsl(220, 30%, 16%)",
          borderColor: "hsl(38, 55%, 52%)",
          boxShadow: "0 0 20px hsl(38 55% 52% / 0.15)",
        }}
      >
        <p
          className="text-sm font-semibold"
          style={{
            color: "hsl(40, 15%, 92%)",
            fontFamily: "var(--font-display)",
          }}
        >
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
      </div>

      {/* Children */}
      {children.length > 0 && (
        <>
          <div className="w-2 h-2 rotate-45 mt-0" style={{ background: "hsl(220, 20%, 30%)" }} />
          <div className="w-px h-8 -mt-1.5" style={{ background: "hsl(220, 20%, 30%)" }} />

          <p
            className="text-[9px] uppercase tracking-[0.15em] mb-2"
            style={{ color: "hsl(220, 10%, 50%)", fontFamily: "var(--font-body)" }}
          >
            Subsidiaries & Branches
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {children.map((c) => renderCard(c.entity, c.percentage, c.relType))}
          </div>
        </>
      )}
    </div>
  );
}
