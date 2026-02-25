import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import EntitiesPage from "@/pages/EntitiesPage";
import EntityDetailPage from "@/pages/EntityDetailPage";
import CommissionPage from "@/pages/CommissionPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import DeliverablesPage from "@/pages/DeliverablesPage";
import MonitoringPage from "@/pages/MonitoringPage";
import PoliciesPage from "@/pages/PoliciesPage";
import AuditLogPage from "@/pages/AuditLogPage";
import CaseDetailPage from "@/pages/CaseDetailPage";
import ModuleWorkbenchPage from "@/pages/ModuleWorkbenchPage";
import CaseQueuePage from "@/pages/CaseQueuePage";
import SupportPage from "@/pages/SupportPage";
import StubPage from "@/pages/StubPage";
import LiaLibraryPage from "@/pages/LiaLibraryPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, isInternal } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-lg text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
      
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/entities" element={<EntitiesPage />} />
        <Route path="/entities/:id" element={<EntityDetailPage />} />
        <Route path="/commission" element={<CommissionPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/deliverables" element={<DeliverablesPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/lia-library" element={<LiaLibraryPage />} />
        <Route path="/cases" element={<CaseQueuePage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/cases/:caseId/modules/:moduleId" element={<ModuleWorkbenchPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/users" element={<StubPage title="Users & Roles" description="Manage team members and role assignments" />} />
        <Route path="/clients" element={<StubPage title="Clients" description="Manage client organisations" />} />
        <Route path="/templates" element={<StubPage title="Templates" description="Report and deliverable templates" />} />
        <Route path="/monitoring-rules" element={<StubPage title="Monitoring Rules" description="Configure monitoring parameters" />} />
        <Route path="/admin" element={<StubPage title="Admin Settings" description="System configuration and global settings" />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
