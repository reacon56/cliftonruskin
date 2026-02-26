import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";

interface InternalRouteGuardProps {
  children: React.ReactNode;
  /** If true, only managers/ops-admins can access */
  managerOnly?: boolean;
}

/**
 * Wraps internal-only routes. Redirects non-internal users to /dashboard.
 * With managerOnly=true, officers are shown an access-restricted message.
 */
export default function InternalRouteGuard({ children, managerOnly = false }: InternalRouteGuardProps) {
  const { isInternal, hasRole } = useAuth();

  if (!isInternal) {
    return <Navigate to="/dashboard" replace />;
  }

  if (managerOnly) {
    const isManager = hasRole("fvc_assurance_manager" as any) || hasRole("fvc_ops_admin" as any);
    if (!isManager) {
      return (
        <div className="max-w-xl mx-auto py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-xl font-semibold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mt-2">
            This area is available to Assurance Managers only.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
