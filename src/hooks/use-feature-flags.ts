import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeatureFlags {
  ownership_structure_intelligence: boolean;
  monitoring_module: boolean;
  jurisdiction_benchmark: boolean;
  advanced_risk_alerts: boolean;
  provenance_view: boolean;
  export_pdf_advanced: boolean;
}

const DEFAULTS: FeatureFlags = {
  ownership_structure_intelligence: false,
  monitoring_module: false,
  jurisdiction_benchmark: false,
  advanced_risk_alerts: false,
  provenance_view: false,
  export_pdf_advanced: false,
};

export function useFeatureFlags() {
  const { profile } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }

    supabase
      .from("org_feature_flags" as any)
      .select("feature_key, enabled")
      .eq("org_id", profile.org_id)
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          const newFlags = { ...DEFAULTS };
          (data as any[]).forEach((row: any) => {
            if (row.feature_key in newFlags) {
              (newFlags as any)[row.feature_key] = row.enabled;
            }
          });
          setFlags(newFlags);
        }
        setLoading(false);
      });
  }, [profile?.org_id]);

  return { flags, loading };
}
