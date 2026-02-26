import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Network, GitBranch, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import OwnershipNetworkGraph from "./OwnershipNetworkGraph";
import OwnershipTreeView from "./OwnershipTreeView";

interface OwnershipStructureTabProps {
  entity: any;
}

export interface StructureNode {
  id: string;
  name: string;
  entity_type: string;
  incorporation_country_code: string | null;
  hq_country_code: string | null;
  risk_tier: string;
  isCentral?: boolean;
}

export interface StructureEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  percentage: number | null;
  confidence_level: string;
  source_reference: string | null;
}

export default function OwnershipStructureTab({ entity }: OwnershipStructureTabProps) {
  const [view, setView] = useState<"network" | "tree">("network");
  const [nodes, setNodes] = useState<StructureNode[]>([]);
  const [edges, setEdges] = useState<StructureEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    loadStructure();
  }, [entity.id]);

  const loadStructure = async () => {
    setLoading(true);

    // Get all relationships involving this entity
    const { data: rels } = await supabase
      .from("entity_relationships" as any)
      .select("*")
      .or(`source_entity_id.eq.${entity.id},target_entity_id.eq.${entity.id}`);

    const relationships = (rels ?? []) as any[];

    // Collect all entity IDs
    const entityIds = new Set<string>();
    entityIds.add(entity.id);
    relationships.forEach((r: any) => {
      entityIds.add(r.source_entity_id);
      entityIds.add(r.target_entity_id);
    });

    // Fetch entity data for all related entities
    const { data: entities } = await supabase
      .from("entities")
      .select("id, name, entity_type, incorporation_country_code, hq_country_code, risk_tier")
      .in("id", Array.from(entityIds));

    const nodeMap = new Map<string, StructureNode>();
    (entities ?? []).forEach((e: any) => {
      nodeMap.set(e.id, {
        ...e,
        isCentral: e.id === entity.id,
      });
    });

    setNodes(Array.from(nodeMap.values()));
    setEdges(
      relationships.map((r: any) => ({
        id: r.id,
        source: r.source_entity_id,
        target: r.target_entity_id,
        relationship_type: r.relationship_type,
        percentage: r.percentage,
        confidence_level: r.confidence_level,
        source_reference: r.source_reference,
      }))
    );
    setLoading(false);
  };

  const handleExportPNG = () => {
    const svg = document.querySelector("#ownership-graph-svg") as SVGSVGElement | null;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const bbox = svg.getBoundingClientRect();
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);

    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = "hsl(220, 40%, 10%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${entity.name}-ownership-structure.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading structure…</div>
      </div>
    );
  }

  if (nodes.length <= 1) {
    return (
      <div className="fvc-card text-center py-16">
        <p className="text-muted-foreground text-sm">No ownership or structural relationships recorded for this entity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="fvc-heading-3">Ownership & Structure</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {nodes.length} entities · {edges.length} relationships
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "network" | "tree")}
            className="border border-border rounded-md"
          >
            <ToggleGroupItem value="network" aria-label="Network view" className="gap-1.5 text-xs px-3">
              <Network className="h-3.5 w-3.5" />
              Network
            </ToggleGroupItem>
            <ToggleGroupItem value="tree" aria-label="Tree view" className="gap-1.5 text-xs px-3">
              <GitBranch className="h-3.5 w-3.5" />
              Tree
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 3))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.3))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setZoomLevel(1);
                setResetKey((k) => k + 1);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs ml-1"
              onClick={handleExportPNG}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Graph / Tree */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          background: "hsl(220, 40%, 10%)",
          backgroundImage:
            "radial-gradient(circle, hsl(220, 30%, 18%) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          minHeight: 520,
        }}
      >
        {view === "network" ? (
          <OwnershipNetworkGraph
            nodes={nodes}
            edges={edges}
            zoomLevel={zoomLevel}
            resetKey={resetKey}
          />
        ) : (
          <OwnershipTreeView
            nodes={nodes}
            edges={edges}
            centralEntityId={entity.id}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-[10px] text-muted-foreground uppercase tracking-widest px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-muted-foreground/40 bg-muted/30" />
          Corporate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground/40 bg-muted/30" />
          Individual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rotate-45 border border-muted-foreground/40 bg-muted/30" />
          Trust
        </span>
        <span className="flex items-center gap-2 ml-4">
          <span className="inline-block w-6 h-px bg-muted-foreground" />
          Ownership
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-6 h-px border-t border-dashed border-muted-foreground" />
          Director
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-6 h-px border-t border-dotted border-muted-foreground" />
          Operational
        </span>
      </div>
    </div>
  );
}
