import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ────── GUARDRAIL CONFIGURATION ────── */
const BANNED_PHRASES: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bevidence of wrongdoing\b/gi, replacement: "indicators requiring further review" },
  { pattern: /\bguilty\b/gi, replacement: "subject to adverse findings" },
  { pattern: /\billegal\b/gi, replacement: "non-compliant" },
  { pattern: /\billicit\b/gi, replacement: "irregular" },
  { pattern: /\bcriminal\b/gi, replacement: "subject to regulatory concern" },
  { pattern: /\bfraud\b/gi, replacement: "financial irregularity" },
  { pattern: /\bfraudulent\b/gi, replacement: "irregular" },
  { pattern: /\bmoney laundering\b/gi, replacement: "potential financial crime exposure" },
  { pattern: /\bterrorist financing\b/gi, replacement: "potential TF exposure" },
  { pattern: /\bwill likely\b/gi, replacement: "may, based on available indicators," },
  { pattern: /\bis expected to\b/gi, replacement: "may, based on current data," },
  { pattern: /\bwill certainly\b/gi, replacement: "indicators suggest" },
  { pattern: /\bproven to be\b/gi, replacement: "assessed as" },
  { pattern: /\bwithout doubt\b/gi, replacement: "based on available evidence" },
  { pattern: /\bundoubtedly\b/gi, replacement: "based on available evidence" },
  { pattern: /\bclearly guilty\b/gi, replacement: "identified adverse indicators" },
  { pattern: /\bconvicted of\b/gi, replacement: "subject to legal proceedings relating to" },
  { pattern: /\bin our opinion\b/gi, replacement: "based on the available data" },
  { pattern: /\bwe believe\b/gi, replacement: "the available data suggests" },
  { pattern: /\bwe conclude\b/gi, replacement: "the analysis indicates" },
  { pattern: /\blegal advice\b/gi, replacement: "compliance observations" },
];

function sanitiseText(text: string): { sanitised: string; replacements: { original: string; replacement: string }[] } {
  const replacements: { original: string; replacement: string }[] = [];
  let sanitised = text;
  for (const rule of BANNED_PHRASES) {
    const matches = sanitised.match(rule.pattern);
    if (matches) {
      for (const match of matches) {
        replacements.push({ original: match, replacement: rule.replacement });
      }
      sanitised = sanitised.replace(rule.pattern, rule.replacement);
    }
  }
  return { sanitised, replacements };
}

function sanitiseReview(raw: any): { sanitised: any; totalViolations: number; allReplacements: any[] } {
  let totalViolations = 0;
  const allReplacements: any[] = [];

  const processField = (value: string, field: string) => {
    const { sanitised, replacements } = sanitiseText(value);
    totalViolations += replacements.length;
    allReplacements.push(...replacements.map((r) => ({ ...r, field })));
    return sanitised;
  };

  const sanitised = JSON.parse(JSON.stringify(raw));

  // Pre-QA Review
  if (sanitised.pre_qa_review) {
    if (sanitised.pre_qa_review.advisory_prompt)
      sanitised.pre_qa_review.advisory_prompt = processField(sanitised.pre_qa_review.advisory_prompt, "pre_qa_advisory");
    if (Array.isArray(sanitised.pre_qa_review.checks)) {
      sanitised.pre_qa_review.checks = sanitised.pre_qa_review.checks.map((c: any, i: number) => ({
        ...c,
        detail: processField(c.detail, `pre_qa_check_${i}`),
      }));
    }
  }

  // Risk Drift
  if (sanitised.risk_drift?.advisory_prompt)
    sanitised.risk_drift.advisory_prompt = processField(sanitised.risk_drift.advisory_prompt, "risk_drift_advisory");

  // Jurisdiction Overlay
  if (sanitised.jurisdiction_overlay) {
    if (sanitised.jurisdiction_overlay.advisory_prompt)
      sanitised.jurisdiction_overlay.advisory_prompt = processField(sanitised.jurisdiction_overlay.advisory_prompt, "jurisdiction_advisory");
    if (Array.isArray(sanitised.jurisdiction_overlay.updates)) {
      sanitised.jurisdiction_overlay.updates = sanitised.jurisdiction_overlay.updates.map((u: any, i: number) => ({
        ...u,
        summary: processField(u.summary, `jurisdiction_update_${i}`),
      }));
    }
  }

  // Trigger-aware drafting sections
  if (sanitised.drafting_output) {
    for (const key of Object.keys(sanitised.drafting_output)) {
      if (typeof sanitised.drafting_output[key] === "string") {
        sanitised.drafting_output[key] = processField(sanitised.drafting_output[key], `drafting_${key}`);
      }
    }
  }
  if (sanitised.research_output) {
    if (Array.isArray(sanitised.research_output.findings)) {
      sanitised.research_output.findings = sanitised.research_output.findings.map((f: any, i: number) => ({
        ...f,
        detail: typeof f.detail === "string" ? processField(f.detail, `research_finding_${i}`) : f.detail,
      }));
    }
    if (Array.isArray(sanitised.research_output.flags_for_analyst)) {
      sanitised.research_output.flags_for_analyst = sanitised.research_output.flags_for_analyst.map((f: string, i: number) =>
        processField(f, `analyst_flag_${i}`)
      );
    }
  }

  return { sanitised, totalViolations, allReplacements };
}

const AI_DISCLAIMER = "AI-assisted drafting used. Human review completed.";

/* ────── TRIGGER-AWARE CONFIGURATION ────── */

const TRIGGER_TYPES = {
  CONTRACT_RENEWAL: "contract_renewal",
  PERIODIC_CADENCE: "periodic_cadence",
  NEW_JURISDICTION: "new_jurisdiction",
  ESCALATION_REQUEST: "escalation_request",
  ALLEGATION_WHISTLEBLOWING: "allegation_whistleblowing",
  REGULATORY_ENFORCEMENT: "regulatory_enforcement",
  OTHER: "other",
} as const;

type TriggerType = (typeof TRIGGER_TYPES)[keyof typeof TRIGGER_TYPES];

const EDD_REQUIRED_TRIGGERS: TriggerType[] = [
  TRIGGER_TYPES.ALLEGATION_WHISTLEBLOWING,
  TRIGGER_TYPES.REGULATORY_ENFORCEMENT,
];

const ESCALATION_KEYWORDS = ["allegation", "fraud", "investigation", "sanction", "enforcement", "criminal"];

/* ────── INTAKE PROMPT BUILDER ────── */

interface IntakeParams {
  entityName: string;
  triggerId: TriggerType;
  triggerNotes: string;
  priorCaseSummary: string | null;
  scopeLevel: "standard" | "enhanced";
}

function buildIntakePrompt(
  params: IntakeParams
): string | { error: string; message: string } | { flag: string; triggerNotes: string } {
  const { entityName, triggerId, triggerNotes, priorCaseSummary, scopeLevel } = params;
  const priorCtx = priorCaseSummary
    ? `\nPrior case summary for context:\n${priorCaseSummary}`
    : "\nNo prior case history is available for comparison.";

  switch (triggerId) {
    case TRIGGER_TYPES.CONTRACT_RENEWAL:
    case TRIGGER_TYPES.PERIODIC_CADENCE:
      return `You are reviewing entity "${entityName}" as part of a ${triggerId === TRIGGER_TYPES.CONTRACT_RENEWAL ? "contract/relationship renewal" : "periodic risk-tier cadence review"}.
Focus ONLY on changes since the last review. Do not repeat findings that are unchanged.
A nil-change finding is a required and complete compliance output — state it explicitly if no material changes are identified.
${priorCtx}`;

    case TRIGGER_TYPES.NEW_JURISDICTION:
      return `You are reviewing entity "${entityName}" due to new jurisdiction exposure.
Focus ENTIRELY on the new jurisdiction. Apply CR-JURIS-1.0 scoring methodology.
Flag explicitly if the jurisdiction is:
- FATF grey-listed or black-listed
- EU high-risk third country (HRTC)
- Subject to UKSL or OFAC sanctions programmes
Trigger notes: ${triggerNotes}
${priorCtx}`;

    case TRIGGER_TYPES.ESCALATION_REQUEST:
      return `You are reviewing entity "${entityName}" in response to an escalation request.
Research ONLY the specific concern described below — this is a targeted scope, not a full profile review.
Escalation details: ${triggerNotes}
${priorCtx}`;

    case TRIGGER_TYPES.ALLEGATION_WHISTLEBLOWING:
      if (scopeLevel !== "enhanced") {
        return {
          error: "SCOPE_INSUFFICIENT",
          message: "Allegation trigger requires EDD scope. Cannot proceed at standard scope without Compliance Gate override.",
        };
      }
      return `You are reviewing entity "${entityName}" following an allegation or whistleblowing report. ENHANCED scope is authorised.
Conduct:
- Deep adverse media search with a 60-month lookback
- Full PEP and sanctions re-screening
- Director cross-referencing against allegation subject matter
Do not summarise — surface raw findings for analyst review.
Allegation details: ${triggerNotes}
${priorCtx}`;

    case TRIGGER_TYPES.REGULATORY_ENFORCEMENT:
      return `You are reviewing entity "${entityName}" following a regulatory or enforcement action.
Identify the specific action and determine whether it is DIRECT or INDIRECT to this entity.
If DIRECT: treat as enhanced scope regardless of initial authorisation — apply full EDD research steps.
If INDIRECT: proceed at standard scope with a dedicated regulatory context section.
Enforcement details: ${triggerNotes}
${priorCtx}`;

    case TRIGGER_TYPES.OTHER: {
      const lower = (triggerNotes || "").toLowerCase();
      const flagged = ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
      if (flagged) {
        return { flag: "SCOPE_REVIEW_REQUIRED", triggerNotes };
      }
      return `You are reviewing entity "${entityName}" for the following reason:
${triggerNotes}
Proceed with standard scope.
${priorCtx}`;
    }

    default:
      return `You are reviewing entity "${entityName}". Proceed with standard scope.\n${priorCtx}`;
  }
}

/* ────── RESEARCH PROMPT BUILDER ────── */

interface ResearchParams {
  scopeLevel: "standard" | "enhanced";
  triggerType: TriggerType;
  priorCaseSummary: string | null;
  triggerNotes: string;
}

function buildResearchPrompt(params: ResearchParams): string {
  const { scopeLevel, triggerType, priorCaseSummary, triggerNotes } = params;

  const standardItems = `STANDARD SCOPE — you MUST address all 7 items:
1. Corporate registry — filing status, registered address, current officers
2. PSC / beneficial ownership — confirm or establish ownership chain
3. Sanctions screening — OFAC SDN, UKSL, EU FSF consolidated lists
4. PEP screening — principals and beneficial owners ≥25%
5. Adverse media — 24-month lookback from today's date
6. Jurisdiction risk — CR-JURIS-1.0 score for the entity's primary jurisdiction
7. Change delta — explicitly state every material change since the prior review OR confirm nil-change (nil-change is a required output, not absence of finding)`;

  const enhancedItems = `ENHANCED SCOPE — in addition to items 1–7 above, address items 8–13:
8. Adverse media extended — 60-month lookback
9. Extended ownership — beyond 25% PSC threshold, intermediate structures, nominee arrangements
10. Director cross-referencing — prior directorships, dissolved entities, connected persons
11. Litigation and enforcement search — court filings, regulatory actions, tribunal records
12. Financial health — CCJs, insolvency events, credit events (public sources only)
13. Allegation-specific (ONLY if trigger is allegation_whistleblowing) — research the subject matter from the trigger notes below, state confidence level for each finding, do not draw conclusions
    Trigger notes: ${triggerNotes}`;

  const priorCtx = priorCaseSummary
    ? `\nPrior case summary for delta comparison:\n${priorCaseSummary}`
    : "\nNo prior case available — treat all findings as baseline.";

  const outputSpec = `
Return structured JSON with exactly these fields:
{
  "entity_id": "<uuid>",
  "scope": "${scopeLevel}",
  "trigger": "${triggerType}",
  "findings": [ { "item_number": <int>, "area": "<string>", "detail": "<string>", "sources": ["<string>"] } ],
  "change_delta": "<string describing changes or 'nil-change'>",
  "risk_indicators": [ "<string>" ],
  "recommended_tier": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "tier_change": <boolean>,
  "flags_for_analyst": [ "<string>" ],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "sources": [ "<string>" ]
}`;

  let prompt = standardItems;
  if (scopeLevel === "enhanced") {
    prompt += "\n\n" + enhancedItems;
  }
  prompt += priorCtx + "\n" + outputSpec;

  return prompt;
}

/* ────── COMPLIANCE GATE PROMPT BUILDER ────── */

interface ComplianceGateResult {
  decision: "APPROVED" | "BLOCKED" | "PENDING_SIGNOFF";
  reason: string;
  appendToConclusion?: string;
}

function buildComplianceGatePrompt(researchOutput: any, triggerType: TriggerType, scopeLevel: string): ComplianceGateResult {
  // RULE 1: Allegation at standard scope → block
  if (triggerType === TRIGGER_TYPES.ALLEGATION_WHISTLEBLOWING && scopeLevel === "standard") {
    return { decision: "BLOCKED", reason: "Allegation trigger requires EDD scope." };
  }

  // RULE 2: Allegation subject matter not addressed
  if (triggerType === TRIGGER_TYPES.ALLEGATION_WHISTLEBLOWING) {
    const findings = researchOutput?.findings || [];
    const hasAllegationItem = findings.some(
      (f: any) => f.item_number === 13 || (f.area || "").toLowerCase().includes("allegation")
    );
    if (!hasAllegationItem) {
      return { decision: "BLOCKED", reason: "Allegation subject matter not addressed in findings." };
    }
  }

  // RULE 3: Tier change → pending sign-off
  if (researchOutput?.tier_change === true) {
    return {
      decision: "PENDING_SIGNOFF",
      reason: "Risk tier change requires analyst acknowledgement before release.",
    };
  }

  // RULE 4: Critical tier → block
  if (researchOutput?.recommended_tier === "CRITICAL") {
    return {
      decision: "BLOCKED",
      reason: "Critical tier — Director sign-off required. Recommended action must be documented.",
    };
  }

  // RULE 5: Periodic cadence nil-change → approve with appendix
  if (triggerType === TRIGGER_TYPES.PERIODIC_CADENCE && (researchOutput?.change_delta || "").toLowerCase().includes("nil-change")) {
    const priorDate = researchOutput?.prior_review_date || "N/A";
    const nextDate = researchOutput?.next_review_date || "to be determined";
    return {
      decision: "APPROVED",
      reason: "Nil-change periodic review.",
      appendToConclusion: `No material changes identified since ${priorDate}. Risk tier confirmed. Next scheduled review: ${nextDate}. Nil-change finding recorded in audit trail.`,
    };
  }

  // RULE 6: Default approve
  return { decision: "APPROVED", reason: "All compliance gates passed." };
}

/* ────── DRAFTING PROMPT BUILDER ────── */

interface DraftingParams {
  triggerType: TriggerType;
  scopeLevel: "standard" | "enhanced";
  researchOutput: any;
  priorCaseSummary: string | null;
  entityName: string;
  entityType: string;
}

function buildDraftingPrompt(params: DraftingParams): string {
  const { triggerType, scopeLevel, researchOutput, priorCaseSummary, entityName, entityType } = params;
  const researchCtx = `\nResearch output:\n${JSON.stringify(researchOutput, null, 2)}`;
  const priorCtx = priorCaseSummary ? `\nPrior case summary:\n${priorCaseSummary}` : "";

  const baseRules = `CRITICAL RULES:
- Use ONLY neutral, institutional language
- Reference ONLY the data provided — never speculate
- NEVER give legal conclusions or opinions
- Every finding must include a source reference and date
- All output will be passed through a guardrail sanitiser — do not use banned phrases`;

  switch (triggerType) {
    case TRIGGER_TYPES.CONTRACT_RENEWAL:
    case TRIGGER_TYPES.PERIODIC_CADENCE:
      return `Draft a review report for ${entityType} "${entityName}".
Report structure:
1. One-sentence programme status statement
2. Change delta (lead section) — detail every change since the prior review
3. If nil-change: state explicitly as the primary finding ("No material changes identified")
4. Confirmed risk tier
5. Confirmed next review date
${baseRules}${researchCtx}${priorCtx}`;

    case TRIGGER_TYPES.NEW_JURISDICTION:
      return `Draft a jurisdiction exposure report for ${entityType} "${entityName}".
Report structure:
1. Jurisdiction risk score (CR-JURIS-1.0) and FATF/OFAC/UKSL status
2. Whether the new exposure changes the entity's overall risk tier
3. Local regulatory environment summary
4. Relevant sanctions regime
5. Recommended monitoring cadence
${baseRules}${researchCtx}${priorCtx}`;

    case TRIGGER_TYPES.ESCALATION_REQUEST:
      return `Draft a targeted escalation report for ${entityType} "${entityName}".
Report structure:
1. Escalation subject matter (lead section)
2. Findings structured around the specific concern
3. Do NOT pad with boilerplate sections
4. Close with a clear recommended action
${baseRules}${researchCtx}${priorCtx}`;

    case TRIGGER_TYPES.ALLEGATION_WHISTLEBLOWING:
      return `Draft an Enhanced Due Diligence report for ${entityType} "${entityName}" following an allegation/whistleblowing trigger.
DO NOT use a standard report template. Structure as:
1. Allegation summary
2. Evidence reviewed (every source must be named, dated, and linked)
3. Findings by subject matter
4. Corroborating or contradicting indicators
5. Recommended action
Every finding must be sourced and dated. No conclusions without evidence.
Flag: ANALYST REVIEW REQUIRED before any release.
${baseRules}${researchCtx}${priorCtx}`;

    case TRIGGER_TYPES.REGULATORY_ENFORCEMENT: {
      const isDirect = researchOutput?.enforcement_direct === true;
      if (isDirect) {
        return `Draft an Enhanced Due Diligence report for ${entityType} "${entityName}" following a DIRECT regulatory/enforcement action.
Lead with whether the action is direct to this entity (confirmed: YES — DIRECT).
Use EDD report structure (same as allegation template):
1. Enforcement action summary
2. Evidence reviewed
3. Findings by subject matter
4. Corroborating or contradicting indicators
5. Recommended action
${baseRules}${researchCtx}${priorCtx}`;
      }
      return `Draft a standard review report for ${entityType} "${entityName}" following an INDIRECT regulatory/enforcement action.
Report structure:
1. State that the enforcement action is INDIRECT to this entity
2. Standard review sections
3. Dedicated "Regulatory Context" section explaining the indirect relationship
4. Risk tier assessment with consideration of indirect exposure
${baseRules}${researchCtx}${priorCtx}`;
    }

    case TRIGGER_TYPES.OTHER:
      return `Draft a standard review report for ${entityType} "${entityName}".
Prepend a one-paragraph section titled "Trigger Context" that quotes the free-text trigger reason verbatim:
"${researchOutput?.trigger_notes || ""}"
Then proceed with standard report structure.
${baseRules}${researchCtx}${priorCtx}`;

    default:
      return `Draft a standard review report for ${entityType} "${entityName}".\n${baseRules}${researchCtx}${priorCtx}`;
  }
}

/* ────── ORIGINAL SYSTEM PROMPT (legacy 3-stage review) ────── */

const SYSTEM_PROMPT = `You are a controlled review agent for a compliance due-diligence platform.
You produce ADVISORY PROMPTS ONLY — you NEVER modify data or override human decisions.

CRITICAL LANGUAGE RULES — you MUST follow these without exception:
- Use ONLY neutral, institutional language
- Reference ONLY the data provided — never speculate
- NEVER give legal conclusions or opinions
- NEVER use predictive language ("will likely", "is expected to", "will certainly")
- NEVER use accusatory terms ("guilty", "illegal", "evidence of wrongdoing", "criminal", "fraudulent")
- NEVER state opinions ("we believe", "in our opinion", "we conclude")
- Use conditional phrasing: "indicators suggest", "based on available data", "may require further review"
- When referencing adverse findings, use: "adverse indicators identified", "flags for review", "findings requiring attention"

You run three independent review stages and return structured outputs for each:

STAGE 1 — Pre-QA Completeness Review:
Check whether the case is ready for QA submission by verifying:
- Source retrieval logs exist and cover key check types
- Required investigation tasks are completed
- Risk model score has been populated
Flag any gaps as advisory prompts.

STAGE 2 — Risk Drift Monitor:
Compare the current entity risk score against prior case history.
Flag significant movement (score difference > 15 points or band change).
If no prior scores exist, note that baseline comparison is unavailable.

STAGE 3 — Jurisdiction Overlay:
Cross-reference recent jurisdiction benchmark updates against the entity's country/sector.
Flag if any updates are relevant to this case.
If no updates exist, note that the jurisdiction profile should be checked manually.

Rules:
- Produce advisory prompts only
- Never modify any data
- Never auto-approve or auto-reject
- Reference only the data provided
- Use neutral institutional language`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "agentic_review",
      description: "Return advisory outputs for all three review stages.",
      parameters: {
        type: "object",
        properties: {
          pre_qa_review: {
            type: "object",
            properties: {
              ready_for_qa: { type: "boolean", description: "Whether the case appears ready for QA submission." },
              checks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string", description: "What was checked." },
                    status: { type: "string", enum: ["pass", "warning", "fail"] },
                    detail: { type: "string" },
                  },
                  required: ["area", "status", "detail"],
                  additionalProperties: false,
                },
              },
              advisory_prompt: { type: "string", description: "Summary advisory for the officer." },
            },
            required: ["ready_for_qa", "checks", "advisory_prompt"],
            additionalProperties: false,
          },
          risk_drift: {
            type: "object",
            properties: {
              drift_detected: { type: "boolean" },
              current_band: { type: "string" },
              current_score: { type: "number" },
              prior_band: { type: "string" },
              prior_score: { type: "number" },
              score_delta: { type: "number" },
              advisory_prompt: { type: "string" },
            },
            required: ["drift_detected", "current_band", "current_score", "prior_band", "prior_score", "score_delta", "advisory_prompt"],
            additionalProperties: false,
          },
          jurisdiction_overlay: {
            type: "object",
            properties: {
              relevant_updates_found: { type: "boolean" },
              updates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    category: { type: "string" },
                    relevance: { type: "string", enum: ["high", "medium", "low"] },
                    summary: { type: "string" },
                  },
                  required: ["title", "category", "relevance", "summary"],
                  additionalProperties: false,
                },
              },
              advisory_prompt: { type: "string" },
            },
            required: ["relevant_updates_found", "updates", "advisory_prompt"],
            additionalProperties: false,
          },
        },
        required: ["pre_qa_review", "risk_drift", "jurisdiction_overlay"],
        additionalProperties: false,
      },
    },
  },
];

/* ────── AI GATEWAY HELPER ────── */

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any): Promise<any> {
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    throw { httpStatus: status, message: text };
  }

  return response.json();
}

/* ────── SERVE ────── */

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const reqBody = await req.json();
    const { case_id, trigger_type, scope_level, trigger_notes } = reqBody;

    if (!case_id)
      return new Response(JSON.stringify({ error: "case_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const resolvedTrigger: TriggerType = trigger_type || TRIGGER_TYPES.PERIODIC_CADENCE;
    const resolvedScope: "standard" | "enhanced" = scope_level === "enhanced" ? "enhanced" : "standard";
    const resolvedNotes: string = trigger_notes || "";

    // Fetch case + entity
    const { data: caseData, error: caseErr } = await supabase
      .from("cases")
      .select("*, entities(name, risk_tier, country, entity_type, data_access_level, hq_country_code)")
      .eq("id", case_id)
      .single();
    if (caseErr || !caseData)
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Persist trigger type and scope on case record for audit trail
    await supabaseAdmin.from("cases").update({
      internal_notes: [
        caseData.internal_notes || "",
        `[Agentic Review] trigger=${resolvedTrigger}, scope=${resolvedScope}, notes=${resolvedNotes} @ ${new Date().toISOString()}`,
      ].filter(Boolean).join("\n"),
    }).eq("id", case_id);

    // Fetch retrieval logs, tasks, scores, jurisdiction updates in parallel
    const [
      { data: retrievalLogs },
      { data: tasks },
      { data: currentScore },
      { data: priorScores },
    ] = await Promise.all([
      supabase.from("retrieval_logs").select("*, research_sources(source_name, category)").eq("case_id", case_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("case_tasks").select("id, title, status").eq("case_id", case_id),
      supabase.from("entity_risk_scores").select("*").eq("entity_id", caseData.entity_id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("entity_risk_scores").select("overall_score, risk_band, calculated_at").eq("entity_id", caseData.entity_id).order("calculated_at", { ascending: false }).limit(5),
    ]);

    // Fetch jurisdiction updates
    const entityCountry = caseData.entities?.hq_country_code || caseData.entities?.country;
    let jurisdictionUpdates: any[] = [];
    if (entityCountry) {
      const { data: jpData } = await supabase.from("jurisdiction_profiles").select("id").eq("country_code", entityCountry).maybeSingle();
      if (jpData) {
        const { data: updates } = await supabase.from("jurisdiction_updates").select("title, category, factual_summary, update_date").eq("jurisdiction_id", jpData.id).order("update_date", { ascending: false }).limit(10);
        jurisdictionUpdates = updates ?? [];
      }
    }

    // Build prior case summary from scores
    const priorCaseSummary = (priorScores && priorScores.length > 1)
      ? `Prior review scored ${priorScores[1].overall_score} (${priorScores[1].risk_band}) on ${priorScores[1].calculated_at}.`
      : null;

    // ── STAGE 1: INTAKE ──
    const intakeResult = buildIntakePrompt({
      entityName: caseData.entities?.name || "Unknown Entity",
      triggerId: resolvedTrigger,
      triggerNotes: resolvedNotes,
      priorCaseSummary,
      scopeLevel: resolvedScope,
    });

    // Check for early-exit conditions (scope insufficient or scope review required)
    if (typeof intakeResult === "object" && "error" in intakeResult) {
      return new Response(JSON.stringify(intakeResult), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof intakeResult === "object" && "flag" in intakeResult) {
      return new Response(JSON.stringify(intakeResult), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intakeSystemPrompt = intakeResult as string;

    // Build context for legacy 3-stage review
    const context = {
      entity: caseData.entities,
      case: { id: caseData.id, status: caseData.status, case_type: caseData.case_type, report_tier: caseData.report_tier, priority: caseData.priority },
      trigger: { type: resolvedTrigger, scope: resolvedScope, notes: resolvedNotes },
      retrieval_logs: (retrievalLogs ?? []).map((l: any) => ({
        source: l.research_sources?.source_name, category: l.research_sources?.category,
        outcome: l.outcome_status, purpose: l.purpose_of_search,
      })),
      tasks: (tasks ?? []).map((t: any) => ({ title: t.title, status: t.status })),
      current_risk_score: currentScore ? {
        overall_score: currentScore.overall_score, risk_band: currentScore.risk_band,
        jurisdiction_score: currentScore.jurisdiction_score, structural_score: currentScore.structural_score,
        association_score: currentScore.association_score, event_score: currentScore.event_score,
        reason_codes: currentScore.reason_codes, calculated_at: currentScore.calculated_at,
      } : null,
      prior_risk_scores: (priorScores ?? []).slice(1).map((s: any) => ({
        overall_score: s.overall_score, risk_band: s.risk_band, calculated_at: s.calculated_at,
      })),
      jurisdiction_updates: jurisdictionUpdates.map((u: any) => ({
        title: u.title, category: u.category, summary: u.factual_summary, date: u.update_date,
      })),
    };

    // ── STAGE 2: RESEARCH PROMPT ──
    const researchPrompt = buildResearchPrompt({
      scopeLevel: resolvedScope,
      triggerType: resolvedTrigger,
      priorCaseSummary,
      triggerNotes: resolvedNotes,
    });

    // Combine intake + research into the system prompt for the AI call
    const combinedSystemPrompt = `${intakeSystemPrompt}\n\n--- RESEARCH BRIEF ---\n${researchPrompt}\n\n--- LEGACY 3-STAGE REVIEW ---\n${SYSTEM_PROMPT}`;

    const userPrompt = `Run all three review stages on this case data:\n\n${JSON.stringify(context, null, 2)}`;

    let result: any;
    try {
      result = await callAI(LOVABLE_API_KEY, combinedSystemPrompt, userPrompt, TOOLS, { type: "function", function: { name: "agentic_review" } });
    } catch (err: any) {
      if (err.httpStatus === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (err.httpStatus === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      console.error("AI gateway error:", err);
      return new Response(JSON.stringify({ error: "AI review failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall)
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const rawReview = JSON.parse(toolCall.function.arguments);

    // ── STAGE 3: COMPLIANCE GATE ──
    const complianceGate = buildComplianceGatePrompt(rawReview.research_output || {}, resolvedTrigger, resolvedScope);

    // ── STAGE 4: DRAFTING PROMPT (generated but not executed in this call — available for downstream) ──
    const draftingPrompt = buildDraftingPrompt({
      triggerType: resolvedTrigger,
      scopeLevel: resolvedScope,
      researchOutput: rawReview.research_output || {},
      priorCaseSummary,
      entityName: caseData.entities?.name || "Unknown Entity",
      entityType: caseData.entities?.entity_type || "entity",
    });

    // ── GUARDRAIL: Sanitise output ──
    const { sanitised, totalViolations, allReplacements } = sanitiseReview(rawReview);

    // ── Log to ai_output_log ──
    const { data: profileData } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (profileData?.org_id) {
      await supabaseAdmin.from("ai_output_log").insert({
        case_id: case_id,
        org_id: profileData.org_id,
        function_name: "agentic-review",
        model_used: "google/gemini-3-flash-preview",
        raw_output: rawReview,
        sanitised_output: sanitised,
        guardrail_violations_found: totalViolations,
        guardrail_replacements: allReplacements,
        ai_disclaimer: AI_DISCLAIMER,
        created_by: user.id,
      });
    }

    return new Response(JSON.stringify({
      review: sanitised,
      trigger: { type: resolvedTrigger, scope: resolvedScope },
      compliance_gate: complianceGate,
      drafting_prompt: draftingPrompt,
      generated_at: new Date().toISOString(),
      guardrail_applied: true,
      violations_sanitised: totalViolations,
      ai_disclaimer: AI_DISCLAIMER,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agentic-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
