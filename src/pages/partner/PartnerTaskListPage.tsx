import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ChevronRight } from "lucide-react";
import {
  PARTNER_STATUS_LABELS,
  PARTNER_STATUS_COLORS,
  type PartnerTaskStatus,
} from "@/lib/partner-statuses";

export default function PartnerTaskListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("partner_tasks" as any)
      .select("*")
      .eq("partner_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setTasks(data ?? []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-20 text-center">Loading tasks…</div>;
  }

  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">My Tasks</h1>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-8">
        In-country enquiry tasks assigned to you
      </p>

      {tasks.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <p className="text-sm text-muted-foreground">No tasks assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t: any) => {
            const status = t.status as PartnerTaskStatus;
            return (
              <div
                key={t.id}
                className="fvc-card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/partner/tasks/${t.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{t.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {t.country}
                    </span>
                    {t.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> Due {new Date(t.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <Badge className={`fvc-status-badge capitalize text-[10px] ${PARTNER_STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
                    {PARTNER_STATUS_LABELS[status] || t.status}
                  </Badge>
                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
