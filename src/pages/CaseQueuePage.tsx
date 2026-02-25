import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function CaseQueuePage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    const { data } = await supabase
      .from("cases")
      .select("*, entities(name), organisations(name)")
      .order("created_at", { ascending: false });
    setCases(data ?? []);
  };

  const filtered = cases.filter((c) => filterStatus === "all" || c.status === filterStatus);

  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">Case Queue</h1>
      <p className="text-sm text-muted-foreground mb-8">All commissioned cases across clients</p>

      <div className="flex gap-3 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_client">Awaiting Client</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12 text-sm text-muted-foreground">No cases in queue.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="fvc-card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/cases/${c.id}`)}>
              <div>
                <div className="text-sm font-medium text-foreground">{(c as any).entities?.name ?? "Entity"}</div>
                <div className="text-xs text-muted-foreground">{(c as any).organisations?.name} · {c.product_type} · {c.priority}</div>
              </div>
              <Badge className="fvc-status-badge bg-muted text-muted-foreground capitalize">{c.status.replace(/_/g, " ")}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
