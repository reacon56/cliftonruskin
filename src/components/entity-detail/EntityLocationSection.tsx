import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMapTheme, BasemapCycleToggle } from "@/hooks/use-map-theme";
import { createEntityIcon } from "@/lib/map-pin-icons";

interface Props {
  entity: any;
}

function formatAddress(line1?: string, line2?: string, city?: string, region?: string, postcode?: string, country?: string) {
  return [line1, line2, city, region, postcode, country].filter(Boolean).join(", ");
}

export default function EntityLocationSection({ entity }: Props) {
  const { toast } = useToast();
  const { tileUrl, basemap, cycleBasemap } = useMapTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const regAddress = formatAddress(entity.registered_address_line1, entity.registered_address_line2, entity.registered_city, entity.registered_region, entity.registered_postcode, entity.registered_country);
  const hqAddress = formatAddress(entity.head_office_address_line1, entity.head_office_address_line2, entity.head_office_city, entity.head_office_region, entity.head_office_postcode, entity.head_office_country);

  const hasReg = entity.registered_lat && entity.registered_lng;
  const hasHq = entity.hq_lat && entity.hq_lng;
  const hasMap = hasReg || hasHq;

  useEffect(() => {
    if (!mapRef.current || !hasMap || leafletMap.current) return;
    const center: [number, number] = hasReg
      ? [entity.registered_lat, entity.registered_lng]
      : [entity.hq_lat, entity.hq_lng];

    const map = L.map(mapRef.current, {
      center,
      zoom: hasReg && hasHq ? 4 : 12,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);

    if (hasReg) {
      L.circleMarker([entity.registered_lat, entity.registered_lng], {
        radius: 7, fillColor: "#d4a843", fillOpacity: 0.9, color: "#d4a843", weight: 1, opacity: 0.5,
      }).bindTooltip("Registered Office", { direction: "top", offset: [0, -8] }).addTo(map);
    }
    if (hasHq) {
      L.circleMarker([entity.hq_lat, entity.hq_lng], {
        radius: 7, fillColor: "#4a90d9", fillOpacity: 0.9, color: "#4a90d9", weight: 1, opacity: 0.5,
      }).bindTooltip("Head Office", { direction: "top", offset: [0, -8] }).addTo(map);
    }

    // Fit bounds if both exist
    if (hasReg && hasHq) {
      const bounds = L.latLngBounds(
        [entity.registered_lat, entity.registered_lng],
        [entity.hq_lat, entity.hq_lng]
      );
      map.fitBounds(bounds.pad(0.3));
    }

    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; tileLayerRef.current = null; };
  }, [entity.id]);

  // React to theme changes
  useEffect(() => {
    if (!leafletMap.current || !tileLayerRef.current) return;
    leafletMap.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(leafletMap.current);
  }, [tileUrl]);

  if (!regAddress && !hqAddress) return null;

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast({ title: "Address copied" });
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <div className="fvc-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-accent" />
          <h3 className="fvc-heading-3 text-foreground">Location</h3>
        </div>
        {hasMap && <BasemapCycleToggle basemap={basemap} onCycle={cycleBasemap} />}
      </div>

      <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
        <div className="space-y-4">
          {regAddress && (
            <div>
              <span className="fvc-label block mb-1.5">Registered Office</span>
              <p className="text-sm text-foreground leading-relaxed">{regAddress}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => copyAddr(regAddress)}>
                  <Copy size={12} className="mr-1" /> Copy
                </Button>
                {hasReg && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => openInMaps(entity.registered_lat, entity.registered_lng)}>
                    <ExternalLink size={12} className="mr-1" /> Open in maps
                  </Button>
                )}
              </div>
            </div>
          )}
          {hqAddress && (
            <div>
              <span className="fvc-label block mb-1.5">Head Office</span>
              <p className="text-sm text-foreground leading-relaxed">{hqAddress}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => copyAddr(hqAddress)}>
                  <Copy size={12} className="mr-1" /> Copy
                </Button>
                {hasHq && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => openInMaps(entity.hq_lat, entity.hq_lng)}>
                    <ExternalLink size={12} className="mr-1" /> Open in maps
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {hasMap && (
          <div className="relative">
            <div ref={mapRef} className="aspect-square rounded-lg overflow-hidden border border-border" style={{ background: basemap === "classic" ? "hsl(0 0% 96%)" : "hsl(220 30% 8%)" }} />
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-background/90 backdrop-blur-sm rounded-md border border-border px-2.5 py-2 text-[11px]">
              {hasReg && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#d4a843" }} />
                  <span className="text-muted-foreground">Registered Office</span>
                </div>
              )}
              {hasHq && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#4a90d9" }} />
                  <span className="text-muted-foreground">Head Office</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
