import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sparkles,
  ChevronDown,
  Check,
  Pencil,
  X,
  AlertTriangle,
  TrendingUp,
  ListChecks,
  Search,
  Loader2,
} from "lucide-react";

interface InconsistencyFlag {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface AiAnalysis {
  executive_summary: string;
  risk_driver_explanation: string;
  follow_up_suggestions: string[];
  inconsistency_flags: InconsistencyFlag[];
}

type SuggestionStatus = "pending" | "accepted" | "edited" | "rejected";

interface SuggestionState {
  status: SuggestionStatus;
  editedContent?: string;
  decidedAt?: string;
}

interface Props {
  caseId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

export default function AiAssurancePanel({ caseId }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [aiDisclaimer, setAiDisclaimer] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, SuggestionState>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");

  const runAssistant = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assurance-assistant", {
        body: { case_id: caseId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      setGeneratedAt(data.generated_at);
      setAiDisclaimer(data.ai_disclaimer ?? null);
      setViolationCount(data.violations_sanitised ?? 0);
      setHumanReviewed(false);
      setDecisions({});
      // Log to audit
      if (user && profile) {
        await supabase.from("audit_events").insert({
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "AI_ASSISTANT_RUN",
          object_type: "case",
          object_id: caseId,
          metadata: { generated_at: data.generated_at },
        });
      }
      toast({ title: "AI analysis complete" });
    } catch (e: any) {
      toast({ title: "AI Assistant Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const decide = async (key: string, status: SuggestionStatus, editedContent?: string) => {
    setDecisions((prev) => ({
      ...prev,
      [key]: { status, editedContent, decidedAt: new Date().toISOString() },
    }));
    setEditingKey(null);
    // Log decision
    if (user && profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: `AI_SUGGESTION_${status.toUpperCase()}`,
        object_type: "case",
        object_id: caseId,
        metadata: { suggestion_key: key, edited: !!editedContent },
      });
    }
  };

  const startEdit = (key: string, content: string) => {
    setEditingKey(key);
    setEditBuffer(content);
  };

  const renderDecisionButtons = (key: string, content: string) => {
    const d = decisions[key];
    if (d) {
      return (
        <Badge
          className={`text-[10px] ${
            d.status === "accepted"
              ? "bg-success/10 text-success"
              : d.status === "edited"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground line-through"
          }`}
        >
          {d.status === "accepted" ? "Accepted" : d.status === "edited" ? "Edited & Accepted" : "Rejected"}
        </Badge>
      );
    }
    if (editingKey === key) {
      return (
        <div className="space-y-2 w-full">
          <Textarea
            rows={4}
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px] gap-1" onClick={() => decide(key, "edited", editBuffer)}>
              <Check size={10} /> Save
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingKey(null)}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex gap-1 mt-1">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => decide(key, "accepted")}>
          <Check size={10} /> Accept
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => startEdit(key, content)}>
          <Pencil size={10} /> Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-destructive" onClick={() => decide(key, "rejected")}>
          <X size={10} /> Reject
        </Button>
      </div>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> AI Assurance Assistant
        </h3>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={runAssistant}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Analysing…" : analysis ? "Re-run Analysis" : "Run AI Assistant"}
        </Button>
      </div>

      {generatedAt && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Generated {new Date(generatedAt).toLocaleString()}
            {violationCount > 0 && (
              <span className="ml-2 text-warning">· {violationCount} guardrail correction{violationCount !== 1 ? "s" : ""} applied</span>
            )}
          </p>
          {/* Internal-only AI disclaimer */}
          {aiDisclaimer && (
            <div className="flex items-center gap-2 p-1.5 rounded border border-border bg-muted/30">
              <AlertTriangle size={10} className="text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground italic flex-1">{aiDisclaimer}</span>
              {!humanReviewed ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 text-[9px] px-2 gap-1 shrink-0"
                  onClick={async () => {
                    setHumanReviewed(true);
                    if (user && profile) {
                      await supabase.from("audit_events").insert({
                        user_id: user.id,
                        org_id: profile.org_id,
                        action_type: "AI_OUTPUT_HUMAN_REVIEWED",
                        object_type: "case",
                        object_id: caseId,
                        metadata: { function_name: "ai-assurance-assistant", generated_at: generatedAt },
                      });
                    }
                  }}
                >
                  <Check size={8} /> Confirm Review
                </Button>
              ) : (
                <Badge className="bg-success/10 text-success text-[9px] shrink-0">Reviewed ✓</Badge>
              )}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="space-y-2">
          {/* 1. Executive Summary */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <TrendingUp size={14} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Executive Summary Draft</span>
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap mb-2">
                {decisions["executive_summary"]?.editedContent ?? analysis.executive_summary}
              </p>
              {renderDecisionButtons("executive_summary", analysis.executive_summary)}
            </CollapsibleContent>
          </Collapsible>

          {/* 2. Risk Driver Explanation */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <TrendingUp size={14} className="text-warning shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Risk Driver Explanation</span>
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap mb-2">
                {decisions["risk_driver"]?.editedContent ?? analysis.risk_driver_explanation}
              </p>
              {renderDecisionButtons("risk_driver", analysis.risk_driver_explanation)}
            </CollapsibleContent>
          </Collapsible>

          {/* 3. Follow-Up Suggestions */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <ListChecks size={14} className="text-accent shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Follow-Up Suggestions</span>
              <Badge variant="outline" className="text-[10px]">{analysis.follow_up_suggestions.length}</Badge>
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <ul className="space-y-1.5">
                {analysis.follow_up_suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    <span>{decisions[`followup_${i}`]?.editedContent ?? s}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2">
                {renderDecisionButtons(
                  "follow_ups",
                  analysis.follow_up_suggestions.join("\n")
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 4. Inconsistency Flags */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <Search size={14} className="text-destructive shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Inconsistency Detector</span>
              {analysis.inconsistency_flags.length > 0 && (
                <Badge className="bg-destructive/10 text-destructive text-[10px]">
                  {analysis.inconsistency_flags.length} flag{analysis.inconsistency_flags.length !== 1 ? "s" : ""}
                </Badge>
              )}
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              {analysis.inconsistency_flags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No inconsistencies detected.</p>
              ) : (
                <div className="space-y-2">
                  {analysis.inconsistency_flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md border">
                      <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${flag.severity === "high" ? "text-destructive" : flag.severity === "medium" ? "text-warning" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge className={`text-[9px] ${SEVERITY_COLORS[flag.severity]}`}>{flag.severity}</Badge>
                          <span className="text-[10px] text-muted-foreground">{flag.type.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-xs text-foreground">{flag.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2">
                {renderDecisionButtons(
                  "inconsistencies",
                  analysis.inconsistency_flags.map((f) => f.description).join("\n")
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {!analysis && !loading && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Click "Run AI Assistant" to analyse case data and retrieval logs.
        </p>
      )}
    </div>
  );
}
