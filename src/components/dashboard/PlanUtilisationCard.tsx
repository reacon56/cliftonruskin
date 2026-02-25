import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Building2, FileCheck, CalendarDays, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface OrgPlan {
  plan_name: string;
  entity_limit: number;
  included_notes_per_year: number;
  included_notes_used_ytd: number;
  renewal_date: string | null;
}

interface Props {
  entityCount: number;
}

export default function PlanUtilisationCard({ entityCount }: Props) {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<OrgPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const canView = hasRole("client_admin") || hasRole("client_auditor");

  useEffect(() => {
    if (!profile?.org_id || !canView) return;
    loadPlan();
  }, [profile?.org_id, canView]);

  const loadPlan = async () => {
    const { data } = await supabase
      .from("organisation_plan")
      .select("plan_name, entity_limit, included_notes_per_year, included_notes_used_ytd, renewal_date")
      .eq("org_id", profile!.org_id!)
      .maybeSingle();
    setPlan(data as OrgPlan | null);
    setLoading(false);
  };

  const handleSubmitRequest = async () => {
    if (!message.trim()) return;
    setSending(true);
    // Log as audit event for now (no billing integration)
    await supabase.from("audit_events").insert({
      user_id: profile?.user_id ?? null,
      org_id: profile?.org_id ?? null,
      action_type: "PLAN_CHANGE_REQUESTED",
      object_type: "organisation_plan",
      metadata: { message: message.trim() },
    });
    toast({ title: "Request submitted", description: "Our team will be in touch regarding your plan change." });
    setSupportOpen(false);
    setMessage("");
    setSending(false);
  };

  if (!canView) return null;
  if (loading) return null;

  // Default display if no plan record exists
  const displayPlan: OrgPlan = plan ?? {
    plan_name: "Standard",
    entity_limit: 50,
    included_notes_per_year: 20,
    included_notes_used_ytd: 0,
    renewal_date: null,
  };

  const entityPct = Math.min(100, Math.round((entityCount / displayPlan.entity_limit) * 100));
  const notesPct = Math.min(100, Math.round((displayPlan.included_notes_used_ytd / displayPlan.included_notes_per_year) * 100));
  const isAdmin = hasRole("client_admin");

  return (
    <>
      <div className="fvc-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-accent" />
            <h2 className="fvc-heading-3 text-foreground">Plan & Utilisation</h2>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
            {displayPlan.plan_name}
          </span>
        </div>

        <div className="space-y-5">
          {/* Entities used */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 size={12} />
                Entities
              </div>
              <span className="text-xs font-medium text-foreground">
                {entityCount} <span className="text-muted-foreground font-normal">/ {displayPlan.entity_limit}</span>
              </span>
            </div>
            <Progress
              value={entityPct}
              className="h-2"
            />
            {entityPct >= 90 && (
              <p className="text-[10px] text-warning mt-1">Approaching entity limit</p>
            )}
          </div>

          {/* Notes used YTD */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileCheck size={12} />
                Included Notes (YTD)
              </div>
              <span className="text-xs font-medium text-foreground">
                {displayPlan.included_notes_used_ytd} <span className="text-muted-foreground font-normal">/ {displayPlan.included_notes_per_year}</span>
              </span>
            </div>
            <Progress
              value={notesPct}
              className="h-2"
            />
            {notesPct >= 90 && (
              <p className="text-[10px] text-warning mt-1">Approaching notes allowance</p>
            )}
          </div>

          {/* Renewal date */}
          {displayPlan.renewal_date && (
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays size={12} />
                Renewal Date
              </div>
              <span className="text-xs font-medium text-foreground">
                {new Date(displayPlan.renewal_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Request plan change — admin only */}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-5 text-xs"
            onClick={() => setSupportOpen(true)}
          >
            Request Plan Change
            <ArrowRight size={12} className="ml-1.5" />
          </Button>
        )}
      </div>

      {/* Support form dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Request Plan Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Tell us what you need and our team will follow up within one business day.
            </p>
            <div className="space-y-2">
              <Label>Your message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. We'd like to increase our entity limit to 100 and add 10 more included notes…"
                rows={4}
              />
            </div>
            <div className="rounded-md bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Current Plan</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">{displayPlan.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entity limit</span>
                  <span className="font-medium text-foreground">{displayPlan.entity_limit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Included notes / year</span>
                  <span className="font-medium text-foreground">{displayPlan.included_notes_per_year}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupportOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!message.trim() || sending}>
              {sending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
