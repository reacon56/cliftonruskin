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

function sanitiseAnalysis(raw: any): { sanitised: any; totalViolations: number; allReplacements: any[] } {
  let totalViolations = 0;
  const allReplacements: any[] = [];

  const processField = (value: string, field: string) => {
    const { sanitised, replacements } = sanitiseText(value);
    totalViolations += replacements.length;
    allReplacements.push(...replacements.map((r) => ({ ...r, field })));
    return sanitised;
  };

  const sanitised = { ...raw };
  if (sanitised.executive_summary) sanitised.executive_summary = processField(sanitised.executive_summary, "executive_summary");
  if (sanitised.risk_driver_explanation) sanitised.risk_driver_explanation = processField(sanitised.risk_driver_explanation, "risk_driver_explanation");
  if (Array.isArray(sanitised.follow_up_suggestions)) {
    sanitised.follow_up_suggestions = sanitised.follow_up_suggestions.map((s: string, i: number) => processField(s, `follow_up_${i}`));
  }
  if (Array.isArray(sanitised.inconsistency_flags)) {
    sanitised.inconsistency_flags = sanitised.inconsistency_flags.map((f: any, i: number) => ({
      ...f,
      description: processField(f.description, `inconsistency_${i}`),
    }));
  }

  return { sanitised, totalViolations, allReplacements };
}

const AI_DISCLAIMER = "AI-assisted drafting used. Human review completed.";

const SYSTEM_PROMPT = `You are a compliance assurance assistant for a due-diligence platform.
You analyse ONLY the structured case data and retrieval logs provided.

CRITICAL LANGUAGE RULES — you MUST follow these without exception:
- Use ONLY neutral, institutional language
- Reference ONLY the data provided — never speculate
- NEVER give legal conclusions or opinions
- NEVER use predictive language ("will likely", "is expected to", "will certainly")
- NEVER use accusatory terms ("guilty", "illegal", "evidence of wrongdoing", "criminal", "fraudulent")
- NEVER state opinions ("we believe", "in our opinion", "we conclude")
- NEVER recommend overriding or changing the risk score
- Use conditional phrasing: "indicators suggest", "based on available data", "may require further review"
- When referencing adverse findings, use: "adverse indicators identified", "flags for review", "findings requiring attention"

You will be asked to produce one of four outputs via tool calling:
1. executive_summary – A neutral factual summary of the case findings
2. risk_driver_explanation – Explain which risk pillars drove the score, referencing structured indicators only
3. follow_up_suggestions – Suggest further checks based on risk band, jurisdiction, and event indicators
4. inconsistency_flags – Flag mismatches between risk score and findings, missing source checks, or gaps between adverse media and commentary`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "assurance_analysis",
      description: "Return all four AI assurance outputs for the case.",
      parameters: {
        type: "object",
        properties: {
          executive_summary: {
            type: "string",
            description: "Neutral institutional summary of the case. No opinions, no predictive language, no legal conclusions.",
          },
          risk_driver_explanation: {
            type: "string",
            description: "Explanation of which risk pillars drove the score, referencing structured indicators only.",
          },
          follow_up_suggestions: {
            type: "array",
            items: { type: "string" },
            description: "List of suggested follow-up checks based on risk band, jurisdiction benchmark, and event risk indicators.",
          },
          inconsistency_flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["score_findings_mismatch", "media_commentary_gap", "missing_source_check", "other"] },
                description: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["type", "description", "severity"],
              additionalProperties: false,
            },
            description: "Flagged inconsistencies between risk score and findings, adverse media and commentary, or missing source checks.",
          },
        },
        required: ["executive_summary", "risk_driver_explanation", "follow_up_suggestions", "inconsistency_flags"],
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

    // Fetch case data
    const { data: caseData, error: caseErr } = await supabase
      .from("cases")
      .select("*, entities(name, risk_tier, country, entity_type, data_access_level)")
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

    // Fetch risk score
    const { data: riskScore } = await supabase
      .from("entity_risk_scores")
      .select("*")
      .eq("entity_id", caseData.entity_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch report draft
    const { data: reportDraft } = await supabase
      .from("report_drafts")
      .select("officer_commentary, ai_draft, report_version")
      .eq("case_id", case_id)
      .maybeSingle();

    // Build context
    const context = {
      entity: caseData.entities,
      case: {
        id: caseData.id, status: caseData.status, case_type: caseData.case_type,
        report_tier: caseData.report_tier, priority: caseData.priority,
        dp_risk_level: caseData.dp_risk_level, processing_purpose: caseData.processing_purpose,
        lawful_basis: caseData.lawful_basis, created_at: caseData.created_at, due_date: caseData.due_date,
      },
      risk_score: riskScore ? {
        overall_score: riskScore.overall_score, risk_band: riskScore.risk_band,
        jurisdiction_score: riskScore.jurisdiction_score, structural_score: riskScore.structural_score,
        association_score: riskScore.association_score, event_score: riskScore.event_score,
        reason_codes: riskScore.reason_codes, confidence: riskScore.confidence,
      } : null,
      retrieval_logs: (retrievalLogs ?? []).map((l: any) => ({
        source: l.research_sources?.source_name, category: l.research_sources?.category,
        outcome: l.outcome_status, purpose: l.purpose_of_search, notes: l.notes_internal, promoted_to: l.promoted_to,
      })),
      officer_commentary: reportDraft?.officer_commentary ?? null,
    };

    const userPrompt = `Analyse the following case data and produce your assurance analysis.\n\n${JSON.stringify(context, null, 2)}`;

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
        tool_choice: { type: "function", function: { name: "assurance_analysis" } },
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
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall)
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const rawAnalysis = JSON.parse(toolCall.function.arguments);

    // ── GUARDRAIL: Sanitise output ──
    const { sanitised, totalViolations, allReplacements } = sanitiseAnalysis(rawAnalysis);

    // ── Log to ai_output_log (using service role to bypass RLS for insert) ──
    // Get user's org_id
    const { data: profileData } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (profileData?.org_id) {
      await supabaseAdmin.from("ai_output_log").insert({
        case_id: case_id,
        org_id: profileData.org_id,
        function_name: "ai-assurance-assistant",
        model_used: "google/gemini-3-flash-preview",
        raw_output: rawAnalysis,
        sanitised_output: sanitised,
        guardrail_violations_found: totalViolations,
        guardrail_replacements: allReplacements,
        ai_disclaimer: AI_DISCLAIMER,
        report_version: reportDraft?.report_version ?? null,
        created_by: user.id,
      });
    }

    return new Response(JSON.stringify({
      analysis: sanitised,
      generated_at: new Date().toISOString(),
      guardrail_applied: true,
      violations_sanitised: totalViolations,
      ai_disclaimer: AI_DISCLAIMER,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assurance-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
