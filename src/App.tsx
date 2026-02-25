import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PartnerLayout from "@/components/PartnerLayout";
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
import AutoApprovalSettingsPage from "@/pages/AutoApprovalSettingsPage";
import OrgSettingsPage from "@/pages/OrgSettingsPage";
import PartnerTaskListPage from "@/pages/partner/PartnerTaskListPage";
import PartnerTaskDetailPage from "@/pages/partner/PartnerTaskDetailPage";
import NotFound from "@/pages/NotFound";

// Website pages
import WebsiteLayout from "@/components/website/WebsiteLayout";
import HomePage from "@/pages/website/HomePage";
import AboutPage from "@/pages/website/AboutPage";
import ServicesPage from "@/pages/website/ServicesPage";
import SectorsPage from "@/pages/website/SectorsPage";
import InsightsPage from "@/pages/website/InsightsPage";
import ContactPage from "@/pages/website/ContactPage";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, isInternal, isPartner } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-lg text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Determine default landing page based on role
  const defaultRoute = isPartner ? "/partner/tasks" : "/dashboard";

  return (
    <Routes>
      {/* ── Public website ── */}
      <Route element={<WebsiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/sectors" element={<SectorsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route path="/auth" element={user ? <Navigate to={defaultRoute} replace /> : <AuthPage />} />
      
      {/* Partner portal — isolated layout */}
      <Route element={<ProtectedRoute><PartnerLayout /></ProtectedRoute>}>
        <Route path="/partner/tasks" element={<PartnerTaskListPage />} />
        <Route path="/partner/tasks/:taskId" element={<PartnerTaskDetailPage />} />
      </Route>

      {/* Main app layout (clients + internal) */}
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
        <Route path="/approval-settings" element={<AutoApprovalSettingsPage />} />
        <Route path="/org-settings" element={<OrgSettingsPage />} />
        <Route path="/cases" element={<CaseQueuePage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/cases/:caseId/modules/:moduleId" element={<ModuleWorkbenchPage />} />
        <Route path="/partner/tasks/:taskId" element={<PartnerTaskDetailPage />} />
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
