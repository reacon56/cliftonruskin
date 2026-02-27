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

  return { sanitised, totalViolations, allReplacements };
}

const AI_DISCLAIMER = "AI-assisted drafting used. Human review completed.";

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

    const { case_id } = await req.json();
    if (!case_id)
      return new Response(JSON.stringify({ error: "case_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

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

    // Fetch retrieval logs
    const { data: retrievalLogs } = await supabase
      .from("retrieval_logs")
      .select("*, research_sources(source_name, category)")
      .eq("case_id", case_id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch tasks
    const { data: tasks } = await supabase
      .from("case_tasks")
      .select("id, title, status")
      .eq("case_id", case_id);

    // Fetch current risk score
    const { data: currentScore } = await supabase
      .from("entity_risk_scores")
      .select("*")
      .eq("entity_id", caseData.entity_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch prior risk scores
    const { data: priorScores } = await supabase
      .from("entity_risk_scores")
      .select("overall_score, risk_band, calculated_at")
      .eq("entity_id", caseData.entity_id)
      .order("calculated_at", { ascending: false })
      .limit(5);

    // Fetch jurisdiction updates
    const entityCountry = caseData.entities?.hq_country_code || caseData.entities?.country;
    let jurisdictionUpdates: any[] = [];
    if (entityCountry) {
      const { data: jpData } = await supabase
        .from("jurisdiction_profiles")
        .select("id")
        .eq("country_code", entityCountry)
        .maybeSingle();
      if (jpData) {
        const { data: updates } = await supabase
          .from("jurisdiction_updates")
          .select("title, category, factual_summary, update_date")
          .eq("jurisdiction_id", jpData.id)
          .order("update_date", { ascending: false })
          .limit(10);
        jurisdictionUpdates = updates ?? [];
      }
    }

    // Build context
    const context = {
      entity: caseData.entities,
      case: { id: caseData.id, status: caseData.status, case_type: caseData.case_type, report_tier: caseData.report_tier, priority: caseData.priority },
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

    const userPrompt = `Run all three review stages on this case data:\n\n${JSON.stringify(context, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "agentic_review" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI review failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall)
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const rawReview = JSON.parse(toolCall.function.arguments);

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
