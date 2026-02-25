import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import CommercialPostureWorkbench from "@/components/workbench/CommercialPostureWorkbench";
import JurisdictionBenchmarkWorkbench from "@/components/workbench/JurisdictionBenchmarkWorkbench";

export default function ModuleWorkbenchPage() {
  const { caseId, moduleId } = useParams<{ caseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { isInternal } = useAuth();
  const [caseData, setCaseData] = useState<any>(null);
  const [caseModule, setCaseModule] = useState<any>(null);
  const [moduleType, setModuleType] = useState<any>(null);
  const [entityName, setEntityName] = useState("Entity");

  useEffect(() => {
    if (caseId && moduleId) loadData();
  }, [caseId, moduleId]);

  const loadData = async () => {
    const [caseRes, cmRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", caseId!).single(),
      supabase.from("case_modules").select("*").eq("id", moduleId!).single(),
    ]);

    setCaseData(caseRes.data);
    setCaseModule(cmRes.data);

    if (cmRes.data?.module_type_id) {
      const { data: mt } = await supabase.from("module_types").select("*").eq("id", cmRes.data.module_type_id).single();
      setModuleType(mt);
    }

    if (caseRes.data?.entity_id) {
      const { data: ent } = await supabase.from("entities").select("name, country").eq("id", caseRes.data.entity_id).single();
      setEntityName(ent?.name ?? "Entity");
      if (caseRes.data) {
        setCaseData((prev: any) => ({ ...prev, entity_country: ent?.country || "" }));
      }
    }
  };

  if (!isInternal) {
    return (
      <div className="text-center py-20">
        <Lock size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">This workspace is restricted to internal analysts.</p>
      </div>
    );
  }

  if (!caseData || !caseModule || !moduleType) {
    return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;
  }

  const isComplete = caseModule.status === "complete";

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(`/cases/${caseId}`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Case
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-accent" />
            <h1 className="fvc-heading-1 text-foreground">{moduleType.name}</h1>
          </div>
          <div className="fvc-gold-rule mt-2 mb-2" />
          <p className="text-sm text-muted-foreground">
            {entityName} · Case {caseData.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Badge className={`fvc-status-badge text-sm px-3 py-1 capitalize ${
          isComplete ? "bg-success/10 text-success" :
          caseModule.status === "in_progress" ? "bg-primary/10 text-primary" :
          "bg-muted text-muted-foreground"
        }`}>
          {caseModule.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {isComplete ? (
        <div className="fvc-card text-center py-12">
          <Sparkles size={32} className="mx-auto text-accent mb-3" />
          <p className="text-sm font-medium text-foreground">Module Complete</p>
          <p className="text-xs text-muted-foreground mt-1">The deliverable has been generated and stored in the Evidence Vault.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/cases/${caseId}`)}>
            Return to Case
          </Button>
        </div>
      ) : moduleType.code === "COMMERCIAL_POSTURE" ? (
        <CommercialPostureWorkbench
          caseModule={caseModule}
          caseData={caseData}
          entityName={entityName}
          onComplete={loadData}
        />
      ) : moduleType.code === "JURISDICTION_BENCHMARK" ? (
        <JurisdictionBenchmarkWorkbench
          caseModule={caseModule}
          caseData={caseData}
          entityName={entityName}
          onComplete={loadData}
        />
      ) : (
        <div className="fvc-card text-center py-12">
          <p className="text-sm text-muted-foreground">Unknown module type.</p>
        </div>
      )}
    </div>
  );
}
