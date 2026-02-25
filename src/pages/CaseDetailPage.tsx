import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, CheckCircle2, Clock, FileText, Play, Send,
  AlertTriangle, Sparkles, Calendar, DollarSign, UserCheck,
  ShieldCheck, Package, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AssuranceNoteReport from "@/components/AssuranceNoteReport";
import CaseActivityTimeline from "@/components/CaseActivityTimeline";
import DataProtectionSummary from "@/components/case-detail/DataProtectionSummary";
import QuotePanel from "@/components/case-detail/QuotePanel";
import {
  CASE_STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_AUDIT_MAP,
  type CaseStatus,
} from "@/lib/case-statuses";

const STATUS_ICONS: Record<CaseStatus, React.ElementType> = {
  scheduled: Calendar,
  quoted: DollarSign,
  submitted: Send,
  approved: CheckCircle2,
  assigned: UserCheck,
  in_progress: Play,
  awaiting_client: Clock,
  qc: ShieldCheck,
  delivered: FileText,
  closed: Package,
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, hasRole, isInternal } = useAuth();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [entity, setEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [caseModules, setCaseModules] = useState<any[]>([]);
  const [simulatingModule, setSimulatingModule] = useState<string | null>(null);
  const [dpReview, setDpReview] = useState<any>(null);

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  const loadCase = async () => {
    const [caseRes, msgsRes, delsRes, auditRes, modulesRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id!).single(),
      supabase.from("case_messages").select("*").eq("case_id", id!).order("created_at"),
      supabase.from("deliverables").select("*").eq("case_id", id!).order("created_at", { ascending: false }),
      supabase.from("audit_events").select("*").eq("object_id", id!).eq("object_type", "case").order("created_at"),
      supabase.from("case_modules").select("*").eq("case_id", id!),
    ]);
    setCaseData(caseRes.data);
    setMessages(msgsRes.data ?? []);
    setDeliverables(delsRes.data ?? []);
    setAuditEvents(auditRes.data ?? []);

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
        .from("data_protection_reviews" as any)
        .select("*")
        .eq("case_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setDpReview(dpData);
    } else {
      setDpReview(null);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await supabase.from("case_messages").insert({
      case_id: id!,
      sender_user_id: user.id,
      message: newMessage,
    });
    setNewMessage("");
    loadCase();
  };

  const transitionTo = async (status: string, extraPayload?: Record<string, any>, comment?: string) => {
    if (!user || !profile) return;

    const updatePayload: Record<string, any> = { status, ...extraPayload };
    await supabase.from("cases").update(updatePayload).eq("id", id!);

    const actionType = STATUS_AUDIT_MAP[status] || `CASE_${status.toUpperCase()}`;
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: actionType,
      object_type: "case",
      object_id: id,
      metadata: {
        entity_name: entity?.name,
        product_type: caseData?.product_type,
        comment: comment || null,
        from_status: caseData?.status,
        to_status: status,
      },
    });

    const label = STATUS_LABELS[status as CaseStatus] || status;
    toast({ title: `Status → ${label}`, description: `Case transitioned to ${label}.` });
    loadCase();
  };

  const simulateDelivery = async () => {
    if (!user || !caseData) return;
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 1500));

    await supabase.from("deliverables").insert({
      case_id: id!,
      title: `Assurance Note — ${entity?.name ?? "Entity"}`,
      deliverable_type: "report",
      version: 1,
    });

    for (const cm of caseModules.filter((m) => m.status === "in_progress" || m.status === "approved")) {
      await simulateModuleDelivery(cm, true);
    }

    await transitionTo("delivered", { due_date: new Date().toISOString().split("T")[0] });
    setSimulating(false);
  };

  const simulateModuleDelivery = async (cm: any, skipReload?: boolean) => {
    if (!user || !profile) return;
    setSimulatingModule(cm.id);
    if (!skipReload) await new Promise((r) => setTimeout(r, 1000));

    const { data: del } = await supabase.from("deliverables").insert({
      case_id: id!,
      title: `${cm.module_type?.name ?? "Addendum"} — ${entity?.name ?? "Entity"}`,
      deliverable_type: "addendum",
      version: 1,
    }).select("id").single();

    await supabase.from("module_outputs").insert({
      case_module_id: cm.id,
      deliverable_id: del?.id ?? null,
      executive_summary: "Analysis complete.",
      confidence_level: "med",
      limitations: "Based on publicly available data.",
    });

    await supabase.from("case_modules").update({ status: "complete" }).eq("id", cm.id);

    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile.org_id,
      action_type: "MODULE_COMPLETED",
      object_type: "case_module",
      object_id: cm.id,
      metadata: { case_id: id, module_code: cm.module_type?.code },
    });

    setSimulatingModule(null);
    if (!skipReload) {
      toast({ title: "Module delivered", description: `${cm.module_type?.name} addendum is now available.` });
      loadCase();
    }
  };

  if (!caseData) {
    return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;
  }

  const currentStatus = caseData.status as CaseStatus;
  const currentIdx = CASE_STATUSES.indexOf(currentStatus);
  const isHighRisk = entity?.risk_tier === "A";

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="fvc-heading-1 text-foreground">{caseData.product_type}</h1>
          <p className="text-sm text-muted-foreground mt-1">{entity?.name ?? "Entity"} · {caseData.priority} priority</p>
        </div>
        <Badge className={`fvc-status-badge text-sm px-3 py-1 capitalize ${STATUS_COLORS[currentStatus] || "bg-muted text-muted-foreground"}`}>
          {STATUS_LABELS[currentStatus] || caseData.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Approval banner for quoted cases */}
      {currentStatus === "quoted" && hasRole("client_admin") && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-accent/30 bg-accent/5 mb-6 animate-fade-in">
          <DollarSign size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-sm font-medium text-foreground">Quote awaiting your approval</div>
            <div className="text-xs text-muted-foreground">
              Review the quote below and approve or reject to proceed.
            </div>
          </div>
        </div>
      )}

      {currentStatus === "submitted" && isHighRisk && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 mb-6 animate-fade-in">
          <AlertTriangle size={18} className="text-warning shrink-0" />
          <div>
            <div className="text-sm font-medium text-foreground">Approval required</div>
            <div className="text-xs text-muted-foreground">
              Tier A entity — requires admin approval before work begins.
            </div>
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
        {CASE_STATUSES.map((s, i) => {
          const Icon = STATUS_ICONS[s];
          const isPast = i <= currentIdx;
          const isCurrent = s === currentStatus;
          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                    : isPast
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Icon size={14} />
                </div>
                <span className={`text-[10px] whitespace-nowrap font-medium ${
                  isCurrent ? "text-foreground" : isPast ? "text-accent" : "text-muted-foreground"
                }`}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < CASE_STATUSES.length - 1 && (
                <div className={`w-8 h-px mx-0.5 mt-[-18px] transition-colors ${isPast && !isCurrent ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <DataProtectionSummary caseData={caseData} isInternal={isInternal} dpReview={dpReview} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <div className="fvc-card">
            <h2 className="fvc-heading-3 text-foreground mb-4">Case Details</h2>
            <div className="fvc-gold-rule mb-4" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="text-foreground font-mono text-xs">{caseData.id.slice(0, 8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span className="text-foreground">{caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : "Not set"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SLA</span><span className="text-foreground">{caseData.sla_days ? `${caseData.sla_days} business days` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Risk tier</span><span className="text-foreground font-medium">{entity?.risk_tier ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee estimate</span><span className="text-accent font-semibold font-display text-lg">£{caseData.price_estimate?.toLocaleString() ?? "—"}</span></div>
              {caseData.scope_notes && (
                <div className="pt-3 border-t border-border">
                  <span className="fvc-label block mb-2">Scope notes</span>
                  <p className="text-foreground leading-relaxed">{caseData.scope_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quote Panel */}
          {(currentStatus === "quoted" || currentStatus === "approved") && (
            <QuotePanel caseId={id!} caseStatus={currentStatus} onStatusChange={loadCase} />
          )}

          {/* EDD+ Modules */}
          {caseModules.length > 0 && (
            <div className="fvc-card">
              <h2 className="fvc-heading-3 text-foreground mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-accent" /> EDD+ Enhancements
              </h2>
              <div className="fvc-gold-rule mb-4" />
              <div className="space-y-3">
                {caseModules.map((cm) => (
                  <div key={cm.id} className="border rounded-lg p-4 border-accent/20 bg-accent/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-foreground">{cm.module_type?.name ?? "Module"}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={`fvc-status-badge capitalize text-[10px] ${
                          cm.status === "complete" ? "bg-success/10 text-success" :
                          cm.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                          cm.status === "in_progress" ? "bg-primary/10 text-primary" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {cm.status.replace(/_/g, " ")}
                        </Badge>
                        {isInternal && cm.status !== "complete" && cm.status !== "cancelled" && (
                          <Button size="sm" variant="outline" className="h-6 px-2.5 text-[10px]"
                            onClick={() => navigate(`/cases/${id}/modules/${cm.id}`)}>
                            Open Workbench
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{cm.module_type?.description?.slice(0, 80)}…</span>
                      {cm.price_estimate && <span className="text-accent font-medium">£{cm.price_estimate.toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="fvc-card">
            <h2 className="fvc-heading-3 text-foreground mb-4">Messages</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {messages.map((m) => {
                  const isMe = m.sender_user_id === user?.id;
                  return (
                    <div key={m.id} className={`border rounded-lg p-3 ${isMe ? "border-accent/20 bg-accent/5" : ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{isMe ? "You" : "Analyst"}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-foreground">{m.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message…" rows={2} className="flex-1" />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm" className="self-end">
                <Send size={14} className="mr-1" /> Send
              </Button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="fvc-card">
            <h2 className="fvc-heading-3 text-foreground mb-4">Activity Timeline</h2>
            <div className="fvc-gold-rule mb-4" />
            <CaseActivityTimeline caseData={caseData} messages={messages} deliverables={deliverables} auditEvents={auditEvents} currentUserId={user?.id} />
          </div>

          {showReport && deliverables.length > 0 && (
            <div className="fvc-card-elevated">
              <AssuranceNoteReport entityName={entity?.name ?? "Entity"} caseDate={caseData.created_at} riskTier={entity?.risk_tier}
                dpSummary={caseData?.requires_personal_data ? { purpose: caseData.processing_purpose, lawfulBasis: caseData.lawful_basis, minimisationConfirmed: caseData.minimisation_confirmed } : undefined} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval gate — for submitted (legacy) or quoted status */}
          {(hasRole("client_admin") || isInternal) && caseData.status === "submitted" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Approval</h3>
              {isHighRisk && (
                <p className="text-xs text-warning mb-3 flex items-center gap-1">
                  <AlertTriangle size={11} /> High-risk entity
                </p>
              )}
              <div className="space-y-2">
                <Button className="w-full" onClick={() => transitionTo("approved", { approved_by: user?.id })}>
                  <CheckCircle2 size={14} className="mr-1" /> Approve
                </Button>
                <Button variant="outline" className="w-full" onClick={() => transitionTo("cancelled")}>Reject</Button>
              </div>
            </div>
          )}

          {/* Analyst: Assign */}
          {isInternal && currentStatus === "approved" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Assign</h3>
              <Button className="w-full" onClick={() => transitionTo("assigned", { assigned_to: user?.id })}>
                <UserCheck size={14} className="mr-1" /> Assign to Me
              </Button>
            </div>
          )}

          {/* Analyst: Begin Work */}
          {isInternal && currentStatus === "assigned" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Actions</h3>
              <Button className="w-full" onClick={() => transitionTo("in_progress")}>
                <Play size={14} className="mr-1" /> Begin Work
              </Button>
            </div>
          )}

          {/* Analyst: In Progress actions */}
          {isInternal && currentStatus === "in_progress" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => transitionTo("qc")}>
                  <ShieldCheck size={14} className="mr-1" /> Submit to QC
                </Button>
                <Button variant="outline" className="w-full" onClick={() => transitionTo("awaiting_client")}>
                  <Clock size={14} className="mr-1" /> Await Client Input
                </Button>
                <Button variant="outline" className="w-full" onClick={simulateDelivery} disabled={simulating}>
                  <FileText size={14} className="mr-1" /> {simulating ? "Generating…" : "Simulate Delivery"}
                </Button>
                {caseModules.filter((cm) => cm.status !== "complete" && cm.status !== "cancelled").map((cm) => (
                  <Button key={cm.id} variant="outline" className="w-full text-xs" onClick={() => simulateModuleDelivery(cm)} disabled={simulatingModule === cm.id}>
                    <Sparkles size={12} className="mr-1 text-accent" />
                    {simulatingModule === cm.id ? "Delivering…" : `Deliver ${cm.module_type?.name ?? "Module"}`}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Analyst: QC actions */}
          {isInternal && currentStatus === "qc" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">QC Review</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={simulateDelivery} disabled={simulating}>
                  <FileText size={14} className="mr-1" /> {simulating ? "Delivering…" : "Approve & Deliver"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => transitionTo("in_progress")}>
                  <X size={14} className="mr-1" /> Return to Analyst
                </Button>
              </div>
            </div>
          )}

          {/* Analyst: Awaiting client → resume */}
          {isInternal && currentStatus === "awaiting_client" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Actions</h3>
              <Button className="w-full" onClick={() => transitionTo("in_progress")}>
                <Play size={14} className="mr-1" /> Resume Work
              </Button>
            </div>
          )}

          {/* Delivered → Close */}
          {(hasRole("client_admin") || isInternal) && currentStatus === "delivered" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Close Case</h3>
              <Button className="w-full" onClick={() => transitionTo("closed")}>
                <Package size={14} className="mr-1" /> Close Case
              </Button>
            </div>
          )}

          {/* Deliverables */}
          <div className="fvc-card">
            <h3 className="fvc-heading-3 text-foreground mb-3">Deliverables</h3>
            {deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliverables yet.</p>
            ) : (
              <div className="space-y-2">
                {deliverables.map((d) => (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
