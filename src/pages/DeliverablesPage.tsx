import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Download, Clock, Trash2, ShieldAlert, Info } from "lucide-react";
import { differenceInDays, addDays, format } from "date-fns";

export default function DeliverablesPage() {
  const { profile, isInternal, canQuote } = useAuth();
  const isManager = isInternal && canQuote;
  const { toast } = useToast();
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [expungeTarget, setExpungeTarget] = useState<any>(null);
  const [expungeReason, setExpungeReason] = useState("");
  const [expunging, setExpunging] = useState(false);
  const [expungeLog, setExpungeLog] = useState<any[]>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (profile?.org_id) {
      loadDeliverables();
      loadRetentionDays();
      if (isManager) loadExpungeLog();
    }
  }, [profile?.org_id]);

  const loadRetentionDays = async () => {
    const { data } = await supabase
      .from("organisation_plan")
      .select("report_retention_days")
      .eq("org_id", profile!.org_id!)
      .maybeSingle();
    if (data && (data as any).report_retention_days) {
      setRetentionDays((data as any).report_retention_days);
    }
  };

  const loadDeliverables = async () => {
    const { data: cases } = await supabase
      .from("cases")
      .select("id")
      .eq("org_id", profile!.org_id!);

    if (!cases?.length) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("deliverables")
      .select("*, cases(entity_id, entities(name))")
      .in("case_id", cases.map((c) => c.id))
      .order("created_at", { ascending: false });

    setDeliverables(data ?? []);
    setLoading(false);
  };

  const loadExpungeLog = async () => {
    const { data } = await supabase
      .from("expunge_log" as any)
      .select("*")
      .eq("org_id", profile!.org_id!)
      .order("created_at", { ascending: false });
    setExpungeLog((data as any) ?? []);
  };

  const getRetentionStatus = (d: any) => {
    if (d.expunged) return { status: "expunged" as const, label: "Expunged", daysLeft: 0 };
    const createdAt = new Date(d.created_at);
    const expiresAt = addDays(createdAt, retentionDays);
    const daysLeft = differenceInDays(expiresAt, new Date());
    if (daysLeft <= 0) return { status: "expired" as const, label: "Retention expired", daysLeft: 0 };
    if (daysLeft <= 14) return { status: "warning" as const, label: `${daysLeft}d remaining`, daysLeft };
    return { status: "ok" as const, label: `${daysLeft}d remaining`, daysLeft };
  };

  const handleExpunge = async () => {
    if (!expungeTarget) return;
    setExpunging(true);

    // Log the expunge
    await supabase.from("expunge_log" as any).insert({
      deliverable_id: expungeTarget.id,
      case_id: expungeTarget.case_id,
      org_id: profile!.org_id!,
      entity_name: (expungeTarget as any).cases?.entities?.name ?? null,
      deliverable_title: expungeTarget.title,
      expunged_by: profile!.user_id,
      reason: expungeReason || null,
    });

    // Mark deliverable as expunged (remove file reference, keep metadata)
    await supabase
      .from("deliverables")
      .update({
        expunged: true,
        expunged_at: new Date().toISOString(),
        expunged_by: profile!.user_id,
        file_url: null, // Remove file access
      } as any)
      .eq("id", expungeTarget.id);

    // Also log to audit_events
    await supabase.from("audit_events").insert({
      user_id: profile!.user_id,
      org_id: profile!.org_id!,
      action_type: "deliverable_expunged",
      object_type: "deliverable",
      object_id: expungeTarget.id,
      metadata: {
        title: expungeTarget.title,
        reason: expungeReason || null,
        entity_name: (expungeTarget as any).cases?.entities?.name ?? null,
      },
    });

    toast({ title: "Report expunged", description: "File removed. Metadata retained for audit." });
    setExpungeTarget(null);
    setExpungeReason("");
    setExpunging(false);
    loadDeliverables();
    if (isManager) loadExpungeLog();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="fvc-heading-1 text-foreground">Deliverables</h1>
        {isManager && expungeLog.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowLog(true)} className="gap-1.5 text-xs">
            <ShieldAlert size={13} /> Expunge Log ({expungeLog.length})
          </Button>
        )}
      </div>
      <div className="fvc-gold-rule mt-3 mb-2" />
      <p className="text-sm text-muted-foreground mb-2">
        Reports, evidence packs, and change logs
      </p>

      {/* Retention notice for clients */}
      {!isInternal && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 mb-6">
          <Info size={16} className="text-accent mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Retention Policy:</span>{" "}
            Reports are available for download for <strong>{retentionDays} days</strong> from delivery.
            After this period, reports may be removed from the platform.{" "}
            <span className="font-medium text-foreground">
              Clients are responsible for retaining downloaded reports.
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-20 text-center">Loading…</div>
      ) : deliverables.length === 0 ? (
        <div className="fvc-card text-center py-12 text-sm text-muted-foreground">
          No deliverables available yet. Deliverables will appear here once cases are completed.
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d) => {
            const retention = getRetentionStatus(d);
            return (
              <div key={d.id} className={`fvc-card flex items-center justify-between ${retention.status === "expunged" ? "opacity-60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{d.title}</span>
                    {retention.status === "expunged" && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        Expunged
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{(d as any).cases?.entities?.name ?? "—"}</span>
                    <span>v{d.version}</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {/* Retention badge */}
                  {retention.status !== "expunged" && (
                    <div className={`flex items-center gap-1 text-[10px] ${
                      retention.status === "warning" ? "text-warning" :
                      retention.status === "expired" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      <Clock size={11} />
                      {retention.label}
                    </div>
                  )}

                  {/* Download reminder for near-expiry */}
                  {retention.status === "warning" && !isInternal && d.file_url && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-warning border-warning/30">
                      <Download size={11} /> Download Now
                    </Button>
                  )}

                  <Badge className="fvc-status-badge bg-muted text-muted-foreground capitalize">
                    {d.deliverable_type?.replace(/_/g, " ") ?? "report"}
                  </Badge>

                  {/* Expunge button — manager only */}
                  {isManager && !d.expunged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setExpungeTarget(d)}
                      title="Expunge report"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expunge confirmation dialog */}
      <AlertDialog open={!!expungeTarget} onOpenChange={() => setExpungeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={18} /> Expunge Report
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the client-visible report file for{" "}
              <strong>{expungeTarget?.title}</strong>. A minimal metadata record will be retained
              for audit purposes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-2">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea
              value={expungeReason}
              onChange={(e) => setExpungeReason(e.target.value)}
              placeholder="e.g. Retention window expired, client confirmed download"
              rows={2}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExpunge}
              disabled={expunging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {expunging ? "Expunging…" : "Confirm Expunge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expunge audit log dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ShieldAlert size={18} className="text-destructive" /> Expunge Audit Log
            </DialogTitle>
            <DialogDescription>
              Record of all expunged deliverables. No automatic deletion occurs without audit record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {expungeLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expunge events.</p>
            ) : (
              expungeLog.map((e: any) => (
                <div key={e.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{e.deliverable_title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(e.created_at), "dd MMM yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {e.entity_name && <p>Entity: {e.entity_name}</p>}
                    {e.reason && <p>Reason: {e.reason}</p>}
                    <p className="text-[10px]">Expunged by: {e.expunged_by}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
