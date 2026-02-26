import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { ViewModeProvider } from "@/contexts/ViewModeContext";

export default function AppLayout() {
  return (
    <ViewModeProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </ViewModeProvider>
  );
}
