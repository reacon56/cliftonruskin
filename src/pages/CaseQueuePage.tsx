import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Building2, Clock, Users, Calendar, AlertTriangle } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS, REPORT_TIER_LABELS, type CaseStatus } from "@/lib/case-statuses";

export default function CaseQueuePage() {
  const navigate = useNavigate();
  const { user, isInternal, canWork, canQuote } = useAuth();
  const isManager = canQuote; // Managers can quote = manager/ops_admin
  const isOfficer = canWork && !isManager;

  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterOfficer, setFilterOfficer] = useState("all");
  const [filterDue, setFilterDue] = useState("all");

  useEffect(() => { loadCases(); }, []);

  const loadCases = async () => {
    let query = supabase
      .from("cases")
      .select("*, entities(name, risk_tier), organisations(name)")
      .order("created_at", { ascending: false });

    // Officers only see their assigned cases
    if (isOfficer && user) {
      query = query.eq("assigned_to", user.id);
    }

    const { data } = await query;
    setCases(data ?? []);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const in7Str = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const in30Str = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  // Derived filter options
  const clientNames = [...new Set(cases.map((c: any) => (c as any).organisations?.name).filter(Boolean))].sort();
  const officerIds = [...new Set(cases.map((c: any) => c.assigned_to).filter(Boolean))];

  const filtered = cases.filter((c: any) => {
    const entityName = (c as any).entities?.name ?? "";
    const orgName = (c as any).organisations?.name ?? "";
    const matchesSearch = entityName.toLowerCase().includes(search.toLowerCase()) ||
      orgName.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesClient = filterClient === "all" || orgName === filterClient;
    const matchesOfficer = filterOfficer === "all" ||
      (filterOfficer === "unassigned" && !c.assigned_to) ||
      c.assigned_to === filterOfficer;
    
    let matchesDue = true;
    if (filterDue === "overdue") matchesDue = !!c.due_date && c.due_date < todayStr;
    else if (filterDue === "7days") matchesDue = !!c.due_date && c.due_date >= todayStr && c.due_date <= in7Str;
    else if (filterDue === "30days") matchesDue = !!c.due_date && c.due_date >= todayStr && c.due_date <= in30Str;
    else if (filterDue === "no_date") matchesDue = !c.due_date;

    return matchesSearch && matchesStatus && matchesClient && matchesOfficer && matchesDue;
  });

  const overdueCount = cases.filter((c: any) => c.due_date && c.due_date < todayStr && !["released", "archived", "closed"].includes(c.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="fvc-heading-1 text-foreground">
          {isOfficer ? "My Cases" : "Case Queue"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isOfficer ? "Cases assigned to you" : "All commissioned cases across clients"}
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary">{cases.length} cases</Badge>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {overdueCount} overdue
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entity, client, or ref…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="with_partner">With Partner</SelectItem>
            <SelectItem value="qc">QC</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clientNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {isManager && (
          <Select value={filterOfficer} onValueChange={setFilterOfficer}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All officers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All officers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={filterDue} onValueChange={setFilterDue}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Due date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any due date</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="7days">Due in 7 days</SelectItem>
            <SelectItem value="30days">Due in 30 days</SelectItem>
            <SelectItem value="no_date">No date set</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Case list */}
      {filtered.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No cases match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => {
            const entityName = (c as any).entities?.name ?? "Entity";
            const orgName = (c as any).organisations?.name ?? "";
            const riskTier = (c as any).entities?.risk_tier;
            const status = c.status as CaseStatus;
            const isOverdue = c.due_date && c.due_date < todayStr && !["released", "archived", "closed"].includes(c.status);

            return (
              <button
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="fvc-card flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors w-full"
              >
                <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate text-sm">{entityName}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {orgName}
                    </span>
                    <span>{CASE_TYPE_LABELS[c.case_type] || c.case_type}</span>
                    <span>{REPORT_TIER_LABELS[c.report_tier] || c.report_tier}</span>
                    {c.due_date && (
                      <span className={`flex items-center gap-0.5 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(c.due_date).toLocaleDateString()}
                        {isOverdue && <AlertTriangle className="h-3 w-3" />}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {riskTier && <Badge variant="outline" className="text-[10px]">Tier {riskTier}</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">{c.priority}</Badge>
                  <Badge className={`fvc-status-badge text-[10px] capitalize ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
                    {STATUS_LABELS[status] || c.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
