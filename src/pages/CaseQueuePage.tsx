import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import SavedViewsDropdown, { type FilterState } from "@/components/SavedViewsDropdown";

export default function CaseQueuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleApplyFilters = (filters: FilterState) => {
    setFilterStatus(filters.status || "all");
  };

  const currentFilters: FilterState = { status: filterStatus };

  const filtered = cases.filter((c) => {
    if (filterStatus === "awaiting_client") {
      return c.status === "awaiting_client";
    }
    return filterStatus === "all" || c.status === filterStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="fvc-heading-1 text-foreground">Case Queue</h1>
        <SavedViewsDropdown
          pageType="cases"
          currentFilters={currentFilters}
          onApplyFilters={handleApplyFilters}
        />
      </div>
      <p className="text-sm text-muted-foreground mb-8">All commissioned cases across clients</p>

      <div className="flex gap-3 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_client">Awaiting Client</SelectItem>
            <SelectItem value="qc">QC</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
