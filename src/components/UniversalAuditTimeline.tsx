import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock, FileText, ShieldCheck, AlertTriangle, CheckCircle2,
  Send, Play, Package, Globe, Database, Sparkles, XCircle,
  UserCheck, DollarSign, Link2, Cpu, Scale, Search, Filter,
  Stamp, Lock, BarChart3, RefreshCw,
} from "lucide-react";

interface Props {
  /** Filter by entity */
  entityId?: string;
  /** Filter by case */
  caseId?: string;
  /** Filter by report draft id */
  reportId?: string;
  /** Max events to show */
  limit?: number;
  /** Compact mode — no search/filter controls */
  compact?: boolean;
}

interface AuditEvent {
  id: string;
  user_id: string | null;
  org_id: string | null;
  action_type: string;
  object_type: string;
  object_id: string | null;
  entity_id: string | null;
  case_id: string | null;
  report_id: string | null;
  event_summary: string | null;
  is_internal: boolean;
  metadata: any;
  created_at: string;
}

/* ── Event type metadata ── */
const EVENT_META: Record<string, { label: string; icon: React.ElementType; color: string; category: string }> = {
  // Case lifecycle
  CASE_SCHEDULED:           { label: "Case scheduled", icon: Clock, color: "text-muted-foreground", category: "case" },
  CASE_QUOTED:              { label: "Quote issued", icon: DollarSign, color: "text-primary", category: "case" },
  CASE_SUBMITTED:           { label: "Case submitted", icon: Send, color: "text-accent", category: "case" },
  CASE_APPROVED:            { label: "Case approved", icon: CheckCircle2, color: "text-success", category: "case" },
  CASE_REJECTED:            { label: "Case rejected", icon: XCircle, color: "text-destructive", category: "case" },
  CASE_ASSIGNED:            { label: "Officer assigned", icon: UserCheck, color: "text-primary", category: "case" },
  CASE_WORK_STARTED:        { label: "Work started", icon: Play, color: "text-primary", category: "case" },
  CASE_QC:                  { label: "Submitted to QC", icon: ShieldCheck, color: "text-accent", category: "case" },
  CASE_DELIVERED:           { label: "Case delivered", icon: FileText, color: "text-success", category: "case" },
  CASE_CLOSED:              { label: "Case closed", icon: Package, color: "text-muted-foreground", category: "case" },
  CASE_COMPLETED:           { label: "Case completed", icon: FileText, color: "text-success", category: "case" },
  CASE_WITH_PARTNER:        { label: "Sent to partner", icon: Globe, color: "text-accent", category: "case" },
  URGENT_AUTHORISED_START:  { label: "Urgent authorised start", icon: AlertTriangle, color: "text-destructive", category: "case" },

  // Entity
  entity_updated:           { label: "Entity updated", icon: Database, color: "text-primary", category: "entity" },
  risk_tier_changed:        { label: "Risk tier changed", icon: BarChart3, color: "text-warning", category: "entity" },
  ENTITY_JURISDICTION_LINK_ADDED:   { label: "Jurisdiction link added", icon: Link2, color: "text-accent", category: "entity" },
  ENTITY_JURISDICTION_LINK_EDITED:  { label: "Jurisdiction link edited", icon: Link2, color: "text-primary", category: "entity" },

  // Report
  REPORT_DATA_LOCKED:            { label: "Structured data locked", icon: Lock, color: "text-success", category: "report" },
  REPORT_COMMENTARY_COMPLETED:   { label: "Commentary completed", icon: FileText, color: "text-success", category: "report" },
  REPORT_AI_DRAFT_GENERATED:     { label: "AI draft generated", icon: Sparkles, color: "text-accent", category: "report" },
  REPORT_AI_DRAFT_REVIEWED:      { label: "AI draft reviewed", icon: CheckCircle2, color: "text-success", category: "report" },
  REPORT_AI_DRAFT_DISMISSED:     { label: "AI draft dismissed", icon: XCircle, color: "text-muted-foreground", category: "report" },
  REPORT_AI_SECTION_ACCEPTED:    { label: "AI section accepted", icon: CheckCircle2, color: "text-success", category: "report" },
  REPORT_AI_SECTION_EDITED:      { label: "AI section edited", icon: Sparkles, color: "text-primary", category: "report" },
  REPORT_QA_APPROVED:            { label: "QA approved", icon: ShieldCheck, color: "text-success", category: "report" },
  REPORT_QA_REJECTED:            { label: "QA returned", icon: AlertTriangle, color: "text-destructive", category: "report" },
  REPORT_REVIEW_REQUESTED:       { label: "Review requested", icon: Send, color: "text-warning", category: "report" },
  REPORT_ASSURANCE_APPROVED:     { label: "Assurance approved", icon: CheckCircle2, color: "text-success", category: "report" },
  REPORT_ASSURANCE_REJECTED:     { label: "Assurance rejected", icon: XCircle, color: "text-destructive", category: "report" },
  REPORT_ISSUED:                 { label: "Report issued", icon: Stamp, color: "text-primary", category: "report" },

  // Ingestion (admin only)
  INGESTION_COMPLETED:    { label: "Ingestion completed", icon: Database, color: "text-success", category: "ingestion" },
  INGESTION_FAILED:       { label: "Ingestion failed", icon: AlertTriangle, color: "text-destructive", category: "ingestion" },

  // Risk engine
  RISK_ENGINE_RUN:        { label: "Risk engine executed", icon: Cpu, color: "text-accent", category: "risk" },

  // Policy
  POLICY_OUTCOME_COMPUTED:  { label: "Policy outcome computed", icon: Scale, color: "text-primary", category: "policy" },

  // Module
  MODULE_COMPLETED:       { label: "Module delivered", icon: Package, color: "text-success", category: "case" },
};

const CATEGORY_LABELS: Record<string, string> = {
  case: "Case",
  entity: "Entity",
  report: "Report",
  ingestion: "Ingestion",
  risk: "Risk",
  policy: "Policy",
};

const CATEGORY_COLORS: Record<string, string> = {
  case: "border-primary/30 text-primary",
  entity: "border-accent/30 text-accent",
  report: "border-success/30 text-success",
  ingestion: "border-warning/30 text-warning",
  risk: "border-destructive/30 text-destructive",
  policy: "border-muted text-muted-foreground",
};

export default function UniversalAuditTimeline({ entityId, caseId, reportId, limit = 100, compact = false }: Props) {
  const { isInternal } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [entityId, caseId, reportId]);

  const loadEvents = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply scoping filters — use both new columns AND legacy object_id/object_type
    if (entityId) {
      query = query.or(`entity_id.eq.${entityId},and(object_id.eq.${entityId},object_type.eq.entity)`);
    }
    if (caseId) {
      query = query.or(`case_id.eq.${caseId},and(object_id.eq.${caseId},object_type.eq.case)`);
    }
    if (reportId) {
      query = query.or(`report_id.eq.${reportId},and(object_id.eq.${reportId},object_type.eq.report_draft)`);
    }

    // Clients should not see internal-only events
    if (!isInternal) {
      query = query.eq("is_internal", false);
    }

    const { data } = await query;
    setEvents((data as AuditEvent[]) ?? []);
    setLoading(false);
  };

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (categoryFilter) {
      filtered = filtered.filter((ev) => {
        const meta = EVENT_META[ev.action_type];
        return meta?.category === categoryFilter;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((ev) => {
        const meta = EVENT_META[ev.action_type];
        const label = meta?.label || ev.action_type;
        const summary = ev.event_summary || "";
        return (
          label.toLowerCase().includes(term) ||
          summary.toLowerCase().includes(term) ||
          ev.action_type.toLowerCase().includes(term) ||
          JSON.stringify(ev.metadata ?? {}).toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }, [events, searchTerm, categoryFilter]);

  // Collect used categories for filter chips
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach((ev) => {
      const meta = EVENT_META[ev.action_type];
      if (meta) cats.add(meta.category);
    });
    return Array.from(cats);
  }, [events]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading audit trail…</div>;
  }

  if (events.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No audit events recorded.</div>;
  }

  return (
    <div className="space-y-3">
      {/* Search & Filters */}
      {!compact && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {usedCategories.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={12} className="text-muted-foreground" />
              <Button
                variant={categoryFilter === null ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setCategoryFilter(null)}
              >
                All
              </Button>
              {usedCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2 capitalize"
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-0">
          {filteredEvents.map((ev, idx) => {
            const meta = EVENT_META[ev.action_type] ?? {
              label: ev.action_type.replace(/_/g, " "),
              icon: Clock,
              color: "text-muted-foreground",
              category: "other",
            };
            const Icon = meta.icon;
            const isLast = idx === filteredEvents.length - 1;
            const evMeta = typeof ev.metadata === "object" && ev.metadata ? ev.metadata : {};
            const summary = ev.event_summary || evMeta.comment || evMeta.entity_name
              ? (ev.event_summary || evMeta.comment || (evMeta.entity_name ? `Entity: ${evMeta.entity_name}` : null))
              : null;

            // Build detail pairs from metadata (excluding already-shown fields)
            const detailKeys = Object.keys(evMeta).filter(
              (k) => !["comment", "entity_name", "from_status", "to_status"].includes(k)
            );

            return (
              <div key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                <div className={`relative z-10 flex items-center justify-center w-[31px] h-[31px] rounded-full border-2 shrink-0 ${
                  isLast ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}>
                  <Icon size={13} className={meta.color} />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground capitalize">{meta.label}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-4 font-normal capitalize ${CATEGORY_COLORS[meta.category] || "border-border text-muted-foreground"}`}
                    >
                      {CATEGORY_LABELS[meta.category] || meta.category}
                    </Badge>
                    {ev.is_internal && isInternal && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal border-warning/30 text-warning">
                        Internal
                      </Badge>
                    )}
                  </div>

                  {summary && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{summary}</p>
                  )}

                  {/* Status transition */}
                  {evMeta.from_status && evMeta.to_status && (
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[9px] h-4 capitalize">{String(evMeta.from_status).replace(/_/g, " ")}</Badge>
                      <span>→</span>
                      <Badge variant="outline" className="text-[9px] h-4 capitalize">{String(evMeta.to_status).replace(/_/g, " ")}</Badge>
                    </div>
                  )}

                  {/* Extra metadata */}
                  {!compact && detailKeys.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1 space-x-3">
                      {detailKeys.slice(0, 4).map((k) => (
                        <span key={k}>
                          <span className="capitalize">{k.replace(/_/g, " ")}</span>:{" "}
                          <span className="font-medium">{typeof evMeta[k] === "object" ? JSON.stringify(evMeta[k]) : String(evMeta[k])}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                    {new Date(ev.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}{" "}at{" "}
                    {new Date(ev.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredEvents.length === 0 && events.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No events match your filter.</p>
      )}

      <p className="text-[10px] text-muted-foreground italic px-1">
        Read-only audit trail. All actions are logged automatically with actor, timestamp, and context.
      </p>
    </div>
  );
}
