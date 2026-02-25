import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ClipboardList } from "lucide-react";

export default function AuditLogPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (profile?.org_id) loadEvents();
  }, [profile?.org_id]);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setEvents(data ?? []);
  };

  const filtered = events.filter((e) => {
    const matchAction = filterAction === "all" || e.action_type === filterAction;
    const matchSearch = e.action_type.toLowerCase().includes(search.toLowerCase()) ||
      e.object_type.toLowerCase().includes(search.toLowerCase());
    return matchAction && matchSearch;
  });

  const actionTypes = [...new Set(events.map((e) => e.action_type))];

  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">Audit Log</h1>
      <p className="text-sm text-muted-foreground mb-8">Complete record of system activity</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actionTypes.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <ClipboardList size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="fvc-card flex items-center justify-between py-3">
              <div>
                <div className="text-sm text-foreground">
                  <span className="font-medium">{e.action_type}</span> on <span className="text-muted-foreground">{e.object_type}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
