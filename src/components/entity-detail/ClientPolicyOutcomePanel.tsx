import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

interface Props {
  entityId: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  EDD_REQUIRED: "bg-destructive/10 text-destructive",
  SENIOR_APPROVAL: "bg-warning/10 text-warning",
  BLOCK_ONBOARDING: "bg-destructive/10 text-destructive",
  ENHANCED_MONITORING: "bg-warning/10 text-warning",
  FLAG_FOR_REVIEW: "bg-warning/10 text-warning",
};

export default function ClientPolicyOutcomePanel({ entityId }: Props) {
  const { data: outcome } = useQuery({
    queryKey: ["client-policy-outcome", entityId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("client_policy_outcome") as any)
        .select("*, client_policy_ruleset(name, version)")
        .eq("entity_id", entityId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!outcome) return null;

  const actions: string[] = outcome.outcome_json?.actions || [];
  const matchedRules: any[] = outcome.outcome_json?.matched_rules || [];
  const rulesetName = outcome.client_policy_ruleset?.name;

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          Client Policy Outcome
          <Badge variant="outline" className="text-[9px] ml-auto font-normal">Client-defined</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action, i) => (
            <Badge
              key={i}
              className={`text-[10px] ${OUTCOME_COLORS[action] || "bg-muted text-foreground"}`}
            >
              {action}
            </Badge>
          ))}
        </div>

        {/* Matched Rules Summary */}
        {matchedRules.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Triggered by:</p>
            {matchedRules.slice(0, 5).map((mr, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                <span>{mr.indicator_type}: {mr.condition}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t">
          {rulesetName && <span>Ruleset: {rulesetName}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(outcome.computed_at), "dd MMM yyyy HH:mm")}
          </span>
          <span>Engine: {outcome.engine_version}</span>
        </div>
      </CardContent>
    </Card>
  );
}
