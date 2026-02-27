import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a compliance assurance assistant for a due-diligence platform.
You analyse ONLY the structured case data and retrieval logs provided.

You MUST:
- Use neutral, institutional language
- Reference only the data provided
- Never give legal conclusions or opinions
- Never use predictive language
- Never override or recommend changing the risk score

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
            description:
              "Neutral institutional summary of the case. No opinions, no predictive language, no legal conclusions.",
          },
          risk_driver_explanation: {
            type: "string",
            description:
              "Explanation of which risk pillars drove the score, referencing structured indicators only.",
          },
          follow_up_suggestions: {
            type: "array",
            items: { type: "string" },
            description:
              "List of suggested follow-up checks based on risk band, jurisdiction benchmark, and event risk indicators.",
          },
          inconsistency_flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "score_findings_mismatch",
                    "media_commentary_gap",
                    "missing_source_check",
                    "other",
                  ],
                },
                description: { type: "string" },
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
              },
              required: ["type", "description", "severity"],
              additionalProperties: false,
            },
            description:
              "Flagged inconsistencies between risk score and findings, adverse media and commentary, or missing source checks.",
          },
        },
        required: [
          "executive_summary",
          "risk_driver_explanation",
          "follow_up_suggestions",
          "inconsistency_flags",
        ],
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

    // Verify user is authenticated and internal
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { case_id } = await req.json();
    if (!case_id)
      return new Response(
        JSON.stringify({ error: "case_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    // Fetch case data
    const { data: caseData, error: caseErr } = await supabase
      .from("cases")
      .select("*, entities(name, risk_tier, country, entity_type, data_access_level)")
      .eq("id", case_id)
      .single();
    if (caseErr || !caseData)
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

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

    // Fetch report draft commentary (if exists)
    const { data: reportDraft } = await supabase
      .from("report_drafts")
      .select("officer_commentary, ai_draft")
      .eq("case_id", case_id)
      .maybeSingle();

    // Build context for AI
    const context = {
      entity: caseData.entities,
      case: {
        id: caseData.id,
        status: caseData.status,
        case_type: caseData.case_type,
        report_tier: caseData.report_tier,
        priority: caseData.priority,
        dp_risk_level: caseData.dp_risk_level,
        processing_purpose: caseData.processing_purpose,
        lawful_basis: caseData.lawful_basis,
        created_at: caseData.created_at,
        due_date: caseData.due_date,
      },
      risk_score: riskScore
        ? {
            overall_score: riskScore.overall_score,
            risk_band: riskScore.risk_band,
            jurisdiction_score: riskScore.jurisdiction_score,
            structural_score: riskScore.structural_score,
            association_score: riskScore.association_score,
            event_score: riskScore.event_score,
            reason_codes: riskScore.reason_codes,
            confidence: riskScore.confidence,
          }
        : null,
      retrieval_logs: (retrievalLogs ?? []).map((l: any) => ({
        source: l.research_sources?.source_name,
        category: l.research_sources?.category,
        outcome: l.outcome_status,
        purpose: l.purpose_of_search,
        notes: l.notes_internal,
        promoted_to: l.promoted_to,
      })),
      officer_commentary: reportDraft?.officer_commentary ?? null,
    };

    const userPrompt = `Analyse the following case data and produce your assurance analysis.\n\n${JSON.stringify(context, null, 2)}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
          tool_choice: {
            type: "function",
            function: { name: "assurance_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ analysis, generated_at: new Date().toISOString() }), {
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
