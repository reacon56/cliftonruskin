import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function DeliverablesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.org_id) loadDeliverables();
  }, [profile?.org_id]);

  const loadDeliverables = async () => {
    const { data: cases } = await supabase
      .from("cases")
      .select("id")
      .eq("org_id", profile!.org_id!);
    
    if (!cases?.length) return;
    
    const { data } = await supabase
      .from("deliverables")
      .select("*, cases(entity_id, entities(name))")
      .in("case_id", cases.map((c) => c.id))
      .order("created_at", { ascending: false });
    
    setDeliverables(data ?? []);
  };

  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">Deliverables</h1>
      <p className="text-sm text-muted-foreground mb-8">Reports, evidence packs, and change logs</p>

      {deliverables.length === 0 ? (
        <div className="fvc-card text-center py-12 text-sm text-muted-foreground">
          No deliverables available yet. Deliverables will appear here once cases are completed.
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d) => (
            <div key={d.id} className="fvc-card flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{d.title}</div>
                <div className="text-xs text-muted-foreground">
                  {(d as any).cases?.entities?.name ?? "—"} · v{d.version} · {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
              <Badge className="fvc-status-badge bg-muted text-muted-foreground capitalize">
                {d.deliverable_type.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
