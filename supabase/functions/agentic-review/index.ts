import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a controlled review agent for a compliance due-diligence platform.
You produce ADVISORY PROMPTS ONLY — you NEVER modify data or override human decisions.

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
                    area: { type: "string", description: "What was checked (e.g. 'retrieval_logs', 'task_completion', 'risk_model')." },
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
              prior_band: { type: "string", description: "Band from most recent prior score, or 'N/A'." },
              prior_score: { type: "number", description: "Prior overall score, or -1 if unavailable." },
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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { case_id } = await req.json();
    if (!case_id)
      return new Response(JSON.stringify({ error: "case_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Fetch case + entity
    const { data: caseData, error: caseErr } = await supabase
      .from("cases")
      .select("*, entities(name, risk_tier, country, entity_type, data_access_level, hq_country_code)")
      .eq("id", case_id)
      .single();
    if (caseErr || !caseData)
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Fetch prior risk scores (all except most recent)
    const { data: priorScores } = await supabase
      .from("entity_risk_scores")
      .select("overall_score, risk_band, calculated_at")
      .eq("entity_id", caseData.entity_id)
      .order("calculated_at", { ascending: false })
      .limit(5);

    // Fetch jurisdiction updates if entity has a country
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
      case: {
        id: caseData.id,
        status: caseData.status,
        case_type: caseData.case_type,
        report_tier: caseData.report_tier,
        priority: caseData.priority,
      },
      retrieval_logs: (retrievalLogs ?? []).map((l: any) => ({
        source: l.research_sources?.source_name,
        category: l.research_sources?.category,
        outcome: l.outcome_status,
        purpose: l.purpose_of_search,
      })),
      tasks: (tasks ?? []).map((t: any) => ({
        title: t.title,
        status: t.status,
      })),
      current_risk_score: currentScore ? {
        overall_score: currentScore.overall_score,
        risk_band: currentScore.risk_band,
        jurisdiction_score: currentScore.jurisdiction_score,
        structural_score: currentScore.structural_score,
        association_score: currentScore.association_score,
        event_score: currentScore.event_score,
        reason_codes: currentScore.reason_codes,
        calculated_at: currentScore.calculated_at,
      } : null,
      prior_risk_scores: (priorScores ?? []).slice(1).map((s: any) => ({
        overall_score: s.overall_score,
        risk_band: s.risk_band,
        calculated_at: s.calculated_at,
      })),
      jurisdiction_updates: jurisdictionUpdates.map((u: any) => ({
        title: u.title,
        category: u.category,
        summary: u.factual_summary,
        date: u.update_date,
      })),
    };

    const userPrompt = `Run all three review stages on this case data:\n\n${JSON.stringify(context, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI review failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const review = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ review, generated_at: new Date().toISOString() }), {
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
