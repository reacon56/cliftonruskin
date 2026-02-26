import { useAuth } from "@/contexts/AuthContext";
import FeatureControlsPanel from "@/components/admin/FeatureControlsPanel";
import BillingUsagePanel from "@/components/admin/BillingUsagePanel";
import { Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function FeatureControlsPage() {
  const { hasRole } = useAuth();

  const isInternal =
    hasRole("fvc_ops_admin") ||
    hasRole("fvc_assurance_manager") ||
    hasRole("fvc_assurance_lead");

  if (!isInternal) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-xl font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Feature controls are available to internal administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <FeatureControlsPanel />
      <Separator />
      <BillingUsagePanel />
    </div>
  );
}
