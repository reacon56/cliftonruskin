import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Network, GitBranch, ZoomIn, ZoomOut, RotateCcw, Download, Eye,
  Globe, Filter, FileText, AlertTriangle,
} from "lucide-react";
import OwnershipNetworkGraph from "./OwnershipNetworkGraph";
import OwnershipTreeView from "./OwnershipTreeView";
import {
  detectRiskMismatches,
  JURISDICTION_LABELS,
  JURISDICTION_TINTS,
  getJurisdictionRegion,
  type RiskMismatch,
  type JurisdictionRegion,
} from "@/lib/jurisdiction-utils";

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
  last_verified_date: string | null;
}

export interface OverlayState {
  showProvenance: boolean;
  jurisdictionOverlay: boolean;
  filters: FilterState;
  riskMismatches: RiskMismatch[];
  isInternal: boolean;
}

export interface FilterState {
  relationshipType: string;
  confidenceLevel: string;
  riskRating: string;
  jurisdiction: string;
}

const EMPTY_FILTERS: FilterState = {
  relationshipType: "all",
  confidenceLevel: "all",
  riskRating: "all",
  jurisdiction: "all",
};

export default function OwnershipStructureTab({ entity }: OwnershipStructureTabProps) {
  const { hasRole, canExportOwnership, canFilterOwnership, canProvenance, canEditRels, isInternal } = useAuth();
  const [view, setView] = useState<"network" | "tree">("network");
  const [nodes, setNodes] = useState<StructureNode[]>([]);
  const [edges, setEdges] = useState<StructureEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  // Overlay controls
  const [showProvenance, setShowProvenance] = useState(false);
  const [jurisdictionOverlay, setJurisdictionOverlay] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadStructure();
  }, [entity.id]);

  const loadStructure = async () => {
    setLoading(true);

    const { data: rels } = await supabase
      .from("entity_relationships" as any)
      .select("*")
      .or(`source_entity_id.eq.${entity.id},target_entity_id.eq.${entity.id}`);

    const relationships = (rels ?? []) as any[];

    const entityIds = new Set<string>();
    entityIds.add(entity.id);
    relationships.forEach((r: any) => {
      entityIds.add(r.source_entity_id);
      entityIds.add(r.target_entity_id);
    });

    const { data: entities } = await supabase
      .from("entities")
      .select("id, name, entity_type, incorporation_country_code, hq_country_code, risk_tier")
      .in("id", Array.from(entityIds));

    const nodeMap = new Map<string, StructureNode>();
    (entities ?? []).forEach((e: any) => {
      nodeMap.set(e.id, { ...e, isCentral: e.id === entity.id });
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
        last_verified_date: r.last_verified_date,
      }))
    );
    setLoading(false);
  };

  // Risk mismatches
  const riskMismatches = useMemo(() => detectRiskMismatches(nodes, edges), [nodes, edges]);

  // Filtered nodes & edges
  const { filteredNodes, filteredEdges } = useMemo(() => {
    let fNodes = [...nodes];
    let fEdges = [...edges];

    if (filters.relationshipType !== "all") {
      const validIds = new Set<string>();
      fEdges = fEdges.filter((e) => e.relationship_type === filters.relationshipType);
      fEdges.forEach((e) => { validIds.add(e.source); validIds.add(e.target); });
      // Always keep central entity
      validIds.add(entity.id);
      fNodes = fNodes.filter((n) => validIds.has(n.id));
    }

    if (filters.confidenceLevel !== "all") {
      fEdges = fEdges.filter((e) => e.confidence_level === filters.confidenceLevel);
      const validIds = new Set<string>();
      fEdges.forEach((e) => { validIds.add(e.source); validIds.add(e.target); });
      validIds.add(entity.id);
      fNodes = fNodes.filter((n) => validIds.has(n.id));
    }

    if (filters.riskRating !== "all") {
      fNodes = fNodes.filter((n) => n.risk_tier === filters.riskRating || n.isCentral);
      const nodeIds = new Set(fNodes.map((n) => n.id));
      fEdges = fEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    }

    if (filters.jurisdiction !== "all") {
      fNodes = fNodes.filter((n) => {
        if (n.isCentral) return true;
        const region = getJurisdictionRegion(n.hq_country_code || n.incorporation_country_code);
        return region === filters.jurisdiction;
      });
      const nodeIds = new Set(fNodes.map((n) => n.id));
      fEdges = fEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    }

    return { filteredNodes: fNodes, filteredEdges: fEdges };
  }, [nodes, edges, filters, entity.id]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "all");

  const overlayState: OverlayState = {
    showProvenance,
    jurisdictionOverlay,
    filters,
    riskMismatches,
    isInternal,
  };

  // --- Export PNG ---
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

  // --- Export PDF ---
  const handleExportPDF = () => {
    const svg = document.querySelector("#ownership-graph-svg") as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const bbox = svg.getBoundingClientRect();

    const canvas = document.createElement("canvas");
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

      const graphDataUrl = canvas.toDataURL("image/png");
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      });

      // Collect active jurisdiction regions for legend
      const activeRegions = new Set<JurisdictionRegion>();
      filteredNodes.forEach((n) => {
        activeRegions.add(getJurisdictionRegion(n.hq_country_code || n.incorporation_country_code));
      });

      const legendItems = Array.from(activeRegions)
        .map((r) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:16px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${JURISDICTION_TINTS[r]};border:1px solid rgba(255,255,255,0.1);"></span>${JURISDICTION_LABELS[r]}</span>`)
        .join("");

      const mismatchRows = riskMismatches.length > 0
        ? riskMismatches
            .map((m) => {
              const node = filteredNodes.find((n) => n.id === m.entityId);
              return `<tr><td style="padding:4px 8px;font-size:9px;color:#9ca3af;">${node?.name || "Unknown"}</td><td style="padding:4px 8px;font-size:9px;color:#d4a853;">${m.description}</td></tr>`;
            })
            .join("")
        : "";

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${entity.name} — Ownership & Structure</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; color: #1e293b; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #c9a94e; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: #1a2744; }
  .header .brand { font-family: 'Cormorant Garamond', serif; font-size: 14px; font-weight: 700; color: #c9a94e; letter-spacing: 0.08em; }
  .meta { font-size: 10px; color: #6b7280; margin-bottom: 16px; }
  .graph-container { text-align: center; margin: 16px 0; }
  .graph-container img { max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; }
  .legend { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 12px; }
  .alerts { margin-top: 16px; }
  .alerts h3 { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; color: #1a2744; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  table tr { border-bottom: 1px solid #f3f4f6; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 16mm; border-top: 1px solid #e5e7eb; font-size: 7px; color: #9ca3af; text-align: center; }
</style>
</head><body>
<div class="header">
  <h1>${entity.name} — Ownership & Structure</h1>
  <div class="brand">CR · CLIFTON RUSKIN</div>
</div>
<div class="meta">Generated ${dateStr} · ${filteredNodes.length} entities · ${filteredEdges.length} relationships · Confidential</div>
<div class="graph-container"><img src="${graphDataUrl}" /></div>
<div class="legend">Jurisdictions: ${legendItems || "—"}</div>
${mismatchRows ? `<div class="alerts"><h3>Intelligence Indicators</h3><table>${mismatchRows}</table></div>` : ""}
<div class="footer">CONFIDENTIAL — Prepared by Clifton Ruskin · info@cliftonruskin.com · This document is provided for informational purposes only.</div>
</body></html>`);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
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
        <p className="text-muted-foreground text-sm">
          No ownership or structural relationships recorded for this entity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="fvc-heading-3">Ownership & Structure</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredNodes.length} entities · {filteredEdges.length} relationships
            {riskMismatches.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1" style={{ color: "hsl(38, 55%, 52%)" }}>
                <AlertTriangle className="h-3 w-3" />
                {riskMismatches.length} indicator{riskMismatches.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
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

          {/* Provenance toggle — internal only */}
          {canProvenance && (
            <div className="flex items-center gap-1.5 ml-1 border border-border rounded-md px-2 py-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="provenance-toggle" className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer">
                Provenance
              </Label>
              <Switch
                id="provenance-toggle"
                checked={showProvenance}
                onCheckedChange={setShowProvenance}
                className="scale-75"
              />
            </div>
          )}

          {/* Jurisdiction overlay toggle */}
          <div className="flex items-center gap-1.5 border border-border rounded-md px-2 py-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <Label htmlFor="jurisdiction-toggle" className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer">
              Jurisdiction
            </Label>
            <Switch
              id="jurisdiction-toggle"
              checked={jurisdictionOverlay}
              onCheckedChange={setJurisdictionOverlay}
              className="scale-75"
            />
          </div>

          {/* Filters — gated by permission */}
          {canFilterOwnership && (
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs relative">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "hsl(38, 55%, 52%)" }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-3" align="end">
                <p className="fvc-label">Filter Structure</p>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Relationship</Label>
                  <Select value={filters.relationshipType} onValueChange={(v) => setFilters({ ...filters, relationshipType: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="shareholder">Shareholder</SelectItem>
                      <SelectItem value="ubo">UBO</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="subsidiary">Subsidiary</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="operating_presence">Operating Presence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</Label>
                  <Select value={filters.confidenceLevel} onValueChange={(v) => setFilters({ ...filters, confidenceLevel: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high">Confirmed</SelectItem>
                      <SelectItem value="med">Likely</SelectItem>
                      <SelectItem value="low">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk Rating</Label>
                  <Select value={filters.riskRating} onValueChange={(v) => setFilters({ ...filters, riskRating: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="A">Tier A — High</SelectItem>
                      <SelectItem value="B">Tier B — Medium</SelectItem>
                      <SelectItem value="C">Tier C — Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Jurisdiction</Label>
                  <Select value={filters.jurisdiction} onValueChange={(v) => setFilters({ ...filters, jurisdiction: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {Object.entries(JURISDICTION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                  >
                    Clear Filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Zoom & Export */}
          <div className="flex items-center gap-1 ml-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 3))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.3))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setZoomLevel(1); setResetKey((k) => k + 1); }}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            {/* Export — gated by permission */}
            {canExportOwnership && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs ml-1">
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1" align="end">
                  <button
                    onClick={handleExportPNG}
                    className="w-full text-left px-3 py-2 text-xs rounded hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <Download className="h-3 w-3" />
                    Export PNG
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-3 py-2 text-xs rounded hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-3 w-3" />
                    Export PDF
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Graph / Tree */}
      <div
        className="rounded-lg border overflow-hidden relative"
        style={{
          background: "hsl(220, 40%, 10%)",
          backgroundImage: "radial-gradient(circle, hsl(220, 30%, 18%) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          minHeight: 520,
        }}
      >
        {view === "network" ? (
          <OwnershipNetworkGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            zoomLevel={zoomLevel}
            resetKey={resetKey}
            overlayState={overlayState}
          />
        ) : (
          <OwnershipTreeView
            nodes={filteredNodes}
            edges={filteredEdges}
            centralEntityId={entity.id}
            overlayState={overlayState}
          />
        )}

        {/* Jurisdiction legend overlay */}
        {jurisdictionOverlay && (
          <div
            className="absolute bottom-3 right-3 rounded-md px-3 py-2 space-y-1"
            style={{ background: "hsl(220, 30%, 12% / 0.9)", border: "1px solid hsl(220, 20%, 25%)" }}
          >
            <p className="text-[8px] uppercase tracking-[0.15em] mb-1" style={{ color: "hsl(220, 10%, 50%)" }}>
              Jurisdiction Regions
            </p>
            {Object.entries(JURISDICTION_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ background: JURISDICTION_TINTS[key as JurisdictionRegion], border: "1px solid hsl(220, 15%, 30%)" }}
                />
                <span className="text-[8px]" style={{ color: "hsl(40, 10%, 60%)" }}>{label}</span>
              </div>
            ))}
          </div>
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
        {riskMismatches.length > 0 && (
          <span className="flex items-center gap-1.5 ml-4">
            <AlertTriangle className="h-3 w-3" style={{ color: "hsl(38, 55%, 52%)" }} />
            <span style={{ color: "hsl(38, 55%, 52%)" }}>Intelligence Indicator</span>
          </span>
        )}
      </div>
    </div>
  );
}
