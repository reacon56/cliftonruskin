import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { StructureNode, StructureEdge } from "./OwnershipStructureTab";
import { countryCodeToFlag } from "@/lib/country-flag";

interface Props {
  nodes: StructureNode[];
  edges: StructureEdge[];
  zoomLevel: number;
  resetKey: number;
}

const RISK_COLORS: Record<string, string> = {
  A: "hsl(0, 55%, 50%)",
  B: "hsl(38, 55%, 52%)",
  C: "hsl(152, 45%, 42%)",
};

const NODE_FILL = "hsl(220, 30%, 18%)";
const NODE_STROKE_DEFAULT = "hsl(220, 20%, 35%)";
const SELECTED_GLOW = "hsl(38, 55%, 52%)";
const TEXT_COLOR = "hsl(40, 15%, 85%)";
const EDGE_COLOR = "hsl(220, 20%, 35%)";
const LABEL_COLOR = "hsl(40, 10%, 65%)";

function getEdgeStroke(type: string): string {
  if (["shareholder", "ubo", "parent", "subsidiary"].includes(type)) return "6,0"; // solid
  if (type === "director") return "6,4"; // dashed
  return "2,4"; // dotted
}

function getNodeShape(type: string): "rect" | "circle" | "diamond" {
  if (type === "individual") return "circle";
  if (type === "trust") return "diamond";
  return "rect";
}

export default function OwnershipNetworkGraph({ nodes, edges, zoomLevel, resetKey }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(520, container.clientHeight);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

    // Defs for filters
    const defs = svg.append("defs");

    // Gold glow filter
    const glowFilter = defs.append("filter").attr("id", "gold-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glowFilter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "4").attr("result", "blur");
    glowFilter.append("feFlood").attr("flood-color", SELECTED_GLOW).attr("flood-opacity", "0.4").attr("result", "color");
    glowFilter.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
    const glowMerge = glowFilter.append("feMerge");
    glowMerge.append("feMergeNode").attr("in", "glow");
    glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Arrow marker
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 6")
      .attr("refX", 30)
      .attr("refY", 3)
      .attr("markerWidth", 8)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L10,3 L0,6")
      .attr("fill", EDGE_COLOR);

    // Zoom behavior
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(zoomLevel).translate(-width / 2, -height / 2));

    // Simulation
    const simNodes = nodes.map((n) => ({
      ...n,
      x: n.isCentral ? width / 2 : undefined,
      y: n.isCentral ? height / 2 : undefined,
      fx: n.isCentral ? width / 2 : undefined,
      fy: n.isCentral ? height / 2 : undefined,
    }));

    const simEdges = edges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force("link", d3.forceLink(simEdges as any).id((d: any) => d.id).distance(160).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50))
      .alphaDecay(0.03);

    simulationRef.current = simulation;

    // Edges
    const edgeGroup = g.append("g").attr("class", "edges");
    const link = edgeGroup
      .selectAll("g")
      .data(simEdges)
      .join("g");

    const linkLine = link
      .append("line")
      .attr("stroke", EDGE_COLOR)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d: any) => getEdgeStroke(d.relationship_type))
      .attr("marker-end", "url(#arrow)");

    // Edge labels
    const edgeLabel = link
      .append("text")
      .attr("fill", LABEL_COLOR)
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-body)")
      .attr("text-anchor", "middle")
      .attr("dy", -6)
      .text((d: any) => {
        if (d.percentage != null) return `${d.percentage}%`;
        return "";
      });

    // Nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    const node = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            if (!d.isCentral) {
              d.fx = null;
              d.fy = null;
            }
          }) as any
      );

    // Draw node shapes
    node.each(function (d: any) {
      const el = d3.select(this);
      const shape = getNodeShape(d.entity_type);
      const riskColor = RISK_COLORS[d.risk_tier] || NODE_STROKE_DEFAULT;

      if (shape === "circle") {
        el.append("circle")
          .attr("r", 18)
          .attr("fill", NODE_FILL)
          .attr("stroke", riskColor)
          .attr("stroke-width", 2);
      } else if (shape === "diamond") {
        el.append("rect")
          .attr("x", -14)
          .attr("y", -14)
          .attr("width", 28)
          .attr("height", 28)
          .attr("rx", 2)
          .attr("fill", NODE_FILL)
          .attr("stroke", riskColor)
          .attr("stroke-width", 2)
          .attr("transform", "rotate(45)");
      } else {
        // rect (corporate / branch)
        el.append("rect")
          .attr("x", -20)
          .attr("y", -16)
          .attr("width", 40)
          .attr("height", 32)
          .attr("rx", 3)
          .attr("fill", d.entity_type === "branch" ? "transparent" : NODE_FILL)
          .attr("stroke", riskColor)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", d.entity_type === "branch" ? "4,3" : "none");
      }
    });

    // Node labels
    node
      .append("text")
      .attr("dy", 32)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_COLOR)
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-display)")
      .attr("font-weight", "600")
      .text((d: any) => {
        const flag = countryCodeToFlag(d.hq_country_code || d.incorporation_country_code) || "";
        const name = d.name.length > 22 ? d.name.slice(0, 20) + "…" : d.name;
        return `${flag} ${name}`;
      });

    // Click handler for glow
    node.on("click", function (_event: any, d: any) {
      setSelectedNode((prev) => (prev === d.id ? null : d.id));
    });

    // Tick
    simulation.on("tick", () => {
      linkLine
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      edgeLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, resetKey]);

  // Update glow on selection change
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll(".nodes g").attr("filter", function (d: any) {
      return d.id === selectedNode ? "url(#gold-glow)" : "none";
    });
  }, [selectedNode]);

  // Handle external zoom level changes
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]);
    svg.transition().duration(300).call(
      zoom.transform as any,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(zoomLevel).translate(-width / 2, -height / 2)
    );
  }, [zoomLevel]);

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 520 }}>
      <svg ref={svgRef} id="ownership-graph-svg" className="w-full" style={{ minHeight: 520 }} />
    </div>
  );
}
