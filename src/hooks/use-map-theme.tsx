import { useState, useCallback } from "react";
import { Globe, Satellite, Moon } from "lucide-react";

export type MapBasemap = "dark" | "classic" | "satellite";

const STORAGE_KEY = "fvc-map-basemap";

const TILE_URLS: Record<MapBasemap, string> = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  classic: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

const CYCLE: MapBasemap[] = ["dark", "classic", "satellite"];

const LABELS: Record<MapBasemap, string> = {
  dark: "Dark",
  classic: "Classic",
  satellite: "Satellite",
};

const ICONS: Record<MapBasemap, typeof Moon> = {
  dark: Moon,
  classic: Globe,
  satellite: Satellite,
};

export function useMapTheme() {
  const [basemap, setBasemapState] = useState<MapBasemap>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) as MapBasemap;
      if (stored && CYCLE.includes(stored)) return stored;
    } catch {}
    return "dark";
  });

  const setBasemap = useCallback((b: MapBasemap) => {
    setBasemapState(b);
    try { sessionStorage.setItem(STORAGE_KEY, b); } catch {}
  }, []);

  const cycleBasemap = useCallback(() => {
    setBasemapState((prev) => {
      const idx = CYCLE.indexOf(prev);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      try { sessionStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  const tileUrl = TILE_URLS[basemap];

  return { basemap, setBasemap, cycleBasemap, tileUrl };
}

export function BasemapCycleToggle({ basemap, onCycle }: { basemap: MapBasemap; onCycle: () => void }) {
  const Icon = ICONS[basemap];
  // Show label of the NEXT basemap the user will switch to
  const idx = CYCLE.indexOf(basemap);
  const nextBasemap = CYCLE[(idx + 1) % CYCLE.length];
  return (
    <button
      onClick={onCycle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
      title={`Switch to ${LABELS[nextBasemap]} basemap`}
    >
      <Icon className="h-3 w-3" />
      {LABELS[basemap]}
    </button>
  );
}
