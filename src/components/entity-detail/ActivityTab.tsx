import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Props {
  entityId: string;
}

export default function ActivityTab({ entityId }: Props) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, [entityId]);

  const loadAudit = async () => {
    const { data } = await supabase
      .from("audit_events")
      .select("*")
      .eq("object_id", entityId)
      .eq("object_type", "entity")
      .order("created_at", { ascending: false })
      .limit(50);
    setEvents(data ?? []);
    setLoading(false);
  };

  if (loading) {
    return <div className="fvc-card text-center py-10 text-sm text-muted-foreground">Loading audit trail…</div>;
  }

  return (
    <div className="space-y-0 fvc-stagger">
      {events.length === 0 ? (
        <div className="fvc-card text-center py-10 text-sm text-muted-foreground">No audit events recorded for this entity.</div>
      ) : (
        <div className="fvc-card p-0 overflow-hidden">
          {events.map((ev) => {
            const meta = typeof ev.metadata === "object" && ev.metadata ? ev.metadata : {};
            return (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3.5 border-b border-border/60 last:border-0">
                <Clock size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">
                    <span className="font-medium capitalize">{ev.action_type.replace(/_/g, " ")}</span>
                  </div>
                  {Object.keys(meta).length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {Object.entries(meta).map(([k, v]) => (
                        <span key={k} className="mr-3">{k.replace(/_/g, " ")}: {String(v)}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic mt-4 px-1">
        Read-only audit trail. All tier, cadence, ownership, and commissioning changes are logged automatically.
      </p>
    </div>
  );
}
