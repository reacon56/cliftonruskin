import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  History, FilePlus2, Archive, Bell, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";

const AMENDABLE_SECTIONS = [
  "Executive Summary",
  "Scope & Methodology",
  "Findings",
  "Risk Assessment",
  "Jurisdiction Context",
  "Source Attribution",
  "Processing Basis",
  "Limitations",
  "Officer Commentary",
  "AI Draft Sections",
] as const;

interface Amendment {
  id: string;
  prior_version: number;
  new_version: number;
  amendment_reason: string;
  amended_sections: string[];
  change_log: string | null;
  amended_by: string | null;
  created_at: string;
  client_notified: boolean;
  client_notified_at: string | null;
}

interface Props {
  draftId: string;
  caseId: string;
  orgId: string;
  currentVersion: number;
  pdfGenerated: boolean;
  onAmendmentCreated: () => void;
}

export default function ReportAmendmentPanel({
  draftId, caseId, orgId, currentVersion, pdfGenerated, onAmendmentCreated,
}: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [reason, setReason] = useState("");
  const [changeLog, setChangeLog] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAmendments(); }, [draftId]);

  const loadAmendments = async () => {
    const { data } = await supabase
      .from("report_amendments")
      .select("*")
      .eq("report_draft_id", draftId)
      .order("created_at", { ascending: false });
    setAmendments((data as any[]) ?? []);
  };

  const toggleSection = (s: string) => {
    setSelectedSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleCreateAmendment = async () => {
    if (!reason.trim() || selectedSections.length === 0) {
      toast({ title: "Provide a reason and select amended sections", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Snapshot current draft state
      const { data: currentDraft } = await supabase
        .from("report_drafts")
        .select("structured_data, officer_commentary, ai_draft, qa_comments, qa_approval_status")
        .eq("id", draftId)
        .single();

      const newVersion = currentVersion + 1;

      // Insert amendment record
      await supabase.from("report_amendments").insert({
        report_draft_id: draftId,
        case_id: caseId,
        org_id: orgId,
        prior_version: currentVersion,
        new_version: newVersion,
        amendment_reason: reason,
        amended_sections: selectedSections,
        change_log: changeLog || null,
        prior_snapshot: currentDraft ?? {},
        amended_by: user?.id,
      } as any);

      // Bump version on draft, reset QA so amended report goes through approval again
      await supabase.from("report_drafts").update({
        report_version: newVersion,
        qa_approval_status: "pending",
        pdf_generated: false,
        structured_data_locked: false,
        officer_commentary_complete: false,
        ai_draft_reviewed: false,
        amendment_history: [
          ...(amendments.map((a) => ({
            version: a.prior_version,
            rejected_at: a.created_at,
            comments: a.amendment_reason,
            amended_sections: a.amended_sections,
            amended_by: a.amended_by,
            change_log: a.change_log,
          }))),
          {
            version: currentVersion,
            rejected_at: new Date().toISOString(),
            comments: `Amendment: ${reason}`,
            amended_sections: selectedSections,
            amended_by: user?.id,
            change_log: changeLog || null,
          },
        ],
      } as any).eq("id", draftId);

      // Audit log
      if (user && profile) {
        await supabase.from("audit_events").insert({
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "REPORT_AMENDED",
          object_type: "report_draft",
          object_id: draftId,
          metadata: {
            case_id: caseId,
            prior_version: currentVersion,
            new_version: newVersion,
            amended_sections: selectedSections,
            amendment_reason: reason,
          },
        });
      }

      toast({ title: `Amendment created — now v${newVersion}` });
      setReason("");
      setChangeLog("");
      setSelectedSections([]);
      setShowForm(false);
      onAmendmentCreated();
      loadAmendments();
    } catch {
      toast({ title: "Failed to create amendment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const notifyClient = async (amendment: Amendment) => {
    // Mark as notified (actual email would be handled by edge function)
    await supabase.from("report_amendments").update({
      client_notified: true,
      client_notified_at: new Date().toISOString(),
    } as any).eq("id", amendment.id);

    if (user && profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: "REPORT_AMENDMENT_CLIENT_NOTIFIED",
        object_type: "report_amendment",
        object_id: amendment.id,
        metadata: {
          case_id: caseId,
          version: amendment.new_version,
          notification_type: "client_notification_record",
          notified_at: new Date().toISOString(),
        },
      });
    }

    toast({ title: "Client notified of amendment" });
    loadAmendments();
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <History size={12} className="text-muted-foreground" />
        <h4 className="text-xs font-semibold text-foreground flex-1">
          Version Control & Amendments
        </h4>
        <Badge variant="outline" className="text-[10px]">v{currentVersion}</Badge>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Amend button — only if PDF has been generated (post-release) */}
          {pdfGenerated && !showForm && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 w-full"
              onClick={() => setShowForm(true)}
            >
              <FilePlus2 size={12} /> Create Post-Release Amendment
            </Button>
          )}

          {!pdfGenerated && amendments.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">
              Amendments can be created after the initial PDF is generated.
            </p>
          )}

          {/* Amendment form */}
          {showForm && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <AlertTriangle size={12} /> Post-Release Amendment
              </div>

              <div>
                <label className="text-[10px] font-medium text-foreground block mb-1">
                  Amendment Reason *
                </label>
                <Textarea
                  rows={2}
                  placeholder="Why is this report being amended?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-foreground block mb-1">
                  Amended Sections *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {AMENDABLE_SECTIONS.map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-[10px] text-foreground cursor-pointer">
                      <Checkbox
                        checked={selectedSections.includes(s)}
                        onCheckedChange={() => toggleSection(s)}
                        className="h-3 w-3"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-foreground block mb-1">
                  Change Log (optional)
                </label>
                <Textarea
                  rows={2}
                  placeholder="Summary of specific changes made…"
                  value={changeLog}
                  onChange={(e) => setChangeLog(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" className="text-xs gap-1" onClick={handleCreateAmendment} disabled={submitting}>
                  <FilePlus2 size={12} /> {submitting ? "Creating…" : "Create Amendment"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Amendment history */}
          {amendments.length > 0 && (
            <div className="space-y-2">
              {amendments.map((a) => (
                <div key={a.id} className="rounded border border-border bg-muted/20 p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Archive size={10} className="text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        v{a.prior_version} → v{a.new_version}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="text-muted-foreground">{a.amendment_reason}</p>

                  <div className="flex flex-wrap gap-1">
                    {a.amended_sections.map((s) => (
                      <Badge key={s} variant="outline" className="text-[9px] py-0">{s}</Badge>
                    ))}
                  </div>

                  {a.change_log && (
                    <p className="text-[10px] text-muted-foreground italic border-t border-border pt-1 mt-1">
                      {a.change_log}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    {a.client_notified ? (
                      <span className="text-[10px] text-success flex items-center gap-1">
                        <Bell size={10} /> Client notified {a.client_notified_at
                          ? new Date(a.client_notified_at).toLocaleDateString("en-GB")
                          : ""}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-5 px-2 gap-1"
                        onClick={() => notifyClient(a)}
                      >
                        <Bell size={10} /> Notify Client
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
