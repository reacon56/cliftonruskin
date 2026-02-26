import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  caseData: any;
  isInternal: boolean;
  isManager: boolean;
  onRefresh: () => void;
}

export default function CaseProcessingRecord({ caseData, isInternal, isManager, onRefresh }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeLia, setActiveLia] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveLia();
  }, [caseData?.org_id, caseData?.active_lia_id]);

  const loadActiveLia = async () => {
    setLoading(true);
    if (caseData?.active_lia_id) {
      const { data } = await supabase
        .from("master_lia_templates" as any)
        .select("id, name, version_number, effective_date, scope_summary, lawful_basis, approved_by_name, status")
        .eq("id", caseData.active_lia_id)
        .single();
      setActiveLia(data);
    } else if (caseData?.org_id) {
      // Auto-find the active LIA for this org
      const { data } = await supabase
        .from("master_lia_templates" as any)
        .select("id, name, version_number, effective_date, scope_summary, lawful_basis, approved_by_name, status")
        .eq("org_id", caseData.org_id)
        .eq("status", "final")
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setActiveLia(data);
        // Auto-link to case
        await supabase.from("cases").update({ active_lia_id: (data as any).id } as any).eq("id", caseData.id);
      }
    }
    setLoading(false);
  };

  const toggleScopeChange = async (value: boolean) => {
    await supabase.from("cases").update({ scope_change_flag: value, scope_change_resolved: false } as any).eq("id", caseData.id);
    toast({ title: value ? "Scope change flagged" : "Scope change removed" });
    onRefresh();
  };

  const resolveScopeChange = async () => {
    await supabase.from("cases").update({ scope_change_resolved: true } as any).eq("id", caseData.id);
    await supabase.from("audit_events").insert({
      user_id: user?.id,
      org_id: caseData.org_id,
      action_type: "SCOPE_CHANGE_RESOLVED",
      object_type: "case",
      object_id: caseData.id,
      metadata: {},
    });
    toast({ title: "Scope change resolved" });
    onRefresh();
  };

  if (loading) return null;

  const scopeChangeBlocking = caseData.scope_change_flag && !caseData.scope_change_resolved;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Processing Record
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active LIA Reference */}
        {activeLia ? (
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">{activeLia.name}</span>
              <Badge className="text-[9px] bg-muted text-muted-foreground px-1.5">v{activeLia.version_number}</Badge>
              <Badge className="text-[9px] bg-success/10 text-success px-1.5">Active</Badge>
            </div>
            <div className="text-[10px] text-muted-foreground ml-5">
              {activeLia.lawful_basis === "legitimate_interests" ? "Legitimate Interests" : activeLia.lawful_basis}
              {activeLia.effective_date && ` · Effective ${new Date(activeLia.effective_date).toLocaleDateString()}`}
              {activeLia.approved_by_name && ` · ${activeLia.approved_by_name}`}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-xs text-warning flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            No active Programme LIA found for this client.
          </div>
        )}

        {/* Minimisation acknowledgement */}
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className={`h-4 w-4 ${caseData.minimisation_confirmed ? "text-success" : "text-muted-foreground"}`} />
          <span className={caseData.minimisation_confirmed ? "text-foreground" : "text-muted-foreground"}>
            Data minimisation confirmed
          </span>
        </div>

        {/* Special category flag */}
        {caseData.requires_personal_data && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className={`h-4 w-4 ${caseData.dp_risk_level === "high" ? "text-destructive" : "text-warning"}`} />
            <span className="text-foreground">
              {caseData.dp_risk_level === "high" ? "Special category data" : "Personal data processing"}
            </span>
          </div>
        )}

        {/* Scope change flag (internal only) */}
        {isInternal && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={caseData.scope_change_flag ?? false}
                onCheckedChange={(v) => toggleScopeChange(!!v)}
              />
              <span className="text-foreground">Scope change from original LIA</span>
            </label>

            {scopeChangeBlocking && (
              <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="font-medium">Release blocked — scope change unresolved</span>
                </div>
                {isManager && (
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={resolveScopeChange}>
                    Resolve Scope Change
                  </Button>
                )}
                {!isManager && (
                  <p className="text-[10px] text-muted-foreground">Only an Assurance Manager can resolve this.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Client view: just show LIA reference, no internal notes */}
        {!isInternal && !activeLia && (
          <p className="text-xs text-muted-foreground">Contact your Assurance Manager for LIA details.</p>
        )}
      </CardContent>
    </Card>
  );
}
