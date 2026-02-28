import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      entity_name,
      entity_type,
      jurisdictions,
      risk_band,
      risk_score,
      contributing_factors,
      recommended_controls,
      client_policy_outcome,
    } = await req.json();

    // Fetch the template prompt
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: template } = await adminClient
      .from("narrative_template")
      .select("content_markdown")
      .eq("template_key", "exec_summary_default")
      .single();

    const systemPrompt = template?.content_markdown ??
      "Generate a 120-180 word executive summary in British assurance firm tone.";

    // Build the user prompt with all context
    const factorsText = (contributing_factors ?? [])
      .slice(0, 3)
      .map((f: any, i: number) => `${i + 1}. ${f.indicator_type}: ${f.description ?? f.status ?? "flagged"} (effective ${f.effective_date ?? "N/A"}, retrieved ${f.retrieved_at ?? "N/A"})`)
      .join("\n");

    const controlsText = (recommended_controls ?? [])
      .map((c: any) => `- ${typeof c === "string" ? c : c.control ?? c.label ?? JSON.stringify(c)}`)
      .join("\n");

    const jurisdictionsText = (jurisdictions ?? [])
      .map((j: any) => typeof j === "string" ? j : `${j.country_name} (${j.country_code})`)
      .join(", ");

    const policyNote = client_policy_outcome
      ? `\nClient policy outcome: ${JSON.stringify(client_policy_outcome)}`
      : "";

    const userPrompt = `Entity: ${entity_name ?? "Unknown"} (${entity_type ?? "Corporate"})
Linked jurisdictions: ${jurisdictionsText || "None specified"}
CR Risk Band: ${risk_band ?? "PENDING"} (score: ${risk_score ?? "N/A"})

Top contributing factors:
${factorsText || "None identified"}

Recommended controls:
${controlsText || "Standard monitoring"}
${policyNote}

Write the executive summary paragraph now. Use exactly 120-180 words. Do not use bullet points. Do not include headings. Write in third person.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const narrative = aiResult.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-narrative error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
