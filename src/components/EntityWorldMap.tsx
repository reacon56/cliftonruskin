import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapTheme, BasemapCycleToggle } from "@/hooks/use-map-theme";
import { createEntityIcon, buildEntityTooltipHtml } from "@/lib/map-pin-icons";
import { cn } from "@/lib/utils";

// Country → approximate lat/lng for common countries
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "United Kingdom": [51.5074, -0.1278],
  "UK": [51.5074, -0.1278],
  "United States": [38.9072, -77.0369],
  "US": [38.9072, -77.0369],
  "USA": [38.9072, -77.0369],
  "Germany": [52.52, 13.405],
  "France": [48.8566, 2.3522],
  "Japan": [35.6762, 139.6503],
  "China": [39.9042, 116.4074],
  "Australia": [-33.8688, 151.2093],
  "Canada": [45.4215, -75.6972],
  "Brazil": [-15.7975, -47.8919],
  "India": [28.6139, 77.209],
  "Singapore": [1.3521, 103.8198],
  "Hong Kong": [22.3193, 114.1694],
  "Switzerland": [46.9481, 7.4474],
  "Netherlands": [52.3676, 4.9041],
  "UAE": [25.2048, 55.2708],
  "Dubai": [25.2048, 55.2708],
  "Ireland": [53.3498, -6.2603],
  "Italy": [41.9028, 12.4964],
  "Spain": [40.4168, -3.7038],
  "South Africa": [-33.9249, 18.4241],
  "Nigeria": [9.0579, 7.4951],
  "Kenya": [-1.2921, 36.8219],
  "Saudi Arabia": [24.7136, 46.6753],
  "Sweden": [59.3293, 18.0686],
  "Norway": [59.9139, 10.7522],
  "Denmark": [55.6761, 12.5683],
  "Poland": [52.2297, 21.0122],
  "Russia": [55.7558, 37.6173],
  "South Korea": [37.5665, 126.978],
  "Mexico": [19.4326, -99.1332],
  "Argentina": [-34.6037, -58.3816],
  "Luxembourg": [49.6117, 6.1319],
  "Belgium": [50.8503, 4.3517],
  "Austria": [48.2082, 16.3738],
  "Portugal": [38.7223, -9.1393],
  "New Zealand": [-41.2865, 174.7762],
  "Malaysia": [3.139, 101.6869],
  "Thailand": [13.7563, 100.5018],
  "Indonesia": [-6.2088, 106.8456],
  "Philippines": [14.5995, 120.9842],
  "Vietnam": [21.0285, 105.8542],
  "Turkey": [39.9334, 32.8597],
  "Egypt": [30.0444, 31.2357],
  "Israel": [31.7683, 35.2137],
  "Qatar": [25.2854, 51.531],
  "Bahrain": [26.0667, 50.5577],
  "Kuwait": [29.3759, 47.9774],
  "Taiwan": [25.033, 121.5654],
  "Colombia": [4.711, -74.0721],
  "Chile": [-33.4489, -70.6693],
  "Peru": [-12.0464, -77.0428],
  "Czech Republic": [50.0755, 14.4378],
  "Romania": [44.4268, 26.1025],
  "Greece": [37.9838, 23.7275],
  "Finland": [60.1699, 24.9384],
  "Pakistan": [33.6844, 73.0479],
  "Bangladesh": [23.8103, 90.4125],
  "Ghana": [5.6037, -0.187],
  "Tanzania": [-6.7924, 39.2083],
  "Morocco": [33.9716, -6.8498],
};

interface Entity {
  id: string;
  name: string;
  country: string | null;
  risk_tier: string;
  latitude?: number | null;
  longitude?: number | null;
  registered_lat?: number | null;
  registered_lng?: number | null;
  hq_lat?: number | null;
  hq_lng?: number | null;
  registered_city?: string | null;
  head_office_city?: string | null;
}

interface Props {
  entities: Entity[];
  /** When true, map fills available height and calls invalidateSize */
  expanded?: boolean;
  /** Called when a marker is clicked – receives the entity id */
  onEntityClick?: (entityId: string) => void;
}

// tierMarkerColor now imported from map-pin-icons

export default function EntityWorldMap({ entities, expanded, onEntityClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { basemap, cycleBasemap, tileUrl } = useMapTheme();

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

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear existing markers (but not tile layers)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    entities.forEach((entity) => {
      let lat: number | undefined;
      let lng: number | undefined;

      // Primary: precise latitude/longitude columns
      if (entity.latitude != null && entity.longitude != null) {
        lat = entity.latitude;
        lng = entity.longitude;
      } else if (entity.registered_lat && entity.registered_lng) {
        lat = entity.registered_lat;
        lng = entity.registered_lng;
      } else if (entity.hq_lat && entity.hq_lng) {
        lat = entity.hq_lat;
        lng = entity.hq_lng;
      } else if (entity.country) {
        const coords = COUNTRY_COORDS[entity.country];
        if (coords) {
          const jitter = () => (Math.random() - 0.5) * 1.5;
          lat = coords[0] + jitter();
          lng = coords[1] + jitter();
        }
      }

      if (lat === undefined || lng === undefined) return;

      const icon = createEntityIcon(entity.risk_tier);
      const marker = L.marker([lat, lng], { icon })
        .bindTooltip(
          buildEntityTooltipHtml({
            ...entity,
            entity_type: undefined,
            registered_country: null,
            head_office_city: null,
            head_office_country: null,
            next_review_date: null,
          }),
          { direction: "top", offset: [0, -14], className: "leaflet-tooltip-entity" }
        )
        .addTo(map);

      if (onEntityClick) {
        marker.on("click", () => onEntityClick(entity.id));
        marker.getElement()?.style.setProperty("cursor", "pointer");
      }
  }, [entities]);

  // Swap tile layer on theme change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
  }, [tileUrl]);

  // Invalidate size when expanded changes (Leaflet needs to recalculate)
  useEffect(() => {
    if (!expanded || !leafletMap.current) return;
    const timer = setTimeout(() => {
      leafletMap.current?.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [expanded]);

  return (
    <div className="relative" style={expanded ? { height: "calc(85vh - 120px)", width: "100%" } : undefined}>
      <div className="absolute top-2 right-2 z-[500]">
        <BasemapCycleToggle basemap={basemap} onCycle={cycleBasemap} />
      </div>
      <div
        ref={mapRef}
        className={cn("w-full rounded-lg overflow-hidden border border-border", expanded ? "" : "h-[360px]")}
        style={{
          background: basemap === "classic" ? "hsl(0 0% 96%)" : "hsl(220 30% 8%)",
          ...(expanded ? { height: "100%" } : {}),
        }}
      />
    </div>
  );
}
