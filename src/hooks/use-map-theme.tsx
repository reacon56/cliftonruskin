import { useState, useCallback } from "react";
import { Globe, Satellite, Sun, Moon } from "lucide-react";

export type MapTheme = "light" | "dark";
export type MapBasemap = "standard" | "satellite";

const STORAGE_KEY = "fvc-map-theme";
const BASEMAP_KEY = "fvc-map-basemap";

const TILE_URLS: Record<MapTheme, string> = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function useMapTheme() {
  const [theme, setThemeState] = useState<MapTheme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as MapTheme) || "light";
    } catch {
      return "light";
    }
  });

  const [basemap, setBasemapState] = useState<MapBasemap>(() => {
    try {
      return (sessionStorage.getItem(BASEMAP_KEY) as MapBasemap) || "standard";
    } catch {
      return "standard";
    }
  });

  const setTheme = useCallback((t: MapTheme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  const setBasemap = useCallback((b: MapBasemap) => {
    setBasemapState(b);
    try { sessionStorage.setItem(BASEMAP_KEY, b); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const toggleBasemap = useCallback(() => {
    setBasemap(basemap === "standard" ? "satellite" : "standard");
  }, [basemap, setBasemap]);

  const tileUrl = basemap === "satellite" ? SATELLITE_URL : TILE_URLS[theme];

  return { theme, basemap, setTheme, setBasemap, toggle, toggleBasemap, tileUrl };
}

export function MapThemeToggle({ theme, onToggle }: { theme: MapTheme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
      title={`Switch to ${theme === "light" ? "dark" : "light"} map`}
    >
      {theme === "light" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
      {theme === "light" ? "Light" : "Dark"}
    </button>
  );
}

export function BasemapToggle({ basemap, onToggle }: { basemap: MapBasemap; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
      title={`Switch to ${basemap === "standard" ? "satellite" : "standard"} view`}
    >
      {basemap === "standard" ? <Satellite className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      {basemap === "standard" ? "Satellite" : "Standard"}
    </button>
  );
}
