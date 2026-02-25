import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PendingCase {
  id: string;
  product_type: string;
  priority: string;
  price_estimate: number | null;
  scope_notes: string | null;
  created_at: string;
  requested_by: string | null;
  entity_id: string;
  entity_name?: string;
  entity_risk_tier?: string;
  requester_name?: string;
}

export default function ApprovalsPage() {
  const { user, profile, hasRole, isInternal } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState<PendingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionCase, setActionCase] = useState<PendingCase | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canApprove = hasRole("client_admin") || isInternal;

  useEffect(() => {
    if (profile?.org_id) loadPending();
  }, [profile?.org_id]);

  const loadPending = async () => {
    setLoading(true);
    const { data: pendingCases } = await supabase
      .from("cases")
      .select("id, product_type, priority, price_estimate, scope_notes, created_at, requested_by, entity_id")
      .eq("status", "submitted")
      .order("created_at", { ascending: false });

    if (!pendingCases?.length) {
      setCases([]);
      setLoading(false);
      return;
    }

    // Fetch entity names
    const entityIds = [...new Set(pendingCases.map((c) => c.entity_id))];
    const { data: entities } = await supabase
      .from("entities")
      .select("id, name, risk_tier")
      .in("id", entityIds);
    const entityMap = Object.fromEntries((entities ?? []).map((e) => [e.id, e]));

    // Fetch requester names
    const requesterIds = [...new Set(pendingCases.map((c) => c.requested_by).filter(Boolean))];
    const { data: profiles } = requesterIds.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", requesterIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

    setCases(
      pendingCases.map((c) => ({
        ...c,
        entity_name: entityMap[c.entity_id]?.name ?? "Unknown",
        entity_risk_tier: entityMap[c.entity_id]?.risk_tier ?? "B",
        requester_name: c.requested_by
          ? profileMap[c.requested_by]?.full_name || profileMap[c.requested_by]?.email || "Unknown"
          : "—",
      }))
    );
    setLoading(false);
  };

  const handleAction = async () => {
    if (!actionCase || !user) return;
    setSubmitting(true);

    const newStatus = actionType === "approve" ? "approved" : "cancelled";
    const sla = actionCase.priority === "rush" ? 5 : 10;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (sla * 1.4)); // rough business day estimate

    const updatePayload: Record<string, any> = {
      status: newStatus,
      approved_by: actionType === "approve" ? user.id : null,
    };

    if (actionType === "approve") {
      updatePayload.sla_days = sla;
      updatePayload.due_date = dueDate.toISOString().split("T")[0];
    }

    const { error } = await supabase.from("cases").update(updatePayload).eq("id", actionCase.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Write audit event
    await supabase.from("audit_events").insert({
      user_id: user.id,
      org_id: profile?.org_id,
      action_type: actionType === "approve" ? "CASE_APPROVED" : "CASE_REJECTED",
      object_type: "case",
      object_id: actionCase.id,
      metadata: {
        product_type: actionCase.product_type,
        entity_name: actionCase.entity_name,
        comment: comment || null,
        price_estimate: actionCase.price_estimate,
      },
    });

    toast({
      title: actionType === "approve" ? "✓ Case approved" : "Case rejected",
      description: actionType === "approve"
        ? `${actionCase.product_type} for ${actionCase.entity_name} has been approved. SLA: ${sla} business days.`
        : `${actionCase.product_type} for ${actionCase.entity_name} has been rejected.`,
    });

    setActionCase(null);
    setComment("");
    setSubmitting(false);
    loadPending();
  };

  const openAction = (c: PendingCase, type: "approve" | "reject") => {
    setActionCase(c);
    setActionType(type);
    setComment("");
  };

  return (
    <div>
      <h1 className="fvc-heading-1 text-foreground mb-1">Approvals</h1>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-8">
        Review and approve pending commission requests
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>
      ) : cases.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <CheckCircle2 size={32} className="text-success mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No pending approvals</p>
          <p className="text-xs text-muted-foreground mt-1">All commission requests have been reviewed.</p>
        </div>
      ) : (
        <div className="fvc-card p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Estimate</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Submitted</TableHead>
                {canApprove && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/cases/${c.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{c.entity_name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Tier {c.entity_risk_tier}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.product_type}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize text-[10px] ${
                      c.priority === "rush"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-display font-semibold text-accent">
                    {c.price_estimate ? `£${c.price_estimate.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.requester_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(c.created_at), "dd MMM yyyy")}
                  </TableCell>
                  {canApprove && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => openAction(c, "approve")}
                          className="h-7 px-3 text-xs"
                        >
                          <CheckCircle2 size={12} className="mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction(c, "reject")}
                          className="h-7 px-3 text-xs"
                        >
                          <XCircle size={12} className="mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionCase} onOpenChange={(o) => !o && setActionCase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <><CheckCircle2 size={18} className="text-success" /> Approve Commission</>
              ) : (
                <><XCircle size={18} className="text-destructive" /> Reject Commission</>
              )}
            </DialogTitle>
          </DialogHeader>

          {actionCase && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entity</span>
                  <span className="font-medium text-foreground">{actionCase.entity_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span className="text-foreground">{actionCase.product_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimate</span>
                  <span className="text-accent font-semibold">
                    {actionCase.price_estimate ? `£${actionCase.price_estimate.toLocaleString()}` : "—"}
                  </span>
                </div>
              </div>

              {actionCase.entity_risk_tier === "A" && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-warning/5 border border-warning/20 text-xs text-warning">
                  <AlertTriangle size={14} /> High-risk entity (Tier A)
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  {actionType === "approve" ? "Approval comment (optional)" : "Reason for rejection"}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder={actionType === "approve" ? "Add any notes…" : "Provide a reason…"}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionCase(null)}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={submitting || (actionType === "reject" && !comment.trim())}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {submitting ? "Processing…" : actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
