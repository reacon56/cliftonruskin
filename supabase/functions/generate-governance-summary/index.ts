import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Regulatory Enforcement": ["fine", "enforcement", "penalty", "regulatory", "compliance failure"],
  "Sanctions & Exposure": ["sanctions", "asset freeze", "ofac", "designated", "ofsi"],
  "Ownership & Control": ["ownership transparency", "beneficial ownership", "shell company", "nominee"],
  "Corporate Governance": ["bribery", "corruption", "deferred prosecution", "fraud", "governance"],
  "Supply Chain Integrity": ["procurement", "counterparty", "supply chain", "third party"],
};

function suggestCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Regulatory Enforcement";
}

function detectCountry(title: string): string | null {
  const lower = title.toLowerCase();
  const map: Record<string, string> = {
    "uk": "GB", "united kingdom": "GB", "britain": "GB", "fca": "GB", "sfo": "GB",
    "companies house": "GB", "ofsi": "GB",
    "us": "US", "united states": "US", "sec": "US", "doj": "US", "ofac": "US",
    "eu": "EU", "european": "EU",
    "germany": "DE", "france": "FR", "switzerland": "CH",
  };
  for (const [keyword, code] of Object.entries(map)) {
    if (lower.includes(keyword)) return code;
  }
  return null;
}

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw { status: response.status, body: t };
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, source, link, org_id } = await req.json();
    if (!title) throw new Error("title is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const category = suggestCategory(title);
    const country = detectCountry(title);

    // Step 1: Relevance scoring against PIP (if org_id provided)
    // This runs FIRST so we can skip analysis for not_relevant items
    let relevance_score: string | null = null;
    let relevance_reasoning: string | null = null;
    let sectors: string[] = [];
    let jurisdictionNames: string[] = [];
    let manualContext = "";
    let hasPip = false;

    if (org_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);

        const { data: pip } = await sb
          .from("programme_intelligence_profile")
          .select("sector_profile, jurisdiction_profile, risk_profile, manual_context")
          .eq("org_id", org_id)
          .maybeSingle();

        if (pip) {
          hasPip = true;
          sectors = (pip.sector_profile as string[]) || [];
          const jurisdictions = (pip.jurisdiction_profile as any[]) || [];
          jurisdictionNames = jurisdictions.map((j: any) => j.name).filter(Boolean);
          const riskProfile = pip.risk_profile || {};
          manualContext = (pip.manual_context as string) || "";

          const relevanceSystem = `You are a relevance scoring engine for a due diligence platform. Score whether a regulatory intelligence item is relevant to a specific DD programme based on its sector and geographic profile. Return ONLY valid JSON, no markdown fences.`;

          const relevanceUser = JSON.stringify({
            article: { title, category, source },
            programme_profile: {
              sectors,
              jurisdictions: jurisdictionNames,
              risk_areas: riskProfile,
              manual_context: manualContext,
            },
            instruction: "Return JSON: { relevance_score: 'high'|'moderate'|'low'|'not_relevant', sector_reasoning: 'one sentence', geographic_reasoning: 'one sentence', confidence: 0.0-1.0 }",
          });

          const relevanceRaw = await callAI(LOVABLE_API_KEY, relevanceSystem, relevanceUser);
          try {
            const rel = JSON.parse(cleanJson(relevanceRaw));
            relevance_score = rel.relevance_score || "low";
            const lines: string[] = [];
            if (rel.sector_reasoning) lines.push(`Sector match: ${rel.sector_reasoning}`);
            if (rel.geographic_reasoning) lines.push(`Geographic match: ${rel.geographic_reasoning}`);
            relevance_reasoning = lines.join("\n");
          } catch {
            console.error("Failed to parse relevance response:", relevanceRaw);
          }
        }
      } catch (pipErr) {
        console.error("PIP lookup/relevance scoring failed:", pipErr);
      }
    }

    // Step 2: If not_relevant, skip AI analysis entirely — flag for discard
    if (relevance_score === "not_relevant") {
      return new Response(
        JSON.stringify({
          summary: null,
          reflection: null,
          category,
          country,
          relevance_score,
          relevance_reasoning,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Generate programme-aware summary & reflection
    // If we have a PIP, contextualise the analysis prompt
    const programmeContext = hasPip
      ? `\n\nProgramme context for this analysis:
The client's programme covers entities in these sectors: ${sectors.join(", ") || "not specified"}.
They have geographic exposure in: ${jurisdictionNames.join(", ") || "not specified"}.
${manualContext ? `Additional context: ${manualContext}` : ""}
Write an editorial opinion that is specific to organisations with this programme profile, not generic commentary.`
      : "";

    const summarySystem = `You are a senior governance analyst at a discreet British institutional advisory firm.
Your task is to produce two pieces of text based on a headline from a public governance, regulatory or enforcement report.

Rules:
- Write original text. Do not copy or closely paraphrase the publisher's words.
- Use a restrained, neutral, institutional British advisory tone.
- Avoid sensational language, moral judgement, or emotive adjectives (never use "shocking", "disastrous", "catastrophic").
- Maintain measured phrasing throughout.${programmeContext}

Output EXACTLY this JSON (no markdown, no wrapping):
{
  "summary": "<3-4 sentence neutral factual summary of the likely content, based on the headline and source>",
  "reflection": "<1-2 sentence board-level governance reflection, framed as a consideration${hasPip ? " specific to the programme profile described above" : ""}>"
}`;

    const summaryUser = `Headline: "${title}"\nSource: ${source}\nURL: ${link}\n\nGenerate the summary and governance reflection.`;

    const summaryRaw = await callAI(LOVABLE_API_KEY, summarySystem, summaryUser);
    let parsed: { summary: string; reflection: string };
    try {
      parsed = JSON.parse(cleanJson(summaryRaw));
    } catch {
      parsed = {
        summary: "A governance-related matter has been publicly reported. Further details are available via the source link.",
        reflection: "Boards may wish to consider the relevance of this development to their own oversight arrangements.",
      };
    }

    return new Response(
      JSON.stringify({
        summary: parsed.summary,
        reflection: parsed.reflection,
        category,
        country,
        relevance_score,
        relevance_reasoning,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    if (e?.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e?.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("generate-governance-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : e?.body || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
