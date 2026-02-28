import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Pen, Save, CheckCircle2, Loader2, AlertCircle, Lock } from "lucide-react";

interface NarrativePanelProps {
  caseId: string;
  /** New: report_version UUID from useReportVersion hook */
  reportVersionId: string | null;
  /** Fallback: integer version for display */
  reportVersionNumber: number;
  /** Whether the version is locked (issued) */
  versionLocked: boolean;
  entityName: string;
  entityType: string;
  riskResult: {
    risk_band: string;
    risk_score: number;
    contributing_factors_json: any;
    recommended_controls_json: any;
  } | null;
  jurisdictions: Array<{ country_name: string; country_code: string }>;
  clientPolicyOutcome?: any;
}

export default function ExecNarrativePanel({
  caseId,
  reportVersionId,
  reportVersionNumber,
  versionLocked,
  entityName,
  entityType,
  riskResult,
  jurisdictions,
  clientPolicyOutcome,
}: NarrativePanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [narrative, setNarrative] = useState("");
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing report_section for this version
  useEffect(() => {
    if (!reportVersionId) return;
    (async () => {
      const { data } = await supabase
        .from("report_section" as any)
        .select("*")
        .eq("report_version_id", reportVersionId)
        .eq("section_key", "exec_summary")
        .maybeSingle();
      if (data) {
        setNarrative((data as any).content_markdown ?? "");
        setFinalized((data as any).finalized ?? false);
        setSectionId((data as any).id);
      } else {
        setNarrative("");
        setFinalized(false);
        setSectionId(null);
      }
    })();
  }, [reportVersionId]);

  const generateNarrative = async () => {
    setGenerating(true);
    setError(null);
    try {
      const factors = Array.isArray(riskResult?.contributing_factors_json)
        ? riskResult.contributing_factors_json.slice(0, 3)
        : [];

      const { data, error: fnError } = await supabase.functions.invoke("generate-narrative", {
        body: {
          entity_name: entityName,
          entity_type: entityType,
          jurisdictions,
          risk_band: riskResult?.risk_band ?? "PENDING",
          risk_score: riskResult?.risk_score ?? null,
          contributing_factors: factors,
          recommended_controls: riskResult?.recommended_controls_json ?? [],
          client_policy_outcome: clientPolicyOutcome ?? null,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        return;
      }

      const text = data?.narrative ?? "";
      setNarrative(text);
      await upsertSection(text, "ai");
      toast({ title: "Executive summary generated" });
    } catch (e: any) {
      console.error("Narrative generation failed:", e);
      setError(e.message ?? "Generation failed");
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const upsertSection = async (text: string, generatedBy: string) => {
    if (!reportVersionId) return;

    // Compute content hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(text));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const payload: any = {
      case_id: caseId,
      report_version_id: reportVersionId,
      section_key: "exec_summary",
      content_markdown: text,
      generated_by: generatedBy,
      content_hash: contentHash,
      source_json: {
        risk_band: riskResult?.risk_band,
        factors_count: riskResult?.contributing_factors_json?.length ?? 0,
        jurisdictions: jurisdictions.map(j => j.country_code),
      },
      updated_at: new Date().toISOString(),
    };

    if (sectionId) {
      if (generatedBy === "officer") {
        payload.edited_by = user?.id;
        payload.edited_at = new Date().toISOString();
      }
      await supabase.from("report_section" as any).update(payload).eq("id", sectionId);
    } else {
      const { data } = await supabase
        .from("report_section" as any)
        .insert(payload)
        .select("id")
        .single();
      if (data) setSectionId((data as any).id);
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    await upsertSection(narrative, "officer");
    setEditing(false);
    setSaving(false);
    toast({ title: "Narrative saved" });
  };

  const finalizeNarrative = async () => {
    if (!sectionId) return;
    await supabase
      .from("report_section" as any)
      .update({ finalized: true, updated_at: new Date().toISOString() } as any)
      .eq("id", sectionId);
    setFinalized(true);
    setEditing(false);
    toast({ title: "Executive summary finalized" });
  };

  const isReadOnly = versionLocked || finalized;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Executive Summary Narrative
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">v{reportVersionNumber}</Badge>
            {versionLocked && (
              <Badge variant="secondary" className="text-[10px]">
                <Lock className="h-3 w-3 mr-0.5" /> Locked
              </Badge>
            )}
            {finalized && !versionLocked && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Finalized
              </Badge>
            )}
            {narrative && !finalized && !versionLocked && (
              <Badge variant="outline" className="text-[10px]">Draft</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {!reportVersionId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Initialising report version…
          </p>
        )}

        {reportVersionId && !narrative && !generating && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              No executive summary generated yet. Click below to create one from the risk assessment data.
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={generateNarrative}
              disabled={!riskResult || isReadOnly}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Narrative
            </Button>
            {!riskResult && (
              <p className="text-[10px] text-muted-foreground">
                Risk assessment must be completed before generating narrative.
              </p>
            )}
          </div>
        )}

        {generating && (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating executive summary…
          </div>
        )}

        {narrative && !generating && (
          <>
            {editing && !isReadOnly ? (
              <Textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={8}
                className="text-sm leading-relaxed"
              />
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {narrative}
                </p>
              </div>
            )}

            {!isReadOnly && (
              <div className="flex items-center gap-2 flex-wrap">
                {editing ? (
                  <>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={saveEdit} disabled={saving}>
                      <Save className="h-3 w-3" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setEditing(true)}>
                      <Pen className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={generateNarrative}>
                      <Sparkles className="h-3 w-3" /> Regenerate
                    </Button>
                    <Button size="sm" className="text-xs gap-1" onClick={finalizeNarrative}>
                      <CheckCircle2 className="h-3 w-3" /> Finalize
                    </Button>
                  </>
                )}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground italic">
              AI-assisted drafting used. Human review required before finalisation.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
