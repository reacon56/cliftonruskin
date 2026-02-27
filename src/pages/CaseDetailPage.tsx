import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, CheckCircle2, Clock, FileText, Play, Send,
  AlertTriangle, Sparkles, Calendar, DollarSign, UserCheck,
  ShieldCheck, Package, X, Save, Globe, Briefcase,
  ListTodo, FlaskConical, Users, Lock, BarChart3, Eye,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AssuranceNoteReport from "@/components/AssuranceNoteReport";
import ReportBuilderEngine from "@/components/case-detail/ReportBuilderEngine";
import AiAssurancePanel from "@/components/case-detail/AiAssurancePanel";
import AgenticReviewPanel from "@/components/case-detail/AgenticReviewPanel";
import CaseActivityTimeline from "@/components/CaseActivityTimeline";
import DataProtectionSummary from "@/components/case-detail/DataProtectionSummary";
import CaseProcessingRecord from "@/components/case-detail/CaseProcessingRecord";
import QuotePanel from "@/components/case-detail/QuotePanel";
import CaseTaskBoard from "@/components/case-detail/CaseTaskBoard";
import EvidenceLocker from "@/components/case-detail/EvidenceLocker";
import CaseRetrievalLogs from "@/components/case-detail/CaseRetrievalLogs";
import CaseChatPanel from "@/components/case-detail/CaseChatPanel";
import {
  CASE_STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_AUDIT_MAP,
  CASE_TYPE_LABELS, REPORT_TIER_LABELS,
  type CaseStatus,
} from "@/lib/case-statuses";

const STATUS_ICONS: Record<CaseStatus, React.ElementType> = {
  new: Briefcase, scheduled: Calendar, quoted: DollarSign, approved: CheckCircle2,
  assigned: UserCheck, in_progress: Play, with_partner: Globe,
  qc: ShieldCheck, released: FileText, archived: Package,
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, hasRole, isInternal, canQuote, canAssign, canWork, canQc, canClose, canAdjustDates, primaryRoleLabel } = useAuth();
  const { toast } = useToast();
  const isManager = canQuote;
  const isOfficer = canWork && !isManager;

  const [caseData, setCaseData] = useState<any>(null);
  
  const [deliverables, setDeliverables] = useState<any[]>([]);
  
  const [entity, setEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [caseModules, setCaseModules] = useState<any[]>([]);
  const [simulatingModule, setSimulatingModule] = useState<string | null>(null);
  const [dpReview, setDpReview] = useState<any>(null);
  const [allowPreApprovalStart, setAllowPreApprovalStart] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [activeTab, setActiveTab] = useState("scope");

  useEffect(() => { if (id) loadCase(); }, [id]);

  const loadCase = async () => {
    const [caseRes, delsRes, auditRes, modulesRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id!).single(),
      supabase.from("deliverables").select("*").eq("case_id", id!).order("created_at", { ascending: false }),
      supabase.from("audit_events").select("*").eq("object_id", id!).eq("object_type", "case").order("created_at"),
      supabase.from("case_modules").select("*").eq("case_id", id!),
    ]);
    setCaseData(caseRes.data);
    setDeliverables(delsRes.data ?? []);
    setDeliverables(delsRes.data ?? []);
    setAuditEvents(auditRes.data ?? []);
    setInternalNotes((caseRes.data as any)?.internal_notes ?? "");

    const rawModules = modulesRes.data ?? [];
    if (rawModules.length > 0) {
      const mtIds = [...new Set(rawModules.map((m: any) => m.module_type_id))];
      const { data: mtData } = await supabase.from("module_types").select("*").in("id", mtIds);
      const mtMap = Object.fromEntries((mtData ?? []).map((m) => [m.id, m]));
      setCaseModules(rawModules.map((m: any) => ({ ...m, module_type: mtMap[m.module_type_id] })));
    } else {
      setCaseModules([]);
    }

    if (caseRes.data?.entity_id) {
      const { data } = await supabase.from("entities").select("name, risk_tier").eq("id", caseRes.data.entity_id).single();
      setEntity(data);
    }

    if (caseRes.data?.dp_review_required) {
      const { data: dpData } = await supabase
        .from("data_protection_reviews" as any).select("*").eq("case_id", id!)
        .order("created_at", { ascending: false }).limit(1).single();
      setDpReview(dpData);
    } else { setDpReview(null); }

    if (caseRes.data?.org_id) {
      const { data: orgData } = await supabase.from("organisations").select("allow_pre_approval_start").eq("id", caseRes.data.org_id).single();
      setAllowPreApprovalStart((orgData as any)?.allow_pre_approval_start ?? false);
    }
  };


  const transitionTo = async (status: string, extraPayload?: Record<string, any>, comment?: string) => {
    if (!user || !profile) return;
    await supabase.from("cases").update({ status, ...extraPayload }).eq("id", id!);
    const actionType = STATUS_AUDIT_MAP[status] || `CASE_${status.toUpperCase()}`;
    await supabase.from("audit_events").insert({
      user_id: user.id, org_id: profile.org_id, action_type: actionType,
      object_type: "case", object_id: id,
      metadata: { entity_name: entity?.name, product_type: caseData?.product_type, comment: comment || null, from_status: caseData?.status, to_status: status },
    });
    toast({ title: `Status → ${STATUS_LABELS[status as CaseStatus] || status}` });
    loadCase();
  };

  const saveInternalNotes = async () => {
    await supabase.from("cases").update({ internal_notes: internalNotes } as any).eq("id", id!);
    toast({ title: "Internal notes saved" });
    setEditingNotes(false);
    loadCase();
  };

  const simulateDelivery = async () => {
    if (!user || !caseData) return;
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 1500));
    await supabase.from("deliverables").insert({ case_id: id!, title: `Assurance Note — ${entity?.name ?? "Entity"}`, deliverable_type: "report", version: 1 });
    for (const cm of caseModules.filter((m) => m.status === "in_progress" || m.status === "approved")) {
      await simulateModuleDelivery(cm, true);
    }
    await transitionTo("released", { due_date: new Date().toISOString().split("T")[0] });
    setSimulating(false);
  };

  const simulateModuleDelivery = async (cm: any, skipReload?: boolean) => {
    if (!user || !profile) return;
    setSimulatingModule(cm.id);
    if (!skipReload) await new Promise((r) => setTimeout(r, 1000));
    const { data: del } = await supabase.from("deliverables").insert({ case_id: id!, title: `${cm.module_type?.name ?? "Addendum"} — ${entity?.name ?? "Entity"}`, deliverable_type: "addendum", version: 1 }).select("id").single();
    await supabase.from("module_outputs").insert({ case_module_id: cm.id, deliverable_id: del?.id ?? null, executive_summary: "Analysis complete.", confidence_level: "med", limitations: "Based on publicly available data." });
    await supabase.from("case_modules").update({ status: "complete" }).eq("id", cm.id);
    await supabase.from("audit_events").insert({ user_id: user.id, org_id: profile.org_id, action_type: "MODULE_COMPLETED", object_type: "case_module", object_id: cm.id, metadata: { case_id: id, module_code: cm.module_type?.code } });
    setSimulatingModule(null);
    if (!skipReload) { toast({ title: "Module delivered" }); loadCase(); }
  };

  const scopeChangeBlocking = (caseData as any)?.scope_change_flag && !(caseData as any)?.scope_change_resolved;

  if (!caseData) return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;

  const currentStatus = caseData.status as CaseStatus;
  const currentIdx = CASE_STATUSES.indexOf(currentStatus);
  const isHighRisk = entity?.risk_tier === "A";

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{caseData.product_type}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entity?.name ?? "Entity"} · {caseData.priority} · {CASE_TYPE_LABELS[(caseData as any).case_type] || (caseData as any).case_type} · {REPORT_TIER_LABELS[(caseData as any).report_tier] || (caseData as any).report_tier}
          </p>
        </div>
        <Badge className={`text-sm px-3 py-1 capitalize ${STATUS_COLORS[currentStatus] || "bg-muted text-muted-foreground"}`}>
          {STATUS_LABELS[currentStatus] || caseData.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* ── Status Pipeline ── */}
      <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
        {CASE_STATUSES.map((s, i) => {
          const Icon = STATUS_ICONS[s];
          const isPast = i <= currentIdx;
          const isCurrent = s === currentStatus;
          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background" : isPast ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon size={12} />
                </div>
                <span className={`text-[9px] whitespace-nowrap font-medium ${isCurrent ? "text-foreground" : isPast ? "text-accent" : "text-muted-foreground"}`}>{STATUS_LABELS[s]}</span>
              </div>
              {i < CASE_STATUSES.length - 1 && <div className={`w-6 h-px mx-0.5 mt-[-14px] ${isPast && !isCurrent ? "bg-accent" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── Tabbed Investigation Workflow ── */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="scope" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><FileText className="h-3.5 w-3.5" /> Scope</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><ListTodo className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
            <TabsTrigger value="research" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><FlaskConical className="h-3.5 w-3.5" /> Research</TabsTrigger>
            {isInternal && <TabsTrigger value="partners" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Globe className="h-3.5 w-3.5" /> Partners</TabsTrigger>}
            <TabsTrigger value="messages" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Send className="h-3.5 w-3.5" /> Messages</TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Lock className="h-3.5 w-3.5" /> Evidence</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><BarChart3 className="h-3.5 w-3.5" /> Risk</TabsTrigger>
            <TabsTrigger value="qa" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Eye className="h-3.5 w-3.5" /> QA</TabsTrigger>
          </TabsList>

          {/* ── SCOPE & MANDATE ── */}
          <TabsContent value="scope" className="space-y-4">
            <DataProtectionSummary caseData={caseData} isInternal={isInternal} dpReview={dpReview} />
            <CaseProcessingRecord caseData={caseData} isInternal={isInternal} isManager={isManager} onRefresh={loadCase} />

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-display text-sm font-semibold text-foreground">Case Details</h3>
              <div className="space-y-2 text-sm">
                <Row label="Reference" value={caseData.id.slice(0, 8).toUpperCase()} mono />
                <Row label="Case Type" value={CASE_TYPE_LABELS[(caseData as any).case_type] || (caseData as any).case_type} />
                <Row label="Report Tier" value={REPORT_TIER_LABELS[(caseData as any).report_tier] || (caseData as any).report_tier} />
                <Row label="Due Date" value={caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : "Not set"} />
                <Row label="SLA" value={caseData.sla_days ? `${caseData.sla_days} business days` : "—"} />
                <Row label="Risk Tier" value={entity?.risk_tier ?? "—"} bold />
                <Row label="Fee Estimate" value={`£${caseData.price_estimate?.toLocaleString() ?? "—"}`} accent />
              </div>
              {caseData.scope_notes && (
                <div className="pt-3 border-t border-border">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scope Notes</span>
                  <p className="text-sm text-foreground mt-1 leading-relaxed">{caseData.scope_notes}</p>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            {isInternal && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-sm font-semibold text-foreground">Internal Notes</h3>
                  {!editingNotes ? (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditingNotes(true)}>Edit</Button>
                  ) : (
                    <Button size="sm" className="text-xs h-7 gap-1" onClick={saveInternalNotes}><Save className="h-3 w-3" /> Save</Button>
                  )}
                </div>
                {editingNotes ? (
                  <Textarea rows={4} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Internal-only notes…" />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{(caseData as any).internal_notes || <span className="text-muted-foreground italic">No internal notes.</span>}</p>
                )}
              </div>
            )}

            {/* Quote Panel */}
            {(currentStatus === "scheduled" || currentStatus === "quoted" || currentStatus === "approved") && (
              <QuotePanel caseId={id!} caseStatus={currentStatus} onStatusChange={loadCase} entityName={entity?.name} />
            )}

            {/* EDD+ Modules */}
            {caseModules.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Sparkles size={14} className="text-accent" /> EDD+ Enhancements</h3>
                <div className="space-y-2">
                  {caseModules.map((cm) => (
                    <div key={cm.id} className="border rounded-lg p-3 border-accent/20 bg-accent/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-foreground">{cm.module_type?.name ?? "Module"}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={`capitalize text-[10px] ${cm.status === "complete" ? "bg-accent/10 text-accent-foreground" : cm.status === "in_progress" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{cm.status.replace(/_/g, " ")}</Badge>
                          {isInternal && cm.status !== "complete" && cm.status !== "cancelled" && (
                            <Button size="sm" variant="outline" className="h-6 px-2.5 text-[10px]" onClick={() => navigate(`/cases/${id}/modules/${cm.id}`)}>Workbench</Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{cm.module_type?.description?.slice(0, 80)}…</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── TASK BOARD ── */}
          <TabsContent value="tasks">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><ListTodo className="h-4 w-4" /> Investigation Tasks</h3>
              <CaseTaskBoard caseId={id!} isManager={isManager} />
            </div>
          </TabsContent>

          {/* ── RESEARCH CONSOLE LINK ── */}
          <TabsContent value="research" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Research Checks</h3>
                {isInternal && (
                  <Button size="sm" variant="outline" onClick={() => navigate("/research-console")}>
                    <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Open Console
                  </Button>
                )}
              </div>
              <CaseRetrievalLogs caseId={id!} />
            </div>
          </TabsContent>

          {/* ── PARTNER ENGAGEMENT ── */}
          {isInternal && (
            <TabsContent value="partners">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Globe className="h-4 w-4" /> Partner Engagement</h3>
                {currentStatus === "with_partner" ? (
                  <div className="space-y-3">
                    <Badge variant="default" className="text-xs">Case currently with Partner</Badge>
                    <p className="text-sm text-muted-foreground">Partner tasks and evidence submissions are tracked in the Partner portal.</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/partner-requests")}>View Partner Requests</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active partner engagement. Use the Actions panel to send this case to a partner.</p>
                )}
              </div>
            </TabsContent>
          )}

          {/* ── MESSAGES ── */}
          <TabsContent value="messages">
            <CaseChatPanel caseId={id!} orgId={caseData.org_id} />
          </TabsContent>

          {/* ── EVIDENCE LOCKER ── */}
          <TabsContent value="evidence">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Lock className="h-4 w-4" /> Evidence Locker</h3>
              {isInternal ? <EvidenceLocker caseId={id!} isManager={isManager} /> : <p className="text-sm text-muted-foreground">Evidence files are managed by the assurance team.</p>}
            </div>
          </TabsContent>

          {/* ── RISK ASSESSMENT ── */}
          <TabsContent value="risk" className="space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Risk Assessment</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Entity Risk Tier</span>
                  <div className="text-lg font-display font-bold text-foreground mt-1">Tier {entity?.risk_tier || "—"}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">DP Risk Level</span>
                  <div className="text-lg font-display font-bold text-foreground mt-1 capitalize">{caseData.dp_risk_level || "Low"}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</span>
                  <div className="text-lg font-display font-bold text-foreground mt-1 capitalize">{caseData.priority}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scope Change</span>
                  <div className="text-lg font-display font-bold mt-1">{scopeChangeBlocking ? <span className="text-destructive">Flagged</span> : <span className="text-foreground">Clear</span>}</div>
                </div>
              </div>
            </div>

            {/* AI Assurance Assistant – internal only */}
            {isInternal && <AiAssurancePanel caseId={id!} />}
          </TabsContent>

          {/* ── QA & RELEASE ── */}
          <TabsContent value="qa" className="space-y-4">
            {/* Report Builder Engine */}
            {isInternal && (
              <ReportBuilderEngine caseId={id!} caseData={caseData} entity={entity} isManager={isManager} />
            )}

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2"><Eye className="h-4 w-4" /> Deliverables</h3>
              {currentStatus === "qc" && (
                <Badge variant="default" className="text-xs">Currently in QC Review</Badge>
              )}
              <div className="space-y-2">
                {deliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deliverables yet.</p>
                ) : deliverables.map((d) => (
                  <div key={d.id} className="border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setShowReport(!showReport)}>
                    <div className="flex items-center gap-2">
                      {d.deliverable_type === "addendum" ? <Sparkles size={14} className="text-accent shrink-0" /> : <FileText size={14} className="text-accent shrink-0" />}
                      <div>
                        <div className="text-sm font-medium text-foreground">{d.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{d.deliverable_type.replace(/_/g, " ")} · v{d.version}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3">Activity Timeline</h3>
              <CaseActivityTimeline caseData={caseData} messages={[]} deliverables={deliverables} auditEvents={auditEvents} currentUserId={user?.id} />
            </div>

            {showReport && deliverables.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <AssuranceNoteReport entityName={entity?.name ?? "Entity"} caseDate={caseData.created_at} riskTier={entity?.risk_tier}
                  dpSummary={caseData?.requires_personal_data ? { purpose: caseData.processing_purpose, lawfulBasis: caseData.lawful_basis, minimisationConfirmed: caseData.minimisation_confirmed } : undefined} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Right Sidebar: Actions ── */}
        <div className="space-y-4">
          {/* Status Banners */}
          {currentStatus === "scheduled" && canQuote && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs">
              <DollarSign size={14} className="text-primary shrink-0" />
              <span>Quote required</span>
            </div>
          )}

          {/* Manager: Assign */}
          {canAssign && (currentStatus === "approved" || (allowPreApprovalStart && (currentStatus === "quoted" || currentStatus === "scheduled"))) && (
            <ActionCard title="Assign">
              <Button className="w-full" size="sm" onClick={() => transitionTo("assigned", { assigned_to: user?.id })}>
                <UserCheck size={14} className="mr-1" /> Assign to Me
              </Button>
            </ActionCard>
          )}

          {isManager && caseData.assigned_to && !["archived", "released"].includes(currentStatus) && (
            <ActionCard title="Reassign">
              <Button variant="outline" className="w-full" size="sm" onClick={() => transitionTo(currentStatus, { assigned_to: user?.id })}>
                <UserCheck size={14} className="mr-1" /> Reassign to Me
              </Button>
            </ActionCard>
          )}

          {canWork && currentStatus === "assigned" && (
            <ActionCard title="Actions">
              <Button className="w-full" size="sm" onClick={() => transitionTo("in_progress")}><Play size={14} className="mr-1" /> Begin Work</Button>
            </ActionCard>
          )}

          {canWork && currentStatus === "in_progress" && (
            <ActionCard title="Actions">
              <div className="space-y-1.5">
                <Button className="w-full" size="sm" onClick={() => transitionTo("qc")}><ShieldCheck size={14} className="mr-1" /> Submit to QC</Button>
                <Button variant="outline" className="w-full" size="sm" onClick={() => transitionTo("with_partner")}><Globe size={14} className="mr-1" /> Send to Partner</Button>
                {caseModules.filter((cm) => cm.status !== "complete" && cm.status !== "cancelled").map((cm) => (
                  <Button key={cm.id} variant="outline" className="w-full text-xs" size="sm" onClick={() => simulateModuleDelivery(cm)} disabled={simulatingModule === cm.id}>
                    <Sparkles size={12} className="mr-1 text-accent" /> {simulatingModule === cm.id ? "Delivering…" : `Deliver ${cm.module_type?.name}`}
                  </Button>
                ))}
              </div>
            </ActionCard>
          )}

          {canWork && currentStatus === "with_partner" && (
            <ActionCard title="Actions">
              <Button className="w-full" size="sm" onClick={() => transitionTo("in_progress")}><Play size={14} className="mr-1" /> Resume Work</Button>
            </ActionCard>
          )}

          {canQc && currentStatus === "qc" && (
            <ActionCard title="QC Review">
              <div className="space-y-1.5">
                {scopeChangeBlocking && (
                  <div className="p-2 rounded border border-destructive/30 bg-destructive/5 text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle size={10} /> Scope change unresolved
                  </div>
                )}
                <Button className="w-full" size="sm" onClick={simulateDelivery} disabled={simulating || scopeChangeBlocking}>
                  <FileText size={14} className="mr-1" /> {simulating ? "Releasing…" : "Approve & Release"}
                </Button>
                <Button variant="outline" className="w-full" size="sm" onClick={() => transitionTo("in_progress")}><X size={14} className="mr-1" /> Return to Officer</Button>
              </div>
            </ActionCard>
          )}

          {isManager && currentStatus === "released" && (
            <ActionCard title="Archive">
              <Button className="w-full" size="sm" onClick={() => transitionTo("archived")}><Package size={14} className="mr-1" /> Archive Case</Button>
            </ActionCard>
          )}

          {hasRole("client_admin") && currentStatus === "released" && (
            <ActionCard title="Acknowledge">
              <Button className="w-full" size="sm" onClick={() => transitionTo("archived")}><CheckCircle2 size={14} className="mr-1" /> Acknowledge & Close</Button>
            </ActionCard>
          )}

          {/* Quick links */}
          <div className="rounded-lg border bg-card p-3 space-y-1.5">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Quick Links</h4>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => navigate(`/entities/${caseData.entity_id}`)}>Entity Profile</Button>
            {isInternal && <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => navigate("/research-console")}>Research Console</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <h4 className="font-display text-xs font-semibold text-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value, mono, bold, accent }: { label: string; value: string; mono?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground ${mono ? "font-mono text-xs" : ""} ${bold ? "font-medium" : ""} ${accent ? "text-accent-foreground font-semibold font-display" : ""}`}>{value}</span>
    </div>
  );
}
