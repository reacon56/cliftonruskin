import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, GanttChart, Users, ChevronLeft, ChevronRight } from "lucide-react";
import WorkloadFilters from "@/components/workload/WorkloadFilters";
import OfficerCapacityPanel from "@/components/workload/OfficerCapacityPanel";
import type { OfficerLoad } from "@/components/workload/OfficerCapacityPanel";
import CalendarSwimlane from "@/components/workload/CalendarSwimlane";
import GanttView from "@/components/workload/GanttView";
import { addDays, isBefore, differenceInDays } from "date-fns";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  owner_id: string | null;
  case_id: string;
  created_at: string;
}

interface CaseRow {
  id: string;
  org_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  sla_days: number | null;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
}

/* ── Demo Data ── */
const DEMO_OFFICERS = [
  { id: "demo-jw", name: "James Whitfield", role: "Senior Analyst" },
  { id: "demo-sc", name: "Sarah Chen", role: "Analyst" },
  { id: "demo-mr", name: "Marcus Reid", role: "Associate Director" },
];

const DEMO_CASES: Array<{
  id: string; entity: string; client: string; officer: string;
  due: string; status: string; priority: string; startOffset: number;
}> = [
  { id: "dc-1", entity: "Al-Rashid Consulting Group", client: "Pemberton Holdings", officer: "demo-jw", due: "2026-03-21", status: "in_progress", priority: "high", startOffset: -5 },
  { id: "dc-2", entity: "Cerberus Risk Analytics", client: "Pemberton Holdings", officer: "demo-jw", due: "2026-03-28", status: "research", priority: "medium", startOffset: -3 },
  { id: "dc-3", entity: "Nordic Freight Solutions AB", client: "Pemberton Holdings", officer: "demo-jw", due: "2026-04-02", status: "assigned", priority: "high", startOffset: 0 },
  { id: "dc-4", entity: "Shenzhen Apex Manufacturing", client: "Pemberton Holdings", officer: "demo-sc", due: "2026-03-18", status: "overdue", priority: "high", startOffset: -10 },
  { id: "dc-5", entity: "Meridian Capital Partners", client: "Pemberton Holdings", officer: "demo-sc", due: "2026-03-25", status: "qc", priority: "medium", startOffset: -7 },
  { id: "dc-6", entity: "São Paulo Trade Corp", client: "Pemberton Holdings", officer: "demo-mr", due: "2026-04-07", status: "assigned", priority: "medium", startOffset: 0 },
  { id: "dc-7", entity: "Al-Rashid Consulting Group (2nd review)", client: "Pemberton Holdings", officer: "demo-mr", due: "2026-04-14", status: "scheduled", priority: "low", startOffset: 5 },
];

const DEMO_CAPACITY: OfficerLoad[] = [
  { id: "demo-jw", name: "James Whitfield", role: "Senior Analyst · 3 cases", taskCount: 3, dueSoon: 1, overdue: 0, caseCount: 3, capacityPercent: 85 },
  { id: "demo-sc", name: "Sarah Chen", role: "Analyst · 2 cases", taskCount: 2, dueSoon: 0, overdue: 1, caseCount: 2, capacityPercent: 70 },
  { id: "demo-mr", name: "Marcus Reid", role: "Associate Director · 2 cases", taskCount: 2, dueSoon: 0, overdue: 0, caseCount: 2, capacityPercent: 90 },
];

function buildDemoTasks(): TaskRow[] {
  const today = new Date();
  return DEMO_CASES.map(c => ({
    id: `task-${c.id}`,
    title: `${c.entity} — ${c.client}`,
    status: c.status === "overdue" ? "in_progress" : c.status === "qc" ? "in_progress" : c.status === "research" ? "in_progress" : c.status,
    due_date: c.due,
    owner_id: c.officer,
    case_id: c.id,
    created_at: addDays(today, c.startOffset).toISOString(),
  }));
}

function buildDemoCases(): CaseRow[] {
  const today = new Date();
  return DEMO_CASES.map(c => ({
    id: c.id,
    org_id: "demo-org",
    assigned_to: c.officer,
    status: c.status,
    priority: c.priority,
    due_date: c.due,
    sla_days: null,
    created_at: addDays(today, c.startOffset).toISOString(),
  }));
}

function buildDemoProfiles(): ProfileRow[] {
  return DEMO_OFFICERS.map(o => ({
    user_id: o.id,
    full_name: o.name,
    email: `${o.name.toLowerCase().replace(" ", ".")}@cliftonruskin.com`,
  }));
}

/* ── Component ── */

export default function WorkloadPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [useDemo, setUseDemo] = useState(false);

  const [filterOrg, setFilterOrg] = useState("all");
  const [filterOfficer, setFilterOfficer] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);

  // Load data
  useEffect(() => {
    Promise.all([
      supabase.from("case_tasks").select("id, title, status, due_date, owner_id, case_id, created_at"),
      supabase.from("cases").select("id, org_id, assigned_to, status, priority, due_date, sla_days, created_at")
        .not("status", "in", '("cancelled","archived")'),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("organisations").select("id, name").order("name"),
    ]).then(([tasksRes, casesRes, profilesRes, orgsRes]) => {
      const dbTasks = tasksRes.data ?? [];
      const dbCases = casesRes.data ?? [];
      const dbProfiles = profilesRes.data ?? [];

      // Always merge demo data so workload views are populated
      setTasks([...buildDemoTasks(), ...dbTasks]);
      setCases([...buildDemoCases(), ...dbCases]);
      setProfiles([...buildDemoProfiles(), ...dbProfiles]);
      setOrgs([{ id: "demo-org", name: "Pemberton Holdings" }, ...(orgsRes.data ?? [])]);
      setUseDemo(true);
    });
  }, []);

  // Derive officer list
  const officerIds = useMemo(() => {
    const ids = new Set<string>();
    cases.forEach(c => { if (c.assigned_to) ids.add(c.assigned_to); });
    tasks.forEach(t => { if (t.owner_id) ids.add(t.owner_id); });
    return ids;
  }, [cases, tasks]);

  const officerList = useMemo(() => {
    return profiles
      .filter(p => officerIds.has(p.user_id))
      .map(p => ({ id: p.user_id, name: p.full_name || p.email || p.user_id.slice(0, 8) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, officerIds]);

  // Case lookup
  const caseMap = useMemo(() => {
    const m: Record<string, CaseRow> = {};
    cases.forEach(c => { m[c.id] = c; });
    return m;
  }, [cases]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const c = caseMap[t.case_id];
      if (!c) return false;
      if (filterOrg !== "all" && c.org_id !== filterOrg) return false;
      if (filterOfficer !== "all" && t.owner_id !== filterOfficer) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && c.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, caseMap, filterOrg, filterOfficer, filterStatus, filterPriority]);

  // SLA breach detection
  const slaBreach = useMemo(() => {
    const breached = new Set<string>();
    const today = new Date();
    cases.forEach(c => {
      if (c.due_date && !["delivered", "closed", "complete", "cancelled", "archived"].includes(c.status)) {
        if (isBefore(new Date(c.due_date), today)) breached.add(c.id);
      }
    });
    return breached;
  }, [cases]);

  // Calendar tasks
  const calendarTasks = useMemo(() => {
    return filteredTasks.map(t => ({
      ...t,
      case_sla_breach: slaBreach.has(t.case_id),
    }));
  }, [filteredTasks, slaBreach]);

  // Gantt items — grouped by officer
  const ganttItems = useMemo(() => {
    const items: Array<{
      id: string; label: string; type: "task" | "milestone";
      start: string; end: string; status: string; officer: string; slaBreach: boolean;
    }> = [];

    // Group by officer for clear rows
    const officerCases: Record<string, typeof DEMO_CASES> = {};
    const filteredCaseIds = new Set(filteredTasks.map(t => t.case_id));

    cases.forEach(c => {
      if (!filteredCaseIds.has(c.id)) return;
      if (filterOrg !== "all" && c.org_id !== filterOrg) return;
      const officerId = c.assigned_to || "unassigned";
      if (!officerCases[officerId]) officerCases[officerId] = [];
    });

    // Add tasks as bars
    filteredTasks.forEach(t => {
      const c = caseMap[t.case_id];
      const officer = profiles.find(p => p.user_id === t.owner_id);
      items.push({
        id: t.id,
        label: t.title,
        type: "task",
        start: t.created_at.split("T")[0],
        end: t.due_date || t.created_at.split("T")[0],
        status: t.status,
        officer: officer?.full_name || "Unassigned",
        slaBreach: slaBreach.has(t.case_id),
      });
    });

    // Sort by officer then date
    items.sort((a, b) => a.officer.localeCompare(b.officer) || a.start.localeCompare(b.start));

    return items;
  }, [filteredTasks, cases, caseMap, profiles, slaBreach, filterOrg]);

  // Capacity data
  const capacityData: OfficerLoad[] = useMemo(() => {
    if (useDemo) return DEMO_CAPACITY;

    const today = new Date();
    const soonThreshold = addDays(today, 3);

    return officerList.map(o => {
      const oTasks = filteredTasks.filter(t => t.owner_id === o.id && t.status !== "done");
      const caseIds = new Set(oTasks.map(t => t.case_id));
      let dueSoon = 0, overdue = 0;
      oTasks.forEach(t => {
        if (!t.due_date) return;
        const d = new Date(t.due_date);
        if (isBefore(d, today)) overdue++;
        else if (isBefore(d, soonThreshold)) dueSoon++;
      });

      return {
        id: o.id,
        name: o.name,
        taskCount: oTasks.length,
        dueSoon,
        overdue,
        caseCount: caseIds.size,
      };
    }).filter(o => o.taskCount > 0 || o.caseCount > 0)
      .sort((a, b) => b.taskCount - a.taskCount);
  }, [useDemo, officerList, filteredTasks]);

  // Filtered officer list for calendar
  const calendarOfficers = useMemo(() => {
    if (filterOfficer !== "all") return officerList.filter(o => o.id === filterOfficer);
    const activeIds = new Set(filteredTasks.map(t => t.owner_id).filter(Boolean));
    return officerList.filter(o => activeIds.has(o.id));
  }, [officerList, filteredTasks, filterOfficer]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Workload Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Team capacity, task calendar & Gantt planning</p>
        </div>
      </div>

      <WorkloadFilters
        orgs={orgs}
        officers={officerList}
        selectedOrg={filterOrg}
        selectedOfficer={filterOfficer}
        selectedStatus={filterStatus}
        selectedPriority={filterPriority}
        onOrgChange={setFilterOrg}
        onOfficerChange={setFilterOfficer}
        onStatusChange={setFilterStatus}
        onPriorityChange={setFilterPriority}
      />

      {/* Capacity Panel */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-accent" />
          <h2 className="fvc-heading-3 text-foreground">Officer Capacity</h2>
        </div>
        <OfficerCapacityPanel officers={capacityData} />
      </section>

      {/* Calendar / Gantt tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar size={14} /> Calendar
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-1.5">
              <GanttChart size={14} /> Gantt
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        <TabsContent value="calendar" className="fvc-card overflow-hidden p-0">
          <CalendarSwimlane tasks={calendarTasks} officers={calendarOfficers} weekOffset={weekOffset} />
        </TabsContent>

        <TabsContent value="gantt" className="fvc-card overflow-hidden p-0">
          <GanttView items={ganttItems} weekOffset={weekOffset} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
