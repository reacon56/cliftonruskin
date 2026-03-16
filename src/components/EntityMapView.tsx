import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapTheme, MapThemeToggle, BasemapToggle } from "@/hooks/use-map-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Layers } from "lucide-react";

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

const TIER_COLORS: Record<string, string> = { A: "#ef4444", B: "#d97706", C: "#22c55e" };
const tierMarkerColor = (tier: string) => TIER_COLORS[tier] || "#22c55e";

const tierBg = (tier: string) => {
  if (tier === "A") return "bg-destructive/10 text-destructive";
  if (tier === "B") return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
};

const TIER_OPTIONS = ["All Tiers", "Tier A", "Tier B", "Tier C"] as const;
const TYPE_OPTIONS = ["All Types", "Supplier", "Partner", "Target"] as const;

/* ── Jurisdiction Risk Overlay colours ── */
const RISK_SCALE = [
  { label: "Critical (85-100)", color: "#8B0000", opacity: 0.5 },
  { label: "High (70-84)", color: "#C0392B", opacity: 0.45 },
  { label: "Medium-High (50-69)", color: "#D4750A", opacity: 0.4 },
  { label: "Medium (30-49)", color: "#F0B429", opacity: 0.35 },
  { label: "Low (0-29)", color: "#27AE60", opacity: 0.3 },
  { label: "No data", color: "#9CA3AF", opacity: 0.15 },
];

function riskColor(score: number | null): { color: string; opacity: number } {
  if (score === null || score === undefined) return { color: "#9CA3AF", opacity: 0.15 };
  if (score >= 85) return { color: "#8B0000", opacity: 0.5 };
  if (score >= 70) return { color: "#C0392B", opacity: 0.45 };
  if (score >= 50) return { color: "#D4750A", opacity: 0.4 };
  if (score >= 30) return { color: "#F0B429", opacity: 0.35 };
  return { color: "#27AE60", opacity: 0.3 };
}

const GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

/* ── Compute a synthetic risk score from jurisdiction indicators ── */
function computeJurisdictionScore(indicators: Array<{ indicator_type: string; value_json: any }>): number {
  let score = 0;
  for (const ind of indicators) {
    const vj = ind.value_json;
    const type = ind.indicator_type;
    if (type === "FATF_STATUS") {
      const status = (vj?.status || "").toUpperCase();
      if (status === "CALL_FOR_ACTION" || status === "BLACKLISTED") score += 50;
      else if (status === "MONITORING" || status === "INCREASED_MONITORING") score += 25;
    } else if (type === "EU_AML_HRTC") {
      if (vj?.status === "listed" || vj?.listed === true) score += 25;
    } else if (type.startsWith("SANCTIONS_")) {
      const status = (vj?.status || "").toLowerCase();
      if (status === "active" || status === "comprehensive") score += 40;
      else if (status === "targeted") score += 20;
    } else if (type === "CPI_SCORE") {
      const cpi = vj?.score;
      if (typeof cpi === "number") {
        // CPI is 0-100 where low = corrupt. Invert for risk.
        const riskContrib = Math.max(0, 100 - cpi);
        if (riskContrib > 70) score += 10;
      }
    }
  }
  return Math.min(100, score);
}

/* ── ISO3 → ISO2 mapping (common subset) ── */
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

export default function EntityMapView({ entities, highlightId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const navigate = useNavigate();
  const [pinType, setPinType] = useState<"registered" | "hq">("registered");
  const [selected, setSelected] = useState<Entity | null>(null);
  const { theme, basemap, toggle, toggleBasemap, tileUrl } = useMapTheme();
  const [riskOverlay, setRiskOverlay] = useState(false);

  // In-map filters
  const [tierFilter, setTierFilter] = useState<string>("All Tiers");
  const [typeFilter, setTypeFilter] = useState<string>("All Types");

  /* ── Fetch jurisdiction risk data ── */
  const { data: riskMap } = useQuery({
    queryKey: ["jurisdiction-risk-map-overlay"],
    enabled: riskOverlay,
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisdiction_indicator")
        .select("jurisdiction_id, indicator_type, value_json, jurisdiction:jurisdiction_id(country_code)");
      if (error) throw error;

      // Group by country_code and compute scores
      const byCountry = new Map<string, Array<{ indicator_type: string; value_json: any }>>();
      for (const row of data ?? []) {
        const cc = (row as any).jurisdiction?.country_code;
        if (!cc) continue;
        const key = cc.toUpperCase();
        if (!byCountry.has(key)) byCountry.set(key, []);
        byCountry.get(key)!.push({ indicator_type: row.indicator_type, value_json: row.value_json });
      }

      const scoreMap = new Map<string, number>();
      byCountry.forEach((indicators, cc) => {
        scoreMap.set(cc, computeJurisdictionScore(indicators));
      });
      return scoreMap;
    },
  });

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

  // Draw entity markers
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

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
        pane: "markerPane", // ensures pins render above overlayPane
      });

      marker.on("click", () => setSelected(entity));
      marker.addTo(map);
      markersRef.current.push(marker);

      if (isHighlighted) {
        map.setView([lat, lng], 6, { animate: true });
      }
    });
  }, [filteredEntities, pinType, highlightId]);

  // Swap tile layer on theme/basemap change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
    // Re-add geojson layer below markers if active
    if (geoLayerRef.current) {
      geoLayerRef.current.bringToBack();
    }
  }, [tileUrl]);

  /* ── GeoJSON risk overlay ── */
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove existing
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    if (!riskOverlay || !geoData || !riskMap) return;

    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const iso3 = feature?.properties?.ISO_A3 || feature?.properties?.iso_a3 || "";
        const iso2 = ISO3_TO_ISO2[iso3] || iso3;
        const score = riskMap.get(iso2.toUpperCase()) ?? null;
        const rc = riskColor(score);
        return {
          fillColor: rc.color,
          fillOpacity: rc.opacity,
          color: "rgba(255,255,255,0.3)",
          weight: 0.5,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature?.properties?.ADMIN || feature?.properties?.name || "";
        const iso3 = feature?.properties?.ISO_A3 || feature?.properties?.iso_a3 || "";
        const iso2 = ISO3_TO_ISO2[iso3] || iso3;
        const score = riskMap.get(iso2.toUpperCase());
        layer.bindTooltip(
          `<strong>${name}</strong><br/>Risk score: ${score !== undefined ? score : "No data"}`,
          { sticky: true, className: "leaflet-tooltip-risk" }
        );
      },
    });

    layer.addTo(map);
    layer.bringToBack();
    geoLayerRef.current = layer;
  }, [riskOverlay, geoData, riskMap]);

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
          <BasemapToggle basemap={basemap} onToggle={toggleBasemap} />
          <MapThemeToggle theme={theme} onToggle={toggle} />
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
          style={{ background: theme === "light" ? "hsl(0 0% 96%)" : "hsl(220 30% 8%)" }}
        />

        {/* Map Legend — bottom-left */}
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-sm max-w-[200px]">
          <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1.5">Entity Pins</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: TIER_COLORS.A }} />
              <span className="text-[10px] text-foreground">Tier A — High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: TIER_COLORS.B }} />
              <span className="text-[10px] text-foreground">Tier B — Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: TIER_COLORS.C }} />
              <span className="text-[10px] text-foreground">Tier C — Low Risk</span>
            </div>
          </div>
          <div className="border-t border-border mt-1.5 pt-1.5">
            <span className="text-[9px] text-muted-foreground">
              Showing: {pinType === "registered" ? "Registered Office" : "Head Office"}
            </span>
          </div>

          {/* Risk overlay legend */}
          {riskOverlay && (
            <>
              <div className="border-t border-border mt-2 pt-2">
                <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1.5">Jurisdiction Risk</p>
                <div className="space-y-1">
                  {RISK_SCALE.map((rs) => (
                    <div key={rs.label} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-2 rounded-[2px]"
                        style={{ backgroundColor: rs.color, opacity: rs.opacity }}
                      />
                      <span className="text-[9px] text-foreground">{rs.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
