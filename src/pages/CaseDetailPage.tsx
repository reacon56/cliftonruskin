import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  const loadCase = async () => {
    const [caseRes, msgsRes, delsRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id!).single(),
      supabase.from("case_messages").select("*").eq("case_id", id!).order("created_at"),
      supabase.from("deliverables").select("*").eq("case_id", id!).order("created_at", { ascending: false }),
    ]);
    setCaseData(caseRes.data);
    setMessages(msgsRes.data ?? []);
    setDeliverables(delsRes.data ?? []);

    if (caseRes.data?.entity_id) {
      const { data } = await supabase.from("entities").select("name").eq("id", caseRes.data.entity_id).single();
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

  const updateStatus = async (status: string) => {
    await supabase.from("cases").update({ status, ...(status === "approved" ? { approved_by: user?.id } : {}) }).eq("id", id!);
    toast({ title: "Status updated" });
    loadCase();
  };

  if (!caseData) {
    return <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>;
  }

  const statusSteps = ["draft", "submitted", "approved", "in_progress", "awaiting_client", "complete"];
  const currentIdx = statusSteps.indexOf(caseData.status);

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
        <Badge className="fvc-status-badge bg-muted text-muted-foreground capitalize text-sm px-3 py-1">
          {caseData.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Status timeline */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {statusSteps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap ${
              i <= currentIdx
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}>
              {s.replace(/_/g, " ")}
            </div>
            {i < statusSteps.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="fvc-card">
            <h2 className="fvc-heading-3 text-foreground mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span className="text-foreground">{caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : "Not set"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SLA</span><span className="text-foreground">{caseData.sla_days ? `${caseData.sla_days} days` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee estimate</span><span className="text-accent font-semibold">£{caseData.price_estimate?.toLocaleString() ?? "—"}</span></div>
              {caseData.scope_notes && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground block mb-1">Scope notes</span>
                  <p className="text-foreground">{caseData.scope_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="fvc-card">
            <h2 className="fvc-heading-3 text-foreground mb-4">Messages</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {messages.map((m) => (
                  <div key={m.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">Message</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground">{m.message}</p>
                  </div>
                ))}
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
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>Send</Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {(hasRole("client_admin") || isInternal) && caseData.status === "submitted" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Approval</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => updateStatus("approved")}>Approve</Button>
                <Button variant="outline" className="w-full" onClick={() => updateStatus("cancelled")}>Reject</Button>
              </div>
            </div>
          )}

          {isInternal && caseData.status === "approved" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Actions</h3>
              <Button className="w-full" onClick={() => updateStatus("in_progress")}>Begin Work</Button>
            </div>
          )}

          {isInternal && caseData.status === "in_progress" && (
            <div className="fvc-card">
              <h3 className="fvc-heading-3 text-foreground mb-3">Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => updateStatus("complete")}>Mark Complete</Button>
                <Button variant="outline" className="w-full" onClick={() => updateStatus("awaiting_client")}>Await Client</Button>
              </div>
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
                  <div key={d.id} className="border rounded-md p-2">
                    <div className="text-sm font-medium text-foreground">{d.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{d.deliverable_type.replace(/_/g, " ")} · v{d.version}</div>
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
