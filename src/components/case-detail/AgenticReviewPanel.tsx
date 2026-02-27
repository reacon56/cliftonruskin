import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bot,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  TrendingUp,
  Globe,
  Loader2,
  Eye,
  ShieldAlert,
} from "lucide-react";

/* ── Types ── */
interface PreQaCheck {
  area: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

interface PreQaReview {
  ready_for_qa: boolean;
  checks: PreQaCheck[];
  advisory_prompt: string;
}

interface RiskDrift {
  drift_detected: boolean;
  current_band: string;
  current_score: number;
  prior_band: string;
  prior_score: number;
  score_delta: number;
  advisory_prompt: string;
}

interface JurisdictionUpdate {
  title: string;
  category: string;
  relevance: "high" | "medium" | "low";
  summary: string;
}

interface JurisdictionOverlay {
  relevant_updates_found: boolean;
  updates: JurisdictionUpdate[];
  advisory_prompt: string;
}

interface AgenticReview {
  pre_qa_review: PreQaReview;
  risk_drift: RiskDrift;
  jurisdiction_overlay: JurisdictionOverlay;
}

interface StageAck {
  acknowledged: boolean;
  acknowledgedAt?: string;
}

interface Props {
  caseId: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 size={12} className="text-success" />,
  warning: <AlertTriangle size={12} className="text-warning" />,
  fail: <XCircle size={12} className="text-destructive" />,
};

const STATUS_BG: Record<string, string> = {
  pass: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  fail: "bg-destructive/10 text-destructive",
};

const RELEVANCE_COLOR: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

export default function AgenticReviewPanel({ caseId }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<AgenticReview | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [aiDisclaimer, setAiDisclaimer] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [acks, setAcks] = useState<Record<string, StageAck>>({});

  const runReview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agentic-review", {
        body: { case_id: caseId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReview(data.review);
      setGeneratedAt(data.generated_at);
      setAcks({});
      if (user && profile) {
        await supabase.from("audit_events").insert({
          user_id: user.id,
          org_id: profile.org_id,
          action_type: "AGENTIC_REVIEW_RUN",
          object_type: "case",
          object_id: caseId,
          metadata: { generated_at: data.generated_at },
        });
      }
      toast({ title: "Agentic review complete" });
    } catch (e: any) {
      toast({ title: "Review Agent Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const acknowledge = async (stage: string) => {
    const now = new Date().toISOString();
    setAcks((prev) => ({ ...prev, [stage]: { acknowledged: true, acknowledgedAt: now } }));
    if (user && profile) {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        org_id: profile.org_id,
        action_type: "AGENTIC_STAGE_ACKNOWLEDGED",
        object_type: "case",
        object_id: caseId,
        metadata: { stage, acknowledged_at: now },
      });
    }
  };

  const allAcknowledged = review && acks.pre_qa?.acknowledged && acks.risk_drift?.acknowledged && acks.jurisdiction?.acknowledged;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> Agentic Review Layer
        </h3>
        <div className="flex items-center gap-2">
          {allAcknowledged && (
            <Badge className="bg-success/10 text-success text-[10px]">All Acknowledged</Badge>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={runReview} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            {loading ? "Running…" : review ? "Re-run Review" : "Run Pre-QA Review"}
          </Button>
        </div>
      </div>

      {generatedAt && (
        <p className="text-[10px] text-muted-foreground">
          Generated {new Date(generatedAt).toLocaleString()} · Advisory only — does not modify data
        </p>
      )}

      {review && (
        <div className="space-y-2">
          {/* ── Stage 1: Pre-QA Completeness ── */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <ClipboardCheck size={14} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Stage 1: Pre-QA Completeness</span>
              <Badge className={`text-[10px] ${review.pre_qa_review.ready_for_qa ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                {review.pre_qa_review.ready_for_qa ? "Ready" : "Gaps Found"}
              </Badge>
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-2">
              <div className="space-y-1.5">
                {review.pre_qa_review.checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md border">
                    {STATUS_ICON[check.status]}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[9px] ${STATUS_BG[check.status]}`}>{check.area.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-[11px] text-foreground mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 rounded-md bg-muted/50 border border-border">
                <p className="text-[11px] text-foreground leading-relaxed">{review.pre_qa_review.advisory_prompt}</p>
              </div>
              {acks.pre_qa?.acknowledged ? (
                <Badge className="bg-success/10 text-success text-[10px]">
                  Acknowledged {new Date(acks.pre_qa.acknowledgedAt!).toLocaleTimeString()}
                </Badge>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => acknowledge("pre_qa")}>
                  <Eye size={12} /> Acknowledge
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* ── Stage 2: Risk Drift Monitor ── */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <TrendingUp size={14} className="text-warning shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Stage 2: Risk Drift Monitor</span>
              {review.risk_drift.drift_detected ? (
                <Badge className="bg-destructive/10 text-destructive text-[10px]">Drift Detected</Badge>
              ) : (
                <Badge className="bg-success/10 text-success text-[10px]">Stable</Badge>
              )}
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border p-2 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Current</span>
                  <span className="text-sm font-bold text-foreground">{review.risk_drift.current_band}</span>
                  <span className="text-[10px] text-muted-foreground block">{review.risk_drift.current_score}</span>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Prior</span>
                  <span className="text-sm font-bold text-foreground">{review.risk_drift.prior_band}</span>
                  <span className="text-[10px] text-muted-foreground block">{review.risk_drift.prior_score >= 0 ? review.risk_drift.prior_score : "N/A"}</span>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Delta</span>
                  <span className={`text-sm font-bold ${review.risk_drift.drift_detected ? "text-destructive" : "text-foreground"}`}>
                    {review.risk_drift.score_delta > 0 ? "+" : ""}{review.risk_drift.score_delta}
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-md bg-muted/50 border border-border">
                <p className="text-[11px] text-foreground leading-relaxed">{review.risk_drift.advisory_prompt}</p>
              </div>
              {acks.risk_drift?.acknowledged ? (
                <Badge className="bg-success/10 text-success text-[10px]">
                  Acknowledged {new Date(acks.risk_drift.acknowledgedAt!).toLocaleTimeString()}
                </Badge>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => acknowledge("risk_drift")}>
                  <Eye size={12} /> Acknowledge
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* ── Stage 3: Jurisdiction Overlay ── */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
              <Globe size={14} className="text-accent shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1">Stage 3: Jurisdiction Overlay</span>
              {review.jurisdiction_overlay.relevant_updates_found ? (
                <Badge className="bg-warning/10 text-warning text-[10px]">
                  {review.jurisdiction_overlay.updates.length} update{review.jurisdiction_overlay.updates.length !== 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground text-[10px]">No Updates</Badge>
              )}
              <ChevronDown size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-2">
              {review.jurisdiction_overlay.updates.length > 0 ? (
                <div className="space-y-1.5">
                  {review.jurisdiction_overlay.updates.map((u, i) => (
                    <div key={i} className="p-2 rounded-md border">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge className={`text-[9px] ${RELEVANCE_COLOR[u.relevance]}`}>{u.relevance}</Badge>
                        <span className="text-[10px] text-muted-foreground">{u.category}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{u.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{u.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No recent jurisdiction updates found for this entity.</p>
              )}
              <div className="p-2 rounded-md bg-muted/50 border border-border">
                <p className="text-[11px] text-foreground leading-relaxed">{review.jurisdiction_overlay.advisory_prompt}</p>
              </div>
              {acks.jurisdiction?.acknowledged ? (
                <Badge className="bg-success/10 text-success text-[10px]">
                  Acknowledged {new Date(acks.jurisdiction.acknowledgedAt!).toLocaleTimeString()}
                </Badge>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => acknowledge("jurisdiction")}>
                  <Eye size={12} /> Acknowledge
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {!review && !loading && (
        <div className="text-center py-4 space-y-1">
          <ShieldAlert size={20} className="mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Run the review layer before submitting to QA. Agents check completeness, risk drift, and jurisdiction relevance.
          </p>
        </div>
      )}
    </div>
  );
}
