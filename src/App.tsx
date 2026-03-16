import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import InternalRouteGuard from "@/components/InternalRouteGuard";
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
import FeatureControlsPage from "@/pages/FeatureControlsPage";
import UpgradeRequestsPage from "@/pages/UpgradeRequestsPage";
import MarketLessonsAdminPage from "@/pages/MarketLessonsAdminPage";
import PartnerTaskListPage from "@/pages/partner/PartnerTaskListPage";
import PartnerTaskDetailPage from "@/pages/partner/PartnerTaskDetailPage";
import NotFound from "@/pages/NotFound";
import WorkloadPage from "@/pages/WorkloadPage";
import MasterEntitiesPage from "@/pages/MasterEntitiesPage";
import ProgrammeSettingsPage from "@/pages/ProgrammeSettingsPage";
import PartnerDirectoryPage from "@/pages/PartnerDirectoryPage";
import ReconciliationPage from "@/pages/ReconciliationPage";
import RiskModelPage from "@/pages/RiskModelPage";
import QaQueuePage from "@/pages/QaQueuePage";
import MyTasksPage from "@/pages/MyTasksPage";
import PartnerRequestsPage from "@/pages/PartnerRequestsPage";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import MasterEntityDetailPage from "@/pages/MasterEntityDetailPage";
import SourceRegistryPage from "@/pages/SourceRegistryPage";
import ResearchConsolePage from "@/pages/ResearchConsolePage";
import JurisdictionLibraryPage from "@/pages/JurisdictionLibraryPage";
import UnitEconomicsPage from "@/pages/UnitEconomicsPage";
import TierMatrixPage from "@/pages/TierMatrixPage";
import ProductCataloguePage from "@/pages/ProductCataloguePage";
import BudgetControlsPage from "@/pages/BudgetControlsPage";
import BillingHandoffPage from "@/pages/BillingHandoffPage";
import WorkOrdersPage from "@/pages/WorkOrdersPage";
import EntitlementSettingsPage from "@/pages/EntitlementSettingsPage";
import ServiceRequestPage from "@/pages/ServiceRequestPage";
import CommercialDashboardPage from "@/pages/CommercialDashboardPage";
import ClientSpendSummaryPage from "@/pages/ClientSpendSummaryPage";
import IngestionSourcesPage from "@/pages/IngestionSourcesPage";
import JurisdictionsListPage from "@/pages/JurisdictionsListPage";
import JurisdictionProfilePage from "@/pages/JurisdictionProfilePage";
import JurisdictionBriefPage from "@/pages/JurisdictionBriefPage";
import AdminSourcesPage from "@/pages/admin/AdminSourcesPage";
import AdminIngestionRunsPage from "@/pages/admin/AdminIngestionRunsPage";
import AdminIngestionRunDetailPage from "@/pages/admin/AdminIngestionRunDetailPage";
import ClientAlertsPage from "@/pages/ClientAlertsPage";
import ClientPolicyPage from "@/pages/ClientPolicyPage";
import PolicySimulatePage from "@/pages/PolicySimulatePage";
import SanctionsRegimesPage from "@/pages/admin/SanctionsRegimesPage";
import MethodologyPage from "@/pages/MethodologyPage";
import MethodologyAdminPage from "@/pages/admin/MethodologyAdminPage";
import ClientOnboardingPage from "@/pages/ClientOnboardingPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RegulatoryBriefingsPage from "@/pages/RegulatoryBriefingsPage";

// Website pages
import WebsiteLayout from "@/components/website/WebsiteLayout";
import HomePage from "@/pages/website/HomePage";
import AboutPage from "@/pages/website/AboutPage";
import ServicesPage from "@/pages/website/ServicesPage";
import SectorsPage from "@/pages/website/SectorsPage";
import InsightsPage from "@/pages/website/InsightsPage";
import ObservationsPage from "@/pages/website/ObservationsPage";
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
        <Route path="/insights" element={<Navigate to="/observations" replace />} />
        <Route path="/observations" element={<ObservationsPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route path="/auth" element={user ? <Navigate to={defaultRoute} replace /> : <AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
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
        <Route path="/service-request" element={<ServiceRequestPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/deliverables" element={<DeliverablesPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/client/alerts" element={<ClientAlertsPage />} />
        <Route path="/client/policy" element={<ClientPolicyPage />} />
        <Route path="/client/policy/simulate" element={<PolicySimulatePage />} />
        <Route path="/client/onboarding" element={<ClientOnboardingPage />} />
        <Route path="/regulatory-briefings" element={<RegulatoryBriefingsPage />} />
        <Route path="/lia-library" element={<LiaLibraryPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/approval-settings" element={<AutoApprovalSettingsPage />} />
        <Route path="/org-settings" element={<OrgSettingsPage />} />
        <Route path="/feature-controls" element={<InternalRouteGuard managerOnly><FeatureControlsPage /></InternalRouteGuard>} />
        <Route path="/upgrade-requests" element={<InternalRouteGuard managerOnly><UpgradeRequestsPage /></InternalRouteGuard>} />
        <Route path="/cases" element={<CaseQueuePage />} />
        <Route path="/admin/market-lessons" element={<InternalRouteGuard managerOnly><MarketLessonsAdminPage /></InternalRouteGuard>} />
        <Route path="/admin/sources" element={<InternalRouteGuard managerOnly><AdminSourcesPage /></InternalRouteGuard>} />
        <Route path="/admin/ingestion-runs" element={<InternalRouteGuard managerOnly><AdminIngestionRunsPage /></InternalRouteGuard>} />
        <Route path="/admin/ingestion-runs/:id" element={<InternalRouteGuard managerOnly><AdminIngestionRunDetailPage /></InternalRouteGuard>} />
        <Route path="/admin/sanctions-regimes" element={<InternalRouteGuard managerOnly><SanctionsRegimesPage /></InternalRouteGuard>} />
        <Route path="/admin/methodology" element={<InternalRouteGuard managerOnly><MethodologyAdminPage /></InternalRouteGuard>} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/cases/:caseId/modules/:moduleId" element={<ModuleWorkbenchPage />} />
        <Route path="/partner/tasks/:taskId" element={<PartnerTaskDetailPage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* ── Manager-only routes ── */}
        <Route path="/workload" element={<InternalRouteGuard managerOnly><WorkloadPage /></InternalRouteGuard>} />
        <Route path="/master-entities" element={<InternalRouteGuard managerOnly><MasterEntitiesPage /></InternalRouteGuard>} />
        <Route path="/master-entities/:id" element={<InternalRouteGuard managerOnly><MasterEntityDetailPage /></InternalRouteGuard>} />
        <Route path="/programme-settings" element={<InternalRouteGuard managerOnly><ProgrammeSettingsPage /></InternalRouteGuard>} />
        <Route path="/partner-directory" element={<InternalRouteGuard managerOnly><PartnerDirectoryPage /></InternalRouteGuard>} />
        <Route path="/reconciliation" element={<InternalRouteGuard managerOnly><ReconciliationPage /></InternalRouteGuard>} />
        <Route path="/risk-model" element={<InternalRouteGuard managerOnly><RiskModelPage /></InternalRouteGuard>} />
        <Route path="/jurisdiction-library" element={<InternalRouteGuard><JurisdictionLibraryPage /></InternalRouteGuard>} />
        <Route path="/jurisdictions" element={<InternalRouteGuard><JurisdictionsListPage /></InternalRouteGuard>} />
        <Route path="/jurisdictions/:id" element={<InternalRouteGuard><JurisdictionProfilePage /></InternalRouteGuard>} />
        <Route path="/jurisdictions/:id/brief" element={<JurisdictionBriefPage />} />
        <Route path="/unit-economics" element={<InternalRouteGuard managerOnly><UnitEconomicsPage /></InternalRouteGuard>} />
        <Route path="/tier-matrix" element={<InternalRouteGuard managerOnly><TierMatrixPage /></InternalRouteGuard>} />
        <Route path="/product-catalogue" element={<InternalRouteGuard><ProductCataloguePage /></InternalRouteGuard>} />
        <Route path="/budget-controls" element={<BudgetControlsPage />} />
        <Route path="/billing-handoff" element={<InternalRouteGuard managerOnly><BillingHandoffPage /></InternalRouteGuard>} />
        <Route path="/work-orders" element={<WorkOrdersPage />} />
        <Route path="/entitlement-settings" element={<InternalRouteGuard managerOnly><EntitlementSettingsPage /></InternalRouteGuard>} />
        <Route path="/commercial-dashboard" element={<InternalRouteGuard managerOnly><CommercialDashboardPage /></InternalRouteGuard>} />
        <Route path="/spend-summary" element={<ClientSpendSummaryPage />} />

        {/* ── Internal routes (officer + manager) ── */}
        <Route path="/qa-queue" element={<InternalRouteGuard><QaQueuePage /></InternalRouteGuard>} />
        <Route path="/my-tasks" element={<InternalRouteGuard><MyTasksPage /></InternalRouteGuard>} />
        <Route path="/partner-requests" element={<InternalRouteGuard><PartnerRequestsPage /></InternalRouteGuard>} />
        <Route path="/knowledge-base" element={<InternalRouteGuard><KnowledgeBasePage /></InternalRouteGuard>} />
        <Route path="/source-registry" element={<InternalRouteGuard managerOnly><SourceRegistryPage /></InternalRouteGuard>} />
        <Route path="/ingestion-sources" element={<InternalRouteGuard managerOnly><IngestionSourcesPage /></InternalRouteGuard>} />
        <Route path="/research-console" element={<InternalRouteGuard><ResearchConsolePage /></InternalRouteGuard>} />

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
