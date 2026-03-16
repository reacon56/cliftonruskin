import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useMapTheme, BasemapCycleToggle } from "@/hooks/use-map-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Layers, Share2 } from "lucide-react";

interface Entity {
  id: string;
  name: string;
  country: string | null;
  risk_tier: string;
  entity_type: string;
  next_review_date: string | null;
  registered_lat: number | null;
  registered_lng: number | null;
  registered_city: string | null;
  registered_country: string | null;
  hq_lat: number | null;
  hq_lng: number | null;
  head_office_city: string | null;
  head_office_country: string | null;
}

interface Props {
  entities: Entity[];
  highlightId?: string | null;
}

import { tierMarkerColor, createEntityIcon, buildEntityTooltipHtml, createClusterIcon } from "@/lib/map-pin-icons";

const tierBg = (tier: string) => {
  if (tier === "A") return "bg-destructive/10 text-destructive";
  if (tier === "B") return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
};

const TIER_OPTIONS = ["All Tiers", "Tier A", "Tier B", "Tier C"] as const;
const TYPE_OPTIONS = ["All Types", "Supplier", "Partner", "Target"] as const;

/* ── Jurisdiction Risk Overlay colours ── */
const RISK_SCALE = [
  { label: "Critical (85-100)", color: "#991B1B", opacity: 0.7 },
  { label: "High (70-84)", color: "#DC2626", opacity: 0.7 },
  { label: "Medium-High (50-69)", color: "#D97706", opacity: 0.7 },
  { label: "Medium (30-49)", color: "#CA8A04", opacity: 0.7 },
  { label: "Low (0-29)", color: "#15803D", opacity: 0.7 },
];

function riskColor(score: number | null): { color: string; opacity: number; stroke: string; strokeWidth: number } {
  if (score === null || score === undefined) return { color: "transparent", opacity: 0, stroke: "transparent", strokeWidth: 0 };
  const stroke = "rgba(255,255,255,0.5)";
  const strokeWidth = 1;
  if (score >= 85) return { color: "#991B1B", opacity: 0.7, stroke, strokeWidth };
  if (score >= 70) return { color: "#DC2626", opacity: 0.7, stroke, strokeWidth };
  if (score >= 50) return { color: "#D97706", opacity: 0.7, stroke, strokeWidth };
  if (score >= 30) return { color: "#CA8A04", opacity: 0.7, stroke, strokeWidth };
  return { color: "#15803D", opacity: 0.7, stroke, strokeWidth };
}

/** Hardcoded jurisdiction risk scores — used as canonical source */
const JURISDICTION_RISK_SCORES: Record<string, number> = {
  RU: 92, CN: 78, NG: 72, KY: 68, SA: 71, PA: 62, VG: 66,
  HK: 55, BR: 58, IN: 52, ZA: 63, AE: 65, SG: 38,
  CH: 22, DE: 18, LU: 15, SE: 12, GB: 20, US: 25,
};

/** Country name → ISO2 mapping for GeoJSON name-based matching */
const NAME_TO_ISO2: Record<string, string> = {
  "russia": "RU", "russian federation": "RU",
  "china": "CN", "people's republic of china": "CN",
  "nigeria": "NG", "cayman islands": "KY", "cayman is.": "KY",
  "saudi arabia": "SA", "panama": "PA",
  "british virgin islands": "VG", "virgin islands, british": "VG", "b.v.i.": "VG", "bvi": "VG",
  "hong kong": "HK", "hong kong sar": "HK", "hong kong s.a.r.": "HK",
  "brazil": "BR", "india": "IN", "south africa": "ZA",
  "united arab emirates": "AE", "singapore": "SG",
  "switzerland": "CH", "germany": "DE", "luxembourg": "LU",
  "sweden": "SE", "united kingdom": "GB", "united states": "US",
  "united states of america": "US",
};

/** Extract ISO2 code from a GeoJSON feature using multiple property keys */
function featureToIso2(props: any): string | null {
  if (!props) return null;
  // Try direct ISO2 keys
  const directIso2 = props.ISO_A2 || props.iso_a2;
  if (directIso2 && directIso2 !== "-99") return directIso2.toUpperCase();
  // Try ISO3 → ISO2 conversion
  const iso3 = props.ISO_A3 || props.iso_a3 || props.ADM0_A3;
  if (iso3 && ISO3_TO_ISO2[iso3]) return ISO3_TO_ISO2[iso3];
  if (iso3 && iso3.length === 3) {
    // Try first 2 chars as fallback (rare)
    const guess = iso3.substring(0, 2).toUpperCase();
    if (JURISDICTION_RISK_SCORES[guess] !== undefined) return guess;
  }
  // Try name-based matching
  const nameFields = [props.name, props.NAME, props.ADMIN, props.admin, props.NAME_LONG, props.name_long, props.SOVEREIGNT];
  for (const n of nameFields) {
    if (!n) continue;
    const lower = n.toLowerCase().trim();
    if (NAME_TO_ISO2[lower]) return NAME_TO_ISO2[lower];
  }
  return null;
}

const GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const ISO3_TO_ISO2: Record<string, string> = {
  AFG:"AF",ALB:"AL",DZA:"DZ",AND:"AD",AGO:"AO",ATG:"AG",ARG:"AR",ARM:"AM",AUS:"AU",AUT:"AT",
  AZE:"AZ",BHS:"BS",BHR:"BH",BGD:"BD",BRB:"BB",BLR:"BY",BEL:"BE",BLZ:"BZ",BEN:"BJ",BTN:"BT",
  BOL:"BO",BIH:"BA",BWA:"BW",BRA:"BR",BRN:"BN",BGR:"BG",BFA:"BF",BDI:"BI",KHM:"KH",CMR:"CM",
  CAN:"CA",CPV:"CV",CAF:"CF",TCD:"TD",CHL:"CL",CHN:"CN",COL:"CO",COM:"KM",COG:"CG",COD:"CD",
  CRI:"CR",CIV:"CI",HRV:"HR",CUB:"CU",CYP:"CY",CZE:"CZ",DNK:"DK",DJI:"DJ",DMA:"DM",DOM:"DO",
  ECU:"EC",EGY:"EG",SLV:"SV",GNQ:"GQ",ERI:"ER",EST:"EE",ETH:"ET",FJI:"FJ",FIN:"FI",FRA:"FR",
  GAB:"GA",GMB:"GM",GEO:"GE",DEU:"DE",GHA:"GH",GRC:"GR",GRD:"GD",GTM:"GT",GIN:"GN",GNB:"GW",
  GUY:"GY",HTI:"HT",HND:"HN",HUN:"HU",ISL:"IS",IND:"IN",IDN:"ID",IRN:"IR",IRQ:"IQ",IRL:"IE",
  ISR:"IL",ITA:"IT",JAM:"JM",JPN:"JP",JOR:"JO",KAZ:"KZ",KEN:"KE",KIR:"KI",PRK:"KP",KOR:"KR",
  KWT:"KW",KGZ:"KG",LAO:"LA",LVA:"LV",LBN:"LB",LSO:"LS",LBR:"LR",LBY:"LY",LIE:"LI",LTU:"LT",
  LUX:"LU",MKD:"MK",MDG:"MG",MWI:"MW",MYS:"MY",MDV:"MV",MLI:"ML",MLT:"MT",MHL:"MH",MRT:"MR",
  MUS:"MU",MEX:"MX",FSM:"FM",MDA:"MD",MCO:"MC",MNG:"MN",MNE:"ME",MAR:"MA",MOZ:"MZ",MMR:"MM",
  NAM:"NA",NRU:"NR",NPL:"NP",NLD:"NL",NZL:"NZ",NIC:"NI",NER:"NE",NGA:"NG",NOR:"NO",OMN:"OM",
  PAK:"PK",PLW:"PW",PAN:"PA",PNG:"PG",PRY:"PY",PER:"PE",PHL:"PH",POL:"PL",PRT:"PT",QAT:"QA",
  ROU:"RO",RUS:"RU",RWA:"RW",KNA:"KN",LCA:"LC",VCT:"VC",WSM:"WS",SMR:"SM",STP:"ST",SAU:"SA",
  SEN:"SN",SRB:"RS",SYC:"SC",SLE:"SL",SGP:"SG",SVK:"SK",SVN:"SI",SLB:"SB",SOM:"SO",ZAF:"ZA",
  SSD:"SS",ESP:"ES",LKA:"LK",SDN:"SD",SUR:"SR",SWZ:"SZ",SWE:"SE",CHE:"CH",SYR:"SY",TWN:"TW",
  TJK:"TJ",TZA:"TZ",THA:"TH",TLS:"TL",TGO:"TG",TON:"TO",TTO:"TT",TUN:"TN",TUR:"TR",TKM:"TM",
  TUV:"TV",UGA:"UG",UKR:"UA",ARE:"AE",GBR:"GB",USA:"US",URY:"UY",UZB:"UZ",VUT:"VU",VEN:"VE",
  VNM:"VN",YEM:"YE",ZMB:"ZM",ZWE:"ZW",HKG:"HK",MAC:"MO",PSE:"PS",XKX:"XK",SXM:"SX",CUW:"CW",
  ABW:"AW",VGB:"VG",CYM:"KY",BMU:"BM",GIB:"GI",IMN:"IM",JEY:"JE",GGY:"GG",
};

/* ── Ownership arc line styles ── */
const REL_STYLES: Record<string, { color: string; opacity: number; weight: number; dashArray?: string }> = {
  ownership: { color: "#2E6DA4", opacity: 0.7, weight: 2 },
  director:  { color: "#7B3FA0", opacity: 0.6, weight: 1.5, dashArray: "4 4" },
};

const REL_LEGEND = [
  { label: "Ownership", color: "#2E6DA4", dash: "" },
  { label: "Director", color: "#7B3FA0", dash: "4 4" },
];

/** Build a curved arc between two points (great-circle approximation for Leaflet) */
function buildArc(from: L.LatLngTuple, to: L.LatLngTuple, segments = 30): L.LatLngTuple[] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  // Midpoint offset for visual curve
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular offset scaled by distance
  const offsetScale = Math.min(dist * 0.15, 8);
  const perpLat = midLat + (-dx / dist) * offsetScale;
  const perpLng = midLng + (dy / dist) * offsetScale;

  const points: L.LatLngTuple[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * perpLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * perpLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
}

export default function EntityMapView({ entities, highlightId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const ownershipLayerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();
  const [pinType, setPinType] = useState<"registered" | "hq">("registered");
  const [selected, setSelected] = useState<Entity | null>(null);
  const { basemap, cycleBasemap, tileUrl } = useMapTheme();
  const [riskOverlay, setRiskOverlay] = useState(false);
  const [ownershipOverlay, setOwnershipOverlay] = useState(false);
  const [ownershipFilterEntity, setOwnershipFilterEntity] = useState<string>("all");

  // In-map filters
  const [tierFilter, setTierFilter] = useState<string>("All Tiers");
  const [typeFilter, setTypeFilter] = useState<string>("All Types");

  /* ── Jurisdiction risk data (hardcoded canonical scores) ── */
  const riskMap = useMemo(() => {
    if (!riskOverlay) return null;
    return JURISDICTION_RISK_SCORES;
  }, [riskOverlay]);

  /* ── Fetch GeoJSON ── */
  const { data: geoData } = useQuery({
    queryKey: ["world-geojson"],
    enabled: riskOverlay,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(GEOJSON_URL);
      if (!res.ok) throw new Error("Failed to load GeoJSON");
      return await res.json();
    },
  });

  /* ── Fetch ownership relationships ── */
  const entityIds = useMemo(() => entities.map((e) => e.id), [entities]);

  const { data: ownershipRels } = useQuery({
    queryKey: ["ownership-map-relationships", entityIds],
    enabled: ownershipOverlay && entityIds.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Fetch relationships where either end is in our visible entities
      const { data, error } = await (supabase
        .from("entity_relationships") as any)
        .select("id, source_entity_id, target_entity_id, relationship_type, percentage, confidence_level")
        .or(entityIds.map((id) => `source_entity_id.eq.${id}`).join(",") + "," + entityIds.map((id) => `target_entity_id.eq.${id}`).join(","));
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        source_entity_id: string;
        target_entity_id: string;
        relationship_type: string;
        percentage: number | null;
        confidence_level: string;
      }>;
    },
  });

  // Also fetch names/coords for related entities not in current view
  const relatedEntityIds = useMemo(() => {
    if (!ownershipRels) return [];
    const entityIdSet = new Set(entityIds);
    const missing = new Set<string>();
    for (const r of ownershipRels) {
      if (!entityIdSet.has(r.source_entity_id)) missing.add(r.source_entity_id);
      if (!entityIdSet.has(r.target_entity_id)) missing.add(r.target_entity_id);
    }
    return Array.from(missing);
  }, [ownershipRels, entityIds]);

  const { data: relatedEntities } = useQuery({
    queryKey: ["ownership-map-related-entities", relatedEntityIds],
    enabled: relatedEntityIds.length > 0 && ownershipOverlay,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, registered_lat, registered_lng, hq_lat, hq_lng")
        .in("id", relatedEntityIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      if (tierFilter !== "All Tiers") {
        const letter = tierFilter.replace("Tier ", "").toUpperCase();
        if (e.risk_tier?.toUpperCase() !== letter) return false;
      }
      if (typeFilter !== "All Types") {
        if (e.entity_type?.toLowerCase() !== typeFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [entities, tierFilter, typeFilter]);

  // Build entity lookup for coords
  const entityLookup = useMemo(() => {
    const map = new Map<string, { name: string; lat: number; lng: number }>();
    const addEntity = (e: { id: string; name: string; registered_lat?: number | null; registered_lng?: number | null; hq_lat?: number | null; hq_lng?: number | null }) => {
      let lat: number | null = null;
      let lng: number | null = null;
      if (pinType === "hq" && e.hq_lat && e.hq_lng) {
        lat = e.hq_lat; lng = e.hq_lng;
      } else if (e.registered_lat && e.registered_lng) {
        lat = e.registered_lat; lng = e.registered_lng;
      }
      if (lat !== null && lng !== null) {
        map.set(e.id, { name: e.name, lat, lng });
      }
    };
    for (const e of entities) addEntity(e);
    if (relatedEntities) {
      for (const e of relatedEntities) addEntity(e as any);
    }
    return map;
  }, [entities, relatedEntities, pinType]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
    });
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, []);

  // Draw entity markers with clustering
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove previous cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    const TIER_PRIORITY: Record<string, number> = { A: 3, B: 2, C: 1 };

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 20,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyDistanceMultiplier: 2,
      iconCreateFunction: (cluster: any) => {
        const childMarkers = cluster.getAllChildMarkers();
        const count = childMarkers.length;
        // Find highest risk tier in cluster
        let maxPriority = 0;
        let maxTier = "C";
        const entityNames: string[] = [];
        for (const m of childMarkers) {
          const e = m.options._entityData as Entity | undefined;
          if (e) {
            const p = TIER_PRIORITY[e.risk_tier] || 0;
            if (p > maxPriority) { maxPriority = p; maxTier = e.risk_tier; }
            entityNames.push(`${e.name} (Tier ${e.risk_tier})`);
          }
        }
        const color = tierMarkerColor(maxTier);
        // Build tooltip content
        const city = (childMarkers[0]?.options?._entityData as Entity | undefined)?.registered_city || "";
        const tooltipHtml = `<strong>${count} entities${city ? ` in ${city}` : ""}:</strong><br/>` +
          entityNames.map(n => `• ${n}`).join("<br/>");

        return L.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${color};
            border:2.5px solid rgba(255,255,255,0.9);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:11px;font-weight:700;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
            cursor:pointer;
          " title="">${count}</div>`,
          className: "entity-cluster-icon",
          iconSize: L.point(28, 28),
          iconAnchor: L.point(14, 14),
        });
      },
    });

    // Bind cluster tooltips after cluster is formed
    clusterGroup.on("clustermouseover", (e: any) => {
      const cluster = e.layer;
      const childMarkers = cluster.getAllChildMarkers();
      const count = childMarkers.length;
      const entities: Entity[] = childMarkers
        .map((m: any) => m.options._entityData as Entity | undefined)
        .filter(Boolean);
      const city = entities[0]?.registered_city || "";
      const tooltipHtml = `<strong>${count} entities${city ? ` in ${city}` : ""}:</strong><br/>` +
        entities.map(e => `• ${e.name} (Tier ${e.risk_tier})`).join("<br/>");
      cluster.bindTooltip(tooltipHtml, { direction: "top", sticky: false, className: "leaflet-tooltip-cluster" }).openTooltip();
    });

    filteredEntities.forEach((entity) => {
      let lat: number | null = null;
      let lng: number | null = null;

      if (pinType === "hq" && entity.hq_lat && entity.hq_lng) {
        lat = entity.hq_lat;
        lng = entity.hq_lng;
      } else if (entity.registered_lat && entity.registered_lng) {
        lat = entity.registered_lat;
        lng = entity.registered_lng;
      }

      if (lat === null || lng === null) return;

      const color = tierMarkerColor(entity.risk_tier);
      const isHighlighted = entity.id === highlightId;

      const marker = L.circleMarker([lat, lng], {
        radius: isHighlighted ? 11 : 7,
        fillColor: color,
        fillOpacity: isHighlighted ? 1 : 0.9,
        color: "#ffffff",
        weight: isHighlighted ? 2.5 : 1.5,
        opacity: 1,
        pane: "markerPane",
        _entityData: entity,
      } as any);

      marker.on("click", () => setSelected(entity));
      clusterGroup.addLayer(marker);

      if (isHighlighted) {
        map.setView([lat, lng], 6, { animate: true });
      }
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
  }, [filteredEntities, pinType, highlightId]);

  // Swap tile layer on theme/basemap change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
    if (geoLayerRef.current) geoLayerRef.current.bringToBack();
  }, [tileUrl]);

  /* ── GeoJSON risk overlay ── */
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }
    if (!riskOverlay || !geoData || !riskMap) return;
    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const iso2 = featureToIso2(feature?.properties);
        const score = iso2 ? (riskMap[iso2] ?? null) : null;
        const rc = riskColor(score);
        return { fillColor: rc.color, fillOpacity: rc.opacity, color: rc.stroke, weight: rc.strokeWidth };
      },
      onEachFeature: (feature, layer) => {
        const name = feature?.properties?.ADMIN || feature?.properties?.name || "";
        const iso2 = featureToIso2(feature?.properties);
        const score = iso2 ? riskMap[iso2] : undefined;
        if (score !== undefined) {
          layer.bindTooltip(
            `<strong>${name}</strong><br/>Risk score: ${score}`,
            { sticky: true, className: "leaflet-tooltip-risk" }
          );
        }
      },
    });
    layer.addTo(map);
    layer.bringToBack();
    geoLayerRef.current = layer;
  }, [riskOverlay, geoData, riskMap]);

  /* ── Ownership network arc overlay ── */
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Always clean up existing
    if (ownershipLayerRef.current) {
      map.removeLayer(ownershipLayerRef.current);
      ownershipLayerRef.current = null;
    }

    if (!ownershipOverlay || !ownershipRels || ownershipRels.length === 0) return;

    const group = L.layerGroup();

    for (const rel of ownershipRels) {
      const relType = (rel.relationship_type || "ownership").toLowerCase();
      // Skip operational relationships
      if (relType === "operational") continue;

      const src = entityLookup.get(rel.source_entity_id);
      const tgt = entityLookup.get(rel.target_entity_id);
      if (!src || !tgt) continue;

      // Entity filter: dim unrelated lines
      const isFiltered = ownershipFilterEntity !== "all";
      const isRelevant = !isFiltered ||
        rel.source_entity_id === ownershipFilterEntity ||
        rel.target_entity_id === ownershipFilterEntity;

      const from: L.LatLngTuple = [src.lat, src.lng];
      const to: L.LatLngTuple = [tgt.lat, tgt.lng];
      const arcPoints = buildArc(from, to);

      const style = REL_STYLES[relType] || REL_STYLES.ownership;
      const dimOpacity = isRelevant ? style.opacity : 0.12;

      const polyline = L.polyline(arcPoints, {
        color: style.color,
        opacity: dimOpacity,
        weight: isRelevant ? style.weight : 1,
        dashArray: style.dashArray,
        interactive: isRelevant,
      });

      // Tooltip on hover showing relationship type + percentage
      const pctText = rel.percentage != null ? ` — ${rel.percentage}%` : "";
      const tooltipLabel = relType.charAt(0).toUpperCase() + relType.slice(1) + (rel.percentage != null ? pctText : " link");
      polyline.bindTooltip(
        `<div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.4;">
          <strong>${tooltipLabel}</strong><br/>
          <span style="opacity:0.7;">${src.name} → ${tgt.name}</span>
        </div>`,
        { sticky: true, className: "leaflet-tooltip-entity" }
      );

      group.addLayer(polyline);

      // Arrowhead at the end of the arc
      if (isRelevant && arcPoints.length >= 2) {
        const last = arcPoints[arcPoints.length - 1];
        const prev = arcPoints[arcPoints.length - 2];
        const angle = Math.atan2(last[0] - prev[0], last[1] - prev[1]);
        // Place arrow slightly before the endpoint
        const arrowLat = last[0] - Math.cos(angle) * 0.3;
        const arrowLng = last[1] - Math.sin(angle) * 0.3;
        const angleDeg = -(angle * 180) / Math.PI;

        const arrowIcon = L.divIcon({
          className: "ownership-arrow",
          html: `<svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate(${angleDeg}deg);">
            <path d="M6 0 L12 12 L6 9 L0 12 Z" fill="${style.color}" opacity="${dimOpacity}" />
          </svg>`,
          iconSize: L.point(12, 12),
          iconAnchor: L.point(6, 6),
        });
        const arrowMarker = L.marker([arrowLat, arrowLng], {
          icon: arrowIcon,
          interactive: false,
          pane: "markerPane",
        });
        group.addLayer(arrowMarker);
      }

      // Ownership percentage label at midpoint
      if (rel.percentage != null && relType === "ownership" && isRelevant) {
        const mid = arcPoints[Math.floor(arcPoints.length / 2)];
        const label = L.marker(mid, {
          icon: L.divIcon({
            className: "ownership-pct-label",
            html: `<span style="
              font-size:9px;
              font-weight:600;
              color:#2E6DA4;
              background:rgba(255,255,255,0.92);
              border:1px solid #2E6DA4;
              border-radius:3px;
              padding:1px 4px;
              white-space:nowrap;
              pointer-events:none;
            ">${rel.percentage}%</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
          pane: "markerPane",
        });
        group.addLayer(label);
      }
    }

    group.addTo(map);
    ownershipLayerRef.current = group;
  }, [ownershipOverlay, ownershipRels, entityLookup, ownershipFilterEntity]);

  const getDueStatus = (e: Entity) => {
    if (!e.next_review_date) return { label: "No date", color: "bg-muted text-muted-foreground" };
    const days = Math.ceil((new Date(e.next_review_date).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: `Due in ${days}d`, color: "bg-warning/10 text-warning" };
    return { label: `Due in ${days}d`, color: "bg-success/10 text-success" };
  };

  return (
    <div className="relative">
      {/* Pin type + theme controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Show pins:</span>
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setPinType("registered")}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                pinType === "registered" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Registered Office
            </button>
            <button
              onClick={() => setPinType("hq")}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                pinType === "hq" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Head Office
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOwnershipOverlay((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
              ownershipOverlay
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
            title="Toggle ownership network arcs"
          >
            <Share2 className="h-3 w-3" />
            Ownership Network
          </button>
          <button
            onClick={() => setRiskOverlay((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
              riskOverlay
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
            title="Toggle jurisdiction risk overlay"
          >
            <Layers className="h-3 w-3" />
            Jurisdiction Risk
          </button>
          <BasemapCycleToggle basemap={basemap} onCycle={cycleBasemap} />
        </div>
      </div>

      {/* In-map filter chips */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setTierFilter(opt)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                tierFilter === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setTypeFilter(opt)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                typeFilter === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {(tierFilter !== "All Tiers" || typeFilter !== "All Types") && (
          <span className="text-[10px] text-muted-foreground">
            Showing {filteredEntities.length} of {entities.length} entities
          </span>
        )}
      </div>

      {/* Map canvas */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-[500px] rounded-lg overflow-hidden border border-border"
          style={{ background: basemap === "classic" ? "hsl(0 0% 96%)" : "hsl(220 30% 8%)" }}
        />

        {/* Map Legend — bottom-left */}
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-sm max-w-[210px]">
          <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1.5">Entity Pins</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: "#ef4444" }} />
              <span className="text-[10px] text-foreground">Tier A — High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: "#d97706" }} />
              <span className="text-[10px] text-foreground">Tier B — Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: "#22c55e" }} />
              <span className="text-[10px] text-foreground">Tier C — Low Risk</span>
            </div>
          </div>
          <div className="border-t border-border mt-1.5 pt-1.5">
            <span className="text-[9px] text-muted-foreground">
              Showing: {pinType === "registered" ? "Registered Office" : "Head Office"}
            </span>
          </div>

          {/* Ownership network legend */}
          {ownershipOverlay && (
            <div className="border-t border-border mt-2 pt-2">
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1.5">Ownership Network</p>
              <div className="space-y-1">
                {REL_LEGEND.map((rl) => (
                  <div key={rl.label} className="flex items-center gap-2">
                    <svg width="16" height="6" className="shrink-0">
                      <line
                        x1="0" y1="3" x2="16" y2="3"
                        stroke={rl.color}
                        strokeWidth={rl.label === "Operational" ? 1 : rl.label === "Director" ? 1.5 : 2}
                        strokeDasharray={rl.dash || undefined}
                      />
                    </svg>
                    <span className="text-[9px] text-foreground">{rl.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk overlay legend */}
          {riskOverlay && (
            <div className="border-t border-border mt-2 pt-2">
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1.5">Jurisdiction Risk</p>
              <div className="space-y-1">
                {RISK_SCALE.map((rs) => (
                  <div key={rs.label} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-2 rounded-[2px]" style={{ backgroundColor: rs.color, opacity: rs.opacity }} />
                    <span className="text-[9px] text-foreground">{rs.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popover for selected entity */}
      {selected && (
        <div className="absolute top-16 right-4 z-[1000] w-72 rounded-lg border bg-card p-4"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-foreground truncate">{selected.name}</h4>
              <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                {selected.entity_type}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground ml-2">
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`fvc-status-badge ${tierBg(selected.risk_tier)}`}>
              Tier {selected.risk_tier}
            </Badge>
            <Badge className={`fvc-status-badge ${getDueStatus(selected).color}`}>
              {getDueStatus(selected).label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {(pinType === "hq" && selected.head_office_city)
              ? `${selected.head_office_city}, ${selected.head_office_country || ""}`
              : `${selected.registered_city || ""}, ${selected.registered_country || selected.country || ""}`}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => navigate(`/entities/${selected.id}`)}>
              Open entity
            </Button>
            <Button size="sm" className="text-xs flex-1" onClick={() => navigate(`/commission?entity=${selected.id}`)}>
              Commission check
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
