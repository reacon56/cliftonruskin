import React, { createContext, useContext, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type ViewMode = "client" | "internal";

interface ViewModeContextType {
  /** The effective view: respects the toggle for dual-role users, otherwise derived from real roles */
  activeView: ViewMode;
  /** Whether the user can toggle (has both client + internal roles) */
  canToggle: boolean;
  /** Toggle between client and internal */
  toggle: () => void;
  setView: (v: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const { isClient, isInternal } = useAuth();
  const hasBoth = isClient && isInternal;
  const defaultView: ViewMode = isInternal ? "internal" : "client";
  const [viewAs, setViewAs] = useState<ViewMode>(defaultView);

  const activeView = hasBoth ? viewAs : defaultView;

  const toggle = () => {
    setViewAs((prev) => (prev === "internal" ? "client" : "internal"));
  };

  return (
    <ViewModeContext.Provider value={{ activeView, canToggle: isInternal, toggle, setView: setViewAs }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
  return ctx;
}
