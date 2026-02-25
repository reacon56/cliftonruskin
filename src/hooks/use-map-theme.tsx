import { useState, useCallback } from "react";

export type MapTheme = "light" | "dark";

const STORAGE_KEY = "fvc-map-theme";

const TILE_URLS: Record<MapTheme, string> = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

export function useMapTheme() {
  const [theme, setThemeState] = useState<MapTheme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as MapTheme) || "light";
    } catch {
      return "light";
    }
  });

  const setTheme = useCallback((t: MapTheme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, tileUrl: TILE_URLS[theme] };
}

export function MapThemeToggle({ theme, onToggle }: { theme: MapTheme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
      title={`Switch to ${theme === "light" ? "dark" : "light"} map`}
    >
      {theme === "light" ? "☀️" : "🌙"} {theme === "light" ? "Light" : "Dark"}
    </button>
  );
}
