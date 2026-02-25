import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Clock, FileText, Play, Send, AlertTriangle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AssuranceNoteReport from "@/components/AssuranceNoteReport";
import CaseActivityTimeline from "@/components/CaseActivityTimeline";

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

    // Enrich modules with type info
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

  const updateStatus = async (status: string, comment?: string) => {
    const sla = caseData?.priority === "rush" ? 5 : 10;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.round(sla * 1.4));

    const updatePayload: Record<string, any> = {
      status,
      ...(status === "approved" ? { approved_by: user?.id, sla_days: sla, due_date: dueDate.toISOString().split("T")[0] } : {}),
      ...(status === "in_progress" ? { assigned_to: user?.id } : {}),
    };

    await supabase.from("cases").update(updatePayload).eq("id", id!);

    const actionMap: Record<string, string> = {
      approved: "CASE_APPROVED",
      cancelled: "CASE_REJECTED",
      in_progress: "CASE_WORK_STARTED",
      complete: "CASE_COMPLETED",
    };

    if (actionMap[status] && user && profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: actionMap[status],
        object_type: "case",
        object_id: id,
        metadata: {
          entity_name: entity?.name,
          product_type: caseData?.product_type,
          comment: comment || null,
        },
      });
    }

    const statusMessages: Record<string, { title: string; description: string }> = {
      approved: { title: "Case approved", description: "The commission has been approved and is now awaiting analyst assignment." },
      cancelled: { title: "Case rejected", description: "The commission request has been rejected." },
      in_progress: { title: "Work begun", description: "The case is now in progress. The client will be notified." },
      awaiting_client: { title: "Awaiting client", description: "The case has been paused pending client input." },
      complete: { title: "Case completed", description: "The case has been marked as complete. Deliverables are now available." },
    };

    const msg = statusMessages[status] || { title: "Status updated", description: "" };
    toast({ title: msg.title, description: msg.description });
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

    // Also deliver any in_progress modules
    for (const cm of caseModules.filter((m) => m.status === "in_progress" || m.status === "approved")) {
      await simulateModuleDelivery(cm, true);
    }

    await supabase.from("cases").update({
      status: "complete",
      due_date: new Date().toISOString().split("T")[0],
    }).eq("id", id!);

    toast({
      title: "Report delivered",
      description: "The Assurance Note and any EDD+ addenda have been completed.",
    });

    setSimulating(false);
    loadCase();
  };

  const simulateModuleDelivery = async (cm: any, skipReload?: boolean) => {
    if (!user || !profile) return;
    setSimulatingModule(cm.id);

    if (!skipReload) await new Promise((r) => setTimeout(r, 1000));

    // Create deliverable
    const { data: del } = await supabase.from("deliverables").insert({
      case_id: id!,
      title: `${cm.module_type?.name ?? "Addendum"} — ${entity?.name ?? "Entity"}`,
      deliverable_type: "addendum",
      version: 1,
    }).select("id").single();

    // Create module_output
    await supabase.from("module_outputs").insert({
      case_module_id: cm.id,
      deliverable_id: del?.id ?? null,
      executive_summary: cm.module_type?.code === "COMMERCIAL_POSTURE"
        ? "Commercial posture analysis indicates moderate-risk payment patterns with standard dispute resolution. Trade references are broadly positive with some latency signals."
        : "Jurisdiction benchmarks indicate this entity operates within normal parameters for the sector. Enforcement environment is active with recent regulatory updates.",
      confidence_level: "med",
      limitations: "Based on publicly available data and client-provided references. Further verification may be warranted.",
    });

    // Update module status
    await supabase.from("case_modules").update({ status: "complete" }).eq("id", cm.id);

    // Audit
    await supabase.from("audit_events").insert([
      {
        user_id: user.id,
        org_id: profile.org_id,
        action_type: "MODULE_COMPLETED",
        object_type: "case_module",
        object_id: cm.id,
        metadata: { case_id: id, module_code: cm.module_type?.code, entity_name: entity?.name },
      },
      {
        user_id: user.id,
        org_id: profile.org_id,
        action_type: "MODULE_DELIVERED",
        object_type: "case_module",
        object_id: cm.id,
        metadata: { case_id: id, module_code: cm.module_type?.code, deliverable_id: del?.id, entity_name: entity?.name },
      },
    ]);

    setSimulatingModule(null);
    if (!skipReload) {
      toast({ title: "Module delivered", description: `${cm.module_type?.name} addendum is now available.` });
      loadCase();
    }
  };

  if (!caseData) {
    return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;
  }

  const statusSteps = [
    { key: "submitted", label: "Submitted", icon: Send },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "in_progress", label: "In Progress", icon: Play },
    { key: "awaiting_client", label: "Awaiting Client", icon: Clock },
    { key: "complete", label: "Delivered", icon: FileText },
  ];

  const currentIdx = statusSteps.findIndex((s) => s.key === caseData.status);
  const isHighRisk = entity?.risk_tier === "A";
  const needsApproval = caseData.status === "submitted" && isHighRisk;

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
        <Badge className={`fvc-status-badge text-sm px-3 py-1 capitalize ${
          caseData.status === "complete" ? "bg-success/10 text-success" :
          caseData.status === "cancelled" ? "bg-destructive/10 text-destructive" :
          "bg-muted text-muted-foreground"
        }`}>
          {caseData.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {needsApproval && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 mb-6 animate-fade-in">
          <AlertTriangle size={18} className="text-warning shrink-0" />
          <div>
            <div className="text-sm font-medium text-foreground">Approval required</div>
            <div className="text-xs text-muted-foreground">
              This entity is classified as Tier A (high risk). A client administrator or internal analyst must approve before work begins.
            </div>
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
        {statusSteps.map((s, i) => {
          const StepIcon = s.icon;
          const isPast = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                    : isPast
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <StepIcon size={14} />
                </div>
                <span className={`text-[10px] whitespace-nowrap font-medium ${
                  isCurrent ? "text-foreground" : isPast ? "text-accent" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`w-12 h-px mx-1 mt-[-18px] transition-colors ${isPast ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2.5 text-[10px]"
                            onClick={() => navigate(`/cases/${id}/modules/${cm.id}`)}
                          >
                            Open Workbench
                          </Button>
                        )}
                        {isInternal && cm.status === "complete" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2.5 text-[10px] text-muted-foreground"
                            onClick={() => navigate(`/cases/${id}/modules/${cm.id}`)}
                          >
                            View
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
              <p className="text-sm text-muted-foreground">No messages yet. Start a conversation about this case.</p>
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
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                rows={2}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm" className="self-end">
                <Send size={14} className="mr-1" /> Send
              </Button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="fvc-card">
            <h2 className="fvc-heading-3 text-foreground mb-4">Activity Timeline</h2>
            <div className="fvc-gold-rule mb-4" />
            <CaseActivityTimeline
              caseData={caseData}
              messages={messages}
              deliverables={deliverables}
              auditEvents={auditEvents}
              currentUserId={user?.id}
            />
          </div>

          {/* Report view */}
          {showReport && deliverables.length > 0 && (
            <div className="fvc-card-elevated">
              <AssuranceNoteReport
                entityName={entity?.name ?? "Entity"}
                caseDate={caseData.created_at}
                riskTier={entity?.risk_tier}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval gate */}
          {(hasRole("client_admin") || isInternal) && caseData.status === "submitted" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-1">Approval</h3>
              {isHighRisk && (
                <p className="text-xs text-warning mb-3 flex items-center gap-1">
                  <AlertTriangle size={11} /> High-risk entity — approval required
                </p>
              )}
              {caseModules.length > 0 && (
                <div className="mb-3 border border-accent/20 rounded-lg p-2.5 bg-accent/5">
                  <div className="text-[10px] font-medium text-foreground mb-1.5 flex items-center gap-1">
                    <Sparkles size={10} className="text-accent" /> Includes EDD+
                  </div>
                  {caseModules.map((cm) => (
                    <div key={cm.id} className="flex justify-between text-[11px] py-0.5">
                      <span className="text-foreground">{cm.module_type?.name}</span>
                      <span className="text-accent">£{cm.price_estimate?.toLocaleString() ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Button className="w-full" onClick={() => updateStatus("approved")}>
                  <CheckCircle2 size={14} className="mr-1" /> Approve
                </Button>
                <Button variant="outline" className="w-full" onClick={() => updateStatus("cancelled")}>Reject</Button>
              </div>
            </div>
          )}

          {/* Analyst actions */}
          {isInternal && caseData.status === "approved" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Analyst Actions</h3>
              <Button className="w-full" onClick={() => updateStatus("in_progress")}>
                <Play size={14} className="mr-1" /> Begin Work
              </Button>
            </div>
          )}

          {/* Simulate delivery */}
          {isInternal && caseData.status === "in_progress" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Actions</h3>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={simulateDelivery}
                  disabled={simulating}
                >
                  <FileText size={14} className="mr-1" />
                  {simulating ? "Generating report…" : "Simulate Delivery"}
                </Button>
                {caseModules.filter((cm) => cm.status !== "complete" && cm.status !== "cancelled").map((cm) => (
                  <Button
                    key={cm.id}
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => simulateModuleDelivery(cm)}
                    disabled={simulatingModule === cm.id}
                  >
                    <Sparkles size={12} className="mr-1 text-accent" />
                    {simulatingModule === cm.id ? "Delivering…" : `Deliver ${cm.module_type?.name ?? "Module"}`}
                  </Button>
                ))}
                <Button variant="outline" className="w-full" onClick={() => updateStatus("awaiting_client")}>
                  <Clock size={14} className="mr-1" /> Await Client
                </Button>
              </div>
            </div>
          )}

          {/* Deliverables */}
          <div className="fvc-card">
            <h3 className="fvc-heading-3 text-foreground mb-3">Deliverables</h3>
            {deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliverables yet. Reports will appear here once the case is complete.</p>
            ) : (
              <div className="space-y-2">
                {deliverables.map((d) => (
                  <div
                    key={d.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setShowReport(!showReport)}
                  >
                    <div className="flex items-center gap-2">
                      {d.deliverable_type === "addendum" ? (
                        <Sparkles size={14} className="text-accent shrink-0" />
                      ) : (
                        <FileText size={14} className="text-accent shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">{d.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{d.deliverable_type.replace(/_/g, " ")} · v{d.version}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground mt-1">Click a deliverable to {showReport ? "hide" : "view"} the report.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
