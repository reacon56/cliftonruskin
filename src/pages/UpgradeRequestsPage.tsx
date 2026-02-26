import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Shield, ArrowUpCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface UpgradeRequest {
  id: string;
  org_id: string;
  org_name: string;
  requested_feature: string;
  requested_by: string;
  requester_name: string;
  notes: string | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; style: string }> = {
  pending: { label: "Pending", icon: Clock, style: "bg-accent/10 text-accent border-accent/30" },
  approved: { label: "Approved", icon: CheckCircle2, style: "bg-primary/10 text-primary border-primary/30" },
  declined: { label: "Declined", icon: XCircle, style: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function UpgradeRequestsPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialog, setResolveDialog] = useState<{ id: string; action: "approved" | "declined" } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isInternal =
    hasRole("fvc_ops_admin") ||
    hasRole("fvc_assurance_manager") ||
    hasRole("fvc_assurance_lead");

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("upgrade_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Enrich with org and user names
    const orgIds = [...new Set((data as any[]).map((r: any) => r.org_id))];
    const userIds = [...new Set((data as any[]).map((r: any) => r.requested_by))];

    const [{ data: orgs }, { data: profiles }] = await Promise.all([
      supabase.from("organisations").select("id, name").in("id", orgIds),
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
    ]);

    const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
    const userMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

    setRequests(
      (data as any[]).map((r: any) => ({
        ...r,
        org_name: orgMap.get(r.org_id) || "Unknown",
        requester_name: userMap.get(r.requested_by) || "Unknown",
      }))
    );
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!resolveDialog) return;
    setSaving(true);

    const { error } = await supabase
      .from("upgrade_requests" as any)
      .update({
        status: resolveDialog.action,
        resolution_notes: resolutionNotes || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", resolveDialog.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Request ${resolveDialog.action}` });
      setResolveDialog(null);
      setResolutionNotes("");
      loadRequests();
    }
  };

  if (!isInternal) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-xl font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Upgrade requests are visible to internal administrators only.
        </p>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="fvc-heading-2 flex items-center gap-2">
          <ArrowUpCircle size={18} /> Upgrade Requests
          {pendingCount > 0 && (
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-[10px] ml-2">
              {pendingCount} pending
            </Badge>
          )}
        </h2>
        <div className="fvc-gold-rule mt-3 mb-2" />
        <p className="text-sm text-muted-foreground">
          Client requests to enable premium features. Review and approve or decline.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading requests…</div>
      ) : requests.length === 0 ? (
        <div className="fvc-card text-center py-12">
          <p className="text-sm text-muted-foreground">No upgrade requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            return (
              <div key={req.id} className="fvc-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">
                        {req.org_name}
                      </h3>
                      <Badge variant="outline" className={`text-[9px] uppercase tracking-wider px-2 py-0.5 ${config.style}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{req.requester_name}</span> requested{" "}
                      <span className="font-medium">{req.requested_feature.replace(/_/g, " ")}</span>
                    </p>
                    {req.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{req.notes}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(req.created_at), "d MMM yyyy, HH:mm")}
                    </p>
                    {req.resolution_notes && (
                      <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                        Resolution: {req.resolution_notes}
                      </p>
                    )}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => { setResolveDialog({ id: req.id, action: "approved" }); setResolutionNotes(""); }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-muted-foreground"
                        onClick={() => { setResolveDialog({ id: req.id, action: "declined" }); setResolutionNotes(""); }}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg capitalize">
              {resolveDialog?.action} Request
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Optional notes (e.g. pricing agreed, reason for decline)…"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={handleResolve}>
              {saving ? "Saving…" : `Confirm ${resolveDialog?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
