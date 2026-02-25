import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

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

const tierMarkerColor = (tier: string) => {
  if (tier === "A") return "#ef4444";
  if (tier === "B") return "#d97706";
  return "#22c55e";
};

const tierBg = (tier: string) => {
  if (tier === "A") return "bg-destructive/10 text-destructive";
  if (tier === "B") return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
};

export default function EntityMapView({ entities, highlightId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const navigate = useNavigate();
  const [pinType, setPinType] = useState<"registered" | "hq">("registered");
  const [selected, setSelected] = useState<Entity | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(map);
    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    entities.forEach((entity) => {
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
      });

      marker.on("click", () => setSelected(entity));
      marker.addTo(map);
      markersRef.current.push(marker);

      if (isHighlighted) {
        map.setView([lat, lng], 6, { animate: true });
      }
    });
  }, [entities, pinType, highlightId]);

  const todayStr = new Date().toISOString().split("T")[0];
  const getDueStatus = (e: Entity) => {
    if (!e.next_review_date) return { label: "No date", color: "bg-muted text-muted-foreground" };
    const days = Math.ceil((new Date(e.next_review_date).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: `Due in ${days}d`, color: "bg-warning/10 text-warning" };
    return { label: `Due in ${days}d`, color: "bg-success/10 text-success" };
  };

  return (
    <div className="relative">
      {/* Pin type control */}
      <div className="flex items-center gap-2 mb-3">
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

      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-lg overflow-hidden border border-border"
        style={{ background: "hsl(0 0% 96%)" }}
      />

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
